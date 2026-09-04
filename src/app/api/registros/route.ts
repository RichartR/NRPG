import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { RewardLogic } from '@/domain/character/logic';
import { ProfileService } from '@/services/supabase/profile.service';
import { sendDiscordMessage, sendDiscordEmbed, editDiscordEmbed, deleteDiscordMessage } from '@/lib/discord';
import { MasterServerService } from '@/services/supabase/master.server.service';

async function getNarrationChannelId(adminClient: any, destinatarioTipo?: string, destinatarioId?: number | null): Promise<string | null> {
  let channelId: string | null = null;

  if (destinatarioId && (destinatarioTipo === 'aldea' || destinatarioTipo === 'organizacion')) {
    const { data: aldea } = await adminClient
      .from('info_aldeas')
      .select('id_narracion_discord')
      .eq('id', destinatarioId)
      .single();
    if (aldea?.id_narracion_discord && aldea.id_narracion_discord.trim() !== '') {
      channelId = aldea.id_narracion_discord.trim();
    }
  }

  // Fallback al canal global de narración
  if (!channelId) {
    channelId = await MasterServerService.getConfiguracion(adminClient, 'discord_global_narration_channel_id');
  }

  return channelId || null;
}

async function buildMentionText(adminClient: any, pingRoles: unknown): Promise<string> {
  const rolesArray: string[] = Array.isArray(pingRoles) ? pingRoles.filter(Boolean) : ['default'];
  if (rolesArray.length === 0 || rolesArray.includes('none')) return '';

  const jugadorRoleId = rolesArray.includes('default')
    ? await MasterServerService.getConfiguracion(adminClient, 'discord_jugador_role_id')
    : null;

  const mentions = rolesArray
    .map((role) => {
      if (role === 'everyone') return '@everyone';
      if (role === 'here') return '@here';
      if (role === 'default') return jugadorRoleId ? `<@&${jugadorRoleId}>` : '';
      return `<@&${role}>`;
    })
    .filter(Boolean);

  return Array.from(new Set(mentions)).join(' ');
}

async function syncNarrationDiscordMessage(
  adminClient: any,
  requestUrl: string,
  registroId: number,
  data: any,
  oldData?: any
) {
  try {
    const origin = new URL(requestUrl).origin;
    const registroUrl = `${origin}/registros/narracion?id=${registroId}`;

    const channelId = await getNarrationChannelId(adminClient, data.destinatario_tipo, data.destinatario_id);
    const oldChannelId = oldData?.discord_channel_id;
    const oldMessageId = oldData?.discord_message_id;

    if (!data.discord_message_text && !oldMessageId) {
      return data;
    }

    const discordImageUrl = data.discord_image_url?.trim() || null;
    const rawText = data.discord_message_text || '';
    const formattedText = rawText.length > 4000 ? rawText.substring(0, 3997) + '...' : rawText;

    const customEmojiId = await MasterServerService.getConfiguracion(adminClient, 'discord_scroll_emoji_id');
    const scrollIcon = customEmojiId && String(customEmojiId).trim() ? `<:naruto_scroll:${String(customEmojiId).trim()}>` : '📜';

    const embed: any = {
      description: formattedText,
      color: 0xD6852D, // Naranja Naruto (#D6852D)
      fields: [
        {
          name: `${scrollIcon} Ver Registro y Recompensas`,
          value: `[Haz clic aquí para consultar los premios en la web](${registroUrl})`,
          inline: false
        }
      ],
      footer: {
        text: `Narrador: ${data.narrador || 'Sistema'} • NRPG`
      },
      timestamp: new Date().toISOString()
    };

    if (discordImageUrl && discordImageUrl.startsWith('http')) {
      embed.image = { url: discordImageUrl };
    }

    // Resolver la mención de rol de Discord según el tipo de destinatario
    let mentionContent: string | undefined = undefined;
    if (data.destinatario_tipo === 'global') {
      const jugadorRoleId = await MasterServerService.getConfiguracion(adminClient, 'discord_jugador_role_id');
      if (jugadorRoleId && String(jugadorRoleId).trim()) {
        mentionContent = `<@&${String(jugadorRoleId).trim()}>`;
      }
    } else if ((data.destinatario_tipo === 'aldea' || data.destinatario_tipo === 'organizacion') && data.destinatario_id) {
      const { data: aldea } = await adminClient
        .from('info_aldeas')
        .select('id_rol_discord')
        .eq('id', data.destinatario_id)
        .single();
      if (aldea?.id_rol_discord && String(aldea.id_rol_discord).trim()) {
        mentionContent = `<@&${String(aldea.id_rol_discord).trim()}>`;
      }
    }

    let newMessageId = oldMessageId;
    let finalChannelId = channelId;

    if (oldMessageId && oldChannelId) {
      if (channelId && channelId === oldChannelId) {
        const updated = await editDiscordEmbed(channelId, oldMessageId, embed, mentionContent);
        if (!updated) {
          const created = await sendDiscordEmbed(channelId, embed, mentionContent);
          newMessageId = created?.id;
        }
      } else {
        if (oldChannelId) {
          try { await deleteDiscordMessage(oldChannelId, oldMessageId); } catch (_) {}
        }
        if (channelId) {
          const created = await sendDiscordEmbed(channelId, embed, mentionContent);
          newMessageId = created?.id;
        } else {
          newMessageId = null;
          finalChannelId = null;
        }
      }
    } else if (channelId) {
      const created = await sendDiscordEmbed(channelId, embed, mentionContent);
      newMessageId = created?.id;
    }

    const updatedPayloadData = {
      ...oldData,
      ...data,
      fecha_modificacion: data.fecha_modificacion || oldData?.fecha_modificacion || new Date().toISOString(),
      discord_message_id: newMessageId || null,
      discord_channel_id: finalChannelId || null
    };
    await adminClient
      .from('reg_registros')
      .update({ data: updatedPayloadData })
      .eq('id', registroId);

    return updatedPayloadData;
  } catch (err) {
    console.error('Error syncing narration message to Discord:', err);
    return data;
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { action, payload, id } = await request.json();

    const adminClient = createAdminClient();

    // Check user role using adminClient to bypass RLS restrictions
    const profile = await ProfileService.getProfile(user.id, adminClient);

    const isStaff = profile?.roles?.some((r: string) => ['admin', 'moderador', 'narrador'].includes(r)) || false;
    const isAdmin = isStaff || user.user_metadata?.role === 'admin' || user.app_metadata?.role === 'admin';

    // Obtener personaje activo del usuario para validaciones de propietario using adminClient
    const { data: activeChar } = await adminClient
      .from('reg_characters')
      .select('id')
      .eq('user_id', user.id)
      .eq('activo', true)
      .maybeSingle();

    let isAuthorized = isAdmin;

    if (!isAuthorized && activeChar) {
      if (action === 'create') {
        if (Number(payload?.autor_id) === Number(activeChar.id)) {
          isAuthorized = true;
        }
      } else if (action === 'update' && id) {
        const { data: existingReg } = await adminClient
          .from('reg_registros')
          .select('*')
          .eq('id', id)
          .single();
        if (existingReg && Number(existingReg.autor_id) === Number(activeChar.id)) {
          isAuthorized = true;
        }
      }
    }

    if (!isAuthorized && action !== 'update_participant_status') {
      return NextResponse.json({ error: 'No tienes permisos de administrador o propietario para esta acción' }, { status: 403 });
    }

    if (action === 'update_participant_status') {
      if (!isStaff) {
        return NextResponse.json({ error: 'No tienes permisos de moderación o narrador' }, { status: 403 });
      }

      const registroId = Number(id);
      const personajeId = Number(payload?.personaje_id);
      const nuevoEstado = payload?.estado; // 'aceptado' | 'rechazado'

      if (!registroId || !personajeId || !['aceptado', 'rechazado'].includes(nuevoEstado)) {
        return NextResponse.json({ error: 'Parámetros inválidos' }, { status: 400 });
      }

      // Obtener el registro y el participante actual
      const { data: registro } = await adminClient.from('reg_registros').select('*').eq('id', registroId).single();
      const { data: part } = await adminClient.from('reg_registros_participantes')
        .select('*')
        .eq('registro_id', registroId)
        .eq('personaje_id', personajeId)
        .single();

      if (!registro || !part) {
        return NextResponse.json({ error: 'Participante o registro no encontrado' }, { status: 404 });
      }

      const estadoAnterior = part.estado;

      if (estadoAnterior !== 'pendiente' && estadoAnterior !== 'disputa_admin') {
        return NextResponse.json({ error: 'Este participante ya ha sido evaluado previamente' }, { status: 400 });
      }
      if (nuevoEstado === 'aceptado' && estadoAnterior !== 'aceptado') {
        const { xp, ryous, pa } = RewardLogic.calculateReward(registro, personajeId);
        const { data: char } = await adminClient.from('reg_characters').select('nombre_ninja, xp, ryous, puntos_aprendizaje').eq('id', personajeId).single();

        if (char) {
          await adminClient.from('reg_characters').update({
            xp: (char.xp || 0) + xp,
            ryous: (char.ryous || 0) + ryous,
            puntos_aprendizaje: (char.puntos_aprendizaje || 0) + pa
          }).eq('id', personajeId);

          // Si es una recuperación de evento, sincronizar el participante en el registro de evento_premios original
          if (registro.subtipo === 'recuperacion_evento' && registro.data?.evento_premios_id) {
            const eventoPremiosId = Number(registro.data.evento_premios_id);
            const { data: regPremios } = await adminClient
              .from('reg_registros')
              .select('*')
              .eq('id', eventoPremiosId)
              .single();

            if (regPremios) {
              const currentPremios = Array.isArray(regPremios.data?.participantes_premios)
                ? [...regPremios.data.participantes_premios]
                : [];

              const existingIdx = currentPremios.findIndex((pr: any) => Number(pr.personaje_id) === Number(personajeId));
              const nuevoPremioObj = {
                personaje_id: personajeId,
                nombre_ninja: char.nombre_ninja,
                xp_extra: xp,
                ryous_extra: ryous,
                pa_extra: pa,
                recuperado: true
              };

              if (existingIdx >= 0) {
                currentPremios[existingIdx] = { ...currentPremios[existingIdx], ...nuevoPremioObj };
              } else {
                currentPremios.push(nuevoPremioObj);
              }

              const updatedPremiosData = {
                ...regPremios.data,
                participantes_premios: currentPremios
              };

              await adminClient
                .from('reg_registros')
                .update({ data: updatedPremiosData })
                .eq('id', eventoPremiosId);

              // Asegurar que se guarde en reg_registros_participantes de evento_premios
              await adminClient
                .from('reg_registros_participantes')
                .upsert({
                  registro_id: eventoPremiosId,
                  personaje_id: personajeId,
                  estado: 'aceptado'
                }, { onConflict: 'registro_id,personaje_id' });
            }
          }
        }
      } else if (nuevoEstado === 'rechazado' && estadoAnterior === 'aceptado') {
        // Si pasa de aceptado a rechazado -> revertir recompensas
        const { xp, ryous, pa } = RewardLogic.calculateReward(registro, personajeId);
        const { data: char } = await adminClient.from('reg_characters').select('xp, ryous, puntos_aprendizaje').eq('id', personajeId).single();

        if (char) {
          await adminClient.from('reg_characters').update({
            xp: Math.max(0, (char.xp || 0) - xp),
            ryous: Math.max(0, (char.ryous || 0) - ryous),
            puntos_aprendizaje: Math.max(0, (char.puntos_aprendizaje || 0) - pa)
          }).eq('id', personajeId);
        }
      }

      // Actualizar estado del participante
      await adminClient.from('reg_registros_participantes')
        .update({ estado: nuevoEstado })
        .eq('id', part.id);

      // Comprobar si quedan participantes pendientes en la solicitud
      const { data: remainingParts } = await adminClient.from('reg_registros_participantes')
        .select('estado')
        .eq('registro_id', registroId);

      const hasPendings = remainingParts?.some(p => p.estado === 'pendiente' || p.estado === 'disputa_admin');
      if (!hasPendings) {
        // Marcar la notificación de admin como resuelta
        await adminClient.from('sys_notificaciones_admin')
          .update({ estado: 'resuelto', resolucion: 'aceptada' })
          .eq('registro_id', registroId);
      }

      return NextResponse.json({ success: true });
    }

    if (action === 'create') {
      // 1. Crear el registro base
      const { data: registro, error: regError } = await adminClient
        .from('reg_registros')
        .insert({
          tipo: payload.tipo,
          subtipo: payload.subtipo,
          autor_id: payload.autor_id,
          data: payload.data
        })
        .select()
        .single();

      if (regError) throw regError;

      // 2. Crear participantes (En evento_premios, narración y recuperacion_evento, TODOS empiezan como 'pendiente')
      const isEventoOrNarracion = payload.subtipo === 'evento_premios' || payload.subtipo === 'narracion' || payload.subtipo === 'recuperacion_evento';

      if (payload.participantes_ids && payload.participantes_ids.length > 0) {
        const participantsData = payload.participantes_ids.map((pid: number) => ({
          registro_id: registro.id,
          personaje_id: pid,
          estado: (!isEventoOrNarracion && payload.autor_id && pid === payload.autor_id) ? 'aceptado' : 'pendiente'
        }));

        const { error: partError } = await adminClient
          .from('reg_registros_participantes')
          .insert(participantsData);

        if (partError) throw partError;
      }

      if (payload.subtipo === 'recuperacion_evento') {
        await adminClient.from('sys_notificaciones_admin').insert({
          registro_id: registro.id,
          personaje_id: payload.autor_id || (payload.participantes_ids && payload.participantes_ids[0]) || null,
          mensaje: `Recuperación de Evento: "${payload.data?.titulo || 'Evento'}" (${payload.data?.urls_imagenes?.length || 1} escena/s de roleo adjunta/s)`,
          estado: 'pendiente'
        });
      }

      // 3. Aplicar recompensas instantáneas al autor (solo para otros tipos de registro, NO en evento_premios ni narracion)
      if (payload.autor_id && !isEventoOrNarracion) {
        const { xp, ryous, pa } = RewardLogic.calculateReward(registro, payload.autor_id);

        let extraMonedaEvento = 0;
        let glosarioItems: any[] = [];
        let rasgosItems: any[] = [];

        if (xp > 0 || ryous > 0 || pa > 0 || extraMonedaEvento > 0) {
          const { data: char } = await adminClient
            .from('reg_characters')
            .select('xp, ryous, puntos_aprendizaje, moneda_evento')
            .eq('id', payload.autor_id)
            .single();

          if (char) {
            await adminClient
              .from('reg_characters')
              .update({
                xp: (char.xp || 0) + xp,
                ryous: (char.ryous || 0) + ryous,
                puntos_aprendizaje: (char.puntos_aprendizaje || 0) + pa,
                moneda_evento: (char.moneda_evento || 0) + extraMonedaEvento
              })
              .eq('id', payload.autor_id);
          }
        }

        if (glosarioItems.length > 0) {
          const inventoryPack = glosarioItems
            .filter((i: any) => Number(i.categoria_id) === 2)
            .map((i: any) => ({ personaje_id: payload.autor_id, item_id: i.id }));

          const techniquesPack = glosarioItems
            .filter((i: any) => Number(i.categoria_id) !== 2)
            .map((i: any) => ({ personaje_id: payload.autor_id, tecnica_id: i.id }));

          if (inventoryPack.length > 0) {
            await adminClient.from('reg_personajes_inventario').insert(inventoryPack);
          }
          if (techniquesPack.length > 0) {
            await adminClient.from('reg_personajes_tecnicas').insert(techniquesPack);
          }
        }

        if (rasgosItems.length > 0) {
          const traitsPack = rasgosItems.map((r: any) => ({
            personaje_id: payload.autor_id,
            rasgo_id: r.id
          }));
          await adminClient.from('reg_personajes_rasgos').upsert(traitsPack, { onConflict: 'personaje_id,rasgo_id', ignoreDuplicates: true });
        }
      }

      // 4. Notificar por Discord si es un reparto de premios de evento (como Embed)
      if (payload.subtipo === 'evento_premios') {
        try {
          const announcementChannelId = (await MasterServerService.getConfiguracion(adminClient, 'discord_event_announcement_channel_id'))
            || (await MasterServerService.getConfiguracion(adminClient, 'discord_event_channel_id'));

          if (announcementChannelId) {
            const origin = new URL(request.url).origin;
            const roleMention = await buildMentionText(adminClient, payload.data?.ping_roles);

            const eventoId = payload.data?.evento_id;
            const targetUrl = eventoId ? `${origin}/noticias?id=${eventoId}` : `${origin}/noticias`;

            const titulo = payload.data?.titulo || 'Reparto de Premios de Evento';
            const notaEntrega = payload.data?.texto_entrega?.trim() || '';

            const embedImageUrl = payload.data?.url_imagen?.trim() || payload.data?.evento_url_imagen?.trim() || undefined;

            const announcementEmbed = {
              title: titulo.toUpperCase(),
              description: `${notaEntrega ? notaEntrega + '\n\n' : ''}🔗 **[Ver Desglose de Premios en la Web](${targetUrl})**`,
              color: 0xD6852D,
              image: embedImageUrl ? { url: embedImageUrl } : undefined,
              footer: { text: 'NRPG • PREMIOS DE EVENTO' }
            };

            const discordMsg = await sendDiscordEmbed(announcementChannelId, announcementEmbed, roleMention || undefined);

            // Guardar IDs de Discord y eliminar el texto de la BD para ahorrar espacio en Supabase
            const cleanData = { ...registro.data, discord_message_id: discordMsg?.id || null, discord_channel_id: announcementChannelId };

            await adminClient.from('reg_registros').update({ data: cleanData }).eq('id', registro.id);
            registro.data = cleanData;
          }
        } catch (discordErr) {
          console.error('Error sending event rewards notification to Discord:', discordErr);
        }
      }

      // 5. Notificar por Discord si es una narración
      if (payload.subtipo === 'narracion') {
        const updatedData = await syncNarrationDiscordMessage(adminClient, request.url, registro.id, payload.data);
        registro.data = updatedData;
      }

      return NextResponse.json(registro);
    }

    if (action === 'update') {
      // 1. Obtener el registro viejo y sus participantes actuales
      const { data: oldRegistro } = await adminClient.from('reg_registros').select('*').eq('id', id).single();
      const { data: currentDbParticipants } = await adminClient.from('reg_registros_participantes').select('*').eq('registro_id', id);

      if (!oldRegistro) throw new Error('Registro no encontrado');

      const updatedData = {
        discord_message_id: oldRegistro.data?.discord_message_id || null,
        discord_channel_id: oldRegistro.data?.discord_channel_id || null,
        ...payload.data,
        fecha_modificacion: new Date().toISOString()
      };

      // 2. Actualizar el registro base
      const { error: updateError } = await adminClient
        .from('reg_registros')
        .update({
          subtipo: payload.subtipo,
          data: updatedData
        })
        .eq('id', id);

      if (updateError) throw updateError;

      if (payload.subtipo === 'evento_premios') {
        try {
          const announcementChannelId = oldRegistro.data?.discord_channel_id
            || (await MasterServerService.getConfiguracion(adminClient, 'discord_event_announcement_channel_id'))
            || (await MasterServerService.getConfiguracion(adminClient, 'discord_event_channel_id'));

          const messageId = oldRegistro.data?.discord_message_id;

          if (announcementChannelId) {
            const origin = new URL(request.url).origin;
            const roleMention = await buildMentionText(adminClient, payload.data?.ping_roles);

            const eventoId = payload.data?.evento_id;
            const targetUrl = eventoId ? `${origin}/noticias?id=${eventoId}` : `${origin}/noticias`;

            const titulo = payload.data?.titulo || 'Reparto de Premios de Evento';
            const notaEntrega = payload.data?.texto_entrega?.trim() || '';

            const embedImageUrl = payload.data?.url_imagen?.trim() || payload.data?.evento_url_imagen?.trim() || undefined;

            const announcementEmbed = {
              title: titulo.toUpperCase(),
              description: `${notaEntrega ? notaEntrega + '\n\n' : ''}🔗 **[Ver Desglose de Premios en la Web](${targetUrl})**`,
              color: 0xD6852D,
              image: embedImageUrl ? { url: embedImageUrl } : undefined,
              footer: { text: 'NRPG • PREMIOS DE EVENTO' }
            };

            if (messageId) {
              await editDiscordEmbed(announcementChannelId, messageId, announcementEmbed, roleMention || undefined);
            } else {
              const discordMsg = await sendDiscordEmbed(announcementChannelId, announcementEmbed, roleMention || undefined);
              updatedData.discord_message_id = discordMsg?.id || null;
              updatedData.discord_channel_id = announcementChannelId;
            }
          }
        } catch (discordErr) {
          console.error('Error updating event rewards notification in Discord:', discordErr);
        }

        await adminClient.from('reg_registros').update({ data: updatedData }).eq('id', id);
      }

      if (!payload.participantes_ids) return NextResponse.json({ success: true });

      const newParticipantIds = payload.participantes_ids;
      const oldParticipants = currentDbParticipants || [];
      const oldParticipantIds = oldParticipants.map(p => p.personaje_id);

      // A. ELIMINADOS: En la DB vieja pero NO en la nueva lista (se les retiran los premios si ya habían aceptado)
      const removedParticipants = oldParticipants.filter(p => !newParticipantIds.includes(p.personaje_id));
      for (const p of removedParticipants) {
        if (p.estado === 'aceptado') {
          const { xp, ryous, pa } = RewardLogic.calculateReward(oldRegistro, p.personaje_id);

          let extraMonedaEvento = 0;
          let glosarioItems: any[] = [];
          if (oldRegistro.subtipo === 'evento_premios' || oldRegistro.subtipo === 'narracion') {
            const oldPartPremio = oldRegistro.data.participantes_premios?.find((pItem: any) => Number(pItem.personaje_id) === Number(p.personaje_id));
            const oldGlobalMonedas = Number(oldRegistro.data.global_monedas_evento) || 0;
            extraMonedaEvento = oldGlobalMonedas + (Number(oldPartPremio?.monedas_evento) || 0);
            glosarioItems = oldPartPremio?.glosario_items || [];
          }

          const { data: char } = await adminClient.from('reg_characters').select('xp, ryous, puntos_aprendizaje, moneda_evento').eq('id', p.personaje_id).single();
          if (char) {
            await adminClient.from('reg_characters').update({
              xp: Math.max(0, (char.xp || 0) - xp),
              ryous: Math.max(0, (char.ryous || 0) - ryous),
              puntos_aprendizaje: Math.max(0, (char.puntos_aprendizaje || 0) - pa),
              moneda_evento: Math.max(0, (char.moneda_evento || 0) - extraMonedaEvento)
            }).eq('id', p.personaje_id);
          }

          if (glosarioItems.length > 0) {
            const itemIds = glosarioItems.filter((i: any) => Number(i.categoria_id) === 2).map((i: any) => i.id);
            const techIds = glosarioItems.filter((i: any) => Number(i.categoria_id) !== 2).map((i: any) => i.id);

            if (itemIds.length > 0) {
              await adminClient.from('reg_personajes_inventario').delete().eq('personaje_id', p.personaje_id).in('item_id', itemIds);
            }
            if (techIds.length > 0) {
              await adminClient.from('reg_personajes_tecnicas').delete().eq('personaje_id', p.personaje_id).in('tecnica_id', techIds);
            }
          }
        }
        await adminClient.from('reg_registros_participantes').delete().eq('id', p.id);
      }

      // B. AÑADIDOS: En la nueva lista pero NO en la DB vieja (se añaden como 'pendiente' para esperar su aceptación manual)
      const addedParticipantIds = newParticipantIds.filter((pid: number) => !oldParticipantIds.includes(pid));
      const autorId = payload.autor_id || oldRegistro.autor_id;
      for (const pid of addedParticipantIds) {
        const isAutor = autorId ? pid === autorId : false;
        const estado = isAutor ? 'aceptado' : 'pendiente';

        const { data: newPart } = await adminClient
          .from('reg_registros_participantes')
          .insert({
            registro_id: id,
            personaje_id: pid,
            estado
          })
          .select()
          .single();

        if (isAutor && newPart) {
          const newRegistroFull = { ...oldRegistro, subtipo: payload.subtipo, data: payload.data };
          const { xp, ryous, pa } = RewardLogic.calculateReward(newRegistroFull, pid);

          let extraMonedaEvento = 0;
          let glosarioItems: any[] = [];
          if (newRegistroFull.subtipo === 'evento_premios' || newRegistroFull.subtipo === 'narracion') {
            const partPremio = newRegistroFull.data.participantes_premios?.find((pItem: any) => Number(pItem.personaje_id) === Number(pid));
            const globalMonedas = Number(newRegistroFull.data.global_monedas_evento) || 0;
            if (partPremio) {
              extraMonedaEvento = globalMonedas + (Number(partPremio.monedas_evento) || 0);
              glosarioItems = partPremio.glosario_items || [];
            } else {
              extraMonedaEvento = globalMonedas;
            }
          }

          const { data: char } = await adminClient.from('reg_characters').select('xp, ryous, puntos_aprendizaje, moneda_evento').eq('id', pid).single();
          if (char) {
            await adminClient.from('reg_characters').update({
              xp: (char.xp || 0) + xp,
              ryous: (char.ryous || 0) + ryous,
              puntos_aprendizaje: (char.puntos_aprendizaje || 0) + pa,
              moneda_evento: (char.moneda_evento || 0) + extraMonedaEvento
            }).eq('id', pid);
          }

          if (glosarioItems.length > 0) {
            const inventoryPack = glosarioItems
              .filter((i: any) => Number(i.categoria_id) === 2)
              .map((i: any) => ({ personaje_id: pid, item_id: i.id }));

            const techniquesPack = glosarioItems
              .filter((i: any) => Number(i.categoria_id) !== 2)
              .map((i: any) => ({ personaje_id: pid, tecnica_id: i.id }));

            if (inventoryPack.length > 0) {
              await adminClient.from('reg_personajes_inventario').insert(inventoryPack);
            }
            if (techniquesPack.length > 0) {
              await adminClient.from('reg_personajes_tecnicas').insert(techniquesPack);
            }
          }
        }
      }

      // C. EXISTENTES: En ambas listas. Si ya aceptaron, ajustamos diferencias
      const existingParticipants = oldParticipants.filter(p => newParticipantIds.includes(p.personaje_id));
      const newRegistroFull = { ...oldRegistro, subtipo: payload.subtipo, data: payload.data };
      for (const p of existingParticipants) {
        if (p.estado === 'aceptado') {
          const oldRewards = RewardLogic.calculateReward(oldRegistro, p.personaje_id);
          const newRewards = RewardLogic.calculateReward(newRegistroFull, p.personaje_id);

          const diffXp = newRewards.xp - oldRewards.xp;
          const diffRyous = newRewards.ryous - oldRewards.ryous;
          const diffPa = newRewards.pa - oldRewards.pa;

          let oldExtraME = 0;
          let oldGlosario: any[] = [];
          let newExtraME = 0;
          let newGlosario: any[] = [];

          if (oldRegistro.subtipo === 'evento_premios' || oldRegistro.subtipo === 'narracion') {
            const oldPartPremio = oldRegistro.data.participantes_premios?.find((pItem: any) => Number(pItem.personaje_id) === Number(p.personaje_id));
            const oldGlobalMonedas = Number(oldRegistro.data.global_monedas_evento) || 0;
            oldExtraME = oldGlobalMonedas + (Number(oldPartPremio?.monedas_evento) || 0);
            oldGlosario = oldPartPremio?.glosario_items || [];
          }
          if (newRegistroFull.subtipo === 'evento_premios' || newRegistroFull.subtipo === 'narracion') {
            const newPartPremio = newRegistroFull.data.participantes_premios?.find((pItem: any) => Number(pItem.personaje_id) === Number(p.personaje_id));
            const newGlobalMonedas = Number(newRegistroFull.data.global_monedas_evento) || 0;
            newExtraME = newGlobalMonedas + (Number(newPartPremio?.monedas_evento) || 0);
            newGlosario = newPartPremio?.glosario_items || [];
          }

          const diffME = newExtraME - oldExtraME;

          if (diffXp !== 0 || diffRyous !== 0 || diffPa !== 0 || diffME !== 0) {
            const { data: char } = await adminClient.from('reg_characters').select('xp, ryous, puntos_aprendizaje, moneda_evento').eq('id', p.personaje_id).single();
            if (char) {
              await adminClient.from('reg_characters').update({
                xp: Math.max(0, (char.xp || 0) + diffXp),
                ryous: Math.max(0, (char.ryous || 0) + diffRyous),
                puntos_aprendizaje: Math.max(0, (char.puntos_aprendizaje || 0) + diffPa),
                moneda_evento: Math.max(0, (char.moneda_evento || 0) + diffME)
              }).eq('id', p.personaje_id);
            }
          }

          if (oldRegistro.subtipo === 'evento_premios' || oldRegistro.subtipo === 'narracion' || newRegistroFull.subtipo === 'evento_premios' || newRegistroFull.subtipo === 'narracion') {
            const oldItemIds = oldGlosario.filter((i: any) => Number(i.categoria_id) === 2).map((i: any) => i.id);
            const oldTechIds = oldGlosario.filter((i: any) => Number(i.categoria_id) !== 2).map((i: any) => i.id);

            if (oldItemIds.length > 0) {
              await adminClient.from('reg_personajes_inventario').delete().eq('personaje_id', p.personaje_id).in('item_id', oldItemIds);
            }
            if (oldTechIds.length > 0) {
              await adminClient.from('reg_personajes_tecnicas').delete().eq('personaje_id', p.personaje_id).in('tecnica_id', oldTechIds);
            }

            const inventoryPack = newGlosario
              .filter((i: any) => Number(i.categoria_id) === 2)
              .map((i: any) => ({ personaje_id: p.personaje_id, item_id: i.id }));

            const techniquesPack = newGlosario
              .filter((i: any) => Number(i.categoria_id) !== 2)
              .map((i: any) => ({ personaje_id: p.personaje_id, tecnica_id: i.id }));

            if (inventoryPack.length > 0) {
              await adminClient.from('reg_personajes_inventario').insert(inventoryPack);
            }
            if (techniquesPack.length > 0) {
              await adminClient.from('reg_personajes_tecnicas').insert(techniquesPack);
            }
          }
        }
      }

      if (payload.subtipo === 'narracion') {
        await syncNarrationDiscordMessage(adminClient, request.url, id, updatedData, oldRegistro.data);
      }

      return NextResponse.json({ success: true });
    }

    if (action === 'delete') {
      // 1. Obtener participantes y registro para revertir recompensas
      const { data: registro } = await adminClient.from('reg_registros').select('*').eq('id', id).single();
      const { data: participantes } = await adminClient.from('reg_registros_participantes').select('*').eq('registro_id', id);

      if (registro) {
        if (registro.subtipo === 'narracion' && registro.data?.discord_message_id && registro.data?.discord_channel_id) {
          try {
            await deleteDiscordMessage(registro.data.discord_channel_id, registro.data.discord_message_id);
          } catch (dErr) {
            console.error('Error deleting narration message in Discord:', dErr);
          }
        }

        if (participantes) {
          for (const p of participantes) {
            if (p.estado === 'aceptado') {
              const { xp, ryous, pa } = RewardLogic.calculateReward(registro, p.personaje_id);

              let extraMonedaEvento = 0;
              let glosarioItems: any[] = [];
              if (registro.subtipo === 'evento_premios' || registro.subtipo === 'narracion') {
                const partPremio = registro.data.participantes_premios?.find((pItem: any) => Number(pItem.personaje_id) === Number(p.personaje_id));
                const globalMonedas = Number(registro.data.global_monedas_evento) || 0;
                extraMonedaEvento = globalMonedas + (Number(partPremio?.monedas_evento) || 0);
                glosarioItems = partPremio?.glosario_items || [];
              }

              const { data: char } = await adminClient.from('reg_characters').select('xp, ryous, puntos_aprendizaje, moneda_evento').eq('id', p.personaje_id).single();
              if (char) {
                await adminClient.from('reg_characters').update({
                  xp: Math.max(0, (char.xp || 0) - xp),
                  ryous: Math.max(0, (char.ryous || 0) - ryous),
                  puntos_aprendizaje: Math.max(0, (char.puntos_aprendizaje || 0) - pa),
                  moneda_evento: Math.max(0, (char.moneda_evento || 0) - extraMonedaEvento)
                }).eq('id', p.personaje_id);
              }

              if (glosarioItems.length > 0) {
                const itemIds = glosarioItems.filter((i: any) => Number(i.categoria_id) === 2).map((i: any) => i.id);
                const techIds = glosarioItems.filter((i: any) => Number(i.categoria_id) !== 2).map((i: any) => i.id);

                if (itemIds.length > 0) {
                  await adminClient.from('reg_personajes_inventario').delete().eq('personaje_id', p.personaje_id).in('item_id', itemIds);
                }
                if (techIds.length > 0) {
                  await adminClient.from('reg_personajes_tecnicas').delete().eq('personaje_id', p.personaje_id).in('tecnica_id', techIds);
                }
              }
            }
          }
        }

        if (registro.tipo === 'accion') {
          const spentXp = Number(registro.data?.gasto_xp) || 0;
          const spentRyous = Number(registro.data?.gasto_ryous) || 0;
          const spentPA = Number(registro.data?.gasto_pa) || 0;

          if (spentXp > 0 || spentRyous > 0 || spentPA > 0) {
            const { data: char } = await adminClient.from('reg_characters').select('xp, ryous, puntos_aprendizaje').eq('id', registro.autor_id).single();
            if (char) {
              await adminClient.from('reg_characters').update({
                xp: (char.xp || 0) + spentXp,
                ryous: (char.ryous || 0) + spentRyous,
                puntos_aprendizaje: (char.puntos_aprendizaje || 0) + spentPA
              }).eq('id', registro.autor_id);
            }
          }
        }
      }

      await adminClient.from('reg_registros_participantes').delete().eq('registro_id', id);
      const { error } = await adminClient
        .from('reg_registros')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
  } catch (error: any) {
    console.error('API Registros Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
