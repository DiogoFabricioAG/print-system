-- Optional cleanup for the production-only column described by the user.
-- First verify: PRAGMA table_info(clientes);
-- Also check that no index, trigger or view references estado.
ALTER TABLE clientes DROP COLUMN estado;
