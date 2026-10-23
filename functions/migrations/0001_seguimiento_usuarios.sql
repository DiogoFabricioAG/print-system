-- Producción: usuarios ya existe con id, username, password y creado_el.
-- Ejecutar una vez con `wrangler d1 migrations apply gamarra_db --remote`.
-- Los hashes SHA-256 existentes se actualizan a PBKDF2 tras cada login correcto.
ALTER TABLE usuarios ADD COLUMN nombre TEXT;
ALTER TABLE usuarios ADD COLUMN rol TEXT NOT NULL DEFAULT 'jefe' CHECK (rol IN ('jefe', 'trabajador'));
ALTER TABLE usuarios ADD COLUMN etapa_orden INTEGER CHECK (etapa_orden BETWEEN 0 AND 3);
ALTER TABLE usuarios ADD COLUMN activo INTEGER NOT NULL DEFAULT 1 CHECK (activo IN (0, 1));
ALTER TABLE usuarios ADD COLUMN password_salt TEXT;
ALTER TABLE usuarios ADD COLUMN password_alg TEXT NOT NULL DEFAULT 'sha256' CHECK (password_alg IN ('sha256', 'pbkdf2'));
CREATE UNIQUE INDEX usuarios_username_nocase ON usuarios(username COLLATE NOCASE);

CREATE TABLE sesiones (
  token_hash TEXT PRIMARY KEY,
  usuario_id INTEGER NOT NULL,
  expira_el TEXT NOT NULL,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

CREATE TABLE venta_etapas_registradas (
  venta_id INTEGER NOT NULL,
  orden INTEGER NOT NULL CHECK (orden BETWEEN 0 AND 3),
  trabajador_id INTEGER NOT NULL,
  registrado_el TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (venta_id, orden),
  FOREIGN KEY (venta_id) REFERENCES ventas(id) ON DELETE CASCADE,
  FOREIGN KEY (trabajador_id) REFERENCES usuarios(id)
);

CREATE TABLE venta_etapas_omisiones (
  venta_id INTEGER NOT NULL,
  orden_omitido INTEGER NOT NULL,
  detectado_en_orden INTEGER NOT NULL,
  detectado_el TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (venta_id, orden_omitido),
  FOREIGN KEY (venta_id) REFERENCES ventas(id) ON DELETE CASCADE
);
