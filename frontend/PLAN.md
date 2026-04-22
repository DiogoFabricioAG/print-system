# Plan de Implementación: Sistema de Registro de Ventas

## Objetivo
Construir un sistema de registro de ventas para controlar operaciones de un negocio, con replicación de acciones en Google Sheets vía API.

## Tecnologías
- Astro (Framework principal)
- React (Componentes UI interactivos)
- Tailwind CSS v4 (Estilos)
- shadcn/ui (Componentes base)
- Recharts (Gráficos)
- Lucide React (Íconos)

## Fases de Desarrollo

### Fase 1: Dashboard Principal (Home.astro)
**Estado:** Completado
- [x] Configuración base: Instalar React y shadcn/ui.
- [x] Construcción de Layout Principal.
- [x] Topbar (Bienvenida y alertas).
- [x] Panel de Navegación Rápida (Ventas y Clientes).
- [x] Carrusel de "Ventas sin Cobrar".
- [x] Gráfica de Barras: Evolución de dinero ingresado en los últimos 7 días.
- [x] Gráfica de Pie: Proporción de clientes nuevos vs. recurrentes.

### Fase 2: Módulo de Clientes (Clients.astro)
**Estado:** En curso
- [ ] Tabla de clientes interactiva con Shadcn Table.
- [ ] Barra de búsqueda y botón de registro.
- [ ] Modal (Dialog) con detalles del cliente (Métricas, listado de compras).
- [ ] Menú de acciones por cliente.

### Fase 3: Módulo de Ventas (Sells.astro)
**Estado:** Pendiente
- [ ] Tabla de ventas con estados visuales (Badges).
- [ ] Filtro de fechas y estado.
- [ ] Modal (Dialog) para "Registrar Venta".
- [ ] Menú de acciones para cambiar estado y ver detalles.

### Fase 4: Sincronización con Google Sheets
**Estado:** Pendiente
- [ ] Configurar Endpoints en Astro para conectarse a Google Sheets API.
- [ ] Implementar botones de sincronización y lógica en tablas.

---
*Nota: Este plan se irá actualizando conforme avance el desarrollo de cada fase.*