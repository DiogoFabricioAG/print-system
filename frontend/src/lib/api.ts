const API_BASE = import.meta.env.PUBLIC_API_BASE_URL || "https://functions.diogofabricio17.workers.dev/api"

export async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const stored = typeof localStorage === "undefined" ? null : localStorage.getItem("printsystem_user")
  const token = stored ? (() => { try { return JSON.parse(stored).token as string | undefined } catch { return undefined } })() : undefined
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
    cache: "no-store",
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
  nombre?: string
  rol: "jefe" | "trabajador"
  etapa_orden?: number
  token: string
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
  fecha: string
}

export interface ClientDetail {
  id: number
  nombre: string
  numero: number
  descripcion: string
  creado_el: string
  metricas: {
    total_ventas: number
    total_pagos: number
    ultima_compra: string
    dias_desde_ultima_compra: number
    ultimo_pago: string
    dias_desde_ultimo_pago: number
    debe: boolean
  }
  historial: Array<{
    tipo: "venta" | "pago"
    id: number
    descripcion: string
    deuda: number
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
  logout: () => fetchApi<null>("/logout", { method: "POST" }),
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

export interface Compra {
  id: number
  tipo: "INSUMO" | "GASTO"
  categoria: string
  monto: number
  notas: string
  creado_el: string
}

export const comprasApi = {
  getAll: () => fetchApi<Compra[]>("/compras"),
  getById: (id: number) => fetchApi<Compra>(`/compras/${id}`),
  create: (data: { tipo: "INSUMO" | "GASTO"; categoria: string; monto: number; notas?: string }) =>
    fetchApi<Compra>("/compras", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: number, data: { tipo?: "INSUMO" | "GASTO"; categoria?: string; monto?: number; notas?: string }) =>
    fetchApi<Compra>(`/compras/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  delete: (id: number) =>
    fetchApi<{ success: boolean }>(`/compras/${id}`, {
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
    fecha?: string
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
    fecha?: string
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

export interface ProductionSummary {
  registradas: number[]
  omisiones: Array<{ etapa: string; detectada_al_registrar: string; fecha: string }>
  historica_terminada?: boolean
}

export interface WorkerSale {
  id: number
  cliente: string
  diseno: string
  fecha: string | null
  creado_el: string
  registrado_el: string | null
  estado: "Pendiente" | "Registrado"
  faltantes_anteriores: number
}

export const trackingApi = {
  getSummary: () => fetchApi<Record<number, ProductionSummary>>("/seguimiento/resumen"),
  getWorkerSales: () => fetchApi<{ etapa: string; etapa_orden: number; ventas: WorkerSale[] }>("/trabajador/ventas"),
  markStage: (id: number) => fetchApi<{ venta_id: number; etapa: string }>(`/trabajador/ventas/${id}/registrar`, { method: "POST" }),
  createWorkerAccount: (data: { nombre: string; username: string; password: string; etapa_orden: number }) =>
    fetchApi<{ id: number; nombre: string; username: string; etapa_orden: number }>("/trabajadores/cuentas", { method: "POST", body: JSON.stringify(data) }),
}

export interface Pago {
  id: number
  cliente_id: number
  cliente_nombre: string
  pago: number
  nota: string
  fecha: string
}

export const pagosApi = {
  getAll: () => fetchApi<Pago[]>("/pagos"),
  create: (data: { cliente_id: number; pago: number; nota?: string; fecha?: string }) =>
    fetchApi<Pago>("/pagos", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: number, data: { cliente_id: number; pago: number; nota?: string; fecha?: string }) =>
    fetchApi<Pago>(`/pagos/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  delete: (id: number) =>
    fetchApi<{ success: boolean }>(`/pagos/${id}`, {
      method: "DELETE",
    }),
}
