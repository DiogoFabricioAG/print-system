import * as React from "react"
import { ClientsToolbar } from "./ClientsToolbar"
import { ClientsTable } from "./ClientsTable"
import { ClientDetailModal, type ClientData } from "./ClientDetailModal"
import { RegisterClientModal } from "./RegisterClientModal"
import { EditClientModal } from "./EditClientModal"
import { clientsApi, type Client } from "@/lib/api"
import { showToast } from "@/lib/toast"

const ITEMS_PER_PAGE = 5

function mapClientToViewModel(client: Client) {
  return {
    id: String(client.id),
    name: client.nombre,
    phone: client.numero ? String(client.numero) : "",
    description: client.descripcion || "",
    totalSalesValue: 0,
    lastPurchaseDate: client.creado_el.split(" ")[0],
    daysSinceLastPurchase: 0,
    hasDebt: false,
    history: []
  }
}

export function ClientsView() {
  const [clients, setClients] = React.useState<ClientData[]>([])
  const [loading, setLoading] = React.useState(true)
  const [searchTerm, setSearchTerm] = React.useState("")
  const [currentPage, setCurrentPage] = React.useState(1)
  const [selectedClient, setSelectedClient] = React.useState<ClientData | null>(null)
  
  const [isDetailModalOpen, setIsDetailModalOpen] = React.useState(false)
  const [isRegisterModalOpen, setIsRegisterModalOpen] = React.useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = React.useState(false)

  const fetchClients = React.useCallback(async () => {
    try {
      setLoading(true)
      const data = await clientsApi.getAll()
      setClients(data.map(mapClientToViewModel))
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
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.phone.includes(searchTerm)
    )
  }, [clients, searchTerm])

  const totalPages = Math.ceil(filteredClients.length / ITEMS_PER_PAGE)
  const paginatedClients = React.useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredClients.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredClients, currentPage])

  React.useEffect(() => {
    setCurrentPage(1)
    if (searchTerm) {
      showToast.info(`Buscando: "${searchTerm}"`)
    }
  }, [searchTerm])

  const handleViewClient = (client: ClientData) => {
    setSelectedClient(client)
    setIsDetailModalOpen(true)
  }

  const handleEditClient = (client: ClientData) => {
    setSelectedClient(client)
    setIsEditModalOpen(true)
  }

  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false)
    setTimeout(() => setSelectedClient(null), 300)
  }

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false)
    setTimeout(() => setSelectedClient(null), 300)
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
    if (!selectedClient) return
    try {
      await clientsApi.update(Number(selectedClient.id), data)
      setIsEditModalOpen(false)
      setSelectedClient(null)
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
        client={selectedClient} 
        isOpen={isDetailModalOpen} 
        onClose={handleCloseDetailModal} 
      />

      <RegisterClientModal 
        isOpen={isRegisterModalOpen} 
        onClose={() => setIsRegisterModalOpen(false)}
        onSuccess={handleRegisterSuccess}
      />

      <EditClientModal 
        client={selectedClient} 
        isOpen={isEditModalOpen} 
        onClose={handleCloseEditModal}
        onSuccess={handleEditSuccess}
      />
    </div>
  )
}