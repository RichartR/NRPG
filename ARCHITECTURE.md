# Arquitectura del Proyecto NRPG

Este documento define la arquitectura y los estándares de desarrollo para el proyecto NRPG. Está basado en los principios de **Clean Architecture** adaptados a **Next.js**, garantizando que la aplicación sea escalable, mantenible y segura.

## Principios Fundamentales

1. **Separación de Responsabilidades**: La interfaz de usuario (UI), la lógica de negocio y el acceso a datos están estrictamente separados.
2. **Fuente Única de Verdad**: Los tipos, modelos y reglas de juego residen en un solo lugar.
3. **Cero Acoplamiento en la UI**: Los componentes de React **NO** deben hacer llamadas directas a la base de datos (Supabase).
4. **Estado Global Optimizado**: Las llamadas repetitivas se evitan mediante cachés y gestores de estado global.

---

## Estructura de Directorios (`src/`)

La arquitectura se divide en capas bien definidas. Si vas a añadir una nueva funcionalidad, debes colocar el código según estas capas:

### 1. `domain/` (Reglas de Negocio y Tipos)
Es el núcleo de la aplicación. Aquí vive la lógica del juego y las definiciones de datos. **No sabe nada de React ni de Supabase**.
* `types/index.ts`: Todas las interfaces TypeScript (modelos de BD). Si cambias una tabla en la BD, actualizas este archivo.
* `character/logic.ts`: Funciones puras de cálculo (ej. calcular stats derivados). Entran datos, salen datos.

### 2. `services/` (Acceso a Datos / Infraestructura)
La única capa que se comunica directamente con la base de datos o APIs externas.
* `supabase/`: Contiene los servicios que encapsulan las llamadas a Supabase.
  * `admin.service.ts`: Todo lo relacionado con la gestión administrativa (crear aldeas, ramas, docs).
  * `character.service.ts`: Consultas y mutaciones referentes a las fichas de personajes.
  * `master.service.ts`: Lectura de datos maestros (tablas de catálogo y configuración).
> **Regla de Oro**: Ningún componente o hook debe hacer un `supabase.from()`. Siempre deben llamar a un método de un Service.

### 3. `store/` (Estado Global)
Gestión del estado de la aplicación utilizando **Zustand**. Evita peticiones repetidas al servidor (caché).
* `useMasterStore.ts`: Guarda en memoria las aldeas, ramas, técnicas y configuraciones (`configuracion_sistema`). Se carga una vez y se reutiliza en toda la app.
* `useCharacterStore.ts`: Mantiene el estado del personaje activo del usuario.

### 4. `hooks/` (Lógica de Interfaz)
Puente entre la interfaz gráfica y los servicios o el estado global.
* `useCharacter.ts`: Hook complejo que maneja la lógica de edición de una ficha, interactuando con el Service y gestionando estados de carga/errores.

### 5. `components/` (Interfaz de Usuario)
Componentes puramente visuales o ensambladores. Deben ser "tontos" en cuanto a de dónde vienen los datos.
* `ui/`: Componentes base reutilizables (`Fields.tsx`, `SectionCard.tsx`, `Toast.tsx`).
* `admin/`: Formularios y listas del panel de control.
* `character/`: Componentes específicos de la vista de fichas.

### 6. `app/` (Enrutamiento de Next.js)
Define las páginas y la estructura de URLs. Aquí decides si un componente es un `Server Component` (para carga rápida SEO) o un `Client Component` (si requiere interactividad).

---

## Flujo de Trabajo para Nuevo Desarrollo

Si necesitas crear, por ejemplo, un **Sistema de Misiones**, sigue este orden:

1. **Definir el Modelo**: Añade la interfaz `Mision` en `src/domain/types/index.ts`.
2. **Crear el Servicio**: Añade las funciones CRUD (`crearMision`, `getMisiones`) en un nuevo archivo `src/services/supabase/mission.service.ts`.
3. **(Opcional) Estado Global**: Si la lista de misiones se usará en muchas partes, añádela a un Store o extiéndelo.
4. **Crear Componentes UI**: Crea la vista `MisionList.tsx` y el formulario `MisionEditForm.tsx` en `src/components/`, utilizando los estilos estandarizados de `ui/Fields.tsx`.
5. **Ensamblar en la Ruta**: Crea el archivo `src/app/admin/misiones/page.tsx` e importa tus componentes.

---

## Estándares de Código y UX

* **Manejo de Errores y Feedback**: **NO utilices `alert()`**. Utiliza el sistema global de notificaciones:
  ```typescript
  import { useToastStore } from '@/components/ui/Toast';
  const addToast = useToastStore(state => state.addToast);
  addToast("Operación exitosa", "success"); // o "error", "info"
  ```
* **Estética (Premium UI)**: Mantén el tema oscuro y moderno. Usa clases de Tailwind preestablecidas (bordes difuminados, transparencias `backdrop-blur`, fondos oscuros `bg-zinc-950`, e iconos de `lucide-react`).
* **TypeScript Estricto**: Evita el uso de `any`. Si una respuesta viene de un Service, tipifícala correctamente usando las interfaces del Domain.
