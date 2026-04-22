import * as React from "react"
import { ChevronDown, Search, X } from "lucide-react"

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
}

export function ClientAutocomplete({ clients, value, onChange, placeholder = "Buscar cliente..." }: ClientAutocompleteProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")
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
    inputRef.current?.focus()
  }

  const handleClear = () => {
    onChange(null)
    setSearch("")
    inputRef.current?.focus()
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
            onClick={(e) => {
              e.preventDefault()
              handleClear()
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        <ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-auto">
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
                    onClick={() => handleSelect(client.id)}
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
      )}
    </div>
  )
}