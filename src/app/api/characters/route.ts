import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import { sendDiscordMessage, getDiscordChannel } from '@/lib/discord';
import { CharacterServerService } from '@/services/supabase/character.server.service';
import { MasterServerService } from '@/services/supabase/master.server.service';
import { createAdminClient } from '@/utils/supabase/admin';
import { getCuposMaximosClan } from '@/utils/cupos';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data } = await request.json();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    // Validar cupos máximos de la aldea/organización si no es renegado (renegado es id nulo / no establecido)
    if (data.aldea_id) {
      // 1. Obtener información de la aldea y su categoría
      const { data: aldeaInfo, error: aldeaError } = await supabase
        .from('info_aldeas')
        .select('nombre_completo, categoria_id')
        .eq('id', data.aldea_id)
        .single();

      if (aldeaError) throw aldeaError;

      // 2. Obtener la cantidad de personajes actuales y activos en esa aldea/organización
      const { count, error: countError } = await supabase
        .from('reg_characters')
        .select('*', { count: 'exact', head: true })
        .eq('aldea_id', data.aldea_id)
        .eq('activo', true)
        .eq('eliminado_voluntario', false);

      if (countError) throw countError;

      // 3. Obtener el límite configurado según la categoría
      let maxCupos = 10;
      if (aldeaInfo.categoria_id === 2) {
        // Organización
        const limitRaw = await MasterServerService.getConfiguracion(supabase, 'cupos_maximos_organizacion');
        maxCupos = limitRaw != null && limitRaw !== '' ? Number(limitRaw) : 10;
      } else {
        // Aldea
        const limitRaw = await MasterServerService.getConfiguracion(supabase, 'cupos_maximos_aldea');
        maxCupos = limitRaw != null && limitRaw !== '' ? Number(limitRaw) : 10;
      }

      if (count !== null && count >= maxCupos) {
        const tipoEntidad = aldeaInfo.categoria_id === 2 ? 'La organización' : 'La aldea';
        return NextResponse.json({ error: `${tipoEntidad} "${aldeaInfo.nombre_completo}" ya ha alcanzado el límite máximo de cupos (${maxCupos}) y no permite nuevos shinobi.` }, { status: 400 });
      }
    }

    // Validar cupos máximos de los clanes seleccionados y que se hayan seleccionado las 2 ramas
    const branchIds = data.personajes_ramas?.map((r: any) => r.rama_id).filter(Boolean) || [];
    if (branchIds.length < 2) {
      return NextResponse.json({ error: 'Es obligatorio seleccionar las dos ramas del personaje.' }, { status: 400 });
    }
    if (branchIds.length > 0) {
      const { data: selectRamas, error: selectRamasError } = await supabase
        .from('info_ramas_clanes')
        .select('id, nombre, tipo, es_especial, config_iniciales')
        .in('id', branchIds);

      if (selectRamasError) throw selectRamasError;

      const clans = selectRamas?.filter(r => r.tipo === 'clan') || [];
      for (const clan of clans) {
        if (clan.es_especial) {
          const permitidos: number[] = clan.config_iniciales?.personajes_permitidos || [];
          if (permitidos.length > 0) {
            return NextResponse.json({ error: `El clan "${clan.nombre}" es un Clan Especial y requiere que un administrador autorice previamente a tu personaje.` }, { status: 400 });
          }
        }

        // 1. Obtener cupos_maximos_aldea de config para calcular el límite dinámico del clan
        const limitAldeaRaw = await MasterServerService.getConfiguracion(supabase, 'cupos_maximos_aldea');
        const C = limitAldeaRaw != null && limitAldeaRaw !== '' ? Number(limitAldeaRaw) : 14;

        // Límite de clan: cada 5 cupos de aldea abre 1 cupo de clan (14->4, 16->5, 18->5, 20->6...)
        const limitClan = getCuposMaximosClan(C);

        // 2. Contar personajes activos en este clan
        const { count: clanActiveCount, error: clanCountError } = await supabase
          .from('reg_personajes_ramas')
          .select('id, reg_characters!inner(id)', { count: 'exact', head: true })
          .eq('rama_id', clan.id)
          .eq('reg_characters.activo', true)
          .eq('reg_characters.eliminado_voluntario', false);

        if (clanCountError) throw clanCountError;

        if (clanActiveCount !== null && clanActiveCount >= limitClan) {
          return NextResponse.json({ error: `El clan "${clan.nombre}" ya ha alcanzado el límite máximo de cupos (${clanActiveCount}/${limitClan}) y no permite nuevos miembros.` }, { status: 400 });
        }
      }
    }

    // Validar límites de Ninjutsu Elemental
    const techIds = (data.personajes_tecnicas || []).map((t: any) => Number(t.tecnica_id)).filter(Boolean);
    let techDetails: any[] = [];
    if (techIds.length > 0) {
      const { data: fetchedTechs } = await supabase
        .from('info_glosario')
        .select('*')
        .in('id', techIds);
      techDetails = fetchedTechs || [];
    }
    const { data: subSpecs } = await supabase
      .from('info_sub_especialidades')
      .select('*');
    const { data: ramaElems } = await supabase
      .from('info_rama_elementos')
      .select('*, info_elementos(*)');

    const { NinjutsuLogic } = await import('@/domain/character/logic');
    const validation = NinjutsuLogic.validateNinjutsuLimits(
      data.personajes_ramas || [],
      techDetails,
      subSpecs || [],
      data.eleccion_tecnicas_clan,
      ramaElems || []
    );
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
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
      puntos_aprendizaje: data.puntos_aprendizaje,
      moneda_evento: data.moneda_evento,
      edad: data.edad,
      sexo: data.sexo,
      rasgos: data.rasgos,
      url_img: data.url_img || null,
      stats_updated_at: new Date().toISOString(),
      eleccion_tecnicas_clan: data.eleccion_tecnicas_clan
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

    // Sincronización de rol y apodo de Discord al crear (en segundo plano)
    (async () => {
      try {
        const { data: userProfile } = await adminClient
          .from('profiles')
          .select('discord_id')
          .eq('id', user.id)
          .single();

        if (userProfile?.discord_id) {
          const { getDiscordGuildId, assignDiscordRole, updateDiscordMemberNickname } = await import('@/lib/discord');
          const guildId = await getDiscordGuildId(adminClient);

          if (guildId) {
            // 1. Asignar rol de aldea o renegado
            let roleIdToAssign = null;
            if (data.aldea_id) {
              const { data: aldeaInfo } = await adminClient
                .from('info_aldeas')
                .select('id_rol_discord')
                .eq('id', data.aldea_id)
                .single();
              roleIdToAssign = aldeaInfo?.id_rol_discord;
            } else {
              roleIdToAssign = await MasterServerService.getConfiguracion(adminClient, 'discord_renegado_role_id');
            }

            if (roleIdToAssign) {
              await assignDiscordRole(guildId, userProfile.discord_id, roleIdToAssign).catch(e => console.error('Error al asignar rol de aldea:', e));
            }

            // 2. Asignar rol de jugador activo
            const jugadorRoleId = await MasterServerService.getConfiguracion(adminClient, 'discord_jugador_role_id');
            if (jugadorRoleId) {
              await assignDiscordRole(guildId, userProfile.discord_id, jugadorRoleId).catch(e => console.error('Error al asignar rol de jugador:', e));
            }

            // 3. Actualizar apodo (nickname) en el servidor de Discord
            if (data.nombre_ninja) {
              await updateDiscordMemberNickname(guildId, userProfile.discord_id, data.nombre_ninja)
                .catch(err => console.error('Error al actualizar el apodo en Discord al crear:', err));
            }
          }
        }
      } catch (discordRoleError) {
        console.error('Error al asignar roles/apodo de Discord al crear personaje (background):', discordRoleError);
      }
    })();

    // 3, 4, 5, 6, 7, 8. Guardar Ramas, Entrenamientos, Inventario, Técnicas, Rasgos y Acompañantes en paralelo
    await Promise.all([
      CharacterServerService.insertRamas(adminClient, characterId, data.personajes_ramas || []),
      CharacterServerService.bulkUpdateEntrenamientos(adminClient, characterId, data.personajes_entrenamientos || []),
      CharacterServerService.replaceInventario(adminClient, characterId, data.personajes_inventario || []),
      CharacterServerService.replaceTecnicas(adminClient, characterId, data.personajes_tecnicas || []),
      CharacterServerService.bulkUpdateRasgos(adminClient, characterId, data.personajes_rasgos || []),
      CharacterServerService.bulkUpdateAcompanantes(adminClient, characterId, data.personajes_acompanantes || [])
    ]);

    // 8. Registro de Acción inicial
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

    // 9. Registro de Elección de Entrenamiento (si aplica)
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

    // 10. Registro de Elección de Elemento Libre al crear (si aplica)
    const slot1 = (data.personajes_ramas || []).find((r: any) => Number(r.slot) === 1);
    const selectedFreeElemId = slot1?.elemento_principal_id ? Number(slot1.elemento_principal_id) : null;
    if (selectedFreeElemId) {
      const { data: elemObj } = await supabase.from('info_elementos').select('nombre_esp, nombre_jap').eq('id', selectedFreeElemId).single();
      if (elemObj) {
        const elemName = elemObj.nombre_jap ? `${elemObj.nombre_jap} (${elemObj.nombre_esp})` : elemObj.nombre_esp;
        const { data: regElem } = await adminClient.from('reg_registros').insert({
          tipo: 'accion',
          autor_id: characterId,
          data: {
            titulo: `${data.nombre_ninja} elige ${elemName} como su Elemento Libre`,
            tipo_accion: 'eleccion_elemento_libre',
            elemento_id: selectedFreeElemId,
            elemento_nombre: elemName
          }
        }).select().single();

        if (regElem) {
          await adminClient.from('reg_registros_participantes').insert({
            registro_id: regElem.id,
            personaje_id: characterId,
            estado: 'aceptado'
          });
        }
      }
    }

    return NextResponse.json({ success: true, id: characterId });
  } catch (error: any) {
    console.error('Create Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
