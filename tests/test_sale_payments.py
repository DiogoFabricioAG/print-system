import importlib.util
import re
import sqlite3
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MODULE = (ROOT / "functions/src/db/sale-payments.ts").read_text(encoding="utf-8")
MIGRATION = (ROOT / "functions/migrations/0005_pagos_por_venta.sql").read_text(encoding="utf-8")
LINK = re.search(r"linkLegacySalePayments = String.raw`(.*?)`;", MODULE, re.S)[1]
TRIGGER = re.search(r"paidSaleTrigger = String.raw`(.*?)`;", MODULE, re.S)[1]
GUARD = (ROOT / "functions/migrations/0006_evitar_pago_duplicado_sin_vinculo.sql").read_text(encoding="utf-8")


class SalePaymentsTest(unittest.TestCase):
    def setUp(self):
        self.db = sqlite3.connect(":memory:")
        self.db.executescript('''
            PRAGMA foreign_keys = ON;
            CREATE TABLE clientes (id INTEGER PRIMARY KEY, nombre TEXT);
            CREATE TABLE ventas (id INTEGER PRIMARY KEY, "diseño" TEXT, cliente_id INTEGER,
                pago REAL, estado TEXT, fecha TEXT, creado_el TEXT DEFAULT CURRENT_TIMESTAMP);
            CREATE TABLE pagos (id INTEGER PRIMARY KEY, cliente_id INTEGER, pago REAL,
                nota TEXT, fecha TEXT);
            INSERT INTO clientes VALUES (1, 'Fixture'), (2, 'Otro');
        ''')
        self.db.executescript(MIGRATION)
        self.db.executescript(GUARD)

    def tearDown(self):
        self.db.close()

    def sale(self, sale_id=1, amount=100, state="Debe", date="2026-10-01"):
        self.db.execute('INSERT INTO ventas (id, "diseño", cliente_id, pago, estado, fecha) VALUES (?, ?, 1, ?, ?, ?)',
                        (sale_id, "Diseño de prueba", amount, state, date))

    def state(self, value, sale_id=1):
        self.db.execute("UPDATE ventas SET estado = ? WHERE id = ?", (value, sale_id))

    def payment(self, amount, sale_id=1, note="Abono"):
        self.db.execute("INSERT INTO pagos (cliente_id, venta_id, pago, nota) VALUES (1, ?, ?, ?)", (sale_id, amount, note))

    def payments(self):
        return self.db.execute("SELECT venta_id, pago, fecha FROM pagos ORDER BY id").fetchall()

    def test_state_transition_creates_exact_payment_once(self):
        self.sale()
        self.state("Pagó")
        self.state("Pagó")
        self.state("Debe")
        self.state("Pagó")
        self.assertEqual(self.payments(), [(1, 100, "2026-10-01")])

    def test_credit_only_registers_unpaid_remainder_in_cents(self):
        self.sale(amount=100.10, state="Crédito")
        self.payment(35.35)
        self.state("Pagó")
        self.assertEqual([row[1] for row in self.payments()], [35.35, 64.75])

    def test_manual_full_payment_does_not_get_duplicated(self):
        self.sale()
        self.payment(100)
        self.state("Pagó")
        self.assertEqual(len(self.payments()), 1)

    def test_general_payment_blocks_new_charge_until_explicitly_linked(self):
        self.sale()
        self.payment(100, sale_id=None)
        with self.assertRaisesRegex(sqlite3.IntegrityError, "PAGOS_SIN_VENTA"):
            self.state("Pagó")
        self.assertEqual(self.db.execute("SELECT estado FROM ventas").fetchone()[0], "Debe")
        self.assertEqual(len(self.payments()), 1)
        self.db.execute("UPDATE pagos SET venta_id=1 WHERE venta_id IS NULL")
        self.state("Pagó")
        self.assertEqual(len(self.payments()), 1)

    def test_general_advance_is_not_charged_twice(self):
        self.sale()
        self.payment(40, sale_id=None)
        with self.assertRaisesRegex(sqlite3.IntegrityError, "PAGOS_SIN_VENTA"):
            self.state("Pagó")
        self.db.execute("UPDATE pagos SET venta_id=1 WHERE venta_id IS NULL")
        self.state("Pagó")
        self.assertEqual([row[1] for row in self.payments()], [40, 60])

    def test_covered_sale_is_not_blocked_by_unrelated_general_payment(self):
        self.sale()
        self.payment(100)
        self.payment(40, sale_id=None)
        self.state("Pagó")
        self.assertEqual(len(self.payments()), 2)

    def test_another_customers_general_payment_does_not_block(self):
        self.sale()
        self.db.execute("INSERT INTO pagos (cliente_id, pago) VALUES (2,100)")
        self.state("Pagó")
        self.assertEqual(self.payments()[-1][:2], (1, 100))

    def test_same_customer_and_amount_do_not_conflate_sales(self):
        self.sale()
        self.sale(sale_id=2)
        self.payment(100)
        self.state("Pagó", sale_id=2)
        self.assertEqual([row[:2] for row in self.payments()], [(1, 100), (2, 100)])

    def test_insert_paid_sale_preserves_existing_creation_flow(self):
        self.sale(state="Pagó")
        self.assertEqual(self.payments(), [])
        self.payment(100)
        self.state("Pagó")
        self.assertEqual(len(self.payments()), 1)

    def test_failed_payment_rolls_back_state_change(self):
        self.sale()
        self.db.executescript("CREATE TRIGGER reject_payment BEFORE INSERT ON pagos BEGIN SELECT RAISE(ABORT, 'fixture failure'); END;")
        with self.assertRaises(sqlite3.IntegrityError):
            self.state("Pagó")
        self.assertEqual(self.db.execute("SELECT estado FROM ventas").fetchone()[0], "Debe")
        self.assertEqual(self.payments(), [])

    def test_missing_date_uses_lima_date(self):
        self.sale(date=None)
        self.db.execute("UPDATE ventas SET creado_el = '2026-10-02 02:00:00'")
        self.state("Pagó")
        self.assertEqual(self.payments()[0][2], "2026-10-01")

    def test_zero_amount_does_not_create_payment(self):
        self.sale(amount=0)
        self.state("Pagó")
        self.assertEqual(self.payments(), [])

    def test_legacy_linking_only_uses_unambiguous_notes(self):
        self.sale()
        self.sale(sale_id=2)
        self.db.executemany("INSERT INTO pagos (cliente_id, pago, nota) VALUES (?, ?, ?)", [
            (1, 100, "Pago total venta #1"),
            (1, 100, "Pago completo - Diseño de prueba"),
            (1, 100, "YAPE"),
            (2, 100, "Pago total venta #1"),
        ])
        before = self.db.execute("SELECT id, cliente_id, pago, nota, fecha FROM pagos").fetchall()
        self.db.executescript(LINK)
        self.assertEqual([row[0] for row in self.db.execute("SELECT venta_id FROM pagos ORDER BY id")], [1, None, None, None])
        self.assertEqual(before, self.db.execute("SELECT id, cliente_id, pago, nota, fecha FROM pagos").fetchall())
        self.db.executescript(LINK)
        self.assertEqual(len(self.payments()), 4)

    def test_runtime_schema_matches_migration(self):
        self.assertIn(LINK.strip(), MIGRATION)
        self.assertIn(TRIGGER.strip(), MIGRATION)
        self.assertIn(re.search(r"unallocatedPaymentGuard = String.raw`(.*?)`;", MODULE, re.S)[1].strip(), GUARD)

    def test_sale_deletion_keeps_financial_record(self):
        self.sale()
        self.state("Pagó")
        self.db.execute("DELETE FROM ventas WHERE id = 1")
        self.assertEqual(self.payments(), [(None, 100, "2026-10-01")])


class AuditTest(unittest.TestCase):
    def test_does_not_claim_generic_or_ambiguous_payments_cover_sale(self):
        spec = importlib.util.spec_from_file_location("audit", ROOT / "scripts/audit-sale-payments.py")
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        sales = [dict(id=i, cliente_id=1, diseno="Repetido", estado="Pagó", pago=100, fecha="2026-10-01") for i in [1, 2]]
        payments = [dict(id=1, cliente_id=1, pago=100, nota="Pago completo - Repetido"),
                    dict(id=2, cliente_id=1, pago=100, nota="YAPE")]
        rows, summary = module.audit(sales, payments, [])
        self.assertEqual(summary["pagos_vinculables"], 0)
        self.assertTrue(all(row["resultado"].startswith("revisar") for row in rows))


if __name__ == "__main__":
    unittest.main()
