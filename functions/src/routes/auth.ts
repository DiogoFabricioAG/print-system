import { z } from "zod";
import { ensureSchema } from "../db/schema";
import type { App } from "../types";
import { errorResponse } from "./helpers";
import { createSession, hashWorkerPassword, randomToken, readSession, sha256 } from "../auth/session";

const loginSchema = z.object({
	username: z.string().min(1),
	password: z.string().min(1),
});

export function registerAuthRoutes(app: App) {
	app.post("/api/login", async (c) => {
		await ensureSchema(c.env.DB);
		await c.env.DB.prepare("DELETE FROM sesiones WHERE expira_el <= CURRENT_TIMESTAMP").run();

		const rawBody = await c.req.json().catch(() => null);
		if (rawBody === null) {
			return c.json(errorResponse("JSON invalido"), 400);
		}

		const parsed = loginSchema.safeParse(rawBody);
		if (!parsed.success) {
			return c.json(errorResponse("Datos invalidos", parsed.error.flatten()), 400);
		}

		const { username, password } = parsed.data;
		const usuario = await c.env.DB.prepare(
			`SELECT id, nombre, username, password, password_salt, password_alg, rol, etapa_orden
			 FROM usuarios WHERE username = ? COLLATE NOCASE AND activo = 1`,
		).bind(username).first<{
			id: number; nombre: string | null; username: string; password: string;
			password_salt: string | null; password_alg: "sha256" | "pbkdf2";
			rol: "jefe" | "trabajador"; etapa_orden: number | null;
		}>();
		if (!usuario) {
			return c.json(errorResponse("Usuario o contraseña incorrectos"), 401);
		}
		const candidate = usuario.password_alg === "pbkdf2" && usuario.password_salt
			? await hashWorkerPassword(password, usuario.password_salt)
			: usuario.password_alg === "sha256" ? await sha256(password) : "";
		if (!candidate || candidate !== usuario.password) {
			return c.json(errorResponse("Usuario o contraseña incorrectos"), 401);
		}
		if (usuario.rol !== "jefe") {
			return c.json(errorResponse("Ingresa desde el sistema de trabajos: https://gestion-trabajos.diogofabricio17.workers.dev"), 403);
		}
		if (usuario.password_alg === "sha256") {
			const salt = randomToken();
			await c.env.DB.prepare(
				"UPDATE usuarios SET password = ?, password_salt = ?, password_alg = 'pbkdf2' WHERE id = ? AND password_alg = 'sha256'",
			).bind(await hashWorkerPassword(password, salt), salt, usuario.id).run();
		}
		const token = await createSession(c.env.DB, usuario.id);
		return c.json({ success: true, data: {
			id: usuario.id, username: usuario.username, nombre: usuario.nombre,
			rol: usuario.rol, etapa_orden: usuario.etapa_orden, token,
		} });
	});

	app.post("/api/logout", async (c) => {
		const token = c.req.header("Authorization")?.match(/^Bearer ([a-f0-9]{64})$/i)?.[1];
		if (token && await readSession(c)) {
			await c.env.DB.prepare("DELETE FROM sesiones WHERE token_hash = ?").bind(await sha256(token)).run();
		}
		return c.json({ success: true, data: null });
	});
}
