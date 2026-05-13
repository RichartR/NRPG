import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import { sendDiscordMessage, editDiscordMessage, getDiscordChannel } from '@/lib/discord';
import { CharacterServerService } from '@/services/supabase/character.server.service';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: characterId } = await params;
    const body = await request.json();
    const { section, data } = body;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    // 1. Obtener datos actuales del personaje
    const character = await CharacterServerService.getCharacterById(supabase, characterId);
    if (!character) throw new Error(`Personaje no encontrado (ID: ${characterId})`);

    let updateData: Record<string, unknown> = {};

    // 2. Lógica por secciones
    switch (section) {
      case 'all':
        updateData = {
          hobba_name: data.hobba_name,
          nombre_ninja: data.nombre_ninja,
          aldea_id: data.aldea_id,
          rango: data.rango,
          rango_jerarquico: data.rango_jerarquico,
          stats_base: data.stats_base,
          atributos_derivados: data.atributos_derivados,
          puntos_stats: data.puntos_stats,
          tiempo_rpg: data.tiempo_rpg,
          edad: data.edad,
          sexo: data.sexo,
          stats_updated_at: new Date().toISOString(),
        };

        // Ramas (Sincronización por Slots)
        if (data.personajes_ramas) {
          const newRamas = data.personajes_ramas;
          for (const slot of [0, 1]) {
            if (newRamas[slot]?.rama_id) {
              await CharacterServerService.upsertRama(supabase, characterId, slot + 1, newRamas[slot].rama_id, newRamas[slot].sub_especialidad_id);
            } else {
              await CharacterServerService.deleteRamaSlot(supabase, characterId, slot + 1);
            }
          }
        }

        // Inventario
        if (data.personajes_inventario) {
          await CharacterServerService.replaceInventario(supabase, characterId, data.personajes_inventario);
        }

        // Técnicas
        if (data.personajes_tecnicas) {
          await CharacterServerService.replaceTecnicas(supabase, characterId, data.personajes_tecnicas);
        }
        break;

      case 'apariencia': {
        const channelIdAp = await getDiscordChannel(supabase);
        const textAp = data.apariencia || 'Pendiente';
        if (!channelIdAp) throw new Error('Canal de Discord no configurado');
        if (!character.apariencia_msg_id) {
          // Sin mensaje previo: crear nuevo
          const res = await sendDiscordMessage(channelIdAp, `**APARIENCIA DE ${character.nombre_ninja}:**\n${textAp}`);
          updateData.apariencia_msg_id = res.id;
        } else {
          // Intentar editar; si fue borrado en Discord, re-crear y actualizar ID
          const edited = await editDiscordMessage(channelIdAp, character.apariencia_msg_id, `**APARIENCIA DE ${character.nombre_ninja}:**\n${textAp}`);
          if (!edited) {
            const res = await sendDiscordMessage(channelIdAp, `**APARIENCIA DE ${character.nombre_ninja}:**\n${textAp}`);
            updateData.apariencia_msg_id = res.id;
          }
        }
        break;
      }

      case 'historia': {
        const channelIdHi = await getDiscordChannel(supabase);
        const textHi = data.historia || 'Pendiente';
        if (!channelIdHi) throw new Error('Canal de Discord no configurado');
        if (!character.historia_msg_id) {
          // Sin mensaje previo: crear nuevo
          const res = await sendDiscordMessage(channelIdHi, `**HISTORIA DE ${character.nombre_ninja}:**\n${textHi}`);
          updateData.historia_msg_id = res.id;
        } else {
          // Intentar editar; si fue borrado en Discord, re-crear y actualizar ID
          const edited = await editDiscordMessage(channelIdHi, character.historia_msg_id, `**HISTORIA DE ${character.nombre_ninja}:**\n${textHi}`);
          if (!edited) {
            const res = await sendDiscordMessage(channelIdHi, `**HISTORIA DE ${character.nombre_ninja}:**\n${textHi}`);
            updateData.historia_msg_id = res.id;
          }
        }
        break;
      }

      case 'onrol':
        updateData = { edad: data.edad, sexo: data.sexo };
        break;

      default:
        throw new Error('Sección no válida');
    }

    // 3. Aplicar actualización
    if (Object.keys(updateData).length > 0) {
      await CharacterServerService.updateCharacterFields(supabase, characterId, updateData);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Ficha Update Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
