import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export interface ClientHistoryItem {
  id: string
  product: string
  amount: number
  date: string
}

export interface ClientMetrics {
  totalSalesValue: number
  lastPurchaseDate: string
  daysSinceLastPurchase: number
  hasDebt: boolean
}

export interface ClientData {
  id: string
  name: string
  phone: string
  description: string
  metrics: ClientMetrics
  history: ClientHistoryItem[]
}

interface ClientDetailModalProps {
  clientId: string | null
  isOpen: boolean
  onClose: () => void
  onRequestData: (clientId: string) => Promise<ClientData | null>
}

export function ClientDetailModal({ clientId, isOpen, onClose, onRequestData }: ClientDetailModalProps) {
  const [client, setClient] = React.useState<ClientData | null>(null)
  const [loading, setLoading] = React.useState(false)

  const formatDate = (dateString: string) => {
    if (!dateString) return "-"
    return dateString.split(" ")[0]
  }

  React.useEffect(() => {
    if (isOpen && clientId) {
      setLoading(true)
      onRequestData(clientId)
        .then(data => setClient(data))
        .finally(() => setLoading(false))
    } else {
      setClient(null)
    }
  }, [isOpen, clientId])

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[650px] bg-slate-50 border-slate-200 rounded-2xl p-0 overflow-hidden shadow-2xl">
        <div className="p-8">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-3xl font-bold text-slate-900 font-display">
              {loading ? "Cargando..." : client?.name}
            </DialogTitle>
            {!loading && client && (
              <div className="text-sm text-slate-500 mt-2 space-y-1">
                <p>Numero: <span className="font-medium text-slate-700">{client.phone}</span></p>
                <p>Descripcion: <span className="text-slate-600">{client.description}</span></p>
              </div>
            )}
          </DialogHeader>

          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="text-slate-500">Cargando datos...</div>
            </div>
          ) : client && (
            <div className="grid grid-cols-1 md:grid-cols-[1fr_200px] gap-6">
              
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <Table>
                  <TableHeader className="bg-slate-50/80">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="font-semibold text-slate-700">Diseno</TableHead>
                      <TableHead className="font-semibold text-slate-700">Monto</TableHead>
                      <TableHead className="font-semibold text-slate-700">Fecha</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {client.history.map((item) => (
                      <TableRow key={item.id} className="border-slate-100">
                        <TableCell className="text-sm text-slate-700">{item.product}</TableCell>
                        <TableCell className="text-sm font-medium tabular-nums text-slate-700">S/ {item.amount}</TableCell>
                        <TableCell className="text-sm text-slate-500">{formatDate(item.date)}</TableCell>
                      </TableRow>
                    ))}
                    {Array.from({ length: Math.max(0, 3 - client.history.length) }).map((_, i) => (
                      <TableRow key={`empty-${i}`} className="border-slate-100 h-12">
                        <TableCell></TableCell>
                        <TableCell></TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex flex-col gap-3">
                <div className="bg-[#ebfbf3] border border-[#a7f3d0] rounded-xl p-4 flex flex-col justify-center items-center text-center">
                  <span className="text-sm font-medium text-[#059669]">Valor de Ventas</span>
                  <span className="text-xl font-bold text-[#047857] tabular-nums mt-1">S/ {client.metrics.totalSalesValue}</span>
                </div>
                
                <div className="bg-[#fefce8] border border-[#fde047] rounded-xl p-4 flex flex-col justify-center items-center text-center">
                  <span className="text-sm font-medium text-[#a16207]">Ultima Compra</span>
                  <span className="text-lg font-bold text-[#854d0e] mt-1">
                    {formatDate(client.metrics.lastPurchaseDate)} ({client.metrics.daysSinceLastPurchase}D)
                  </span>
                </div>

                <div className={`border rounded-xl p-4 flex flex-col justify-center items-center text-center ${client.metrics.hasDebt ? 'bg-[#fef2f2] border-[#fecaca]' : 'bg-slate-50 border-slate-200'}`}>
                  <span className={`text-sm font-medium ${client.metrics.hasDebt ? 'text-[#e11d48]' : 'text-slate-500'}`}>Debe?</span>
                  <span className={`text-xl font-bold mt-1 ${client.metrics.hasDebt ? 'text-[#be123c]' : 'text-slate-700'}`}>
                    {client.metrics.hasDebt ? "Si" : "No"}
                  </span>
                </div>
              </div>

            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
