# Sistema de Diseño Visual: Naruto Mobile (web2026)

Este documento es una referencia estética pura para recrear la interfaz en **Next.js** o cualquier framework moderno.

---

## 1. Paleta de Colores (Design Tokens)

### Oro y Destacados (Acentos)

- **Oro Principal (Brillante):** `#ffe69f` (Títulos, botones, bordes activos).
- **Oro Gradiente (Top):** `#ffefd3` (Parte superior de los textos con degradado).
- **Oro Sombra:** `#a5570b` (Texto de botones de acción).
- **Oro Suave:** `#ffe6ba` (Bordes de miniaturas).

### Rojos y Alertas

- **Rojo Sangre:** `#670909` (Categorías de noticias, scrollbar).
- **Rojo Oscuro:** `#320d04` (Fondos de sección Match/Torneo).

### Fondos y Sombras

- **Negro Primario:** `#050309` (Fondo general de secciones).
- **Negro Overlay:** `rgba(0, 0, 0, 0.7)` (Fondo de menús y diálogos).
- **Gris Texto:** `#d4d4d4` (Texto de cuerpo).
- **Gris Borde:** `#d2d2d2` (Bordes de etiquetas).
- **Sombra Skill:** `#2b1002` (Sombra de los iconos de habilidades).

---

## 2. Tipografía y Escalas

### Fuentes Clave

- **Principal:** `syht` (Source Han Sans).
- **Títulos Ninja:** `fztht` (Grosor pesado, tradicional).
- **Decoración:** `en` (English Sans).

### Efectos de Texto

- **Títulos Ninja (Oro Gradiente):**
  ```css
  background: linear-gradient(to bottom, #ffefd3, #ffe69f);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  transform: scaleY(1.4); /* Efecto de estiramiento vertical */
  ```
- **Escala de Rem:** Basada en `1920px`.
  - Título Grande: `60rem` (60px).
  - Título Sección: `30rem` (30px).
  - Texto Cuerpo: `18rem` (18px).

---

## 3. Elementos Poligonales (The Ninja Look)

### La Caja de Habilidad (Octágono)

Para replicar las cajas de skills en Next.js/Tailwind:

- **Clip-Path:**
  ```css
  clip-path: polygon(
    20px 0,
    calc(100% - 20px) 0,
    100% 20px,
    100% calc(100% - 20px),
    calc(100% - 20px) 100%,
    20px 100%,
    0 calc(100% - 20px),
    0 20px
  );
  ```
- **Borde SVG (Inline):** Se usa una máscara de borde para que el trazo siga la forma octogonal.

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
