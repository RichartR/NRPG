# 📋 Plantillas de Publicación: Discord CMS

Usa estas plantillas para publicar contenido desde la web hacia Discord. Mantén las palabras clave (ej: `TITULO:`, `RECOMPENSA:`) exactamente igual para que el sistema de "lectura" de la web funcione correctamente.

---

## 🛠️ 1. Plantilla: Parches de Actualización
*Ideal para cambios técnicos, ajustes de balance o nuevos sistemas.*

**PARCHE:** [Versión, ej: v1.0.2]
**FECHA:** [Día/Mes/Año]

**CATEGORIA:** [Sistema / Jutsus / Mapa]
* [Cambio 1]
* [Cambio 2]

**CATEGORIA:** [Balance / Economía]
* [Cambio A]
* [Cambio B]

**NOTA:** [Comentario breve del Staff sobre el impacto del parche]

---

## 🏆 2. Plantilla: Eventos
*Esta plantilla permite al sistema repartir recompensas automáticamente.*

**EVENTO:** [Nombre del Evento]
**FECHA:** [Día y Hora]
**LUGAR:** [Sala de Habbo / Link]

**REQUISITOS:** [Rango mínimo, Ryos necesarios, etc.]
**RECOMPENSA:** [XP] XP, [Ryos] Ryos

**DESCRIPCION:** [Escribe aquí todo el lore o las instrucciones del evento]

**IMAGEN:** [Link de Cloudinary o Imgur]

---

## 📰 3. Plantilla: Noticias y Anuncios
*Para comunicados generales, cambios de Staff o noticias de las aldeas.*

**NOTICIA:** [Titular de la noticia]
**AUTOR:** [Nombre del Kage o Administrador]
**IMPORTANCIA:** [Alta / Media / Baja]

**CUERPO:** 
[Escribe aquí el contenido de la noticia. Puedes usar varios párrafos.]

**IMAGEN:** [Opcional: Link de Cloudinary o Imgur]

---

## 💡 Notas para el Programador (Lógica de Mapeo)

Para que la web convierta este texto en una interfaz visual, el script de procesamiento en Vercel debe:

1. **Detectar el Tipo:** Buscar si el mensaje empieza por `PARCHE:`, `EVENTO:` o `NOTICIA:`.
2. **Extraer Recompensas:** En la plantilla de Eventos, usar una expresión regular para capturar los números antes de "XP" y "Ryos".
3. **Manejar Listas:** Identificar las líneas que empiezan con `*` para transformarlas en elementos `<li>` de HTML.
4. **Cargar Imagen:** Si el campo `IMAGEN:` contiene un link válido, inyectarlo en el componente de cabecera de la noticia.