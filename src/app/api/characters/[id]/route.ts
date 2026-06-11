import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import { sendDiscordMessage, editDiscordMessage, deleteDiscordMessage, getDiscordChannel } from '@/lib/discord';
import { CharacterServerService } from '@/services/supabase/character.server.service';
import { MasterServerService } from '@/services/supabase/master.server.service';
import { createAdminClient } from '@/utils/supabase/admin';

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
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    
    // 1. Obtener datos actuales del personaje
    const character = await CharacterServerService.getCharacterById(supabase, characterId);
    if (!character) throw new Error(`Personaje no encontrado (ID: ${characterId})`);

    // 2. Verificar Permisos (Dueño o Admin)
    const isOwner = character.user_id === user.id;
    
    // Obtener rol del perfil en la base de datos
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    // @ts-ignore - roles might be in user_metadata or profiles
    const isAdmin = profile?.role === 'admin' || user.user_metadata?.role === 'admin' || user.app_metadata?.role === 'admin';

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'No tienes permiso para editar este personaje' }, { status: 403 });
    }

    const adminClient = createAdminClient();
    let updateData: Record<string, unknown> = {};

    // 2. Lógica por secciones
    switch (section) {
      case 'all':
        // Validar límites de Ninjutsu Elemental
        {
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

          const { NinjutsuLogic } = await import('@/domain/character/logic');
          const validation = NinjutsuLogic.validateNinjutsuLimits(
            data.personajes_ramas || character.personajes_ramas || [],
            techDetails,
            subSpecs || []
          );
          if (!validation.valid) {
            return NextResponse.json({ error: validation.error }, { status: 400 });
          }
        }

        // Validar cupos máximos de la aldea/organización si cambia y el personaje está activo
        if (character.activo && !character.eliminado_voluntario) {
          if (data.aldea_id && Number(data.aldea_id) !== Number(character.aldea_id)) {
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
              return NextResponse.json({ error: `${tipoEntidad} "${aldeaInfo.nombre_completo}" ya ha alcanzado el límite máximo de cupos (${maxCupos}) y no permite nuevos shinobis.` }, { status: 400 });
            }
          }

          // Validar cupos máximos de los clanes seleccionados que sean NUEVOS para el personaje
          if (data.personajes_ramas) {
            const oldRamaIds = (character as any).personajes_ramas?.map((r: any) => Number(r.rama_id)).filter(Boolean) || [];
            const newRamasInput = data.personajes_ramas || [];
            const newRamaIds = newRamasInput.map((r: any) => Number(r.rama_id)).filter(Boolean);
            const addedRamaIds = newRamaIds.filter((id: number) => !oldRamaIds.includes(id));

            if (addedRamaIds.length > 0) {
              const { data: selectRamas, error: selectRamasError } = await supabase
                .from('info_ramas_clanes')
                .select('id, nombre, tipo, es_especial')
                .in('id', addedRamaIds);

              if (selectRamasError) throw selectRamasError;

              const clans = selectRamas?.filter(r => r.tipo === 'clan') || [];
              for (const clan of clans) {
                // 1. Obtener cupos_maximos_aldea de config para calcular el límite dinámico del clan
                const limitAldeaRaw = await MasterServerService.getConfiguracion(supabase, 'cupos_maximos_aldea');
                const C = limitAldeaRaw != null && limitAldeaRaw !== '' ? Number(limitAldeaRaw) : 10;

                // Límite de clan = (es_especial ? 2 : 4) + Math.floor((C - 10) / 5)
                const limitClan = (clan.es_especial ? 2 : 4) + Math.floor((C - 10) / 5);

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
          }
        }

        // Calcular reembolsos si el periodo de reseteos gratuitos está activo
        let refundXp = 0;
        let refundRyous = 0;
        let refundPa = 0;
        let refundMonedaEvento = 0;

        const { data: configReset } = await adminClient
          .from('sys_configuracion_sistema')
          .select('valor')
          .eq('clave', 'periodo_reseteos_gratuitos')
          .single();
        const isFreeReset = configReset?.valor === true || String(configReset?.valor) === 'true';

        if (isFreeReset) {
          // Devolución de Inventario (Objetos)
          const oldItems = character.personajes_inventario || [];
          const newItems = data.personajes_inventario || [];
          const deletedItems = oldItems.filter(oi => !newItems.some((ni: any) => Number(ni.item_id) === Number(oi.item_id)));

          const refundedItemsInfo = [];
          for (const item of deletedItems) {
            const { data: res } = await adminClient.rpc('calcular_reembolso_glosario', {
              p_personaje_id: Number(characterId),
              p_glosario_id: Number(item.item_id)
            });
            if (res) {
              const rxp = Number(res.xp || 0);
              const rryous = Number(res.ryous || 0);
              const rpa = Number(res.pa || 0);
              const rme = Number(res.moneda_evento || 0);
              refundXp += rxp;
              refundRyous += rryous;
              refundPa += rpa;
              refundMonedaEvento += rme;
              if (rxp > 0 || rryous > 0 || rpa > 0 || rme > 0) {
                refundedItemsInfo.push({ id: item.item_id, nombre: item.info_glosario?.nombre_es || 'Objeto', xp: rxp, ryous: rryous, pa: rpa, moneda_evento: rme });
              }
            }
          }

          // Devolución de Técnicas
          const oldTecs = character.personajes_tecnicas || [];
          const newTecs = data.personajes_tecnicas || [];
          const deletedTecs = oldTecs.filter(ot => !newTecs.some((nt: any) => Number(nt.tecnica_id) === Number(ot.tecnica_id)));

          const refundedTecsInfo = [];
          for (const tec of deletedTecs) {
            const { data: res } = await adminClient.rpc('calcular_reembolso_glosario', {
              p_personaje_id: Number(characterId),
              p_glosario_id: Number(tec.tecnica_id)
            });
            if (res) {
              const rxp = Number(res.xp || 0);
              const rryous = Number(res.ryous || 0);
              const rpa = Number(res.pa || 0);
              const rme = Number(res.moneda_evento || 0);
              refundXp += rxp;
              refundRyous += rryous;
              refundPa += rpa;
              refundMonedaEvento += rme;
              if (rxp > 0 || rryous > 0 || rpa > 0 || rme > 0) {
                refundedTecsInfo.push({ id: tec.tecnica_id, nombre: tec.info_glosario?.nombre_es || 'Técnica', xp: rxp, ryous: rryous, pa: rpa, moneda_evento: rme });
              }
            }
          }

          // Devolución de Entrenamientos
          const oldTrainings = character.personajes_entrenamientos || [];
          const newTrainings = data.personajes_entrenamientos || [];
          const deletedTrainings = oldTrainings.filter(ot => !newTrainings.some((nt: any) => Number(nt.entrenamiento_id) === Number(ot.entrenamiento_id)));

          const refundedTrainingsInfo = [];
          for (const tr of deletedTrainings) {
            const { data: res } = await adminClient.rpc('calcular_reembolso_entrenamiento', {
              p_personaje_id: Number(characterId),
              p_entrenamiento_id: Number(tr.entrenamiento_id)
            });
            if (res) {
              const rxp = Number(res.xp || 0);
              const rryous = Number(res.ryous || 0);
              const rpa = Number(res.pa || 0);
              refundXp += rxp;
              refundRyous += rryous;
              refundPa += rpa;
              if (rxp > 0 || rryous > 0 || rpa > 0) {
                refundedTrainingsInfo.push({ id: tr.entrenamiento_id, nombre: tr.info_entrenamientos?.nombre_esp || 'Entrenamiento', xp: rxp, ryous: rryous, pa: rpa });
              }
            }
          }

          // Registrar las devoluciones
          if (refundXp > 0 || refundRyous > 0 || refundPa > 0 || refundMonedaEvento > 0) {
            const itemsList = refundedItemsInfo.map(i => i.nombre).join(', ');
            const tecsList = refundedTecsInfo.map(t => t.nombre).join(', ');
            const trsList = refundedTrainingsInfo.map(t => t.nombre).join(', ');
            
            const refundText = [
              refundXp > 0 && `${refundXp} EXP`,
              refundRyous > 0 && `${refundRyous} Ryous`,
              refundPa > 0 && `${refundPa} PA`,
              refundMonedaEvento > 0 && `${refundMonedaEvento} Monedas de Evento`
            ].filter(Boolean).join(', ');

            let details = '';
            if (itemsList) details += `Objetos devueltos: ${itemsList}. `;
            if (tecsList) details += `Técnicas devueltas: ${tecsList}. `;
            if (trsList) details += `Entrenamientos devueltos: ${trsList}. `;

            const { data: registro } = await adminClient.from('reg_registros').insert({
              tipo: 'accion',
              autor_id: characterId,
              data: {
                titulo: `${character.nombre_ninja} devuelve elementos y recibe reembolso: +${refundText}`,
                subtitulo: details,
                tipo_accion: 'reembolso_devoluciones',
                refund_xp: refundXp,
                refund_ryous: refundRyous,
                refund_pa: refundPa,
                refund_moneda_evento: refundMonedaEvento
              }
            }).select().single();

            if (registro) {
              await adminClient.from('reg_registros_participantes').insert({
                registro_id: registro.id,
                personaje_id: characterId,
                estado: 'aceptado'
              });
            }
          }
        }

        updateData = {
          hobba_name: data.hobba_name,
          nombre_ninja: data.nombre_ninja,
          aldea_id: data.aldea_id,
          rango: data.rango,
          rango_jerarquico: data.rango_jerarquico,
          stats_base: data.stats_base,
          atributos_derivados: data.atributos_derivados,
          puntos_stats: data.puntos_stats,
          xp: Number(data.xp || 0) + refundXp,
          ryous: Number(data.ryous || 0) + refundRyous,
          puntos_aprendizaje: Number(data.puntos_aprendizaje || 0) + refundPa,
          moneda_evento: Number(data.moneda_evento || 0) + refundMonedaEvento,
          tiempo_rpg: data.tiempo_rpg,
          edad: data.edad,
          sexo: data.sexo,
          url_img: data.url_img,
          stats_updated_at: new Date().toISOString(),
          eleccion_tecnicas_clan: data.eleccion_tecnicas_clan,
        };

        // 3. Ejecutar actualizaciones en paralelo
        const updatePromises: Promise<any>[] = [];

        // Ramas
        if (data.personajes_ramas) {
          const oldRamas = (character as any).personajes_ramas || [];
          const newRamas = data.personajes_ramas;

          // Detectar cambios significativos para el registro de acciones
          const changes = [];
          for (const newR of newRamas) {
            const oldR = oldRamas.find((r: any) => r.slot === newR.slot);
            
            // 1. Cambio de Rama/Subesp
            if (oldR && (oldR.rama_id !== newR.rama_id || oldR.sub_especialidad_id !== newR.sub_especialidad_id)) {
              const [{ data: ramaInfo }, { data: subInfo }] = await Promise.all([
                adminClient.from('info_ramas_clanes').select('nombre, tipo').eq('id', newR.rama_id).single(),
                newR.sub_especialidad_id 
                  ? adminClient.from('info_sub_especialidades').select('nombre').eq('id', newR.sub_especialidad_id).single()
                  : Promise.resolve({ data: null })
              ]);

              if (ramaInfo) {
                const oldSubText = oldR.sub_especialidad?.nombre ? ` (${oldR.sub_especialidad.nombre})` : '';
                const newSubText = subInfo?.nombre ? ` (${subInfo.nombre})` : '';
                const tipoText = ramaInfo.tipo === 'clan' ? 'su clan' : 'su rama';
                changes.push(`${tipoText} ${oldR.rama?.nombre}${oldSubText} por ${ramaInfo.nombre}${newSubText}`);
              }
            }

          }

          if (changes.length > 0) {
            const tituloAccion = `${character.nombre_ninja} cambia ${changes.join(' y ')}.`;
            const { data: registro } = await adminClient.from('reg_registros').insert({
              tipo: 'accion',
              autor_id: characterId,
              data: {
                titulo: tituloAccion,
                tipo_accion: 'cambio_especializacion'
              }
            }).select().single();

            if (registro) {
              await adminClient.from('reg_registros_participantes').insert({
                registro_id: registro.id,
                personaje_id: characterId,
                estado: 'aceptado'
              });
            }
          }
          updatePromises.push(CharacterServerService.bulkUpdateRamas(adminClient, characterId, data.personajes_ramas));
        }

        // Entrenamientos
        if (data.personajes_entrenamientos) {
          updatePromises.push(CharacterServerService.bulkUpdateEntrenamientos(adminClient, characterId, data.personajes_entrenamientos));
        }

        // Inventario
        if (data.personajes_inventario) {
          updatePromises.push(CharacterServerService.replaceInventario(adminClient, characterId, data.personajes_inventario));
        }

        // Técnicas
        if (data.personajes_tecnicas) {
          updatePromises.push(CharacterServerService.replaceTecnicas(adminClient, characterId, data.personajes_tecnicas));
        }

        // Rasgos
        if (data.personajes_rasgos) {
          updatePromises.push(CharacterServerService.bulkUpdateRasgos(adminClient, characterId, data.personajes_rasgos));
        }

        await Promise.all(updatePromises);
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
        updateData = { edad: data.edad, sexo: data.sexo, url_img: data.url_img };
        break;
      
      case 'inventario':
        if (data.personajes_inventario) {
          await CharacterServerService.replaceInventario(adminClient, characterId, data.personajes_inventario);
        }
        break;

      case 'tecnicas':
        if (data.personajes_tecnicas) {
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

          const { NinjutsuLogic } = await import('@/domain/character/logic');
          const validation = NinjutsuLogic.validateNinjutsuLimits(
            character.personajes_ramas || [],
            techDetails,
            subSpecs || []
          );
          if (!validation.valid) {
            return NextResponse.json({ error: validation.error }, { status: 400 });
          }

          await CharacterServerService.replaceTecnicas(adminClient, characterId, data.personajes_tecnicas);
        }
        break;

      case 'restore':
        if (!isAdmin) {
          return NextResponse.json({ error: 'No tienes permiso para restaurar este personaje' }, { status: 403 });
        }
        await CharacterServerService.restoreCharacter(adminClient, characterId);
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

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: characterId } = await params;
    const { searchParams } = new URL(request.url);
    const force = searchParams.get('force') === 'true';

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    // 1. Obtener datos actuales del personaje para tener los IDs de Discord
    const character = await CharacterServerService.getCharacterById(supabase, characterId);
    if (!character) return NextResponse.json({ error: 'Personaje no encontrado' }, { status: 404 });

    // 2. Verificar Permisos (Dueño o Admin)
    const isOwner = character.user_id === user.id;
    
    // Obtener rol del perfil en la base de datos
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    // @ts-ignore
    const isAdmin = profile?.role === 'admin' || user.user_metadata?.role === 'admin' || user.app_metadata?.role === 'admin';

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'No tienes permiso para borrar este personaje' }, { status: 403 });
    }

    if (force && !isAdmin) {
      return NextResponse.json({ error: 'Solo un administrador puede forzar la eliminación definitiva de un personaje' }, { status: 403 });
    }

    const adminClient = createAdminClient();
    const channelId = await getDiscordChannel(supabase);

    if (force) {
      // 3. Eliminar mensajes de Discord y Personaje físicamente en paralelo
      const cleanupPromises: Promise<any>[] = [];
      
      cleanupPromises.push(Promise.resolve(adminClient.from('reg_characters').delete().eq('id', characterId)));

      if (channelId) {
        if (character.apariencia_msg_id) {
          cleanupPromises.push(deleteDiscordMessage(channelId, character.apariencia_msg_id).catch(e => console.error('Discord Delete Error (Ap):', e)));
        }
        if (character.historia_msg_id) {
          cleanupPromises.push(deleteDiscordMessage(channelId, character.historia_msg_id).catch(e => console.error('Discord Delete Error (Hi):', e)));
        }
      }

      await Promise.all(cleanupPromises);
    } else {
      // 3. De forma regular: archivar voluntariamente
      await CharacterServerService.archiveCharacter(adminClient, characterId, true);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Ficha Delete/Archive Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
