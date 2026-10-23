import { Hono } from "hono";
import { cors } from "hono/cors";
import { registerClientesRoutes } from "./routes/clientes.js";
import { registerVentasRoutes } from "./routes/ventas.js";
import { registerComprasRoutes } from "./routes/compras.js";
import { registerAuthRoutes } from "./routes/auth.js";

// Start a Hono app
import { registerPagosRoutes } from "./routes/pagos";
import { registerActivosFijosRoutes } from "./routes/activos_fijos";
import { registerEstadoResultados } from "./routes/estado_resultados";
import { registerVariablesRoutes } from "./routes/variables_negocio";
import { isExemptOrigin, registerApiKeyMiddleware } from "./middleware/api_key";
import { registerSeguimientoRoutes } from "./routes/seguimiento";
import { registerNotificacionesRoutes } from "./routes/notificaciones";

const app = new Hono<{ Bindings: Env }>();

app.use(
	"/*",
	cors({
		origin: (origin, c) => {
			return isExemptOrigin(c.env, origin) ? origin : undefined;
		},
		allowHeaders: ["Content-Type", "X-API-Key", "Authorization"],
	}),
);

registerApiKeyMiddleware(app);

registerAuthRoutes(app);
registerClientesRoutes(app);
registerVentasRoutes(app);
registerComprasRoutes(app);
registerActivosFijosRoutes(app);
registerVariablesRoutes(app);
registerPagosRoutes(app);
registerEstadoResultados(app);
registerSeguimientoRoutes(app);
registerNotificacionesRoutes(app);

// You may also register routes for non OpenAPI directly on Hono
// app.get('/test', (c) => c.text('Hono!'))

// Export the Hono app
export default app;
