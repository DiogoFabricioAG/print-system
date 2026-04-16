# Print System

Aplicación web para registrar clientes y ventas, conectada a Google Sheets.

Cuando se registra una venta:

- Si el cliente existe, la venta se guarda en una hoja de Google Sheets para ese cliente.
- Si el cliente no existe, se puede crear primero y luego registrar la venta.

La idea es que el equipo pueda ver ventas en tiempo real desde el navegador, sin depender de un archivo local.

## Objetivo del proyecto

Construir una app web simple para operación comercial diaria que centralice:

- Gestión de clientes.
- Registro de ventas.
- Persistencia automática en Google Sheets.

## Alcance funcional (MVP)

### 1) Gestión de clientes

- Crear cliente nuevo.
- Evitar duplicados (por nombre o identificación definida).
- Listar clientes registrados.
- Buscar cliente por nombre.

### 2) Registro de ventas

- Registrar venta asociada a un cliente existente.
- Guardar fecha, producto/servicio, cantidad, precio unitario, total y observaciones.
- Validar campos obligatorios.

### 3) Integración con Google Sheets

- Usar una spreadsheet principal (ejemplo: `Ventas_Clientes`).
- Mantener una hoja índice (ejemplo: `Clientes`).
- Mantener una hoja por cliente para historial de ventas.
- Si la hoja del cliente no existe, crearla automáticamente al registrar la primera venta.

## Reglas de negocio

- Un cliente debe existir antes de registrar una venta.
- El nombre de pestaña en Google Sheets debe normalizarse para evitar caracteres no válidos o demasiado largos.
- Cada venta debe tener un identificador único.
- El total de la venta se calcula como:

$$
	ext{total} = \text{cantidad} \times \text{precio\_unitario}
$$

- La fecha puede completarse automáticamente con la fecha/hora actual.

## Estructura sugerida de Google Sheets

### Pestaña: Clientes

Columnas:

- client_id
- nombre
- telefono
- email
- direccion
- fecha_alta

### Pestaña por cliente (ejemplo: Cliente_Juan_Perez)

Columnas:

- venta_id
- fecha
- producto
- cantidad
- precio_unitario
- total
- observaciones

## Parte visual del aplicativo (Astro)

### Pantallas mínimas

1. Inicio (`/`)

- Resumen: total de clientes, total de ventas y últimas ventas.

2. Clientes (`/clientes`)

- Tabla de clientes.
- Buscador por nombre.
- Botón `Nuevo cliente`.

3. Nuevo cliente (`/clientes/nuevo`)

- Formulario de alta con validaciones.

4. Nueva venta (`/ventas/nueva`)

- Selector de cliente.
- Formulario de venta.
- Cálculo del total en pantalla antes de guardar.

5. Historial cliente (`/clientes/[id]`)

- Datos del cliente.
- Tabla de ventas leídas desde Google Sheets.

## Stack recomendado

- Frontend: Astro
- Backend API: Express (Node.js)
- Integración Google Sheets: Google Sheets API (`googleapis`)
- Estilos: CSS simple con componentes reutilizables en Astro

## Arquitectura propuesta

- Astro renderiza la UI y consume endpoints REST del backend.
- Express expone API para clientes y ventas.
- Un servicio `sheets.service.js` centraliza toda la lectura/escritura en Google Sheets.
- Autenticación con cuenta de servicio de Google (JSON de credenciales) y `SPREADSHEET_ID` por variable de entorno.

## API base sugerida (Express)

- `GET /api/clientes`
- `POST /api/clientes`
- `GET /api/clientes/:id`
- `GET /api/clientes/:id/ventas`
- `POST /api/ventas`

### Comportamiento clave en `POST /api/ventas`

- Validar que el cliente exista en la pestaña `Clientes`.
- Resolver nombre de pestaña por cliente (normalizado).
- Crear pestaña si no existe.
- Insertar fila de venta con `venta_id`, fecha y total calculado.

## Estructura de proyecto sugerida

```text
print-system/
  README.md
  package.json
  apps/
    web/                     # Astro
      src/
        pages/
          index.astro
          clientes/index.astro
          clientes/nuevo.astro
          clientes/[id].astro
          ventas/nueva.astro
        components/
          Layout.astro
          ClientForm.astro
          SaleForm.astro
    api/                     # Express
      src/
        server.js
        routes/
          clientes.routes.js
          ventas.routes.js
        services/
          sheets.service.js
          clients.service.js
          sales.service.js
  tests/
    api/
      clientes.test.js
      ventas.test.js
```

## Variables de entorno sugeridas

- `PORT=3001`
- `SPREADSHEET_ID=tu_id_de_google_sheet`
- `GOOGLE_SERVICE_ACCOUNT_EMAIL=...`
- `GOOGLE_PRIVATE_KEY=...`

Nota: la spreadsheet debe compartirse con el email de la cuenta de servicio para poder leer/escribir.

## Flujo principal

1. Usuario abre la app web.
2. Registra cliente nuevo o selecciona uno existente.
3. Completa datos de venta.
4. La app valida datos.
5. El backend guarda la venta en Google Sheets.
6. La UI refleja el resultado y muestra historial actualizado.

## Criterios de aceptación iniciales

- Se puede crear cliente y verlo en la pestaña `Clientes`.
- Se puede registrar venta y verla en la pestaña del cliente.
- Si la pestaña no existe, se crea automáticamente.
- La UI permite operar todo desde navegador sin abrir archivos locales.
- Los datos quedan disponibles para consulta compartida en Google Sheets.

## Riesgos y consideraciones

- Límites de cuota/rate limit de Google API.
- Manejo seguro de credenciales (nunca subir claves privadas al repositorio).
- Control de concurrencia si varios usuarios registran ventas simultáneamente.

## Próximos pasos

1. Crear el esqueleto Astro + Express.
2. Configurar autenticación con Google Service Account.
3. Implementar `sheets.service.js` con operaciones de clientes y ventas.
4. Conectar formularios de Astro con la API.
5. Agregar validaciones, mensajes de error y pruebas básicas.

## Estado

Proyecto en fase de definición funcional y diseño técnico inicial.
