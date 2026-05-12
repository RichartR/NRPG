import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import { sendDiscordMessage, editDiscordMessage, getDiscordChannel } from '@/lib/discord';

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
    
    console.log('PATCH Request:', { characterId, userId: user?.id });

    // 1. Obtener datos actuales del personaje
    const { data: character, error: fetchError } = await supabase
      .from('characters')
      .select('*')
      .eq('id', characterId)
      .single();

    if (fetchError || !character) {
      console.error('Error buscando personaje:', fetchError);
      throw new Error(`Personaje no encontrado (ID: ${characterId})`);
    }

    let updateData: any = {};

    // 2. Lógica por secciones
    switch (section) {
      case 'all':
        // 1. Datos básicos
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

        // 2. Ramas (Sincronización por Slots)
        if (data.personajes_ramas) {
          const newRamas = data.personajes_ramas;
          if (newRamas[0]?.rama_id) {
            await supabase.from('personajes_ramas').upsert({
              personaje_id: characterId, slot: 1, rama_id: newRamas[0].rama_id,
              sub_especialidad_id: newRamas[0].sub_especialidad_id || null
            }, { onConflict: 'personaje_id, slot' });
          } else {
            await supabase.from('personajes_ramas').delete().eq('personaje_id', characterId).eq('slot', 1);
          }
          if (newRamas[1]?.rama_id) {
            await supabase.from('personajes_ramas').upsert({
              personaje_id: characterId, slot: 2, rama_id: newRamas[1].rama_id,
              sub_especialidad_id: newRamas[1].sub_especialidad_id || null
            }, { onConflict: 'personaje_id, slot' });
          } else {
            await supabase.from('personajes_ramas').delete().eq('personaje_id', characterId).eq('slot', 2);
          }
        }

        // 3. Inventario
        if (data.personajes_inventario) {
          await supabase.from('personajes_inventario').delete().eq('personaje_id', characterId);
          if (data.personajes_inventario.length > 0) {
            await supabase.from('personajes_inventario').insert(
              data.personajes_inventario.map((i: any) => ({
                personaje_id: characterId, item_id: i.item_id, cantidad: i.cantidad
              }))
            );
          }
        }

        // 4. Técnicas
        if (data.personajes_tecnicas) {
          await supabase.from('personajes_tecnicas').delete().eq('personaje_id', characterId);
          if (data.personajes_tecnicas.length > 0) {
            await supabase.from('personajes_tecnicas').insert(
              data.personajes_tecnicas.map((t: any) => ({
                personaje_id: characterId, tecnica_id: t.tecnica_id
              }))
            );
          }
        }
        break;

      case 'apariencia':
        const channelIdAp = await getDiscordChannel(supabase);
        const textAp = data.apariencia || 'Pendiente';
        
        if (!character.apariencia_msg_id) {
          const res = await sendDiscordMessage(channelIdAp, `**APARIENCIA DE ${character.nombre_ninja}:**\n${textAp}`);
          updateData.apariencia_msg_id = res.id;
        } else {
          await editDiscordMessage(channelIdAp, character.apariencia_msg_id, `**APARIENCIA DE ${character.nombre_ninja}:**\n${textAp}`);
        }
        break;

      case 'historia':
        const channelIdHi = await getDiscordChannel(supabase);
        const textHi = data.historia || 'Pendiente';

        if (!character.historia_msg_id) {
          const res = await sendDiscordMessage(channelIdHi, `**HISTORIA DE ${character.nombre_ninja}:**\n${textHi}`);
          updateData.historia_msg_id = res.id;
        } else {
          await editDiscordMessage(channelIdHi, character.historia_msg_id, `**HISTORIA DE ${character.nombre_ninja}:**\n${textHi}`);
        }
        break;

      case 'onrol':
        updateData = {
          edad: data.edad,
          sexo: data.sexo,
        };
        break;

      default:
        throw new Error('Sección no válida');
    }

    // 3. Aplicar actualización en Supabase
    const { error: updateError } = await supabase
      .from('characters')
      .update(updateData)
      .eq('id', characterId);

    if (updateError) throw updateError;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Ficha Update Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

