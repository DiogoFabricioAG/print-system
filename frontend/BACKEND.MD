# 📄 Documentación API – Print System

**Base URL**  
https://functions.diogofabricio17.workers.dev/api

## ✅ Formato de Respuestas

**Respuesta exitosa**

```
{
  "success": true,
  "data": { ... } // o arreglo de datos
}
```

**Respuesta de error**

```
{
  "success": false,
  "error": "Mensaje de error",
  "details": { ... } // opcional
}
```

---

# 👤 Clientes (`/clientes`)

## Obtener todos los clientes

- **Ruta:** `GET /clientes`
- **Descripción:** Lista de clientes ordenados del más reciente al más antiguo.

**Respuesta (200 OK)**

```
{
  "success": true,
  "data": [
    {
      "id": 1,
      "nombre": "Juan Pérez",
      "numero": 987654321,
      "descripcion": "Cliente frecuente",
      "creado_el": "2026-04-21 16:00:00"
    }
  ]
}
```

---

## Obtener cliente por ID

- **Ruta:** `GET /clientes/:id`
- **Descripción:** Retorna un cliente específico.

**Errores**

- 400: ID inválido
- 404: Cliente no encontrado

---

## Crear cliente

- **Ruta:** `POST /clientes`

**Body**

```
{
  "nombre": "Juan Pérez",        // requerido
  "numero": 987654321,           // opcional
  "descripcion": "Cliente nuevo" // opcional
}
```

**Respuesta (201 Created)**  
Devuelve el cliente creado.

**Errores**

- 400: Datos inválidos

---

## Actualizar cliente

- **Ruta:** `PUT /clientes/:id`
- **Descripción:** Actualiza un cliente existente.

**Body:** igual que creación (enviar todos los campos)

**Errores**

- 400: Datos inválidos
- 404: Cliente no encontrado

---

## Eliminar cliente

- **Ruta:** `DELETE /clientes/:id`

**Respuesta (200 OK)**

```
{
  "success": true
}
```

**Errores**

- 400
- 404

---

# 💰 Ventas (`/ventas`)

## Obtener todas las ventas

- **Ruta:** `GET /ventas`
- **Descripción:** Lista de ventas (orden descendente) con nombre de cliente.

**Respuesta (200 OK)**

```
{
  "success": true,
  "data": [
    {
      "id": 1,
      "diseno": "Flyer A4",
      "cliente_id": 1,
      "cliente_nombre": "Juan Pérez",
      "cantidad": "1000",
      "metro_total": 15.5,
      "maquina": "Offset 4",
      "pago": 150.50,
      "estado": "En progreso",
      "nota": "Urgente",
      "creado_el": "2026-04-21 16:30:00"
    }
  ]
}
```

---

## Obtener venta por ID

- **Ruta:** `GET /ventas/:id`

**Errores**

- 400
- 404

---

## Crear venta

- **Ruta:** `POST /ventas`

**Body**

```
{
  "diseno": "Logo Empresa",      // requerido
  "cliente_id": 1,               // requerido
  "pago": 200.0,                 // requerido
  "cantidad": "100",             // opcional
  "metro_total": 20.0,           // opcional
  "maquina": "Plotter 1",        // opcional
  "estado": "Entregado",         // opcional
  "nota": "Dejar en recepción"   // opcional
}
```

**Errores**

- 400: JSON inválido o cliente no existe

---

## Actualizar venta

- **Ruta:** `PUT /ventas/:id`
- **Descripción:** Actualiza una venta.

**Body:** igual que creación (enviar todo)

**Errores**

- 400
- 404

---

## Eliminar venta

- **Ruta:** `DELETE /ventas/:id`

**Respuesta (200 OK)**

```
{
  "success": true
}
```

**Errores**

- 400
- 404

---
