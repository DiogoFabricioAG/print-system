# Kromata · Sistema de diseño

Pieza de portfolio generada con Archify a partir del frontend real de Print System.
El mapa explica cómo los fundamentos visuales se convierten en componentes,
patrones de trabajo y pantallas del negocio.

## Abrir o compartir

- [HTML interactivo](kromata-design-system.html): abrir directamente en un navegador.
- [PNG de 4840 × 2560 px](kromata-design-system.png): para el caso de estudio o una presentación.
- [SVG editable](kromata-design-system.svg): para escalarlo o integrarlo en una composición.
- [Fuente Archify](kromata-design-system.architecture.json): para mantener el mapa.
- [Capturas en claro y oscuro](kromata-design-system.visual-check.html).

Enlace publicado: <https://print-system.diogoabregu.tech/portfolio/kromata-design-system.html>.
Las copias de HTML, SVG y PNG en `frontend/public/portfolio/` son idénticas a los
artefactos de esta carpeta.

El contenido está escrito en español. Los controles fijos del visor y su atributo
HTML `lang` usan inglés, porque esta versión de Archify admite `en` y `zh-CN`.
Los temas claro y oscuro corresponden al visor del diagrama.

## Qué documenta

- **Fundamentos:** Ink `#0a1229`, Cloud `#f4f7ff`, Electric `#30b7ff`,
  Spark `#ff9f43` y Mint `#34d1bf`, declarados en `global.css`.
- **Tipografía y forma:** Manrope, Sora y un radio base de `0.625rem`.
- **Componentes:** configuración shadcn/ui `base-nova`, primitivas Base UI,
  variantes de botones, entradas, diálogos, confirmaciones e iconos Lucide.
- **Patrones:** tablas compactas, columna fija y desplazamiento horizontal en
  ventas, pagos desde su fila y gráficos con barras, líneas y cifras tabulares.
- **Aplicación:** ventas, clientes, compras y métricas como islas React en Astro.

El color operativo está implementado también mediante utilidades locales:
cielo para ventas y acciones, esmeralda para pagos y flujo, ámbar para crédito
y egresos, rosa para deuda o pérdida. El mapa documenta esa composición actual.
Cada elemento ofrece referencias a sus archivos de origen, verificadas durante
la generación. No contiene registros ni datos de clientes.

Código documentado: `76858295f27d684a487aeb81fc1669e88d7d4bd0`.
Tipo de diagrama: `architecture`, aplicado a la composición del sistema de diseño.

## Verificación

- `validation`: **9/9 showcase**, cero errores y cero advertencias de composición.
- `browser_evidence`: **passed**. Sin desbordamiento a 1440×900, 1600×1000,
  1920×1080 y 2048×1320; capturas claras y oscuras en ambos extremos.
- `visual_review`: **passed**, tras revisar las cuatro capturas y el PNG exportado.
- `correction_rounds`: **2**. Ajustes de tamaño de nodos y posición de etiquetas.
- 12 elementos y 23 referencias verificadas al repositorio.

Los resultados automáticos y la revisión visual se registran por separado:
[entrega](archify-delivery.json), [evidencia del navegador](kromata-design-system.visual-check.json),
[revisión visual](visual-review.json) y [exportaciones](portfolio-exports.json).

SHA-256 de la especificación:
`aa78b13ac064cbbec121d298b29975a90dbb2aeb511d68b1ab2c7a119489b005`.

SHA-256 del HTML:
`a71c6973d869324e9034dbbfe2e00fa814f819b0e1e0106135874df02809458c`.
