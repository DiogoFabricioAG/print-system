-- Cada jefe conserva su propio estado de lectura de las etapas omitidas.
-- Inicial ya no es una etapa registrable: Impreso es el estado inicial automático.
DELETE FROM venta_etapas_omisiones WHERE orden_omitido = 0;
CREATE TABLE notificaciones_lecturas (
  usuario_id INTEGER NOT NULL,
  venta_id INTEGER NOT NULL,
  orden_omitido INTEGER NOT NULL,
  leido_el TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (usuario_id, venta_id, orden_omitido),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  FOREIGN KEY (venta_id, orden_omitido) REFERENCES venta_etapas_omisiones(venta_id, orden_omitido) ON DELETE CASCADE
);
