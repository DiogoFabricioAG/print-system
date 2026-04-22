const API_BASE = "https://functions.diogofabricio17.workers.dev/api"

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...options,
  })

  const data = await response.json()

  if (!data.success) {
    throw new Error(data.error || "Error desconocido")
  }

  return data.data
}

export interface Client {
  id: number
  nombre: string
  numero: number
  descripcion: string
  creado_el: string
}

export interface Sale {
  id: number
  diseno: string
  cliente_id: number
  cliente_nombre: string
  cantidad: string
  metro_total: number
  maquina: string
  pago: number
  estado: string
  nota: string
  creado_el: string
}

export const clientsApi = {
  getAll: () => fetchApi<Client[]>("/clientes"),
  getById: (id: number) => fetchApi<Client>(`/clientes/${id}`),
  create: (data: { nombre: string; numero?: number; descripcion?: string }) =>
    fetchApi<Client>("/clientes", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: number, data: { nombre: string; numero?: number; descripcion?: string }) =>
    fetchApi<Client>(`/clientes/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  delete: (id: number) =>
    fetchApi<{ success: boolean }>(`/clientes/${id}`, {
      method: "DELETE",
    }),
}

export const salesApi = {
  getAll: () => fetchApi<Sale[]>("/ventas"),
  getById: (id: number) => fetchApi<Sale>(`/ventas/${id}`),
  create: (data: {
    diseno: string
    cliente_id: number
    pago: number
    cantidad?: string
    metro_total?: number
    maquina?: string
    estado?: string
    nota?: string
  }) =>
    fetchApi<Sale>("/ventas", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: number, data: {
    diseno: string
    cliente_id: number
    pago: number
    cantidad?: string
    metro_total?: number
    maquina?: string
    estado?: string
    nota?: string
  }) =>
    fetchApi<Sale>(`/ventas/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  delete: (id: number) =>
    fetchApi<{ success: boolean }>(`/ventas/${id}`, {
      method: "DELETE",
    }),
}