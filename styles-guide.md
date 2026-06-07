# Sistema de Diseño Visual Estándar: NRPG

Este documento define la única fuente de verdad para la interfaz, eliminando discrepancias visuales.

---

## 1. Paleta de Colores (Design Tokens)

| Tipo | Variable Semántica | Valor Hex | Uso Principal |
| :--- | :--- | :--- | :--- |
| **Principal** | `--color-primary-500` | `#ffe69f` | Textos destacados, bordes interactivos y botones principales |
| **Principal (Soft)** | `--color-primary-400` | `#ffe6ba` | Estados hover y brillos |
| **Principal (Dark)** | `--color-primary-700` | `#a5570b` | Sombras interiores y gradientes |
| **Secundario** | `--color-secondary-500` | `#670909` | Acentos, botones destructivos o alternativos |
| **Secundario (Dark)**| `--color-secondary-900` | `#320d04` | Fondos de acento o gradientes oscuros |
| **Neutro 900** | `--color-neutral-900` | `#050309` | Fondo principal de la aplicación (`body`) |
| **Neutro 800** | `--color-neutral-800` | `#0a0a0a` | Fondos de tarjetas y contenedores de primer nivel |
| **Neutro 700** | `--color-neutral-700` | `#1a1a1c` | Fondos de contenedores secundarios (tablas, modales) |
| **Neutro 600** | `--color-neutral-600` | `#26262b` | Elementos de superficie elevados (dropdowns, tooltips) |
| **Éxito (Bg/Text)** | `--color-success-bg` / `text` | `#064e3b` / `#a7f3d0` | Alertas positivas, barras de vida altas |
| **Error (Bg/Text)** | `--color-error-bg` / `text`| `#7f1d1d` / `#fecaca` | Errores crudos, daño, barras de vida críticas |
| **Warning (Bg/Text)** | `--color-warning-bg` / `text`| `#92400e` / `#fde68a` | Advertencias, alertas medias |

---

## 2. Tipografía y Escalas

Basado en las fuentes `Shojumaru` (Ninja) y `Noto Sans JP` (Body).

| Jerarquía | Tamaño | Peso | Altura de Línea | Espaciado (Tracking) | Uso |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **H1** | `32px` (`2rem`) | Black (`900`) | `1.2` | `0.1em` | Títulos principales de páginas |
| **H2** | `24px` (`1.5rem`) | Black (`900`) | `1.3` | `0.1em` | Títulos de sección o tarjetas grandes |
| **H3** | `16px` (`1rem`) | Bold (`700`) | `1.4` | `0.1em` | Subtítulos y elementos destacados |
| **Body** | `14px` (`0.875rem`) | Normal (`400`) | `1.5` | `normal` | Párrafos largos y lecturas generales |
| **Caption** | `10px` (`0.625rem`) | Black (`900`) | `1.2` | `0.2em` (MAYÚSCULAS) | Etiquetas, métricas de stats, insignias |

---

## 3. Elementos Poligonales, Bordes y Sombras

Los `border-radius` están unificados usando el estilo poligonal característico del proyecto.

| Nivel | Variable (`clip-path`) / Sombra | Descripción de Uso |
| :--- | :--- | :--- |
| **Radius SM** | `--radius-sm` | Inputs, tags y botones pequeños |
| **Radius MD** | `--radius-md` | Botones principales y tarjetas estándar |
| **Radius LG** | `--radius-lg` | Modales, paneles grandes y contenedores principales |
| **Sombra Sutil** | `--shadow-sutil` | Elementos en estado default o inactivos |
| **Sombra Media** | `--shadow-media` | Elementos con estado Hover / Interacción |
| **Sombra Fuerte** | `--shadow-fuerte` | Modales y elementos con elevación z-index máxima |

---

## 4. Assets: Backgrounds e Imágenes Core

| Elemento        | URL del Asset (CDN Oficial)                          |
| :-------------- | :--------------------------------------------------- |
| **KV Hero**     | `//game.gtimg.cn/images/hyrz/web2026/kv.jpg`         |
| **Slogan PNG**  | `//game.gtimg.cn/images/hyrz/web2026/kv-slogan.png`  |
| **Content BG**  | `//game.gtimg.cn/images/hyrz/web2026/content.jpg`    |
| **Ninja BG**    | `//game.gtimg.cn/images/hyrz/web2026/ninja.jpg`      |
| **Match BG**    | `//game.gtimg.cn/images/hyrz/web2026/match.jpg`      |
| **Player BG**   | `//game.gtimg.cn/images/hyrz/web2026/player.jpg`     |
| **Icono Llama** | `//game.gtimg.cn/images/hyrz/web2026/page-title.png` |
| **Logo**        | `//game.gtimg.cn/images/hyrz/web2026/logo.png`       |

---

## 5. Efectos de Capas (Layering)

### Overlay de Video

- Fondo: `rgba(0, 0, 0, 0.5)`
- Icono central: `//game.gtimg.cn/images/hyrz/web2026/ninja-play.png` (54x54px).

### Degradado de Sección Ninja

Para que el personaje destaque sobre el fondo:

```css
background: linear-gradient(
  to right,
  rgba(0, 0, 0, 0.8) 0%,
  rgba(0, 0, 0, 0.3) 30%,
  transparent 50%
);
```

---

## 6. Micro-Interacciones (Next.js/Framer Motion)

- **Hover Button:** `scale: 1.05`, `filter: brightness(1.2)`.
- **Hover Card:** `scale: 1.1` en la imagen interna, manteniendo el contenedor fijo con `overflow: hidden`.
- **Transition Standard:** `0.3s ease-in-out`.
