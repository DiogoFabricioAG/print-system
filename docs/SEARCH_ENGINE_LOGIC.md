# 🔍 Buscador de Archivos — Lógica Interna

## Flujo de Indexación

```
archivo .cdr → nombre + ruta manual + Ctrl+V screenshot → NVIDIA Vision → descripción → KV
```

### Endpoint: `POST /index-file`

1. Recibe `{ ruta, nombre, extension, thumbnail }`
2. Si hay `thumbnail` (imagen del portapapeles), llama a `describeImage()`
3. Guarda en KV `file:{uuid}` y actualiza `index:all`

---

## Flujo de Búsqueda

```
imagen query → NVIDIA Vision → descripción → comparación trigramas → top 5 por score
```

### Endpoint: `POST /search-file`

1. Recibe la imagen como `multipart/form-data`
2. Convierte a base64 y llama a `describeImage()`
3. Carga todos los archivos indexados desde KV (`index:all`)
4. Compara la descripción query contra cada descripción indexada
5. Retorna top 5 ordenados por score

---

## Descripción de Imagen (`describeImage`)

### Modelo
**NVIDIA** `meta/llama-3.2-90b-vision-instruct`

### Prompt
```
Describe SOLO el diseño/logo/gráfico principal visible en esta imagen.
IGNORA completamente: personas, manos, teléfonos, fondos, paredes,
escritorios, reflejos, perspectiva, ángulo de la foto.
Enfócate EXCLUSIVAMENTE en el diseño gráfico: colores dominantes,
formas, tipografía, estilo, elementos visuales.
Si es una foto de un logo impreso o en pantalla, describe el logo, no la foto.
Responde en español, máximo 2 frases. Solo la descripción.
```

### Respuesta típica
> *"Logo circular con fondo azul degradado, tipografía sans-serif blanca y formas geométricas concéntricas"*

---

## Comparación de Similitud (`similarityScore`)

### Sin llamadas a la API — matemática pura en milisegundos

### Paso 1: Trigramas
Cada descripción se limpia y se divide en secuencias de 3 caracteres:

```
"Logo circular azul" → log, ogo, cir, irc, rcu, cul, ula, lar, azu, zul
```

### Paso 2: Coeficiente de Dice × 1.6

```
score = 2 × trigramas_en_común / (total_A + total_B) × 1.6
```

Ejemplo con 7 trigramas en común, desc A=18, desc B=22:
```
score = 2 × 7 / (18 + 22) × 1.6
      = 14 / 40 × 1.6
      = 0.56 → 56%
```

El factor ×1.6 suaviza los resultados para que imágenes muy parecidas ronden 90-100%.

---

## Resumen de Llamadas a la API

| Operación | Llamadas | Modelo |
|-----------|----------|--------|
| Indexar archivo | 1 (describe thumbnail) | NVIDIA Vision |
| Buscar archivo | 1 (describe query) | NVIDIA Vision |
| Comparar | 0 (matemática local) | — |

Solo **1 llamada a la API** por operación. La comparación es trigramas en memoria.
