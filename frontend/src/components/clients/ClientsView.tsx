import * as React from "react"
import { ClientsToolbar } from "./ClientsToolbar"
import { ClientsTable } from "./ClientsTable"
import { ClientDetailModal, type ClientData } from "./ClientDetailModal"
import { RegisterClientModal } from "./RegisterClientModal"
import { EditClientModal } from "./EditClientModal"
import { clientsApi, type Client } from "@/lib/api"
import { showToast } from "@/lib/toast"

const ITEMS_PER_PAGE = 5

export function ClientsView() {
  const [clients, setClients] = React.useState<Client[]>([])
  const [loading, setLoading] = React.useState(true)
  const [searchTerm, setSearchTerm] = React.useState("")
  const [currentPage, setCurrentPage] = React.useState(1)
  const [selectedClientId, setSelectedClientId] = React.useState<string | null>(null)
  
  const [isDetailModalOpen, setIsDetailModalOpen] = React.useState(false)
  const [isRegisterModalOpen, setIsRegisterModalOpen] = React.useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = React.useState(false)
  const [editingClient, setEditingClient] = React.useState<Client | null>(null)

  const fetchClients = React.useCallback(async () => {
    try {
      setLoading(true)
      const data = await clientsApi.getAll()
      setClients(data)
    } catch (error) {
      showToast.error("Error al cargar clientes")
      console.error(error)
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetchClients()
  }, [fetchClients])

  const filteredClients = React.useMemo(() => {
    if (!searchTerm) return clients
    return clients.filter(client => 
      client.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(client.numero).includes(searchTerm)
    )
  }, [clients, searchTerm])

  const clientViewModels = React.useMemo(() => {
    return filteredClients.map(client => ({
      id: String(client.id),
      name: client.nombre,
      phone: client.numero ? String(client.numero) : "",
      description: client.descripcion || "",
      metrics: {
        totalSalesValue: 0,
        lastPurchaseDate: "",
        daysSinceLastPurchase: 0,
        hasDebt: false
      },
      history: []
    }))
  }, [filteredClients])

  const totalPages = Math.ceil(clientViewModels.length / ITEMS_PER_PAGE)
  const paginatedClients = React.useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return clientViewModels.slice(start, start + ITEMS_PER_PAGE)
  }, [clientViewModels, currentPage])

  React.useEffect(() => {
    setCurrentPage(1)
    if (searchTerm) {
      showToast.info(`Buscando: "${searchTerm}"`)
    }
  }, [searchTerm])

  const handleViewClient = (client: ClientData) => {
    setSelectedClientId(client.id)
    setIsDetailModalOpen(true)
  }

  const handleEditClient = (client: ClientData) => {
    const originalClient = clients.find(c => String(c.id) === client.id)
    if (originalClient) {
      setEditingClient(originalClient)
      setIsEditModalOpen(true)
    }
  }

  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false)
    setTimeout(() => setSelectedClientId(null), 300)
  }

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false)
    setTimeout(() => setEditingClient(null), 300)
  }

  const handleRequestClientData = async (clientId: string) => {
    try {
      const detail = await clientsApi.getDetail(Number(clientId))
      return {
        id: String(detail.id),
        name: detail.nombre,
        phone: detail.numero ? String(detail.numero) : "",
        description: detail.descripcion || "",
        metrics: {
          totalSalesValue: detail.metricas.total_ventas,
          lastPurchaseDate: detail.metricas.ultima_compra,
          daysSinceLastPurchase: detail.metricas.dias_desde_ultima_compra,
          hasDebt: detail.metricas.debe
        },
        history: detail.historial.map(h => ({
          id: String(h.id),
          product: h.diseno,
          amount: h.pago,
          date: h.fecha
        }))
      }
    } catch (error) {
      showToast.error("Error al cargar datos del cliente")
      console.error(error)
      return null
    }
  }

  const handleRegisterSuccess = async (data: { nombre: string; numero?: number; descripcion?: string }) => {
    try {
      await clientsApi.create(data)
      setIsRegisterModalOpen(false)
      showToast.success("Cliente registrado correctamente")
      fetchClients()
    } catch (error) {
      showToast.error("Error al registrar cliente")
    }
  }

  const handleEditSuccess = async (data: { nombre: string; numero?: number; descripcion?: string }) => {
    if (!editingClient) return
    try {
      await clientsApi.update(Number(editingClient.id), data)
      setIsEditModalOpen(false)
      setEditingClient(null)
      showToast.success("Cliente actualizado correctamente")
      fetchClients()
    } catch (error) {
      showToast.error("Error al actualizar cliente")
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500">Cargando clientes...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <ClientsToolbar 
        onSearch={setSearchTerm} 
        onRegisterClick={() => setIsRegisterModalOpen(true)} 
      />
      
      <ClientsTable 
        clients={paginatedClients} 
        onViewClient={handleViewClient} 
        onEditClient={handleEditClient}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />

      <ClientDetailModal 
        clientId={selectedClientId} 
        isOpen={isDetailModalOpen} 
        onClose={handleCloseDetailModal}
        onRequestData={handleRequestClientData}
      />

      <RegisterClientModal 
        isOpen={isRegisterModalOpen} 
        onClose={() => setIsRegisterModalOpen(false)}
        onSuccess={handleRegisterSuccess}
      />

      <EditClientModal 
        client={editingClient ? {
          id: String(editingClient.id),
          nombre: editingClient.nombre,
          numero: editingClient.numero,
          descripcion: editingClient.descripcion
        } : null} 
        isOpen={isEditModalOpen} 
        onClose={handleCloseEditModal}
        onSuccess={handleEditSuccess}
      />
    </div>
  )
}