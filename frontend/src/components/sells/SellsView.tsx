import * as React from "react"
import { X } from "lucide-react"
import { SellsToolbar } from "./SellsToolbar"
import { SellsTable, type SellData } from "./SellsTable"
import { SellDetailModal } from "./SellDetailModal"
import { EditSellModal } from "./EditSellModal"
import { RegisterSellModal } from "./RegisterSellModal"
import { ConfirmModal } from "@/components/ui/confirm-modal"
import { salesApi, clientsApi, pagosApi, type Sale, type Client } from "@/lib/api"
import { showToast } from "@/lib/toast"

const ITEMS_TO_LOAD = 15

interface DateRange {
  from: Date | undefined
  to: Date | undefined
}

function mapSaleToViewModel(sale: Sale): SellData {
  return {
    id: String(sale.id),
    design: sale.diseno,
    client: sale.cliente_nombre,
    clientId: sale.cliente_id,
    amount: sale.pago,
    status: sale.estado,
    date: sale.fecha || sale.creado_el.split(" ")[0],
    nota: sale.nota,
    cantidad: sale.cantidad,
    metro_total: sale.metro_total,
    maquina: sale.maquina,
  }
}

export function SellsView() {
  const [sales, setSales] = React.useState<SellData[]>([])
  const [clients, setClients] = React.useState<Client[]>([])
  const [loading, setLoading] = React.useState(true)
  const [searchTerm, setSearchTerm] = React.useState("")
  const [visibleCount, setVisibleCount] = React.useState(ITEMS_TO_LOAD)
  const [selectedSell, setSelectedSell] = React.useState<SellData | null>(null)
  const [dateRange, setDateRange] = React.useState<DateRange>({ from: undefined, to: undefined })
  const [statusFilter, setStatusFilter] = React.useState("")
  const [hasFiltered, setHasFiltered] = React.useState(false)
  
  const [isDetailModalOpen, setIsDetailModalOpen] = React.useState(false)
  const [isRegisterModalOpen, setIsRegisterModalOpen] = React.useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = React.useState(false)
  const [isConfirmModalOpen, setIsConfirmModalOpen] = React.useState(false)
  const [noteSell, setNoteSell] = React.useState<SellData | null>(null)
  const [pendingSellData, setPendingSellData] = React.useState<{
    diseno: string
    cliente_id: number
    pago: number
    cantidad?: string
    metro_total?: number
    maquina?: string
    estado?: string
    nota?: string
    fecha?: string
    adelantoAmount?: number
  } | null>(null)
  const [isEditing, setIsEditing] = React.useState(false)

  const fetchData = React.useCallback(async () => {
    try {
      setLoading(true)
      const [salesData, clientsData] = await Promise.all([
        salesApi.getAll(),
        clientsApi.getAll()
      ])
      setSales(salesData.map(mapSaleToViewModel))
      setClients(clientsData)
    } catch (error) {
      showToast.error("Error al cargar datos")
      console.error(error)
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetchData()
    
    // Check if we need to open the register modal from URL
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get('modal') === 'register') {
      setIsRegisterModalOpen(true);
      // Clean up the URL so refresh doesn't reopen it
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [fetchData])

  const filteredSells = React.useMemo(() => {
    let result = sales

    if (searchTerm) {
      result = result.filter(sell => 
        sell.design.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sell.client.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (dateRange.from || dateRange.to) {
      result = result.filter(sell => {
        const sellDate = new Date(sell.date)
        const from = dateRange.from ? new Date(dateRange.from) : null
        const to = dateRange.to ? new Date(dateRange.to) : null
        
        if (from && sellDate < from) return false
        if (to && sellDate > to) return false
        return true
      })
    }

    if (statusFilter) {
      result = result.filter(sell => sell.status === statusFilter)
    }

    return result
  }, [sales, searchTerm, dateRange, statusFilter])

  const paginatedSells = React.useMemo(() => {
    return filteredSells.slice(0, visibleCount)
  }, [filteredSells, visibleCount])

  const hasMore = filteredSells.length > visibleCount;

  React.useEffect(() => {
    setVisibleCount(ITEMS_TO_LOAD)
  }, [searchTerm, dateRange, statusFilter])

  React.useEffect(() => {
    if (hasFiltered) {
      showToast.success(`Filtro aplicado: ${filteredSells.length} resultados`)
      setHasFiltered(false)
    }
  }, [searchTerm, dateRange, statusFilter, filteredSells.length]);

  const handleViewSell = (sell: SellData) => {
    setSelectedSell(sell)
    setIsDetailModalOpen(true)
  }

  const handleEditSell = (sell: SellData) => {
    setSelectedSell(sell)
    setIsEditModalOpen(true)
  }

  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false)
    setTimeout(() => setSelectedSell(null), 300)
  }

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false)
    setTimeout(() => setSelectedSell(null), 300)
  }

  const handleDateRangeChange = (range: DateRange) => {
    setDateRange(range)
    setHasFiltered(true)
  }

  const handleStatusChange = (status: string) => {
    setStatusFilter(status)
    setHasFiltered(true)
  }

  const handleRegisterClick = (data: {
    diseno: string
    cliente_id: number
    pago: number
    cantidad?: string
    metro_total?: number
    maquina?: string
    estado?: string
    nota?: string
    fecha?: string
    adelantoAmount?: number
  }) => {
    setPendingSellData(data)
    setIsEditing(false)
    setIsConfirmModalOpen(true)
  }

  const handleEditClick = (data: {
    diseno: string
    cliente_id: number
    pago: number
    cantidad?: string
    metro_total?: number
    maquina?: string
    estado?: string
    nota?: string
    fecha?: string
  }) => {
    setPendingSellData(data)
    setIsEditing(true)
    setIsConfirmModalOpen(true)
  }

  const handleConfirmSubmit = async () => {
    if (!pendingSellData) return
    try {
      if (isEditing) {
        await salesApi.update(Number(selectedSell?.id), pendingSellData)
        setIsEditModalOpen(false)
        setSelectedSell(null)
        showToast.success("Venta actualizada correctamente")
      } else {
        await salesApi.create(pendingSellData)
        
        if (pendingSellData.estado === "Pagó" && pendingSellData.pago > 0) {
          await pagosApi.create({
            cliente_id: pendingSellData.cliente_id,
            pago: pendingSellData.pago,
            nota: `Pago completo - ${pendingSellData.diseno}`,
          });
        } else if (pendingSellData.estado === "Crédito" && pendingSellData.adelantoAmount && pendingSellData.adelantoAmount > 0) {
          await pagosApi.create({
            cliente_id: pendingSellData.cliente_id,
            pago: pendingSellData.adelantoAmount,
            nota: `Adelanto - ${pendingSellData.diseno}`,
          });
        }

        setIsRegisterModalOpen(false)
        showToast.success("Venta registrada correctamente")
      }
      setIsConfirmModalOpen(false)
      setPendingSellData(null)
      fetchData()
    } catch (error) {
      showToast.error(`Error al ${isEditing ? 'actualizar' : 'registrar'} venta`)
    }
  }

  const handleConfirmClose = () => {
    setIsConfirmModalOpen(false)
    setPendingSellData(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500">Cargando ventas...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <SellsToolbar 
        onSearch={(term) => {
          setSearchTerm(term)
          if (term) setHasFiltered(true)
        }} 
        onRegisterClick={() => setIsRegisterModalOpen(true)}
        searchTerm={searchTerm}
        dateRange={dateRange}
        onDateRangeChange={handleDateRangeChange}
        statusFilter={statusFilter}
        onStatusChange={handleStatusChange}
      />
      
      <SellsTable 
        sells={paginatedSells} 
        onViewSell={handleViewSell} 
        onEditSell={handleEditSell}
        onViewNote={(sell) => setNoteSell(sell)}
        highlightedId={noteSell?.id}
        hasMore={hasMore}
        onLoadMore={() => setVisibleCount((p) => p + ITEMS_TO_LOAD)}
      />

      <SellDetailModal 
        sell={selectedSell} 
        isOpen={isDetailModalOpen} 
        onClose={handleCloseDetailModal} 
      />

      <RegisterSellModal 
        isOpen={isRegisterModalOpen} 
        onClose={() => setIsRegisterModalOpen(false)}
        onSuccess={handleRegisterClick}
        clients={clients}
        onClientAdded={(newClient) => {
          setClients(prev => [...prev, newClient])
        }}
        onBatchComplete={() => {
          setIsRegisterModalOpen(false)
          fetchData()
        }}
      />

      <EditSellModal 
        sell={selectedSell} 
        isOpen={isEditModalOpen} 
        onClose={handleCloseEditModal}
        onSuccess={handleEditClick}
      />

      <ConfirmModal
        isOpen={isConfirmModalOpen}
        onClose={handleConfirmClose}
        onConfirm={handleConfirmSubmit}
        title={isEditing ? "¿Actualizar venta?" : "¿Registrar venta?"}
        message={isEditing ? "¿Estás seguro de que deseas actualizar esta venta?" : "¿Estás seguro de que deseas registrar esta venta?"}
        confirmText={isEditing ? "Sí, actualizar" : "Sí, registrar"}
      />

      {/* NOTE PANEL — floating, compact, no backdrop */}
      {noteSell && (
        <div className="fixed inset-0 z-40 pointer-events-none flex items-center justify-end p-6">
          <div className="pointer-events-auto w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-right-4 duration-200">
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <span className="text-lg">📝</span>
                <h2 className="text-sm font-bold text-slate-800">Nota</h2>
              </div>
              <button
                onClick={() => setNoteSell(null)}
                className="h-7 w-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-white transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Cliente</p>
                <a href={`/clientes/detalle?id=${noteSell.clientId}`} className="text-sm font-medium text-[#30b7ff] hover:underline">
                  {noteSell.client}
                </a>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Diseño</p>
                <p className="text-sm text-slate-700">{noteSell.design}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Nota</p>
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap bg-amber-50/50 rounded-lg p-3 border border-amber-100/50">
                  {noteSell.nota}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}