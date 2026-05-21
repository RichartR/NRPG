import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import { sendDiscordMessage, getDiscordChannel } from '@/lib/discord';
import { CharacterServerService } from '@/services/supabase/character.server.service';
import { MasterServerService } from '@/services/supabase/master.server.service';
import { createAdminClient } from '@/utils/supabase/admin';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data } = await request.json();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    // Validar cupos máximos de la aldea si no es renegado (renegado es id nulo / no establecido)
    if (data.aldea_id) {
      // 1. Obtener la cantidad de personajes actuales en esa aldea
      const { count, error: countError } = await supabase
        .from('personajes')
        .select('*', { count: 'exact', head: true })
        .eq('aldea_id', data.aldea_id);

      if (countError) throw countError;

      // 2. Obtener el límite máximo configurado
      const limitRaw = await MasterServerService.getConfiguracion(supabase, 'cupos_maximos_aldea');
      const maxCupos = limitRaw != null && limitRaw !== '' ? Number(limitRaw) : 30;

      if (count !== null && count >= maxCupos) {
        return NextResponse.json({ error: 'La aldea seleccionada ya ha alcanzado el límite máximo de cupos y no permite nuevos shinobis.' }, { status: 400 });
      }
    }

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
      const [apRes, hiRes] = await Promise.all([
        sendDiscordMessage(channelId, `**APARIENCIA DE ${data.nombre_ninja}:**\n${data.apariencia || 'Pendiente'}`),
        sendDiscordMessage(channelId, `**HISTORIA DE ${data.nombre_ninja}:**\n${data.historia || 'Pendiente'}`)
      ]);
      
      apMsgId = apRes.id;
      hiMsgId = hiRes.id;

      await CharacterServerService.updateCharacterFields(supabase, characterId, {
        apariencia_msg_id: apMsgId,
        historia_msg_id: hiMsgId
      });
    }

    // USAR CLIENTE ADMIN PARA BYPASSEAR RLS EN TABLAS RESTRINGIDAS
    const adminClient = createAdminClient();

    // 3, 4, 5. Guardar Ramas, Inventario y Técnicas en paralelo
    await Promise.all([
      CharacterServerService.insertRamas(adminClient, characterId, data.personajes_ramas || []),
      CharacterServerService.replaceInventario(adminClient, characterId, data.personajes_inventario || []),
      CharacterServerService.replaceTecnicas(adminClient, characterId, data.personajes_tecnicas || [])
    ]);

    // 6. Registro de Acción inicial
    const { data: aldea } = await supabase.from('info_aldeas').select('nombre_completo').eq('id', data.aldea_id).single();
    
    // Obtener información de ramas y clanes para el título
    const ramaIds = data.personajes_ramas?.map((r: any) => r.rama_id) || [];
    const subIds = data.personajes_ramas?.map((r: any) => r.sub_especialidad_id).filter(Boolean) || [];

    const [{ data: allRamas }, { data: allSubs }] = await Promise.all([
      supabase.from('info_ramas_clanes').select('id, nombre, tipo').in('id', ramaIds),
      supabase.from('info_sub_especialidades').select('id, nombre').in('id', subIds)
    ]);

    const ramasMap = new Map(allRamas?.map(r => [r.id, r]));
    const subsMap = new Map(allSubs?.map(s => [s.id, s]));

    const ramasInfo = data.personajes_ramas?.map((r: any) => {
      const rama = ramasMap.get(r.rama_id);
      if (!rama) return null;
      const sub = r.sub_especialidad_id ? subsMap.get(r.sub_especialidad_id) : null;
      
      const articulo = rama.tipo === 'clan' ? 'el' : 'la';
      const subText = sub ? ` (${sub.nombre})` : '';
      return `${articulo} ${rama.tipo} ${rama.nombre}${subText}`;
    }).filter(Boolean);

    let tituloAccion = `${data.nombre_ninja} inicia su aventura en ${aldea?.nombre_completo || 'el Mundo Ninja'}`;
    if (ramasInfo && ramasInfo.length > 0) {
      const infoText = ramasInfo.join(' y ');
      tituloAccion += `. Con ${infoText}.`;
    }
    
    const { data: registro } = await adminClient.from('reg_registros').insert({
      tipo: 'accion',
      autor_id: characterId,
      data: {
        titulo: tituloAccion,
        tipo_accion: 'inicio_aventura'
      }
    }).select().single();

    if (registro) {
      await adminClient.from('reg_registros_participantes').insert({
        registro_id: registro.id,
        personaje_id: characterId,
        estado: 'aceptado'
      });
    }

    // 7. Registro de Elección de Entrenamiento (si aplica)
    if (data.personajes_ramas && data.personajes_ramas.length > 0) {
      const { data: allTrainings } = await adminClient.from('info_entrenamientos').select('id, nombre_esp').in('id', data.personajes_ramas.map((r: any) => r.id_entrenamiento).filter(Boolean));
      const trainingsMap = new Map(allTrainings?.map(t => [t.id, t]));

      for (const r of data.personajes_ramas) {
        if (r.id_entrenamiento) {
          const training = trainingsMap.get(r.id_entrenamiento);
          const rama = ramasMap.get(r.rama_id);
          if (training && rama) {
            const articulo = rama.tipo === 'clan' ? 'el' : 'la';
            const tituloEntrenamiento = `${data.nombre_ninja} ha elegido el ${training.nombre_esp} de ${articulo} ${rama.tipo} ${rama.nombre}`;
            
            const { data: regEnt } = await adminClient.from('reg_registros').insert({
              tipo: 'accion',
              autor_id: characterId,
              data: {
                titulo: tituloEntrenamiento,
                tipo_accion: 'eleccion_entrenamiento'
              }
            }).select().single();

            if (regEnt) {
              await adminClient.from('reg_registros_participantes').insert({
                registro_id: regEnt.id,
                personaje_id: characterId,
                estado: 'aceptado'
              });
            }
          }
        }
      }
    }

    return NextResponse.json({ success: true, id: characterId });
  } catch (error: any) {
    console.error('Create Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
