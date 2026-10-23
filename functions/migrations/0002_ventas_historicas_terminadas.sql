-- Marca las ventas que ya existen como terminadas. Las nuevas conservan el DEFAULT 0 (Impreso).
ALTER TABLE ventas ADD COLUMN produccion_historica_terminada INTEGER NOT NULL DEFAULT 0 CHECK (produccion_historica_terminada IN (0, 1));
UPDATE ventas SET produccion_historica_terminada = 1;
