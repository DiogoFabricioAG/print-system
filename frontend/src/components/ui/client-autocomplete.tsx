import * as React from "react"
import { ChevronDown, Search, X, Plus } from "lucide-react"
import { RegisterClientModal } from "@/components/clients/RegisterClientModal"
import { clientsApi } from "@/lib/api"
import { showToast } from "@/lib/toast"

interface Client {
  id: number
  nombre: string
  numero: number
}

interface ClientAutocompleteProps {
  clients: Client[]
  value: number | null
  onChange: (clientId: number | null) => void
  placeholder?: string
  onClientAdded?: (newClient: Client) => void
}

export function ClientAutocomplete({ clients, value, onChange, placeholder = "Buscar cliente...", onClientAdded }: ClientAutocompleteProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")
  const [isRegisterModalOpen, setIsRegisterModalOpen] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const containerRef = React.useRef<HTMLDivElement>(null)

  const selectedClient = clients.find(c => c.id === value)

  const normalizedSearch = search.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")

  const filteredClients = React.useMemo(() => {
    if (!search) return clients
    return clients.filter(client => {
      const normalizedName = client.nombre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      return normalizedName.includes(normalizedSearch)
    })
  }, [clients, search])

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      // Ignorar clics en los modales (Dialog)
      const isDialogClick = (e.target as Element).closest('[role="dialog"]') !== null
      if (isDialogClick) return

      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleSelect = (clientId: number) => {
    onChange(clientId)
    setSearch("")
    setIsOpen(false)
    // No enfocar de nuevo, porque eso lo vuelve a abrir a veces
  }

  const handleClear = () => {
    onChange(null)
    setSearch("")
    inputRef.current?.focus()
  }

  const handleCreateClient = async (data: { nombre: string; numero?: number; descripcion?: string }) => {
    try {
      const newClient = await clientsApi.create(data) as Client
      showToast.success("Cliente creado correctamente")
      
      if (onClientAdded) {
        onClientAdded(newClient)
      }
      
      // Auto-seleccionar y cerrar dropdown y modal
      onChange(newClient.id)
      setSearch("")
      setIsOpen(false)
      setIsRegisterModalOpen(false)
    } catch (error) {
      showToast.error("Error al crear cliente")
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          ref={inputRef}
          type="text"
          value={isOpen ? search : (selectedClient?.nombre || "")}
          onChange={(e) => {
            setSearch(e.target.value)
            setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && filteredClients.length > 0) {
              e.preventDefault()
              handleSelect(filteredClients[0].id)
            }
            if (e.key === "Escape") {
              setIsOpen(false)
            }
          }}
          placeholder={placeholder}
          className="w-full h-11 pl-10 pr-10 rounded-xl border border-slate-200 bg-white text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-[#30b7ff]"
        />
        {selectedClient && (
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault()
              handleClear()
            }}
            className="absolute right-8 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 z-10"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        <ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden flex flex-col max-h-64">
          <button
            type="button"
            onClick={() => setIsRegisterModalOpen(true)}
            className="w-full px-4 py-3 text-left bg-slate-50 hover:bg-slate-100 border-b border-slate-100 flex items-center gap-2 text-[#30b7ff] font-semibold transition-colors shrink-0"
          >
            <Plus className="h-4 w-4" />
            + Crear Cliente
          </button>
          
          <div className="overflow-auto flex-1">
            {filteredClients.length === 0 ? (
              <div className="px-4 py-3 text-slate-500 text-sm">
                {search ? "No se encontraron clientes" : "No hay clientes disponibles"}
              </div>
            ) : (
              <ul className="py-1">
                {filteredClients.map((client) => (
                  <li key={client.id}>
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        // onMouseDown prevents input from losing focus before click
                        e.preventDefault()
                        handleSelect(client.id)
                      }}
                      className={`w-full px-4 py-3 text-left hover:bg-slate-50 transition-colors ${
                        client.id === value ? "bg-[#30b7ff]/10 text-[#30b7ff]" : "text-slate-700"
                      }`}
                    >
                      <span className="font-medium">{client.nombre}</span>
                      {client.numero && (
                        <span className="ml-2 text-sm text-slate-400">{client.numero}</span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      <RegisterClientModal 
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        onSuccess={handleCreateClient}
      />
    </div>
  )
}