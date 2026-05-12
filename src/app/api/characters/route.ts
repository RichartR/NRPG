import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import { sendDiscordMessage, getDiscordChannel } from '@/lib/discord';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data } = await request.json();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    // 1. Crear el personaje base
    const { data: character, error: charError } = await supabase
      .from('characters')
      .insert({
        user_id: user.id,
        hobba_name: data.hobba_name,
        nombre_ninja: data.nombre_ninja,
        aldea_id: data.aldea_id,
        tiempo_rpg: data.tiempo_rpg,
        rango: data.rango || 'D',
        rango_jerarquico: data.rango_jerarquico || 'Estudiante',
        stats_base: data.stats_base,
        atributos_derivados: data.atributos_derivados,
        puntos_stats: data.puntos_stats,
        edad: data.edad,
        sexo: data.sexo,
        rasgos: data.rasgos
      })
      .select()
      .single();

    if (charError) throw charError;
    const characterId = character.id;

    // 2. Discord (Envío inicial automático al crear)
    const channelId = await getDiscordChannel(supabase);
    let apMsgId = null;
    let hiMsgId = null;

    if (channelId) {
      // Enviamos a Discord
      const apRes = await sendDiscordMessage(channelId, `**APARIENCIA DE ${data.nombre_ninja}:**\n${data.apariencia || 'Pendiente'}`);
      apMsgId = apRes.id;
      const hiRes = await sendDiscordMessage(channelId, `**HISTORIA DE ${data.nombre_ninja}:**\n${data.historia || 'Pendiente'}`);
      hiMsgId = hiRes.id;

      // Guardamos los IDs en la ficha recién creada
      await supabase.from('characters').update({
        apariencia_msg_id: apMsgId,
        historia_msg_id: hiMsgId
      }).eq('id', characterId);
    }

    // 3. Guardar Ramas
    if (data.personajes_ramas?.length > 0) {
      await supabase.from('personajes_ramas').insert(
        data.personajes_ramas.map((r: any, idx: number) => ({
          personaje_id: characterId,
          rama_id: r.rama_id,
          sub_especialidad_id: r.sub_especialidad_id,
          slot: idx + 1
        }))
      );
    }

    // 4. Guardar Inventario
    if (data.personajes_inventario?.length > 0) {
      await supabase.from('personajes_inventario').insert(
        data.personajes_inventario.map((i: any) => ({
          personaje_id: characterId,
          item_id: i.item_id,
          cantidad: i.cantidad
        }))
      );
    }

    // 5. Guardar Técnicas
    if (data.personajes_tecnicas?.length > 0) {
      await supabase.from('personajes_tecnicas').insert(
        data.personajes_tecnicas.map((t: any) => ({
          personaje_id: characterId,
          tecnica_id: t.tecnica_id
        }))
      );
    }

    return NextResponse.json({ success: true, id: characterId });
  } catch (error: any) {
    console.error('Create Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
