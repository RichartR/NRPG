# 🏯 Documentación Técnica: Naruto RPG Engine (Habbo)

Este documento contiene la arquitectura completa, el esquema de datos y las reglas de negocio para el desarrollo del RPG en **Next.js**, **Supabase** y **Vercel**.

---

## 🏗️ 1. Arquitectura de Software (Stack Tecnológico)

* **Frontend:** Next.js 15 (App Router) + Tailwind CSS.
* **Gestión de Estado:** Zustand (Estado global para sesión, notificaciones y calculadora).
* **Base de Datos & Auth:** Supabase (PostgreSQL).
* **Servidor de Contenidos (CMS):** Discord API (v10) - Sistema de Zero-Storage.
* **Procesamiento de Imágenes:** Cloudinary (Fichas) + Hotlinking con política `no-referrer`.
* **Documentación:** Google Drive API para embeber PDFs de normativas.

---

## 👥 2. Modelo de Identidad y Personajes

Para permitir reinicios (resets) sin perder el historial de la cuenta ni los logs de registros.

### Tabla: `profiles` (La Cuenta Global)
* `id`: UUID (PK vinculada a auth.users).
* `username`: Text (Único).
* `discord_id`: Text (ID de Discord para vinculación).
* `active_character_id`: UUID (FK a la tabla `characters`).

### Tabla: `characters` (El Personaje Ninja)
* `id`: UUID (PK).
* `user_id`: UUID (FK a profiles).
* `nombre_ninja`: Text.
* `aldea_id`: UUID (FK).
* `rango`: Enum (D, C, B, A, S).
* `xp`: Int4 (Acumulada).
* `stats_base`: JSONB (NIN, TAI, GEN, INT, FUE, AGI, EST, SM).
* `atributos_derivados`: JSONB (VIT, CH, VEL, RES, REA, DET).
* `is_active`: Boolean (Define si es el personaje actual).

---

## 📚 3. Glosario Jerárquico de Técnicas

Estructura diseñada para filtrado dinámico en la ficha del jugador.

1.  **Aldea:** (Ej: Konoha, Suna, General).
2.  **Rama:** (Ej: Ninjutsu, Taijutsu, Genjutsu, Clan Uchiha, Ninja Médico).
3.  **Subcategoría (Punto Intermedio):** (Ej: Katon, Suiton, Habilidades de Clan, Taijutsu de Fuerza).
4.  **Técnica:** Nombre, Rango, Descripción y Enlace a PDF en Drive.

---

## 📝 4. Sistema de Registros Públicos

Feeds paginados de **Combates, Misiones y Eventos**. Los registros son visibles para todos los usuarios.

### Flujo de Trabajo:
1.  **Creación:** Un usuario postea el registro mencionando a los participantes.
2.  **Notificación:** Los participantes reciben una alerta reactiva (Zustand + Realtime).
3.  **Validación:**
    * **Aceptar:** Se dispara una función RPC en Supabase que actualiza automáticamente la XP y Ryos en la ficha del participante.
    * **Rechazar:** Requiere comentario obligatorio y se notifica a los roles de Moderación/Administración.
4.  **Finalización:** Una vez resuelto, la notificación desaparece del sistema, pero el post de registro permanece en el feed histórico.

---

## 🧮 5. Calculadora de Combate (Manual y Multijugador)

Herramienta de asistencia sin automatización forzada para permitir flexibilidad en los duelos.

* **Salas de Combate:** Creación mediante código de invitación.
* **Sincronización:** Uso de Supabase Realtime (Broadcast/Presence). No guarda datos permanentes en DB.
* **Funcionalidad:**
    * Carga automática de stats desde el personaje activo.
    * Inputs manuales para: Fórmula de Daño, Gasto de Chakra y Pérdida de Vida.
    * Dado 100 integrado para chequeos de cansancio.
    * Modo individual (Local) y Modo Multijugador (Sala compartida).

---

## 🔑 6. Diccionario de Keywords (Automatización)

Al aceptar un registro, el sistema escanea el campo `recompensa` del post:

* `XP`: `(\d+) XP` -> Suma al perfil.
* `Ryos`: `(\d+) Ryos` -> Suma a la billetera.
* `Item`: `Item: [Nombre]` -> Busca en `items_catalog` y añade al inventario.
* `BONUS`: `BONUS: x[N]` -> Multiplica la recompensa antes de aplicarla.

---

## 🛡️ 7. Roles y Permisos (RBAC Dinámico)

Tabla de roles administrable desde la web:
* **Administrador:** Acceso total.
* **Moderador:** Resolución de conflictos en registros y edición de glosario.
* **Narrador:** Creación de eventos con recompensas automáticas.
* **Kage / Consejero:** Gestión de miembros de su propia aldea.

---

## 📊 8. Datos Técnicos y Normativa (Extraído de Docs)

### Escalamiento por Rango
| Rango | Stats Totales | VIT Base | CH Base | RES Base | REF/PER |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **D** | 8 - 15 | 600 | 0 | 0% | 1 / 0 |
| **C** | 16 - 20 | 900 | 50 | 0% | 1 / 1 |
| **B** | 21 - 25 | 1100 | 100 | 15% | 1 / 2 |
| **A** | 26 - 35 | 1200 | 150 | 20% | 2 / 3 |
| **S** | 35 - 45 | 1300 | 200 | 25% | 2 / 4 |

### Normas de Cansancio
* **Cansancio (CH < 20%):** Dado 100. Resultado 1-50: Pierde 10% VIT Máxima.
* **Cansancio Avanzado (CH < 10%):** Dado 100. Resultado 1-25: Inconsciente. Resultado 26-75: Pierde 10% VIT Máxima.

### Equipamiento Base
* **Shuriken:** 10/20 daño.
* **Kunai:** 15/25 daño.
* **Kibaku Fuuda:** 35 daño.
* **Venenos (D-S):** Daño progresivo de 10 a 30.

---

## 🌐 9. SEO y Seguridad

* **SEO:** Rutas públicas (`/glosario`, `/noticias`, `/guias`) renderizadas en el servidor con meta-tags para keywords (Naruto, RPG, Habbo).
* **Privacidad:** Fichas de personaje y calculadora protegidas por sesión.
* **Imágenes:**
    ```html
    <meta name="referrer" content="no-referrer">
    ```

---

## 📁 10. Estructura de Base de Datos (SQL sugerido)

```sql
-- Perfiles
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE,
  username TEXT UNIQUE,
  discord_id TEXT,
  active_char_id UUID,
  PRIMARY KEY (id)
);

-- Personajes
CREATE TABLE characters (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  nombre_ninja TEXT,
  rango TEXT,
  xp INTEGER DEFAULT 0,
  stats JSONB,
  is_active BOOLEAN DEFAULT true
);

-- Glosario
CREATE TABLE tecnicas_glosario (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  nombre TEXT,
  rama_id UUID,
  subcategoria TEXT,
  rango TEXT,
  drive_url TEXT
);