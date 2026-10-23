import type { Context } from "hono";

export type Session = { tipo: "jefe" | "trabajador"; actor_id: number; etapa_orden: number | null };

export async function sha256(value: string): Promise<string> {
  const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function hashWorkerPassword(password: string, salt: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: new TextEncoder().encode(salt), iterations: 150000, hash: "SHA-256" }, key, 256);
  return Array.from(new Uint8Array(bits), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function createSession(db: D1Database, actorId: number): Promise<string> {
  const token = randomToken();
  await db.prepare("INSERT INTO sesiones (token_hash, usuario_id, expira_el) VALUES (?, ?, datetime('now', '+7 days'))")
    .bind(await sha256(token), actorId).run();
  return token;
}

export async function readSession(c: Context): Promise<Session | null> {
  const token = c.req.header("Authorization")?.match(/^Bearer ([a-f0-9]{64})$/i)?.[1];
  if (!token) return null;
  const row = await (c.env as Env).DB.prepare(
    `SELECT u.rol AS tipo, u.id AS actor_id, u.etapa_orden FROM sesiones s
     JOIN usuarios u ON u.id = s.usuario_id
     WHERE s.token_hash = ? AND s.expira_el > CURRENT_TIMESTAMP AND u.activo = 1`,
  ).bind(await sha256(token)).first<Session>();
  return row ?? null;
}
