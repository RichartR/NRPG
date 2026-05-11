# 📜 Especificaciones Técnicas: RPG Engine (Habbo Web)

Este documento centraliza la arquitectura híbrida, el sistema de contenidos mediante Discord y la lógica de automatización de recompensas e inventario.

---

## 🏗️ 1. Arquitectura del Sistema
Para garantizar el rendimiento y el coste cero ($0), el sistema se divide en:

*   **Supabase (DB):** Almacena el "Índice" de contenidos, estadísticas numéricas, inventarios y logs.
*   **Discord (CMS):** Almacena el cuerpo (texto largo) de noticias y eventos.
*   **Vercel (Backend/API):** Gestiona la lógica de "parsing", el bot de Discord y la seguridad.
*   **Cloudinary/No-Referrer:** Gestión inteligente de imágenes para evitar baneos de hotlinking.

---

## 📋 2. Plantillas de Publicación (Discord CMS)

El Staff publicará desde la Web, y el sistema enviará estos formatos a Discord. La Web luego leerá estos mensajes buscando las **Keywords**.

### A. Parches de Actualización
> **PARCHE:** [Versión]
> **FECHA:** [Día/Mes/Año]
> **CATEGORIA:** [Sistema / Jutsus / Mapa]
> * [Cambio 1]
> * [Cambio 2]

### B. Eventos (Automatizados)
> **EVENTO:** [Nombre del Evento]
> **FECHA:** [Día y Hora]
> **RECOMPENSA:** [Monto] XP, [Monto] Ryos, Item: [Nombre Exacto]
> **IMAGEN:** [URL]
> **DESCRIPCION:** [Texto largo]

### C. Noticias
> **NOTICIA:** [Titular]
> **AUTOR:** [Nombre]
> **CUERPO:** [Contenido]

---

## 🔑 3. Diccionario de Keywords (Recompensas)

El motor de la Web buscará estas palabras clave dentro de la línea `RECOMPENSA:` para automatizar el reparto.

| Categoría | Keywords Aceptadas | Acción del Sistema |
| :--- | :--- | :--- |
| **Experiencia** | `XP`, `EXP`, `Experiencia` | Suma el valor al perfil del usuario. |
| **Dinero** | `Ryos`, `Ryo`, `RY` | Suma el valor a la billetera del usuario. |
| **Objetos** | `Item:`, `Objeto:` | Busca el nombre en `items_catalog` y lo añade al inventario. |
| **Multiplicador**| `BONUS: x[N]` | Multiplica XP y Ryos por N antes de repartir. |

---

## 🎒 4. Estructura de Base de Datos (Supabase)

Para que los "Items" de las keywords funcionen, necesitamos estas dos tablas:

### Tabla: `items_catalog` (El Diccionario de Objetos)
Guarda la definición de qué es cada cosa.
*   `id`: UUID (Primary Key)
*   `nombre`: Text (Ej: "Capa de Akatsuki") -> *Debe coincidir con la Keyword.*
*   `descripcion`: Text
*   `imagen_url`: Text (Cloudinary)
*   `categoria`: Text (Arma, Ropa, Consumible)

### Tabla: `user_inventory` (Las Posesiones)
Relaciona a los usuarios con sus objetos.
*   `id`: UUID (Primary Key)
*   `user_id`: UUID (Foreign Key -> profiles)
*   `item_id`: UUID (Foreign Key -> items_catalog)
*   `cantidad`: Int4 (Por defecto 1)
*   `obtenido_en`: Timestamp (Ej: "Evento: Examen Chunin")

---

## 🤖 5. Lógica de Automatización (Pseudocódigo)

Cuando el Admin pulsa "Repartir Recompensas" en la Web:

1.  **Fetch:** Se recupera el texto del mensaje de Discord.
2.  **Parse:** 
    *   `xp_ganada = texto.match(/(\d+)\s*XP/)`
    *   `ryos_ganados = texto.match(/(\d+)\s*Ryos/)`
    *   `item_nombre = texto.match(/Item:\s*(.*)/)`
3.  **Update:**
    *   `UPDATE profiles SET xp = xp + xp_ganada, ryos = ryos + ryos_ganados WHERE id IN (lista_asistentes)`
4.  **Insert (Items):**
    *   Para cada asistente, se inserta una fila en `user_inventory` con el `item_id` del objeto detectado.
5.  **Log:** Se registra la acción para evitar duplicados.

---

## 🛡️ 6. Seguridad (Headers)
Para asegurar la visualización de imágenes de terceros (Imgur/Discord) sin bloqueos:
```html
<meta name="referrer" content="no-referrer">