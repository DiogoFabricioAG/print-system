# Kromata · Arquitectura

Mapa técnico del ecosistema: Print System, Job System / Work System, la D1
compartida, el listener de Windows y Google Sheets. Generado con Archify a partir
de los puntos de entrada, configuraciones y contratos de los dos repositorios.

## Abrir y descargar

- [HTML interactivo](kromata-arquitectura.html).
- [PNG de 4920 × 2720 px](kromata-arquitectura.png).
- [SVG editable](kromata-arquitectura.svg).
- [Especificación Archify](kromata-arquitectura.architecture.json).
- [Evidencia de la implementación](evidence.md).

Enlace para el portfolio:
<https://print-system.diogoabregu.tech/portfolio/kromata-arquitectura.html>.

El contenido está en español. Los controles fijos del visor y su atributo HTML
`lang` utilizan inglés. Los temas claro y oscuro pertenecen al diagrama.

## Tecnologías y responsabilidades

| Parte | Tecnologías | Responsabilidad |
| --- | --- | --- |
| Print System web | Astro 6, React 19, TypeScript, Tailwind CSS 4, Vercel | Ventas, clientes, pagos, compras y métricas. |
| API comercial | Hono, Zod, TypeScript, Cloudflare Workers | Validación, permisos, persistencia comercial y sincronización con Sheets. |
| Job System web | React 19, Vite 7, TypeScript, Tailwind CSS 4, Workers Assets | Registro manual de tareas y seguimiento de producción. |
| API de trabajos | Hono, Zod, Cloudflare Workers | Permisos por rol, plazos, etapas, omisiones y entrega. |
| Datos compartidos | Cloudflare D1, SQLite | Ventas y cuentas comunes, tablas de producción y sesiones de cada aplicación. |
| Listener Windows | Python, watchdog, Tkinter, requests, SQLite local | Detección de PNG, revisión, envío a la API y reintentos locales. |
| Distribución del listener | GitHub Actions, PyInstaller, Programador de tareas, PowerShell | Compilación del .exe, releases verificadas y actualización del equipo. |
| Integración externa | Google Sheets API, cuenta de servicio | Copia operativa secundaria de los registros comerciales. |

Print System usa `sesiones`; Job System usa `work_sesiones`. Ambos consultan
`usuarios`, pero cada aplicación valida su propio token. Las APIs consultan D1
mediante el binding `DB` de cada Worker.

El jefe crea una tarea de Job System eligiendo una venta existente y su plazo.
Impresión y Planchado registran sus etapas; el jefe registra la entrega cuando
ambas están completas. El registro de una venta no crea esa tarea automáticamente.

El listener conserva `state.db` en el equipo Windows y llama a la API comercial
con `X-API-Key`. Los intentos de actualización verifican SHA-256 y el heartbeat.
La venta se persiste en D1 antes de sincronizarse con Sheets.

## Procedencia

Print System e inventario de hechos:
`73b1b1f9a6e6332de2baef50687629e0a48a3e64`.

Job System / Work System inspeccionado:
`2346982bc5262eb76c8aab66bbc0704cc1f71783`.

Hay 11 elementos y 21 referencias verificadas en el repositorio público. Las
referencias de Work System apuntan al inventario de hechos: su código privado
se inspeccionó localmente y no se copia en esta publicación.

## Verificación

- Tipo: `architecture`.
- Validación: **9/9 showcase**, cero errores y cero advertencias de composición.
- Evidencia automática del navegador: **passed** en 1440×900, 1600×1000,
  1920×1080 y 2048×1320, sin desbordamiento.
- Revisión visual: **passed** tras inspeccionar las cuatro capturas de temas
  claro/oscuro y la exportación PNG.
- Correcciones visuales tras la primera entrega: **1**, título compacto para
  mantener una sola línea en portátil.

Los registros de entrega, navegador y revisión perceptual se conservan separados:
[recibo de entrega](archify-delivery.json),
[evidencia automática](kromata-arquitectura.visual-check.json),
[revisión visual](visual-review.json) y [exportaciones](portfolio-exports.json).

SHA-256 de la especificación:
`e755356548a3111c8512858d80a85c01a20c6496c2d7d5390782add7e2be0be4`.

SHA-256 del HTML:
`5c19c2babd971a4ca3b3dee5a4c6d13f85d37e24b8f7ae88344c05beccfd3bea`.
