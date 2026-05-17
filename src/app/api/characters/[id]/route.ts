import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import { sendDiscordMessage, editDiscordMessage, deleteDiscordMessage, getDiscordChannel } from '@/lib/discord';
import { CharacterServerService } from '@/services/supabase/character.server.service';
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
    // @ts-ignore - roles might be in user_metadata or profiles
    const isAdmin = user.user_metadata?.role === 'admin' || user.app_metadata?.role === 'admin';

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'No tienes permiso para editar este personaje' }, { status: 403 });
    }

    const adminClient = createAdminClient();
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
          xp: data.xp,
          ryous: data.ryous,
          puntos_combate: data.puntos_combate,
          tiempo_rpg: data.tiempo_rpg,
          edad: data.edad,
          sexo: data.sexo,
          url_img: data.url_img,
          stats_updated_at: new Date().toISOString(),
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

            // 2. Elección de Entrenamiento
            if (oldR && newR.id_entrenamiento !== oldR.id_entrenamiento && newR.id_entrenamiento) {
              const [{ data: trainingInfo }, { data: ramaInfo }] = await Promise.all([
                adminClient.from('info_entrenamientos').select('nombre_esp').eq('id', newR.id_entrenamiento).single(),
                adminClient.from('info_ramas_clanes').select('nombre, tipo').eq('id', newR.rama_id).single()
              ]);

              if (trainingInfo && ramaInfo) {
                const articulo = ramaInfo.tipo === 'clan' ? 'el' : 'la';
                changes.push(`ha elegido el ${trainingInfo.nombre_esp} de ${articulo} ${ramaInfo.tipo} ${ramaInfo.nombre}`);
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

        // Inventario
        if (data.personajes_inventario) {
          updatePromises.push(CharacterServerService.replaceInventario(adminClient, characterId, data.personajes_inventario));
        }

        // Técnicas
        if (data.personajes_tecnicas) {
          updatePromises.push(CharacterServerService.replaceTecnicas(adminClient, characterId, data.personajes_tecnicas));
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
          await CharacterServerService.replaceTecnicas(adminClient, characterId, data.personajes_tecnicas);
        }
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
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    // 1. Obtener datos actuales del personaje para tener los IDs de Discord
    const character = await CharacterServerService.getCharacterById(supabase, characterId);
    if (!character) return NextResponse.json({ error: 'Personaje no encontrado' }, { status: 404 });

    // 2. Verificar Permisos (Dueño o Admin)
    const isOwner = character.user_id === user.id;
    // @ts-ignore
    const isAdmin = user.user_metadata?.role === 'admin' || user.app_metadata?.role === 'admin';

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'No tienes permiso para borrar este personaje' }, { status: 403 });
    }

    const adminClient = createAdminClient();
    const channelId = await getDiscordChannel(supabase);

    // 3. Eliminar mensajes de Discord y Personaje en paralelo
    const cleanupPromises: Promise<any>[] = [];
    
    // Eliminar de la DB (esto disparará ON DELETE CASCADE si está configurado, si no, hay que borrar lo relacionado)
    cleanupPromises.push(Promise.resolve(adminClient.from('reg_characters').delete().eq('id', characterId)));

    // Eliminar mensajes de Discord
    if (channelId) {
      if (character.apariencia_msg_id) {
        cleanupPromises.push(deleteDiscordMessage(channelId, character.apariencia_msg_id).catch(e => console.error('Discord Delete Error (Ap):', e)));
      }
      if (character.historia_msg_id) {
        cleanupPromises.push(deleteDiscordMessage(channelId, character.historia_msg_id).catch(e => console.error('Discord Delete Error (Hi):', e)));
      }
    }

    await Promise.all(cleanupPromises);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Ficha Delete Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
