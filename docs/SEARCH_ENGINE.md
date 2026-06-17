# 🗂️ Indexador de Archivos por Imagen

Sistema de búsqueda de archivos por similitud visual (reverse image search) para uso local. Permite indexar archivos de diseño (CorelDRAW, PDF, etc.) y buscarlos posteriormente subiendo una imagen de referencia o una descripción de texto.

---

## 📌 Caso de Uso

Un cliente interno necesita localizar archivos de diseño (`.cdr`, `.pdf`, `.ai`, etc.) almacenados en su equipo local a partir de una imagen de referencia visual, similar a Google Imágenes pero apuntando a su propio repositorio de archivos.

---

## 🏗️ Arquitectura General

```
[Frontend — Astro (SSG/SSR)]
          ↕ fetch/HTTP
[Cloudflare Workers (API serverless)]
          ↕
[Cloudflare KV Storage]        ← embeddings CLIP + descripción LLM + metadata
          ↕
[Script local de indexación]   ← accede al sistema de archivos del cliente
```

> **Nota:** Cloudflare Workers corre en el edge (o en modo local con Wrangler). El script de indexación corre **en el equipo del cliente** y sube los datos al KV via API. El Worker nunca accede directamente al sistema de archivos — solo consulta el KV y devuelve rutas indexadas previamente.

---

## 🤖 Estrategia de Modelos — Híbrido CLIP + LLM

El sistema usa **dos modelos en combinación**, con CLIP como componente principal y un LLM multimodal como enriquecimiento opcional durante la indexación.

### Modelo primario: CLIP (gratuito, siempre activo)

**CLIP** (Contrastive Language-Image Pretraining de OpenAI) es un modelo open-source que convierte imágenes en vectores numéricos de 512 dimensiones. La búsqueda se realiza calculando la **similitud coseno** entre el vector de la imagen query y los vectores almacenados en KV.

- ✅ Completamente gratuito y open-source
- ✅ Funciona offline — corre localmente sin llamadas externas
- ✅ Velocidad de búsqueda en milisegundos
- ✅ Excelente precisión para similitud visual (formas, colores, composición)
- ✅ Escala a miles de archivos sin costo adicional
- ⚠️ No entiende conceptos semánticos en texto de consulta

**Implementaciones:**

- En el **script de indexación local** → `sentence-transformers` (Python)
- En el **Cloudflare Worker** → `@xenova/transformers` (WASM, corre en el edge sin servidor)

### Modelo secundario: LLM Multimodal (opcional, solo en indexación)

Un LLM multimodal vía **Groq API** usando el modelo **qwen/qwen3-32b** se usa **una única vez por archivo, durante la indexación**, para generar una descripción textual de la imagen preview. Esta descripción se guarda en KV como metadata y habilita la búsqueda por texto.

- ✅ Se llama solo al indexar (no en cada búsqueda — costo controlado)
- ✅ Permite buscar con lenguaje natural: _"logo circular azul con tipografía sans-serif"_
- ✅ Enriquece los resultados con contexto semántico
- ⚠️ Requiere API key externa
- ⚠️ Puede omitirse en la primera versión — el sistema funciona sin él

> **Prioridad de implementación:** Implementar CLIP completo primero. El LLM es una mejora aditiva que se puede activar después agregando la API key al Worker.

### Comparativa de modos de búsqueda

| Modo                                | Modelo usado                    | Cuándo usarlo                     | Costo                |
| ----------------------------------- | ------------------------------- | --------------------------------- | -------------------- |
| **Búsqueda por imagen** (principal) | CLIP                            | Usuario sube imagen de referencia | Gratis               |
| **Búsqueda por texto** (secundario) | Descripciones LLM pre-generadas | Usuario escribe descripción       | Gratis en búsqueda\* |

\*El costo LLM solo ocurre al indexar, no al buscar.

---

## 🧩 Componentes del Sistema

### 1. Indexador local (`scripts/indexer.py`)

Script que corre **en el equipo del cliente** (una vez o periódicamente).

**Responsabilidades:**

- Recorrer las carpetas configuradas
- Extraer imagen preview de cada archivo (CDR → PNG via Inkscape CLI, PDF → PNG via pdf2image)
- Generar embedding CLIP con `sentence-transformers` — **siempre**
- Generar descripción textual con LLM multimodal — **si hay API key configurada**
- Subir al KV de Cloudflare via REST: `{ embedding[], descripcion, ruta_absoluta, nombre, thumbnail_base64, fecha }`

### 2. Cloudflare Workers (`workers/`)

API serverless desplegada en Cloudflare (o localmente con Wrangler dev).

**Endpoints:**
| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/api/search/image` | Recibe imagen, genera embedding CLIP, busca similitud en KV |
| `POST` | `/api/search/text` | Recibe texto, busca contra descripciones LLM en KV |
| `POST` | `/api/index` | Recibe metadata + embedding + descripción, persiste en KV |
| `DELETE` | `/api/index/:id` | Elimina una entrada del KV |
| `GET` | `/api/health` | Verifica que el Worker está activo |

### 3. Frontend — Astro (`src/`)

Interfaz web construida con Astro (modo SSR con adapter Cloudflare).

**Sección 1 — Buscar:**

- Input principal: drag & drop de imagen → llama a `/api/search/image` (CLIP)
- Input secundario: campo de texto → llama a `/api/search/text` (LLM descriptions)
- Resultados: thumbnail + nombre + ruta absoluta + score + botón copiar ruta

**Sección 2 — Indexar:**

- Drag & drop del archivo a indexar (CDR, PDF, etc.)
- Campo para imagen preview (opcional si el indexador local puede extraerla)
- Confirmación de indexación exitosa

---

## 🛠️ Stack Tecnológico

| Capa                    | Tecnología                         | Justificación                                             |
| ----------------------- | ---------------------------------- | --------------------------------------------------------- |
| Frontend                | **Astro**                          | Rápido, SSG/SSR, integración nativa con Cloudflare        |
| Backend                 | **Cloudflare Workers**             | Serverless, latencia baja, sin servidor que mantener      |
| Almacenamiento          | **Cloudflare KV**                  | Clave-valor, persistente, accesible desde Workers         |
| Embeddings en Worker    | **@xenova/transformers** (WASM)    | CLIP gratuito en el edge sin dependencias externas        |
| Embeddings en indexador | **sentence-transformers** (Python) | CLIP local para el script de indexación                   |
| Descripción LLM         | **Groq — qwen/qwen3-32b**          | Gratuito, rápido (LPU), multimodal, solo usado al indexar |
| Extracción CDR          | Inkscape CLI                       | Único convertidor open-source confiable para CDR          |
| Extracción PDF          | `pdf2image` + `poppler`            | Estándar para renderizar PDFs                             |

---

## 🗄️ Estructura de Datos en Cloudflare KV

Cada archivo indexado se guarda como **una entrada KV** con esta estructura:

```json
{
  "id": "uuid-generado",
  "ruta": "C:/Diseños/logo_cliente_v2.cdr",
  "nombre": "logo_cliente_v2.cdr",
  "extension": ".cdr",
  "embedding": [0.023, -0.412, 0.887, "...512 valores"],
  "descripcion": "Logo circular con tipografía sans-serif en tonos azules y blancos sobre fondo transparente. Incluye ícono geométrico abstracto en la parte superior.",
  "thumbnail": "data:image/png;base64,...",
  "fecha_indexacion": "2026-06-16T18:00:00Z",
  "llm_usado": "qwen/qwen3-32b"
}
```

> Si el LLM no está configurado, el campo `descripcion` queda como `null` y la búsqueda por texto simplemente no retorna resultados para esa entrada.

### Índice secundario de embeddings

Para búsqueda eficiente sin iterar todas las keys:

```
KEY:   index:embeddings
VALUE: [
  { "id": "uuid-1", "embedding": [...512 dims] },
  { "id": "uuid-2", "embedding": [...512 dims] },
  ...
]
```

El Worker carga este índice en una sola lectura KV y hace la búsqueda coseno en memoria.

### Índice secundario de descripciones

```
KEY:   index:descriptions
VALUE: [
  { "id": "uuid-1", "descripcion": "logo circular azul..." },
  { "id": "uuid-2", "descripcion": "afiche con tipografía bold roja..." },
  ...
]
```

---

## 📁 Estructura del Proyecto

```
indexador/
├── README.md
├── package.json
├── astro.config.mjs              # Configurado con adapter Cloudflare
├── wrangler.toml                 # Configuración de Workers + KV binding
│
├── src/                          # Astro frontend
│   ├── pages/
│   │   └── index.astro           # Página principal (búsqueda + indexación)
│   └── components/
│       ├── SearchPanel.astro     # Panel de búsqueda (imagen + texto)
│       └── IndexPanel.astro      # Panel de indexación de archivos
│
├── workers/                      # Cloudflare Workers
│   ├── api.ts                    # Entry point del Worker
│   ├── search-image.ts           # Búsqueda por similitud CLIP
│   ├── search-text.ts            # Búsqueda por descripciones LLM
│   ├── index.ts                  # Lógica de indexación
│   └── embeddings.ts             # Wrapper CLIP con @xenova/transformers
│
└── scripts/                      # Corre localmente en el equipo del cliente
    ├── indexer.py                # Script de indexación batch
    ├── extractor.py              # Extracción de imágenes por tipo de archivo
    ├── llm_descriptor.py         # Genera descripciones via LLM (opcional)
    ├── config.py                 # Carpetas, API keys, configuración
    └── requirements.txt
```

---

## ⚙️ Configuración (`scripts/config.py`)

```python
# Carpetas que el indexador debe recorrer
WATCH_FOLDERS = [
    "C:/Diseños",
    "D:/Archivos CorelDRAW",
]

# Extensiones de archivo soportadas
SUPPORTED_EXTENSIONS = [".cdr", ".pdf", ".ai", ".eps", ".png", ".jpg"]

# Número de resultados a retornar en búsquedas
TOP_K_RESULTS = 10

# URL del Worker (local o producción)
WORKER_URL = "http://localhost:8787"  # o https://tu-worker.workers.dev

# ── LLM (OPCIONAL) ──────────────────────────────────────────────
# Dejar en None para desactivar descripciones LLM.
# Si se configura, se genera descripción de cada imagen al indexar.
LLM_PROVIDER = "groq"           # "groq" | "openai" | "google" | None
LLM_API_KEY  = None              # "gsk_..." (Groq API key) | None
LLM_MODEL    = "qwen/qwen3-32b"   # modelo gratuito en Groq (preferido)
```

---

## ⚙️ `wrangler.toml`

```toml
name = "indexador-archivos"
main = "workers/api.ts"
compatibility_date = "2026-06-01"

[[kv_namespaces]]
binding = "FILE_INDEX"
id = "TU_KV_NAMESPACE_ID"
preview_id = "TU_KV_NAMESPACE_PREVIEW_ID"

[vars]
TOP_K_RESULTS = "10"
# LLM_API_KEY se agrega como secret: npx wrangler secret put LLM_API_KEY
```

---

## ⚙️ `astro.config.mjs`

```js
import { defineConfig } from "astro/config";
import cloudflare from "@astrojs/cloudflare";

export default defineConfig({
  output: "server",
  adapter: cloudflare(),
});
```

---

## 🔄 Flujo de Datos Detallado

### Indexación (script local → KV)

```
Archivo en disco
    → extractor.py genera PNG preview (Inkscape / pdf2image)
    → sentence-transformers genera embedding CLIP (512 dims)  ← siempre
    → llm_descriptor.py llama a LLM con la imagen            ← si LLM_API_KEY configurada
         → retorna descripción textual en español
    → HTTP POST /api/index con { ruta, nombre, embedding, descripcion, thumbnail }
    → Worker guarda en KV: file:{uuid}
    → Worker actualiza index:embeddings e index:descriptions
```

### Búsqueda por imagen (principal — CLIP)

```
Usuario sube imagen en el frontend Astro
    → fetch POST /api/search/image
    → Worker genera embedding CLIP con @xenova/transformers
    → Lee index:embeddings del KV (una sola lectura)
    → Calcula similitud coseno en memoria → top-N ids
    → Lee entradas file:{id} del KV para los resultados
    → Retorna [ { ruta, nombre, score, thumbnail, descripcion } ]
```

### Búsqueda por texto (secundario — LLM descriptions)

```
Usuario escribe descripción en el frontend Astro
    → fetch POST /api/search/text con { query: "logo circular azul" }
    → Worker lee index:descriptions del KV
    → Compara texto query contra descripciones (similitud de texto simple o embeddings de texto)
    → Retorna archivos cuya descripción hace match
```

---

## ⚠️ Consideraciones sobre CorelDRAW (`.cdr`)

Los archivos `.cdr` usan un formato propietario. Estrategias de extracción (en orden de preferencia):

1. **Inkscape CLI** — funciona con la mayoría de versiones CDR modernas:
   ```bash
   inkscape archivo.cdr --export-filename=preview.png --export-type=png
   ```
2. **LibreOffice Draw** — fallback para archivos que Inkscape no puede abrir
3. **Flujo de trabajo del cliente** — pedirle que exporte también a PDF/PNG al guardar
4. **Macro VBA en CorelDRAW** — si el cliente tiene CorelDRAW instalado, script de exportación batch

---

## 🚀 Instalación y Uso

### Requisitos previos

- Node.js 18+
- Python 3.10+ (para el script de indexación local)
- Inkscape instalado y en el PATH del sistema
- Poppler instalado (para pdf2image)
- Cuenta Cloudflare con Workers y KV habilitados

### Setup del proyecto

```bash
npm install
npx wrangler kv:namespace create FILE_INDEX
# Copiar el ID generado a wrangler.toml
```

### Activar descripciones LLM (opcional)

```bash
npx wrangler secret put LLM_API_KEY
# Ingresar la API key cuando lo solicite
```

### Desarrollo local

```bash
npx wrangler dev        # Worker + KV local en puerto 8787
npm run dev             # Astro frontend
```

### Deploy

```bash
npx wrangler deploy
npm run build && npx wrangler pages deploy dist/
```

### Indexación inicial (en el equipo del cliente)

```bash
cd scripts/
pip install -r requirements.txt
python indexer.py
```

---

## 📦 `requirements.txt` (script local)

```
sentence-transformers
Pillow
pdf2image
requests
groq             # para Groq API (qwen/qwen3-32b y otros modelos gratuitos)
openai          # opcional, fallback si LLM_PROVIDER = "openai"
```

---

## 🔮 Posibles Mejoras Futuras

- **Cloudflare Vectorize** — reemplazar la búsqueda coseno manual en KV por el servicio vectorial nativo de Cloudflare, que escala sin límites y es más eficiente
- **Re-indexación automática** — watcher de carpetas con `watchdog` (Python) para indexar archivos nuevos en tiempo real
- **Cloudflare R2** — mover los thumbnails de base64 en KV a R2 (object storage) para reducir el tamaño de las entradas KV
- **Dashboard de administración** — página Astro para ver archivos indexados, eliminar entradas y forzar re-indexación
- **Empaquetado del indexador** — distribuir el script local como `.exe` con PyInstaller para instalación sin Python
- **Búsqueda combinada** — fusionar score CLIP + score de texto en un único ranking (RRF - Reciprocal Rank Fusion)
