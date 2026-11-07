const API_BASE = import.meta.env.PUBLIC_API_BASE_URL || "https://functions.diogofabricio17.workers.dev/api"

export class ApiError extends Error {
  constructor(message: string, public status: number, public details?: unknown) {
    super(message)
    this.name = "ApiError"
  }
}

export interface SalePaymentReview {
  code: "SALE_PAYMENT_REVIEW"
  pending_amount: number
  payments: { id: number; pago: number; nota: string | null; fecha: string | null }[]
  version: string
}

export interface SalePaymentResolution {
  version: string
  existing_payment_ids: number[]
  new_payment_amount: number
}

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
    throw new ApiError(data.error || "Error desconocido", response.status, data.details)
  }

  return data.data
}

export interface User {
  id: number
  username: string
  nombre?: string
  rol: "jefe"
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
  metodo_pago?: "Yape" | "Efectivo"
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
    pendiente?: number
    venta_id?: number | null
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
    metodo_pago?: "Yape" | "Efectivo"
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
    metodo_pago?: "Yape" | "Efectivo"
    pago: number
    cantidad?: string
    metro_total?: number
    maquina?: string
    estado?: string
    nota?: string
    fecha?: string
    payment_resolution?: SalePaymentResolution
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

export interface Pago {
  id: number
  cliente_id: number
  venta_id?: number | null
  cliente_nombre: string
  pago: number
  nota: string
  fecha: string
}

export const pagosApi = {
  getAll: () => fetchApi<Pago[]>("/pagos"),
  create: (data: { cliente_id: number; venta_id?: number; pago: number; nota?: string; fecha?: string }) =>
    fetchApi<Pago>("/pagos", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: number, data: { cliente_id: number; venta_id?: number; pago: number; nota?: string; fecha?: string }) =>
    fetchApi<Pago>(`/pagos/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  delete: (id: number) =>
    fetchApi<{ success: boolean }>(`/pagos/${id}`, {
      method: "DELETE",
    }),
}

export interface MetricsSummary {
  ventas: number; costo_estimado: number; gastos: number; utilidad: number;
  cobros: number; insumos: number; flujo_caja: number; cantidad: number;
  ticket_promedio: number; margen: number | null;
}
export interface MetricsData {
  periodo: { inicio: string; fin: string; dias: number; anterior_inicio: string; anterior_fin: string };
  agrupacion: "dia" | "semana" | "mes";
  costo_porcentaje: number;
  domingos_omitidos?: number;
  resumen: MetricsSummary;
  anterior: MetricsSummary;
  serie: Array<MetricsSummary & { inicio: string; fin: string }>;
  gastos_categorias: Array<{ categoria: string; monto: number }>;
  clientes: Array<{ id: number; nombre: string; ventas: number; cantidad: number }>;
}
export const metricsApi = {
  get: (desde: string, hasta: string, agrupacion: MetricsData["agrupacion"], signal?: AbortSignal) =>
    fetchApi<MetricsData>(`/metricas?${new URLSearchParams({ desde, hasta, agrupacion })}`, { signal }),
}
