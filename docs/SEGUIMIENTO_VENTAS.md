# Tareas independientes en Work System

La aplicación de trabajos tiene repositorio y despliegue propios:

- Repositorio: https://github.com/DiogoFabricioAG/work-system
- Aplicación: https://task-system.diogoabregu.tech

Print System mantiene clientes, ventas, importes, métodos de pago y el listener.
Registrar una venta no crea tareas. El administrador usa **Nueva tarea** en
Work System para seleccionar una venta existente y asignar la entrega máxima
(fecha y hora de Lima). Cliente y diseño se toman de la venta seleccionada.

Los trabajadores de Impresión y Planchado solo completan su etapa. Una tarea
queda completada cuando ambos lo registran. Si Planchado registra primero,
la omisión de Impresión se muestra en Información y el trabajo sigue pendiente
de impresión. No hay campana ni centro de notificaciones.

## D1 compartida

Las aplicaciones comparten `usuarios` y D1. Work System consulta las ventas y
sus clientes para el selector, y guarda sus tareas en `work_tareas`,
`work_tarea_etapas` y `work_tarea_omisiones`. Cada tarea nueva tiene `venta_id`
y `entrega_limite`, sin modificar la venta. Se admite una tarea por venta.
Las ventas y las tablas anteriores `venta_etapas_registradas` y
`venta_etapas_omisiones` se conservan; no se importan a las tareas nuevas.

Cada aplicación requiere iniciar sesión: Print System usa `sesiones` y Work
System usa `work_sesiones`. Sus tokens son independientes. Los trabajadores
acceden a Work System; la URL antigua `/trabajador/ventas` redirige al nuevo acceso.

## Migraciones y API

Las migraciones de Work System usan `work_migrations`, separada del historial
de Print System. La migración `20261030_0002_tareas_independientes.sql` añade
las tablas de tareas sin modificar datos comerciales ni importar ventas.
La migración `20261030_0003_tareas_venta_entrega.sql` añade el vínculo con ventas
y el plazo. Las tareas manuales anteriores se conservan sin inventar un vínculo.

El administrador consulta y registra tareas mediante `GET/POST /api/trabajos`.
El registro recibe `venta_id` y `entrega_limite`; el selector usa
`GET /api/ventas/disponibles?search=...` en Work System.
Los trabajadores usan `GET /api/trabajador/tareas` y
`POST /api/trabajador/tareas/:id/completar` en el Worker de Work System.
Las rutas antiguas de seguimiento por venta ya no se usan.

Ver el README del repositorio nuevo para desarrollo, pruebas y publicación.
