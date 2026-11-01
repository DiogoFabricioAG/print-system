# Pagos y cambios de estado

La migración `functions/migrations/0005_pagos_por_venta.sql` añade
`pagos.venta_id` y el trigger `ventas_registrar_pago_al_cambiar_estado`.
Debe aplicarse antes de publicar el frontend. El Worker también comprueba
este esquema al iniciar.

Al cambiar una venta existente de otro estado a `Pagó`, el trigger registra
su importe menos los pagos y adelantos vinculados. Conserva la fecha comercial
de la venta. La actualización y el pago forman una sola transacción: si falla
el pago, el estado tampoco cambia. Repetir el guardado o alternar estados no
duplica el importe ya cubierto. Las ventas nuevas conservan el flujo de registro
actual de la web y del listener.

La web envía `venta_id` para pagos al crear ventas y desde el atajo de una deuda.
El backend reconoce las notas `Pago total venta #123` y `Adelanto venta #123`
del listener instalado; no necesita actualizarse el ejecutable. Los abonos
generales de un cliente siguen permitidos sin venta específica. Esos abonos no
se asignan automáticamente: un mismo cliente puede tener varias ventas.

La migración `0006_evitar_pago_duplicado_sin_vinculo.sql` impide pasar a `Pagó`
si falta importe por cubrir y el cliente tiene pagos generales sin asociar.
La API devuelve 409 con instrucciones, sin cambiar el estado ni crear un cobro.
Desde el historial del cliente, editar el pago y elegir «Venta que paga» permite
vincular el registro existente, conservando su importe. Después se puede marcar
la venta `Pagó`; si ya está cubierta no se inserta otro pago, y si hay adelanto
solo se registra el resto. El formulario de nuevo abono también permite elegir
la venta. No se asume que dos movimientos con igual importe o fecha sean el mismo.

La migración vincula pagos históricos únicamente si su nota identifica una sola
venta del mismo cliente. Para `Pago completo - diseño` también exige el mismo
importe. No crea cobros históricos, ni cambia importes, notas o fechas.
Editar o borrar un pago sigue siendo una operación manual; el trigger se ejecuta
cuando una venta pasa a `Pagó`, no al consultar ni al guardar una venta que ya
tenía ese estado.

## Auditoría de solo lectura

Desde `functions`, exportar los tres resultados con Wrangler:

```powershell
node node_modules/wrangler/bin/wrangler.js d1 execute gamarra_db --remote --command 'SELECT id, cliente_id, diseño AS diseno, pago, estado, COALESCE(fecha, date(creado_el, ''-5 hours'')) AS fecha FROM ventas; SELECT id, cliente_id, venta_id, pago, nota, fecha FROM pagos; SELECT id, nombre FROM clientes;' --json > .wrangler/payments-audit-data.json
```

Desde la raíz del repositorio:

```powershell
python scripts/audit-sale-payments.py functions/.wrangler/payments-audit-data.json functions/.wrangler/payment-reports
python -m unittest discover -s tests -p 'test_*.py' -v
```

La prueba de integración `node tests/payment-integration.cjs`, ejecutada desde
`functions`, usa D1 local en memoria, datos ficticios y una integración de Sheets
simulada. No utiliza las credenciales ni los datos de producción.

El informe distingue ventas con pago identificable, clientes sin ningún pago y
ventas que necesitan revisión. Un pago genérico, de igual importe o de igual fecha,
no prueba por sí solo qué venta cubre. Los CSV incluyen IDs y se guardan fuera de
Git porque contienen datos de clientes. Revisarlos antes de reconstruir cobros
históricos; no confundir el importe sin identificar con una deuda confirmada.
