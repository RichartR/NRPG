import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import { sendDiscordMessage, getDiscordChannel } from '@/lib/discord';
import { CharacterServerService } from '@/services/supabase/character.server.service';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data } = await request.json();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    // 1. Crear el personaje base
    const character = await CharacterServerService.createCharacter(supabase, {
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
      xp: data.xp,
      ryous: data.ryous,
      edad: data.edad,
      sexo: data.sexo,
      rasgos: data.rasgos
    });

    const characterId = character.id;

    // 2. Discord (Envío inicial automático al crear)
    const channelId = await getDiscordChannel(supabase);
    let apMsgId = null;
    let hiMsgId = null;

    if (channelId) {
      const apRes = await sendDiscordMessage(channelId, `**APARIENCIA DE ${data.nombre_ninja}:**\n${data.apariencia || 'Pendiente'}`);
      apMsgId = apRes.id;
      const hiRes = await sendDiscordMessage(channelId, `**HISTORIA DE ${data.nombre_ninja}:**\n${data.historia || 'Pendiente'}`);
      hiMsgId = hiRes.id;

      await CharacterServerService.updateCharacterFields(supabase, characterId, {
        apariencia_msg_id: apMsgId,
        historia_msg_id: hiMsgId
      });
    }

    // 3. Guardar Ramas
    await CharacterServerService.insertRamas(supabase, characterId, data.personajes_ramas || []);

    // 4. Guardar Inventario
    await CharacterServerService.replaceInventario(supabase, characterId, data.personajes_inventario || []);

    // 5. Guardar Técnicas
    await CharacterServerService.replaceTecnicas(supabase, characterId, data.personajes_tecnicas || []);

    return NextResponse.json({ success: true, id: characterId });
  } catch (error: any) {
    console.error('Create Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
