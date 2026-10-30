let schemaReady = false;

async function hasTable(db: D1Database, name: string): Promise<boolean> {
    return !!await db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?")
        .bind(name).first();
}

async function columnsOf(db: D1Database, table: string): Promise<Set<string>> {
    const { results } = await db.prepare(`PRAGMA table_info(${table})`).all<{ name: string }>();
    return new Set(results.map((column) => column.name));
}

async function ensureUserSchema(db: D1Database) {
    await db.prepare(`CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE COLLATE NOCASE,
        password TEXT NOT NULL,
        creado_el DATETIME DEFAULT CURRENT_TIMESTAMP,
        nombre TEXT,
        rol TEXT NOT NULL DEFAULT 'jefe' CHECK (rol IN ('jefe', 'trabajador')),
        etapa_orden INTEGER CHECK (etapa_orden BETWEEN 0 AND 3),
        activo INTEGER NOT NULL DEFAULT 1 CHECK (activo IN (0, 1)),
        password_salt TEXT,
        password_alg TEXT NOT NULL DEFAULT 'sha256' CHECK (password_alg IN ('sha256', 'pbkdf2'))
    );`).run();
    const columns = await columnsOf(db, "usuarios");
    const additions = [
        ["nombre", "TEXT"],
        ["rol", "TEXT NOT NULL DEFAULT 'jefe' CHECK (rol IN ('jefe', 'trabajador'))"],
        ["etapa_orden", "INTEGER CHECK (etapa_orden BETWEEN 0 AND 3)"],
        ["activo", "INTEGER NOT NULL DEFAULT 1 CHECK (activo IN (0, 1))"],
        ["password_salt", "TEXT"],
        ["password_alg", "TEXT NOT NULL DEFAULT 'sha256' CHECK (password_alg IN ('sha256', 'pbkdf2'))"],
    ] as const;
    for (const [name, definition] of additions) {
        if (!columns.has(name)) await db.exec(`ALTER TABLE usuarios ADD COLUMN ${name} ${definition};`);
    }
    // Old administrator usernames were unique only with case-sensitive comparison.
    await db.exec("CREATE UNIQUE INDEX IF NOT EXISTS usuarios_username_nocase ON usuarios(username COLLATE NOCASE);");
}

async function ensureTrackingSchema(db: D1Database) {
    const legacyWorkers = await hasTable(db, "trabajador_cuentas");
    if (legacyWorkers) {
        const collision = await db.prepare(`SELECT w.username FROM trabajador_cuentas w
            JOIN usuarios u ON u.username = w.username COLLATE NOCASE LIMIT 1`).first();
        if (collision) throw new Error("No se pueden migrar trabajadores: hay nombres de usuario repetidos entre cuentas antiguas");

        const statements = [
            db.prepare(`INSERT INTO usuarios (nombre, username, password, password_salt, password_alg, rol, etapa_orden, activo)
                SELECT nombre, username, password_hash, password_salt, 'pbkdf2', 'trabajador', etapa_orden, activo
                FROM trabajador_cuentas`),
        ];
        if (await hasTable(db, "venta_etapas_registradas")) {
            statements.push(
                db.prepare(`CREATE TABLE venta_etapas_registradas_unificada (
                    venta_id INTEGER NOT NULL, orden INTEGER NOT NULL CHECK (orden BETWEEN 0 AND 3),
                    trabajador_id INTEGER NOT NULL, registrado_el TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (venta_id, orden),
                    FOREIGN KEY (venta_id) REFERENCES ventas(id) ON DELETE CASCADE,
                    FOREIGN KEY (trabajador_id) REFERENCES usuarios(id))`),
                db.prepare(`INSERT INTO venta_etapas_registradas_unificada
                    SELECT r.venta_id, r.orden, u.id, r.registrado_el
                    FROM venta_etapas_registradas r
                    JOIN trabajador_cuentas w ON w.id = r.trabajador_id
                    JOIN usuarios u ON u.username = w.username COLLATE NOCASE`),
                db.prepare("DROP TABLE venta_etapas_registradas"),
                db.prepare("ALTER TABLE venta_etapas_registradas_unificada RENAME TO venta_etapas_registradas"),
            );
        }
        await db.batch(statements);
    }

    if (await hasTable(db, "sesiones") && (await columnsOf(db, "sesiones")).has("actor_id")) {
        await db.batch([
            db.prepare(`CREATE TABLE sesiones_unificadas (
                token_hash TEXT PRIMARY KEY, usuario_id INTEGER NOT NULL, expira_el TEXT NOT NULL,
                FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE)`),
            db.prepare(`INSERT INTO sesiones_unificadas (token_hash, usuario_id, expira_el)
                SELECT s.token_hash, CASE WHEN s.tipo = 'jefe' THEN s.actor_id ELSE u.id END, s.expira_el
                FROM sesiones s
                LEFT JOIN trabajador_cuentas w ON s.tipo = 'trabajador' AND w.id = s.actor_id
                LEFT JOIN usuarios u ON u.username = w.username COLLATE NOCASE
                WHERE (s.tipo = 'jefe' AND EXISTS (SELECT 1 FROM usuarios a WHERE a.id = s.actor_id))
                   OR (s.tipo = 'trabajador' AND u.id IS NOT NULL)`),
            db.prepare("DROP TABLE sesiones"),
            db.prepare("ALTER TABLE sesiones_unificadas RENAME TO sesiones"),
        ]);
    }

    await db.prepare(`CREATE TABLE IF NOT EXISTS sesiones (
        token_hash TEXT PRIMARY KEY, usuario_id INTEGER NOT NULL, expira_el TEXT NOT NULL,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE);`).run();
    await db.prepare(`CREATE TABLE IF NOT EXISTS venta_etapas_registradas (
        venta_id INTEGER NOT NULL, orden INTEGER NOT NULL CHECK (orden BETWEEN 0 AND 3),
        trabajador_id INTEGER NOT NULL, registrado_el TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (venta_id, orden),
        FOREIGN KEY (venta_id) REFERENCES ventas(id) ON DELETE CASCADE,
        FOREIGN KEY (trabajador_id) REFERENCES usuarios(id));`).run();
    await db.prepare(`CREATE TABLE IF NOT EXISTS venta_etapas_omisiones (
        venta_id INTEGER NOT NULL, orden_omitido INTEGER NOT NULL,
        detectado_en_orden INTEGER NOT NULL, detectado_el TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (venta_id, orden_omitido),
        FOREIGN KEY (venta_id) REFERENCES ventas(id) ON DELETE CASCADE);`).run();
    if (legacyWorkers) await db.exec("DROP TABLE trabajador_cuentas;");
}

export async function ensureSchema(db: D1Database) {
    if (schemaReady) {
        return;
    }

    await db.exec(`PRAGMA foreign_keys = ON;`);
    await db.exec(`CREATE TABLE IF NOT EXISTS clientes ( id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT NOT NULL UNIQUE, numero BIGINT UNIQUE, descripcion TEXT, creado_el DATETIME DEFAULT CURRENT_TIMESTAMP );`);
    await db.exec(`CREATE TABLE IF NOT EXISTS ventas ( id INTEGER PRIMARY KEY AUTOINCREMENT, "diseño" TEXT NOT NULL, cliente_id INTEGER NOT NULL, cantidad TEXT, metro_total DOUBLE, maquina TEXT, pago DOUBLE NOT NULL, estado TEXT, nota TEXT, creado_el DATETIME DEFAULT CURRENT_TIMESTAMP, fecha TEXT, produccion_historica_terminada INTEGER NOT NULL DEFAULT 0 CHECK (produccion_historica_terminada IN (0, 1)), FOREIGN KEY (cliente_id) REFERENCES clientes(id) );`);
    await ensureUserSchema(db);
    await db.exec(`CREATE TABLE IF NOT EXISTS pagos ( id INTEGER PRIMARY KEY AUTOINCREMENT, cliente_id INTEGER NOT NULL, pago DOUBLE NOT NULL, nota TEXT, fecha TEXT DEFAULT (date('now', '-5 hours')), FOREIGN KEY (cliente_id) REFERENCES clientes(id) );`);
    await db.exec(`CREATE TABLE IF NOT EXISTS compras ( id INTEGER PRIMARY KEY AUTOINCREMENT, tipo TEXT NOT NULL, categoria TEXT NOT NULL, monto DOUBLE NOT NULL, notas TEXT, creado_el DATETIME DEFAULT CURRENT_TIMESTAMP );`);
    await db.exec(`CREATE TABLE IF NOT EXISTS activos_fijos ( id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT NOT NULL, valor_compra DOUBLE NOT NULL, tasa_depreciacion_anual DOUBLE NOT NULL, fecha_compra TEXT NOT NULL );`);
    await db.exec(`CREATE TABLE IF NOT EXISTS variables_negocio ( id INTEGER PRIMARY KEY AUTOINCREMENT, clave TEXT NOT NULL UNIQUE, valor TEXT NOT NULL );`);
    await ensureTrackingSchema(db);

    // Insert default variables if they don't exist
    await db.exec(`INSERT OR IGNORE INTO variables_negocio (clave, valor) VALUES ('costo_venta_porcentaje', '50');`);

    // Add costo_por_metro to ventas if it doesn't exist
    const ventaColumns = await columnsOf(db, "ventas");
    if (!ventaColumns.has("metodo_pago")) {
        await db.exec(`ALTER TABLE ventas ADD COLUMN metodo_pago TEXT NOT NULL DEFAULT 'Yape' CHECK (metodo_pago IN ('Yape', 'Efectivo'));`);
    }

    // Add costo_por_metro to ventas if it doesn't exist
    try { await db.exec(`ALTER TABLE ventas ADD COLUMN costo_por_metro DOUBLE;`); } catch (_) {}

    // Add fecha to ventas if it doesn't exist (bases creadas antes de la columna)
    try { await db.exec(`ALTER TABLE ventas ADD COLUMN fecha TEXT;`); } catch (_) {}

    // Las ventas nuevas inician en Impreso; la migración marca las ventas históricas.
    try { await db.exec(`ALTER TABLE ventas ADD COLUMN produccion_historica_terminada INTEGER NOT NULL DEFAULT 0 CHECK (produccion_historica_terminada IN (0, 1));`); } catch (_) {}

    // Preserve explicitly selected dates. Fill missing dates, and correct the
    // UTC date selected by older clients between 00:00 and 04:59 UTC.
    await db.prepare(`CREATE TRIGGER IF NOT EXISTS ventas_fecha_lima_after_insert
        AFTER INSERT ON ventas
        WHEN NEW.creado_el IS NOT NULL AND (
            NEW.fecha IS NULL OR (
                time(NEW.creado_el) >= '00:00:00' AND
                time(NEW.creado_el) < '05:00:00' AND
                NEW.fecha = date(NEW.creado_el)
            )
        )
        BEGIN
            UPDATE ventas
            SET fecha = date(NEW.creado_el, '-5 hours')
            WHERE id = NEW.id;
        END;`).run();

    schemaReady = true;
}
