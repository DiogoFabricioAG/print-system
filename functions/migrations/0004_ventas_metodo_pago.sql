ALTER TABLE ventas ADD COLUMN metodo_pago TEXT NOT NULL DEFAULT 'Yape' CHECK (metodo_pago IN ('Yape', 'Efectivo'));
