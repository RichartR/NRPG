# 🥷 NRPG — Plataforma Integral de Rol, Combate Realtime y Gestión de Personajes

[![Next.js](https://img.shields.io/badge/Next.js-16.2.6-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2.4-blue?style=for-the-badge&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-SSR%20%26%20Realtime-3ECF8E?style=for-the-badge&logo=supabase)](https://supabase.com/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![Vitest](https://img.shields.io/badge/Vitest-Unit%20Tests-729B1B?style=for-the-badge&logo=vitest)](https://vitest.dev/)

Plataforma web para comunidades de juego de rol (RPG) ambientada en el universo shinobi. Integra gestión avanzada de fichas de personajes con validación estricta de reglas de juego, salas de combate táctico interactivo en tiempo real con WebSockets, sincronización bidireccional con Discord y panel administrativo completo con control de acceso basado en roles (RBAC).

---

## 🏛️ Arquitectura del Sistema (Clean Architecture)

El proyecto sigue una arquitectura desacoplada por capas para garantizar escalabilidad, rendimiento y cero acoplamiento entre la interfaz de usuario y las fuentes de datos:

```
src/
├── app/                  # Next.js App Router (Páginas, Server/Client Components, Route Handlers)
├── domain/               # Capa de Dominio (Modelos puros, tipos TypeScript, lógica de cálculo RPG)
│   ├── types/            # Interfaces de entidades (Character, Glosario, Aldea, Registro, etc.)
│   └── character/        # Funciones puras de cálculo: Stats derivados, rangos, límites y multiplicadores
├── services/             # Capa de Infraestructura y Acceso a Datos (Supabase Services)
│   └── supabase/         # Clientes especializados: Character, Master, Admin, Tiendas, Auth, Profile
├── store/                # Estado Global Reactivo (Zustand) con caché en memoria (useMasterStore, useCharacterStore)
├── hooks/                # Custom Hooks para orquestación de UI y mutaciones
├── components/           # Componentes Atómicos y Moleculares (UI, Ficha, Combate, Admin, Registros)
├── lib/                  # Integración con Discord (Webhooks, OAuth, API) y utilidades de renderizado
└── utils/                # Configuración singleton de Supabase Browser/Server/Admin y helpers
```

### Principios Arquitectónicos Implementados
1. **Patrón Singleton en el Navegador**: Inicialización única de `@supabase/ssr` en cliente (`createClient()`) para optimizar la reutilización de conexiones, listeners de autenticación y canales WebSocket.
2. **Cero Acoplamiento en Componentes**: Ningún componente de interfaz realiza consultas directas a la base de datos (`supabase.from()`). Toda mutación y consulta se delega en la capa de **Services**.
3. **Reglas de Dominio Aisladas**: La matemática del juego (fórmulas de vitalidad, chakra, velocidad, caps de experiencia/PA y multiplicadores de progreso) reside en `domain/character/logic.ts` como funciones puras y deterministas.
4. **Pruebas Automatizadas con Vitest**: Suite de tests unitarios garantizando la exactitud de las fórmulas de combate y cálculo de recompensas.

---

## ⚡ Características Principales

### 📜 Ficha de Personaje Dinámica y Reactiva
- **Cálculo Automático de Atributos**: Stats derivados (VIT, CH, VEL, RES, VR, DET) calculados en tiempo real según las estadísticas primarias (FUE, AGI, RES, EST, INT) y las reglas de escalado de la aldea/rango.
- **Árbol de Ramas y Técnicas**: Compatibilidad con Kekkei Genkai, clanes elementales, marionetistas (Kugutsu con componentes equipables), especialidades y clan Uchiha (slots Sharingan y técnicas copiadas).
- **Inventario Ninja Modular**: Gestión de objetos, pergaminos y equipamiento con restricciones de portabilidad.

### ⚔️ Salas de Combate Táctico en Tiempo Real
- **Sincronización por WebSockets**: Canales Realtime de Supabase con `presence` y `broadcast` para turnos, colas de iniciativa y registros de combate sincronizados al instante entre todos los participantes.
- **Cuadrícula Táctica**: Tablero interactivo para posicionamiento táctico en batalla.
- **Soporte Multimedia y Ambientes**: Control de audio/música sincronizada para eventos y narraciones.

### 🏪 Tiendas Ninja Transaccionales
- Compras seguras ejecutadas en PostgreSQL mediante funciones **RPC transaccionales** (`realizar_compra_tienda`, `comprar_puntos_stat`) para prevenir condiciones de carrera (*race conditions*) y duplicación de recursos.

### 🤖 Ecosistema Discord y RBAC
- Autenticación OAuth con Discord con mapeo automático de roles del servidor (Administradores, Moderadores, Narradores y Jugadores).
- Notificaciones automáticas a canales de Discord mediante webhooks formateados en Markdown.

---

## 🛠️ Stack Tecnológico

| Capa | Tecnología |
| :--- | :--- |
| **Framework** | Next.js 16 (App Router, Turbopack, ISR / Static Page Generation) |
| **Librería UI** | React 19 + Lucide Icons + Recharts |
| **Estilos** | Vanilla CSS Tokens + TailwindCSS v4 |
| **Base de Datos & Auth** | Supabase (PostgreSQL, Row Level Security, Realtime, SSR) |
| **Estado Global** | Zustand v5 |
| **Testing** | Vitest |
| **Integraciones** | Discord API & Webhooks |

---

## 🚀 Puesta en Marcha Local

### Prerrequisitos
- Node.js 20+
- Gestor de paquetes `npm`

### Instalación

1. Clona el repositorio:
   ```bash
   git clone <URL_DEL_REPOSITORIO>
   cd NRPG
   ```

2. Instala las dependencias:
   ```bash
   npm install
   ```

3. Configura las variables de entorno:
   Crea un archivo `.env.local` basado en `.env.example`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=tu_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=tu_supabase_service_role_key
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   DISCORD_BOT_TOKEN=tu_discord_bot_token
   ```

4. Ejecuta el servidor de desarrollo:
   ```bash
   npm run dev
   ```

5. Ejecuta las pruebas unitarias:
   ```bash
   npm test
   ```

6. Compilación de producción:
   ```bash
   npm run build
   ```

---

## 🧪 Pruebas Unitarias

Las reglas matemáticas y de balance del juego cuentan con cobertura de pruebas unitarias ejecutadas mediante Vitest:

```bash
npm test
```

```
 Test Files  4 passed (4)
      Tests  54 passed (54)
 ✓ src/domain/character/logic.test.ts (36 tests)
   ✓ StatsLogic: Atributos derivados, validación de topes por rango y auto-ascenso condicional
   ✓ RewardLogic: Caps de EXP/PA, multiplicadores por tier, eventos, sanación y combate numérico
   ✓ NinjutsuLogic: Restricciones de clanes elementales, ranuras básicas, tech caps y afinidades secundarias/terciarias
 ✓ src/lib/utils/search.test.ts (8 tests)
   ✓ Normalización Unicode de tildes/ligaduras (æ, œ, ø, etc.), búsquedas insensibles a mayúsculas y filtros multicampo
 ✓ src/lib/utils/driveConverter.test.ts (7 tests)
   ✓ Conversión a vistas previas de Google Docs/PDF embebidos y generación de enlaces de descarga directa
 ✓ src/utils/cupos.test.ts (3 tests)
   ✓ Algoritmo de escalado de cupos máximos de clan en función del censo de la aldea
```
