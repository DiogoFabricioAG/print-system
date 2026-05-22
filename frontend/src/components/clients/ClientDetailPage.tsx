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
  PlusCircle,
  Loader2,
  Pencil,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { clientsApi, pagosApi, type ClientDetail } from "@/lib/api";
import { showToast } from "@/lib/toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function ClientDetailPage() {
  const [clientId, setClientId] = React.useState<string | null>(null);
  const [client, setClient] = React.useState<ClientDetail | null>(null);
  const [loading, setLoading] = React.useState(true);

  // States for payment modals
  const [isPaymentModalOpen, setIsPaymentModalOpen] = React.useState(false);
  const [isSubmittingPayment, setIsSubmittingPayment] = React.useState(false);
  const [editingPago, setEditingPago] = React.useState<{
    id: number;
    pago: number;
    nota: string;
    fecha: string;
  } | null>(null);
  const [isSubmittingEdit, setIsSubmittingEdit] = React.useState(false);
  const [deletingPagoId, setDeletingPagoId] = React.useState<number | null>(
    null,
  );
  const [isDeletingPago, setIsDeletingPago] = React.useState(false);

  React.useEffect(() => {
    // Solo se ejecuta en el cliente
    const searchParams = new URLSearchParams(window.location.search);
    const id = searchParams.get("id");
    setClientId(id);
  }, []);

  const fetchClientData = React.useCallback(async () => {
    if (!clientId) return;
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
  }, [clientId]);

  React.useEffect(() => {
    if (clientId) {
      fetchClientData();
    } else if (clientId === null) {
      // Waiting for id
    } else {
      setLoading(false);
    }
  }, [clientId, fetchClientData]);

  const handlePaymentSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!clientId || isSubmittingPayment) return;

    setIsSubmittingPayment(true);
    const formData = new FormData(e.currentTarget);
    const pagoNum = parseFloat(formData.get("pago") as string);

    if (isNaN(pagoNum) || pagoNum <= 0) {
      showToast.error("Ingresa un monto válido");
      setIsSubmittingPayment(false);
      return;
    }

    try {
      await pagosApi.create({
        cliente_id: Number(clientId),
        pago: pagoNum,
        nota: (formData.get("nota") as string) || undefined,
        fecha: (formData.get("fecha") as string) || undefined,
      });
      showToast.success("Pago registrado correctamente");
      setIsPaymentModalOpen(false);
      fetchClientData();
    } catch (error) {
      showToast.error("Error al registrar el pago");
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingPago || !clientId || isSubmittingEdit) return;

    setIsSubmittingEdit(true);
    const formData = new FormData(e.currentTarget);
    const pagoNum = parseFloat(formData.get("pago") as string);

    if (isNaN(pagoNum) || pagoNum <= 0) {
      showToast.error("Ingresa un monto válido");
      setIsSubmittingEdit(false);
      return;
    }

    try {
      await pagosApi.update(editingPago.id, {
        cliente_id: Number(clientId),
        pago: pagoNum,
        nota: (formData.get("nota") as string) || undefined,
        fecha: (formData.get("fecha") as string) || undefined,
      });
      showToast.success("Pago actualizado correctamente");
      setEditingPago(null);
      fetchClientData();
    } catch (error) {
      showToast.error("Error al actualizar el pago");
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const handleDeletePago = async () => {
    if (!deletingPagoId || isDeletingPago) return;

    setIsDeletingPago(true);
    try {
      await pagosApi.delete(deletingPagoId);
      showToast.success("Pago eliminado correctamente");
      setDeletingPagoId(null);
      fetchClientData();
    } catch (error) {
      showToast.error("Error al eliminar el pago");
    } finally {
      setIsDeletingPago(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    return dateString.split(" ")[0];
  };

  const getInsights = (client: ClientDetail) => {
    const totalOrders = client.historial.filter(
      (h) => h.tipo === "venta",
    ).length;
    const debtBalance =
      client.metricas.total_ventas - client.metricas.total_pagos;

    return {
      totalOrders,
      debtBalance: Math.max(0, debtBalance),
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

          <div className="shrink-0 flex flex-col gap-3 min-w-[200px]">
            <Button
              onClick={() => setIsPaymentModalOpen(true)}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white h-12 rounded-xl shadow-sm gap-2"
            >
              <PlusCircle className="w-5 h-5" />
              Registrar Pago
            </Button>

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
              Total Pagado
            </h3>
          </div>
          <p className="text-2xl font-bold text-slate-900">
            S/{" "}
            {client.metricas.total_pagos.toLocaleString("es-PE", {
              minimumFractionDigits: 2,
            })}
          </p>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            En abonos y pagos
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertCircle className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold text-slate-600">
              Deuda Restante
            </h3>
          </div>
          <p
            className="text-lg font-bold text-slate-900 truncate"
            title={insights.debtBalance.toLocaleString("es-PE", {
              minimumFractionDigits: 2,
            })}
          >
            S/{" "}
            {insights.debtBalance.toLocaleString("es-PE", {
              minimumFractionDigits: 2,
            })}
          </p>
          <p className="text-xs text-slate-500 mt-1 font-medium">Por cobrar</p>
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
                    Fecha
                  </TableHead>
                  <TableHead className="font-semibold text-slate-700 px-6 py-4">
                    Descripción
                  </TableHead>
                  <TableHead className="font-semibold text-slate-700 px-6 py-4">
                    Deuda
                  </TableHead>
                  <TableHead className="font-semibold text-slate-700 px-6 py-4">
                    Pago
                  </TableHead>
                  <TableHead className="font-semibold text-slate-700 px-6 py-4 w-20">
                    Acciones
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {client.historial.map((item, index) => (
                  <TableRow
                    key={`${item.tipo}-${item.id}-${index}`}
                    className="border-slate-50 hover:bg-slate-50/80 transition-colors group"
                  >
                    <TableCell className="px-6 py-4 text-sm text-slate-500 whitespace-nowrap">
                      {formatDate(item.fecha)}
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex w-2 h-2 rounded-full ${item.tipo === "venta" ? "bg-rose-400" : "bg-emerald-400"}`}
                        />
                        <span className="text-sm font-medium text-slate-800">
                          {item.descripcion}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-4 text-sm font-bold tabular-nums text-rose-600">
                      {item.deuda > 0
                        ? `S/ ${item.deuda.toLocaleString("es-PE", { minimumFractionDigits: 2 })}`
                        : "-"}
                    </TableCell>
                    <TableCell className="px-6 py-4 text-sm font-bold tabular-nums text-emerald-600">
                      {item.pago > 0
                        ? `S/ ${item.pago.toLocaleString("es-PE", { minimumFractionDigits: 2 })}`
                        : "-"}
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      {item.tipo === "pago" && (
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                            onClick={() =>
                              setEditingPago({
                                id: item.id,
                                pago: item.pago,
                                nota:
                                  item.descripcion === "Abono"
                                    ? ""
                                    : item.descripcion,
                                fecha: item.fecha,
                              })
                            }
                            title="Editar pago"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                            onClick={() => setDeletingPagoId(item.id)}
                            title="Eliminar pago"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* MODAL DE REGISTRO DE PAGO */}
      <Dialog
        open={isPaymentModalOpen}
        onOpenChange={(open) => {
          if (!open && !isSubmittingPayment) setIsPaymentModalOpen(false);
        }}
      >
        <DialogContent className="sm:max-w-[450px] bg-white border-slate-200 rounded-2xl p-0 overflow-hidden shadow-2xl">
          {isSubmittingPayment && (
            <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-[2px] flex flex-col items-center justify-center z-50">
              <div className="bg-white p-5 rounded-2xl shadow-xl flex flex-col items-center">
                <Loader2 className="h-8 w-8 text-emerald-500 animate-spin mb-3" />
                <p className="text-sm font-semibold text-slate-700">
                  Registrando pago...
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handlePaymentSubmit}>
            <div className="p-8">
              <DialogHeader className="mb-6">
                <DialogTitle className="text-2xl font-bold text-slate-900 font-display">
                  Registrar Pago / Abono
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label
                    htmlFor="pago"
                    className="text-slate-700 font-semibold"
                  >
                    Monto a pagar (S/)
                  </Label>
                  <Input
                    id="pago"
                    name="pago"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    required
                    className="rounded-xl border-slate-200 focus-visible:ring-emerald-500 text-lg font-bold"
                  />
                  {insights.debtBalance > 0 && (
                    <p className="text-xs text-rose-500 font-medium mt-1">
                      Deuda actual: S/{" "}
                      {insights.debtBalance.toLocaleString("es-PE", {
                        minimumFractionDigits: 2,
                      })}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="fecha"
                    className="text-slate-700 font-semibold"
                  >
                    Fecha del pago
                  </Label>
                  <Input
                    id="fecha"
                    name="fecha"
                    type="date"
                    defaultValue={new Date().toISOString().split("T")[0]}
                    className="rounded-xl border-slate-200 focus-visible:ring-emerald-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="nota"
                    className="text-slate-700 font-semibold"
                  >
                    Descripción o Nota (Opcional)
                  </Label>
                  <Textarea
                    id="nota"
                    name="nota"
                    placeholder="Ej. Transferencia BCP, Abono para saldar cuenta..."
                    className="rounded-xl border-slate-200 resize-none h-20 focus-visible:ring-emerald-500"
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="bg-slate-50 px-8 py-4 border-t border-slate-100 flex gap-3 sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsPaymentModalOpen(false)}
                className="rounded-xl border-slate-200 text-slate-600 hover:bg-slate-100"
                disabled={isSubmittingPayment}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm"
                disabled={isSubmittingPayment}
              >
                Guardar Pago
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL DE EDICION DE PAGO */}
      <Dialog
        open={editingPago !== null}
        onOpenChange={(open) => {
          if (!open && !isSubmittingEdit) setEditingPago(null);
        }}
      >
        <DialogContent className="sm:max-w-[450px] bg-white border-slate-200 rounded-2xl p-0 overflow-hidden shadow-2xl">
          {isSubmittingEdit && (
            <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-[2px] flex flex-col items-center justify-center z-50">
              <div className="bg-white p-5 rounded-2xl shadow-xl flex flex-col items-center">
                <Loader2 className="h-8 w-8 text-blue-500 animate-spin mb-3" />
                <p className="text-sm font-semibold text-slate-700">
                  Actualizando pago...
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleEditSubmit}>
            <div className="p-8">
              <DialogHeader className="mb-6">
                <DialogTitle className="text-2xl font-bold text-slate-900 font-display">
                  Editar Pago / Abono
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label
                    htmlFor="edit-pago"
                    className="text-slate-700 font-semibold"
                  >
                    Monto (S/)
                  </Label>
                  <Input
                    id="edit-pago"
                    name="pago"
                    type="number"
                    step="0.01"
                    defaultValue={editingPago?.pago ?? ""}
                    required
                    className="rounded-xl border-slate-200 focus-visible:ring-blue-500 text-lg font-bold"
                  />
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="edit-fecha"
                    className="text-slate-700 font-semibold"
                  >
                    Fecha del pago
                  </Label>
                  <Input
                    id="edit-fecha"
                    name="fecha"
                    type="date"
                    defaultValue={editingPago?.fecha?.split(" ")[0] ?? ""}
                    className="rounded-xl border-slate-200 focus-visible:ring-blue-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="edit-nota"
                    className="text-slate-700 font-semibold"
                  >
                    Descripción o Nota
                  </Label>
                  <Textarea
                    id="edit-nota"
                    name="nota"
                    defaultValue={editingPago?.nota ?? ""}
                    placeholder="Ej. Transferencia BCP, Abono para saldar cuenta..."
                    className="rounded-xl border-slate-200 resize-none h-20 focus-visible:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="bg-slate-50 px-8 py-4 border-t border-slate-100 flex gap-3 sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingPago(null)}
                className="rounded-xl border-slate-200 text-slate-600 cursor-pointer hover:bg-slate-100"
                disabled={isSubmittingEdit}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="rounded-xl bg-green-600 hover:bg-green-700 cursor-pointer text-white shadow-sm"
                disabled={isSubmittingEdit}
              >
                Guardar Cambios
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL DE CONFIRMACION DE ELIMINACION */}
      <Dialog
        open={deletingPagoId !== null}
        onOpenChange={(open) => {
          if (!open && !isDeletingPago) setDeletingPagoId(null);
        }}
      >
        <DialogContent className="sm:max-w-[400px] bg-white border-slate-200 rounded-2xl p-0 overflow-hidden shadow-2xl">
          {isDeletingPago && (
            <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-[2px] flex flex-col items-center justify-center z-50">
              <div className="bg-white p-5 rounded-2xl shadow-xl flex flex-col items-center">
                <Loader2 className="h-8 w-8 text-rose-500 animate-spin mb-3" />
                <p className="text-sm font-semibold text-slate-700">
                  Eliminando pago...
                </p>
              </div>
            </div>
          )}

          <div className="p-8">
            <DialogHeader className="mb-4">
              <DialogTitle className="text-xl font-bold text-slate-900 font-display">
                Eliminar Pago
              </DialogTitle>
            </DialogHeader>
            <p className="text-slate-600 text-sm">
              ¿Estás seguro de que deseas eliminar este pago? Esta acción no se
              puede deshacer.
            </p>
          </div>

          <DialogFooter className="bg-slate-50 px-8 py-4 border-t border-slate-100 flex gap-3 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeletingPagoId(null)}
              className="rounded-xl border-slate-200 text-slate-600 hover:bg-slate-100"
              disabled={isDeletingPago}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleDeletePago}
              className="rounded-xl bg-rose-500 hover:bg-rose-600 text-white shadow-sm"
              disabled={isDeletingPago}
            >
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
