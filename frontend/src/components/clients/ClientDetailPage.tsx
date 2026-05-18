import * as React from "react";
import {
  Phone,
  User,
  CalendarDays,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  History,
  Receipt,
  Tag,
  Star,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { clientsApi, type ClientDetail } from "@/lib/api";
import { showToast } from "@/lib/toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function ClientDetailPage() {
  const [clientId, setClientId] = React.useState<string | null>(null);
  const [client, setClient] = React.useState<ClientDetail | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    // Solo se ejecuta en el cliente
    const searchParams = new URLSearchParams(window.location.search);
    const id = searchParams.get("id");
    setClientId(id);
  }, []);

  React.useEffect(() => {
    const fetchClientData = async () => {
      try {
        setLoading(true);
        const data = await clientsApi.getDetail(Number(clientId));
        setClient(data);
      } catch (error) {
        showToast.error("Error al cargar los detalles del cliente");
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    if (clientId) {
      fetchClientData();
    } else if (clientId === null) {
      // Waiting for id
    } else {
      setLoading(false);
    }
  }, [clientId]);

  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    return dateString.split(" ")[0];
  };

  const getInsights = (client: ClientDetail) => {
    const totalOrders = client.historial.length;
    const averageTicket =
      totalOrders > 0 ? client.metricas.total_ventas / totalOrders : 0;

    // Calculate most frequent word in design (excluding small words)
    const words = client.historial.flatMap((h) =>
      h.diseno.toLowerCase().split(/\s+/),
    );
    const wordCounts = words.reduce(
      (acc, word) => {
        if (word.length > 3) acc[word] = (acc[word] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    let favoriteProduct = "-";
    let maxCount = 0;
    Object.entries(wordCounts).forEach(([word, count]) => {
      if (count > maxCount) {
        favoriteProduct = word;
        maxCount = count;
      }
    });

    return {
      totalOrders,
      averageTicket,
      favoriteProduct:
        favoriteProduct !== "-"
          ? favoriteProduct.charAt(0).toUpperCase() + favoriteProduct.slice(1)
          : "-",
    };
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-[#30b7ff] rounded-full animate-spin"></div>
        <div className="text-slate-500 font-medium">
          Cargando perfil del cliente...
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
        <AlertCircle className="w-12 h-12 text-rose-500" />
        <div>
          <h2 className="text-xl font-bold text-slate-800">
            Cliente no encontrado
          </h2>
          <p className="text-slate-500 mt-1">
            El cliente que buscas no existe o fue eliminado.
          </p>
        </div>
        <Button
          onClick={() => window.history.back()}
          variant="outline"
          className="mt-2"
        >
          Volver atrás
        </Button>
      </div>
    );
  }

  const insights = getInsights(client);

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* HEADER CARD */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 opacity-70 pointer-events-none"></div>

        <div className="relative flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="flex gap-5 items-start">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#30b7ff] to-blue-600 flex items-center justify-center shadow-lg shrink-0 text-white font-display text-2xl font-bold">
              {client.nombre.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900 font-display tracking-tight">
                {client.nombre}
              </h1>
              <div className="flex flex-wrap items-center gap-3 mt-3 text-sm text-slate-600">
                {client.numero && (
                  <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                    <Phone className="w-4 h-4 text-slate-400" />
                    <span className="font-medium">{client.numero}</span>
                  </div>
                )}
                {client.creado_el && (
                  <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                    <CalendarDays className="w-4 h-4 text-slate-400" />
                    <span>Registrado el {formatDate(client.creado_el)}</span>
                  </div>
                )}
              </div>
              {client.descripcion && (
                <p className="mt-4 text-slate-600 max-w-2xl bg-slate-50 p-4 rounded-xl border border-slate-100 text-sm leading-relaxed">
                  {client.descripcion}
                </p>
              )}
            </div>
          </div>

          <div className="shrink-0 flex flex-col gap-2 min-w-[200px]">
            <div
              className={`flex items-center gap-3 p-4 rounded-2xl border ${client.metricas.debe ? "bg-rose-50/50 border-rose-100" : "bg-emerald-50/50 border-emerald-100"}`}
            >
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${client.metricas.debe ? "bg-rose-100 text-rose-600" : "bg-emerald-100 text-emerald-600"}`}
              >
                {client.metricas.debe ? (
                  <AlertCircle className="w-5 h-5" />
                ) : (
                  <CheckCircle2 className="w-5 h-5" />
                )}
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-0.5">
                  Estado Contable
                </p>
                <p
                  className={`font-bold ${client.metricas.debe ? "text-rose-600" : "text-emerald-600"}`}
                >
                  {client.metricas.debe ? "Con Deuda" : "Al Día"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* METRICS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold text-slate-600">
              Total Comprado
            </h3>
          </div>
          <p className="text-2xl font-bold text-slate-900">
            S/{" "}
            {client.metricas.total_ventas.toLocaleString("es-PE", {
              minimumFractionDigits: 2,
            })}
          </p>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            {insights.totalOrders} pedidos en total
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <History className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold text-slate-600">
              Última Compra
            </h3>
          </div>
          <p className="text-xl font-bold text-slate-900">
            {formatDate(client.metricas.ultima_compra)}
          </p>
          <p className="text-xs text-amber-600 mt-1 font-medium bg-amber-50 inline-block px-2 py-0.5 rounded-md">
            Hace {client.metricas.dias_desde_ultima_compra} días
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold text-slate-600">
              Ticket Promedio
            </h3>
          </div>
          <p className="text-2xl font-bold text-slate-900">
            S/{" "}
            {insights.averageTicket.toLocaleString("es-PE", {
              minimumFractionDigits: 2,
            })}
          </p>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Por cada pedido
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Star className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold text-slate-600">
              Servicio Frecuente
            </h3>
          </div>
          <p
            className="text-lg font-bold text-slate-900 truncate"
            title={insights.favoriteProduct}
          >
            {insights.favoriteProduct}
          </p>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Preferencia de diseño
          </p>
        </div>
      </div>

      {/* HISTORY TABLE */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 shadow-sm flex items-center justify-center">
              <Tag className="w-4 h-4 text-slate-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">
              Historial de Trabajos
            </h3>
          </div>
          <span className="text-sm font-medium text-slate-500 bg-white px-3 py-1 rounded-full border border-slate-200 shadow-sm">
            {client.historial.length} registros
          </span>
        </div>

        {client.historial.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Receipt className="w-12 h-12 text-slate-200 mb-3" />
            <h4 className="text-lg font-semibold text-slate-700">
              Sin historial
            </h4>
            <p className="text-sm text-slate-500">
              Este cliente aún no tiene ventas registradas.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-slate-100">
                  <TableHead className="font-semibold text-slate-700 px-6 py-4">
                    Diseño / Trabajo
                  </TableHead>
                  <TableHead className="font-semibold text-slate-700 px-6 py-4">
                    Monto
                  </TableHead>
                  <TableHead className="font-semibold text-slate-700 px-6 py-4">
                    Fecha
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {client.historial.map((item) => (
                  <TableRow
                    key={item.id}
                    className="border-slate-50 hover:bg-slate-50/80 transition-colors group"
                  >
                    <TableCell className="px-6 py-4 text-sm font-medium text-slate-800">
                      {item.diseno}
                    </TableCell>
                    <TableCell className="px-6 py-4 text-sm font-bold tabular-nums text-slate-700">
                      S/{" "}
                      {item.pago.toLocaleString("es-PE", {
                        minimumFractionDigits: 2,
                      })}
                    </TableCell>
                    <TableCell className="px-6 py-4 text-sm text-slate-500">
                      {formatDate(item.fecha)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
