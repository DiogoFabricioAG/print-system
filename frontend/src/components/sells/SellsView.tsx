import * as React from "react"
import { SellsToolbar } from "./SellsToolbar"
import { SellsTable, type SellData } from "./SellsTable"
import { SellDetailModal } from "./SellDetailModal"
import { EditSellModal } from "./EditSellModal"
import { RegisterSellModal } from "./RegisterSellModal"
import { salesApi, clientsApi, type Sale, type Client } from "@/lib/api"
import { showToast } from "@/lib/toast"

const ITEMS_PER_PAGE = 5

interface DateRange {
  from: Date | undefined
  to: Date | undefined
}

function mapSaleToViewModel(sale: Sale): SellData {
  return {
    id: String(sale.id),
    design: sale.diseno,
    client: sale.cliente_nombre,
    amount: sale.pago,
    status: sale.estado,
    date: sale.creado_el.split(" ")[0]
  }
}

export function SellsView() {
  const [sales, setSales] = React.useState<SellData[]>([])
  const [clients, setClients] = React.useState<Client[]>([])
  const [loading, setLoading] = React.useState(true)
  const [searchTerm, setSearchTerm] = React.useState("")
  const [currentPage, setCurrentPage] = React.useState(1)
  const [selectedSell, setSelectedSell] = React.useState<SellData | null>(null)
  const [dateRange, setDateRange] = React.useState<DateRange>({ from: undefined, to: undefined })
  const [statusFilter, setStatusFilter] = React.useState("")
  const [hasFiltered, setHasFiltered] = React.useState(false)
  
  const [isDetailModalOpen, setIsDetailModalOpen] = React.useState(false)
  const [isRegisterModalOpen, setIsRegisterModalOpen] = React.useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = React.useState(false)

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

  const totalPages = Math.ceil(filteredSells.length / ITEMS_PER_PAGE)
  const paginatedSells = React.useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredSells.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredSells, currentPage])

  React.useEffect(() => {
    setCurrentPage(1)
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

  const handleRegisterSuccess = async (data: {
    diseno: string
    cliente_id: number
    pago: number
    cantidad?: string
    metro_total?: number
    maquina?: string
    estado?: string
    nota?: string
  }) => {
    try {
      await salesApi.create(data)
      setIsRegisterModalOpen(false)
      showToast.success("Venta registrada correctamente")
      fetchData()
    } catch (error) {
      showToast.error("Error al registrar venta")
    }
  }

  const handleEditSuccess = async (data: {
    diseno: string
    cliente_id: number
    pago: number
    cantidad?: string
    metro_total?: number
    maquina?: string
    estado?: string
    nota?: string
  }) => {
    if (!selectedSell) return
    try {
      await salesApi.update(Number(selectedSell.id), data)
      setIsEditModalOpen(false)
      setSelectedSell(null)
      showToast.success("Venta actualizada correctamente")
      fetchData()
    } catch (error) {
      showToast.error("Error al actualizar venta")
    }
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
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />

      <SellDetailModal 
        sell={selectedSell} 
        isOpen={isDetailModalOpen} 
        onClose={handleCloseDetailModal} 
      />

      <EditSellModal 
        sell={selectedSell} 
        isOpen={isEditModalOpen} 
        onClose={handleCloseEditModal}
        onSuccess={handleEditSuccess}
      />

      <RegisterSellModal 
        isOpen={isRegisterModalOpen} 
        onClose={() => setIsRegisterModalOpen(false)}
        onSuccess={handleRegisterSuccess}
        clients={clients}
      />
    </div>
  )
}