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

export interface User {
  id: number
  username: string
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

export interface ClientDetail {
  id: number
  nombre: string
  numero: number
  descripcion: string
  creado_el: string
  metricas: {
    total_ventas: number
    ultima_compra: string
    dias_desde_ultima_compra: number
    debe: boolean
  }
  historial: Array<{
    id: number
    diseno: string
    pago: number
    fecha: string
  }>
}

export const authApi = {
  login: async (username: string, password: string): Promise<User> => {
    const response = await fetch(`${API_BASE}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    })
    
    const data = await response.json()
    
    if (!data.success) {
      throw new Error(data.error || "Error desconocido")
    }
    
    return data.data
  },
}

export const clientsApi = {
  getAll: () => fetchApi<Client[]>("/clientes"),
  getById: (id: number) => fetchApi<Client>(`/clientes/${id}`),
  getDetail: (id: number) => fetchApi<ClientDetail>(`/clientes/${id}/detalle`),
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

export interface Gasto {
  id: number
  notas: string
  monto: number
  creado_el: string
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

export const gastosApi = {
  getAll: () => fetchApi<Gasto[]>("/gastos"),
  getById: (id: number) => fetchApi<Gasto>(`/gastos/${id}`),
  create: (data: { notas: string; monto: number }) =>
    fetchApi<Gasto>("/gastos", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: number, data: { notas?: string; monto?: number }) =>
    fetchApi<Gasto>(`/gastos/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  delete: (id: number) =>
    fetchApi<{ success: boolean }>(`/gastos/${id}`, {
      method: "DELETE",
    }),
}
