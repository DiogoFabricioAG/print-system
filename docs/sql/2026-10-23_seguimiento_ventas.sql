-- Esquema de referencia del seguimiento unificado.
-- No ejecutar sobre una D1 existente: ensureSchema del Worker migra usuarios y
-- conserva cuentas, sesiones y registros de la versión anterior.
-- La tabla usuarios existente recibe mediante esa migración:
-- nombre, rol, etapa_orden, activo, password_salt y password_alg.

CREATE TABLE IF NOT EXISTS sesiones (
  token_hash TEXT PRIMARY KEY,
  usuario_id INTEGER NOT NULL,
  expira_el TEXT NOT NULL,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS venta_etapas_registradas (
  venta_id INTEGER NOT NULL,
  -- La API actual registra solo 1 Imprimir y 2 Planchar; el CHECK conserva compatibilidad histórica.
  orden INTEGER NOT NULL CHECK (orden BETWEEN 0 AND 3),
  trabajador_id INTEGER NOT NULL,
  registrado_el TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (venta_id, orden),
  FOREIGN KEY (venta_id) REFERENCES ventas(id) ON DELETE CASCADE,
  FOREIGN KEY (trabajador_id) REFERENCES usuarios(id)
);

CREATE TABLE IF NOT EXISTS venta_etapas_omisiones (
  venta_id INTEGER NOT NULL,
  orden_omitido INTEGER NOT NULL,
  detectado_en_orden INTEGER NOT NULL,
  detectado_el TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (venta_id, orden_omitido),
  FOREIGN KEY (venta_id) REFERENCES ventas(id) ON DELETE CASCADE
);
