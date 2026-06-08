import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

export interface ResultadoPDFData {
  periodo: { filtro: string; inicio: string; fin: string };
  ventas_totales: { monto: number; pct: number };
  costo_ventas: { monto: number; pct: number };
  utilidad_bruta: { monto: number; pct: number };
  gastos_administracion: { total: number; pct: number; detalle: { categoria: string; monto: number; pct: number }[] };
  gastos_ventas: { total: number; pct: number; detalle: { categoria: string; monto: number; pct: number }[] };
  depreciacion: { total: number; pct: number; detalle: { nombre: string; monto: number; pct: number }[] };
  gastos_operativos: { total: number; pct: number };
  utilidad_antes_impuestos: { monto: number; pct: number };
  impuesto_renta: { monto: number; pct: number };
  utilidad_neta: { monto: number; pct: number };
}

const DARK = "#1e293b";
const GRAY = "#64748b";
const LIGHT = "#94a3b8";

const styles = StyleSheet.create({
  page: { padding: 45, fontFamily: "Helvetica", fontSize: 10, color: DARK },
  header: { marginBottom: 24, borderBottom: "2pt solid #e2e8f0", paddingBottom: 14 },
  company: { fontSize: 16, fontWeight: 700, color: "#0f172a" },
  title: { fontSize: 12, fontWeight: 700, color: GRAY, marginTop: 4, textTransform: "uppercase", letterSpacing: 1 },
  periodo: { fontSize: 9, color: LIGHT, marginTop: 6 },
  tableHeader: { flexDirection: "row", borderBottom: "1pt solid #e2e8f0", paddingBottom: 6, marginBottom: 6 },
  thConcepto: { flex: 3, fontSize: 8, fontWeight: 700, color: LIGHT, textTransform: "uppercase", letterSpacing: 0.5 },
  thMonto: { flex: 1.5, fontSize: 8, fontWeight: 700, color: LIGHT, textTransform: "uppercase", letterSpacing: 0.5, textAlign: "right" },
  thPct: { flex: 0.7, fontSize: 8, fontWeight: 700, color: LIGHT, textTransform: "uppercase", letterSpacing: 0.5, textAlign: "right" },
  row: { flexDirection: "row", paddingVertical: 5, paddingHorizontal: 4, borderRadius: 3 },
  rowIndent: { paddingLeft: 20 },
  rowBold: { backgroundColor: "#f8fafc" },
  cellLabel: { flex: 3, fontSize: 9, color: GRAY },
  cellLabelBold: { flex: 3, fontSize: 9, fontWeight: 700, color: DARK },
  cellLabelIndent: { flex: 3, fontSize: 9, color: GRAY, paddingLeft: 12 },
  cellMonto: { flex: 1.5, fontSize: 9, textAlign: "right", color: GRAY },
  cellMontoBold: { flex: 1.5, fontSize: 9, textAlign: "right", fontWeight: 700, color: DARK },
  cellPct: { flex: 0.7, fontSize: 8, textAlign: "right", color: LIGHT },
  divider: { marginVertical: 4 },
  dividerStrong: { marginVertical: 5 },
  dividerNet: { marginVertical: 7 },
  sectionGap: { marginTop: 4 },
  footer: { position: "absolute", bottom: 30, left: 45, right: 45, borderTop: "1pt solid #e2e8f0", paddingTop: 10 },
  footerText: { fontSize: 7, color: LIGHT, textAlign: "center" },
});

function fmt(n: number) {
  return `S/ ${n.toLocaleString("es-PE", { minimumFractionDigits: 2 })}`;
}

export function EstadoResultadosPDF({ data }: { data: ResultadoPDFData }) {
  const lines: { label: string; monto: number; pct: number; bold?: boolean; indent?: boolean; dividerBefore?: "strong" | "normal" | "net" }[] = [];

  lines.push({ label: "Ventas Totales", monto: data.ventas_totales.monto, pct: 100, bold: true });
  lines.push({ label: "Costo de Ventas", monto: data.costo_ventas.monto, pct: data.costo_ventas.pct });
  lines.push({ label: "UTILIDAD BRUTA", monto: data.utilidad_bruta.monto, pct: data.utilidad_bruta.pct, bold: true, dividerBefore: "strong" });

  if (data.gastos_administracion.total > 0) {
    lines.push({ label: "Gastos de Administración", monto: data.gastos_administracion.total, pct: data.gastos_administracion.pct, bold: true, dividerBefore: "normal" });
    for (const g of data.gastos_administracion.detalle) {
      lines.push({ label: g.categoria, monto: g.monto, pct: g.pct, indent: true });
    }
  }
  if (data.gastos_ventas.total > 0) {
    lines.push({ label: "Gastos de Ventas", monto: data.gastos_ventas.total, pct: data.gastos_ventas.pct, bold: true });
    for (const g of data.gastos_ventas.detalle) {
      lines.push({ label: g.categoria, monto: g.monto, pct: g.pct, indent: true });
    }
  }
  if (data.depreciacion.total > 0) {
    lines.push({ label: "Depreciación", monto: data.depreciacion.total, pct: data.depreciacion.pct, bold: true });
    for (const d of data.depreciacion.detalle) {
      lines.push({ label: d.nombre, monto: d.monto, pct: d.pct, indent: true });
    }
  }

  lines.push({ label: "Utilidad Antes de Impuestos", monto: data.utilidad_antes_impuestos.monto, pct: data.utilidad_antes_impuestos.pct, bold: true, dividerBefore: "strong" });
  lines.push({ label: "Impuesto a la Renta (1.5%)", monto: data.impuesto_renta.monto, pct: data.impuesto_renta.pct });
  lines.push({ label: "UTILIDAD NETA", monto: data.utilidad_neta.monto, pct: data.utilidad_neta.pct, bold: true, dividerBefore: "net" });

  const today = new Date().toLocaleDateString("es-PE", { day: "2-digit", month: "2-digit", year: "numeric" });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.company}>Gamarra Print System</Text>
          <Text style={styles.title}>Estado de Resultados</Text>
          <Text style={styles.periodo}>
            {data.periodo.filtro === "semana" ? "Semana" : data.periodo.filtro === "mes" ? "Mes" : "Año"} del {data.periodo.inicio} al {data.periodo.fin}
          </Text>
        </View>

        <View style={styles.tableHeader}>
          <Text style={styles.thConcepto}>Concepto</Text>
          <Text style={styles.thMonto}>Monto (S/)</Text>
          <Text style={styles.thPct}>%</Text>
        </View>

        {lines.map((line, i) => (
          <View key={i}>
            {line.dividerBefore === "strong" && <View style={styles.dividerStrong} />}
            {line.dividerBefore === "normal" && <View style={styles.divider} />}
            {line.dividerBefore === "net" && <View style={styles.dividerNet} />}
            <View style={[styles.row, line.bold && styles.rowBold, line.indent && styles.rowIndent]}>
              <Text style={line.bold ? styles.cellLabelBold : line.indent ? styles.cellLabelIndent : styles.cellLabel}>
                {line.label}
              </Text>
              <Text style={line.bold ? styles.cellMontoBold : styles.cellMonto}>
                {fmt(line.monto)}
              </Text>
              <Text style={styles.cellPct}>{line.pct.toFixed(1)}%</Text>
            </View>
          </View>
        ))}

        <View style={styles.footer}>
          <Text style={styles.footerText}>Generado el {today} — Gamarra Print System</Text>
        </View>
      </Page>
    </Document>
  );
}
