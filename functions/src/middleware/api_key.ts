import type { App } from "../types";
import { errorResponse } from "../routes/helpers";
import { ensureSchema } from "../db/schema";
import { readSession } from "../auth/session";

export function getAllowedOrigins(env: Env): string[] {
	return (env.ALLOWED_ORIGINS ?? "")
		.split(",")
		.map((origin) => origin.trim().toLowerCase())
		.filter((origin) => origin.length > 0);
}

export function isExemptOrigin(env: Env, origin: string | undefined): boolean {
	if (!origin) {
		return false;
	}

	return getAllowedOrigins(env).includes(origin.toLowerCase());
}

function timingSafeEqual(a: string, b: string): boolean {
	const aBytes = new TextEncoder().encode(a);
	const bBytes = new TextEncoder().encode(b);
	const length = Math.max(aBytes.length, bBytes.length);
	let diff = aBytes.length ^ bBytes.length;

	for (let i = 0; i < length; i++) {
		diff |= (aBytes[i] ?? 0) ^ (bBytes[i] ?? 0);
	}

	return diff === 0;
}

export function registerApiKeyMiddleware(app: App) {
	app.use("/api/*", async (c, next) => {
		// El preflight CORS lo responde el middleware `cors` registrado antes.
		if (c.req.method === "OPTIONS") {
			return next();
		}

		if (c.req.path === "/api/login") {
			return next();
		}

		const expectedKey = c.env.API_KEY;
		const providedKey = c.req.header("X-API-Key");

		if (expectedKey && providedKey && timingSafeEqual(providedKey, expectedKey)) {
			return next();
		}

		await ensureSchema(c.env.DB);
		const session = await readSession(c);
		if (session?.tipo === "jefe") return next();


		return c.json(errorResponse("Sesión requerida o acceso no permitido"), 401);
	});
}
