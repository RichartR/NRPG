# 🏯 Infraestructura Técnica: RPG Engine para Habbo (V1.0)

Este documento detalla la arquitectura híbrida diseñada para un foro de rol, optimizada para el plan gratuito de **Supabase**, utilizando **Discord** como gestor de contenidos (CMS) y **Cloudinary** para el procesamiento de imágenes.

## 🏗️ 1. Arquitectura General (El Modelo Híbrido)
La web no es un foro tradicional, sino un **Sistema de Gestión de Personajes** que utiliza tres núcleos de datos independientes para maximizar el ahorro de recursos.

- **Frontend:** Desplegado en **Vercel** (React/Next.js/Vue).
- **Cerebro (DB):** **Supabase** (Plan Free). Almacena solo datos estructurados y numéricos.
- **Almacén de Contenido (CMS):** **Discord API**. Almacena los textos largos de noticias, eventos y parches.
- **Procesador de Imágenes:** **Cloudinary** (Fichas) + **Hotlinking con Bypass** (Imágenes externas).

---

## 📊 2. Estrategia de Base de Datos (Supabase)
Para evitar llenar los 500MB del plan gratuito, aplicamos **Indexación de Contenido**. Supabase no guarda el "cuerpo" de los posts, solo sus metadatos.

### Tabla: `noticias_index`
| Columna | Tipo | Descripción |
| :--- | :--- | :--- |
| `id` | int8 | Identificador único. |
| `titulo` | text | Título de la noticia (para búsquedas rápidas). |
| `discord_msg_id` | text | ID del mensaje en Discord (para recuperar el texto). |
| `categoria` | text | Evento, Parche, Noticia. |
| `slug` | text | URL amigable (ej: examen-chunin-2026). |

**Resultado:** 10,000 registros ocupan menos de 10MB.

---

## 💬 3. Gestión de Contenido (Discord CMS)
La web utiliza los servidores de Discord como disco duro gratuito para el texto.

- **Escritura (Web → Discord):** El panel de admin de la web envía el texto a Discord. Discord genera un `message_id` que se guarda en Supabase.
- **Lectura (Discord → Web):** Al abrir una noticia, la web pide el contenido a Discord usando el ID.
- **Edición/Borrado:** Se realiza desde la web mediante peticiones `PATCH` o `DELETE` a la API de Discord, manteniendo sincronizados ambos sitios.

---

## 🖼️ 4. Gestión de Imágenes
Para evitar el límite de 2GB de transferencia de Supabase y el bloqueo de Imgur:

1. **Fichas de Personaje:** Subida a **Cloudinary**. Se usa su API para transformar imágenes a `.webp` automáticamente.
2. **Imágenes Externas (Imgur/Discord):** Se utiliza la política de referer fantasma en el `index.html`:
   ```html
   <meta name="referrer" content="no-referrer">