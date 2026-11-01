"""Audit a read-only Wrangler JSON export; never connect to or modify D1.

Export three SELECT results, in order: ventas, pagos, clientes. Required sale
columns: id, cliente_id, diseno, estado, pago, fecha. Payments: id, cliente_id,
pago, nota, fecha (venta_id optional). Clients: id, nombre. See docs/sql/README.md.
"""
import argparse
import collections
import csv
import json
import re
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path


def cents(value):
    return int((Decimal(str(value)) * 100).quantize(Decimal("1"), rounding=ROUND_HALF_UP))


def audit(sales, payments, clients):
    by_id = {sale["id"]: sale for sale in sales}
    by_client = collections.defaultdict(list)
    linked = collections.defaultdict(list)
    unresolved_payments = []
    names = {client["id"]: client["nombre"] for client in clients}
    for payment in payments:
        by_client[payment["cliente_id"]].append(payment)
        note = payment.get("nota") or ""
        candidates = []
        if payment.get("venta_id"):
            candidates = [payment["venta_id"]]
        elif match := re.fullmatch(r"(?:Pago total|Adelanto) venta #(\d+)", note):
            candidates = [int(match[1])]
        else:
            for sale in sales:
                if sale["cliente_id"] != payment["cliente_id"]:
                    continue
                if (note == "Pago completo - " + sale["diseno"]
                        and cents(payment["pago"]) == cents(sale["pago"])):
                    candidates.append(sale["id"])
                elif note == "Adelanto - " + sale["diseno"]:
                    candidates.append(sale["id"])
        candidates = [sale_id for sale_id in candidates if sale_id in by_id
                      and by_id[sale_id]["cliente_id"] == payment["cliente_id"]]
        if len(candidates) == 1:
            linked[candidates[0]].append(payment)
        else:
            unresolved_payments.append(payment["id"])

    rows = []
    for sale in sales:
        if sale["estado"] != "Pagó":
            continue
        identified = linked[sale["id"]]
        covered = sum(cents(payment["pago"]) for payment in identified)
        total = cents(sale["pago"])
        if covered >= total:
            status = "pago_identificado"
        elif not by_client[sale["cliente_id"]]:
            status = "cliente_sin_pagos"
        else:
            status = "revisar_pagos_sin_vinculo_o_incompletos"
        rows.append({
            "venta_id": sale["id"], "cliente": names.get(sale["cliente_id"], ""),
            "diseno": sale["diseno"], "fecha_venta": sale["fecha"],
            "importe_venta": f"{total / 100:.2f}",
            "pago_identificado": f"{covered / 100:.2f}",
            "importe_sin_identificar": f"{max(total - covered, 0) / 100:.2f}",
            "pagos_identificados_ids": ", ".join(str(p["id"]) for p in identified),
            "resultado": status,
        })
    summary = {
        "ventas_pago": len(rows),
        "clasificacion": dict(collections.Counter(row["resultado"] for row in rows)),
        "pagos_vinculables": sum(len(items) for items in linked.values()),
        "pagos_no_vinculables_ids": unresolved_payments,
    }
    return rows, summary


def safe_cell(value):
    # CSVs are intended for opening in Excel; neutralize formula prefixes.
    return "'" + value if isinstance(value, str) and value.startswith(("=", "+", "-", "@", "\t", "\r", "\n")) else value


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input", type=Path)
    parser.add_argument("output_dir", type=Path)
    args = parser.parse_args()
    raw = args.input.read_bytes()
    encoding = "utf-16" if raw[:2] in (b"\xff\xfe", b"\xfe\xff") else "utf-8-sig"
    data = json.loads(raw.decode(encoding))
    if len(data) != 3 or not all(item.get("success") for item in data):
        raise ValueError("Expected three successful read-only SELECT results")
    rows, summary = audit(*(item["results"] for item in data))
    args.output_dir.mkdir(parents=True, exist_ok=True)
    for filename, selected in [
        ("ventas-pago-auditoria.csv", rows),
        ("ventas-pago-por-revisar.csv", [row for row in rows if row["resultado"] != "pago_identificado"]),
    ]:
        with (args.output_dir / filename).open("w", encoding="utf-8-sig", newline="") as handle:
            writer = csv.DictWriter(handle, fieldnames=list(rows[0]) if rows else ["venta_id"])
            writer.writeheader()
            writer.writerows({key: safe_cell(value) for key, value in row.items()} for row in selected)
    (args.output_dir / "resumen.json").write_text(json.dumps(summary, indent=2, ensure_ascii=False), encoding="utf-8")
    print(json.dumps(summary, ensure_ascii=True))


if __name__ == "__main__":
    main()
