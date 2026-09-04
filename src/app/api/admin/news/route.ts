import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { ProfileService } from '@/services/supabase/profile.service';
import { MasterServerService } from '@/services/supabase/master.server.service';
import { sendDiscordMessage, editDiscordMessage, sendDiscordEmbed, editDiscordEmbed } from '@/lib/discord';
import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getURL } from '@/lib/utils/url';

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

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const adminClient = createAdminClient();
    const profile = await ProfileService.getProfile(user.id, adminClient);
    const isAdmin = profile?.roles?.some((r: string) => ['admin', 'moderador', 'narrador'].includes(r)) || user.user_metadata?.role === 'admin' || user.app_metadata?.role === 'admin';

    if (!isAdmin) {
      return NextResponse.json({ error: 'No tienes permisos de administrador para esta acción' }, { status: 403 });
    }

    const body = await request.json();
    const { id, titulo, categoria, url_imagen, descripcion, activo, discord_msg_id, discord_content, ping_roles, discord_announcement_msg_id } = body;

    const cleanData: any = {};
    if (titulo !== undefined) cleanData.titulo = titulo;
    if (categoria !== undefined) cleanData.categoria = categoria;
    if (url_imagen !== undefined) cleanData.url_imagen = url_imagen?.trim() || null;
    if (descripcion !== undefined) cleanData.descripcion = descripcion?.trim() || null;
    if (activo !== undefined) cleanData.activo = activo;
    if (discord_msg_id !== undefined) cleanData.discord_msg_id = discord_msg_id?.trim() || null;
    if (discord_announcement_msg_id !== undefined) cleanData.discord_announcement_msg_id = discord_announcement_msg_id?.trim() || null;

    const isNoticia = categoria === 'Noticia';
    const isParche = categoria === 'Parche';
    const channelKey = isNoticia
      ? 'discord_news_channel_id'
      : isParche
      ? 'discord_patch_channel_id'
      : 'discord_event_channel_id';

    if (discord_content) {
      const targetChannelId = await MasterServerService.getConfiguracion(adminClient, channelKey);
      if (!targetChannelId) {
        return NextResponse.json({ error: `Canal de Discord (${channelKey}) no configurado en el sistema` }, { status: 400 });
      }

      const mentionText = await buildMentionText(adminClient, ping_roles);
      const typeTag = (categoria || 'NOTICIA').toUpperCase();
      const origin = getURL().replace(/\/$/, '');

      if (id) {
        // Edit existing item
        const targetUrl = `${origin}/noticias?id=${id}`;
        const webLinkText = `🔗 **[Ver enlace](${targetUrl})**`;
        const descriptionWithLink = (discord_content.includes('Ver enlace') || discord_content.includes('Ver en la Web'))
          ? discord_content
          : `${discord_content}\n\n${webLinkText}`;

        const embedData = {
          title: titulo,
          description: descriptionWithLink,
          color: 0xD6852D,
          image: url_imagen?.trim() ? { url: url_imagen.trim() } : undefined,
          footer: { text: `NRPG • ${typeTag}` }
        };

        const { data: existingItem, error: fetchErr } = await adminClient
          .from('info_noticias_index')
          .select('discord_msg_id, discord_announcement_msg_id')
          .eq('id', id)
          .single();

        if (fetchErr || !existingItem) {
          return NextResponse.json({ error: 'No se encontró el elemento a actualizar' }, { status: 404 });
        }

        const msgId = existingItem.discord_msg_id;
        if (msgId && !msgId.startsWith('http')) {
          try {
            await editDiscordEmbed(targetChannelId, msgId, embedData, mentionText || undefined);
          } catch (discordErr: any) {
            console.error(`Error updating Discord ${categoria} embed:`, discordErr);
          }
        } else {
          try {
            const newMsg = await sendDiscordEmbed(targetChannelId, embedData, mentionText || undefined);
            if (newMsg?.id) cleanData.discord_msg_id = newMsg.id;
          } catch (discordErr: any) {
            console.error(`Error posting new Discord ${categoria} embed on edit:`, discordErr);
          }
        }

        // Also update announcement embed if category is Evento and announcement channel exists
        if (categoria === 'Evento') {
          const announcementChannelId = await MasterServerService.getConfiguracion(adminClient, 'discord_event_announcement_channel_id');
          if (announcementChannelId && existingItem.discord_announcement_msg_id) {
            const announcementEmbed = {
              title: `¡NUEVO EVENTO: ${titulo}!`,
              description: `${descripcion?.trim() ? descripcion.trim() + '\n\n' : ''}🔗 **[Ver enlace](${targetUrl})**`,
              color: 0xD6852D,
              image: url_imagen?.trim() ? { url: url_imagen.trim() } : undefined,
              footer: { text: 'NRPG • EVENTO' }
            };
            try {
              await editDiscordEmbed(announcementChannelId, existingItem.discord_announcement_msg_id, announcementEmbed, mentionText || undefined);
            } catch (annErr) {
              console.error('Error updating Discord event announcement embed:', annErr);
            }
          }
        }

        const { data: updated, error: updateErr } = await adminClient
          .from('info_noticias_index')
          .update(cleanData)
          .eq('id', id)
          .select()
          .single();

        if (updateErr) throw updateErr;

        revalidatePath('/noticias');

        return NextResponse.json(updated);
      } else {
        // Create new item - send Discord embed first to get a unique discord_msg_id for DB insert
        const initialEmbedData = {
          title: titulo,
          description: discord_content,
          color: 0xD6852D,
          image: url_imagen?.trim() ? { url: url_imagen.trim() } : undefined,
          footer: { text: `NRPG • ${typeTag}` }
        };

        let discordMsgId: string | null = null;
        try {
          const discordMsg = await sendDiscordEmbed(targetChannelId, initialEmbedData, mentionText || undefined);
          if (discordMsg?.id) discordMsgId = discordMsg.id;
        } catch (discordErr: any) {
          console.error(`Error posting initial Discord ${categoria} embed:`, discordErr);
        }

        if (discordMsgId && !cleanData.discord_msg_id?.startsWith('http')) {
          cleanData.discord_msg_id = discordMsgId;
        }

        const { data: inserted, error: insertErr } = await adminClient
          .from('info_noticias_index')
          .insert([cleanData])
          .select()
          .single();

        if (insertErr) throw insertErr;

        const targetUrl = `${origin}/noticias?id=${inserted.id}`;

        // Now edit the Discord embed to include the URL with inserted.id
        if (discordMsgId) {
          const webLinkText = `🔗 **[Ver enlace](${targetUrl})**`;
          const descriptionWithLink = (discord_content.includes('Ver enlace') || discord_content.includes('Ver en la Web'))
            ? discord_content
            : `${discord_content}\n\n${webLinkText}`;

          const finalEmbedData = {
            title: titulo,
            description: descriptionWithLink,
            color: 0xD6852D,
            image: url_imagen?.trim() ? { url: url_imagen.trim() } : undefined,
            footer: { text: `NRPG • ${typeTag}` }
          };

          try {
            await editDiscordEmbed(targetChannelId, discordMsgId, finalEmbedData, mentionText || undefined);
          } catch (editErr: any) {
            console.error(`Error updating Discord ${categoria} embed with target link:`, editErr);
          }
        }

        // Post announcement to event announcement channel if category is Evento
        if (categoria === 'Evento') {
          const announcementChannelId = await MasterServerService.getConfiguracion(adminClient, 'discord_event_announcement_channel_id');
          if (announcementChannelId) {
            const announcementEmbed = {
              title: `¡NUEVO EVENTO: ${titulo}!`,
              description: `${descripcion?.trim() ? descripcion.trim() + '\n\n' : ''}🔗 **[Ver enlace](${targetUrl})**`,
              color: 0xD6852D,
              image: url_imagen?.trim() ? { url: url_imagen.trim() } : undefined,
              footer: { text: 'NRPG • EVENTO' }
            };
            try {
              const annMsg = await sendDiscordEmbed(announcementChannelId, announcementEmbed, mentionText || undefined);
              if (annMsg?.id) {
                await adminClient
                  .from('info_noticias_index')
                  .update({ discord_announcement_msg_id: annMsg.id })
                  .eq('id', inserted.id);
              }
            } catch (announcementErr) {
              console.error('Error sending event announcement Embed to Discord:', announcementErr);
            }
          }
        }

        revalidatePath('/noticias');

        return NextResponse.json(inserted);
      }
    } else {
      // Fallback flow (Noticia, Parche, or Evento without direct discord_content, using document URL)
      if (id) {
        const { data: existingItem } = await adminClient
          .from('info_noticias_index')
          .select('discord_announcement_msg_id')
          .eq('id', id)
          .single();

        const { data: updated, error: updateErr } = await adminClient
          .from('info_noticias_index')
          .update(cleanData)
          .eq('id', id)
          .select()
          .single();

        if (updateErr) throw updateErr;

        // Update announcement Embed if it exists
        if (channelKey && existingItem?.discord_announcement_msg_id) {
          const targetChannelId = await MasterServerService.getConfiguracion(adminClient, channelKey);
          if (targetChannelId) {
            const origin = new URL(request.url).origin;
            const targetUrl = `${origin}/noticias?id=${id}`;
            const typeLabel = isNoticia ? 'NUEVA NOTICIA' : isParche ? 'NUEVO PARCHE' : 'NUEVO ANUNCIO';

            const mentionText = await buildMentionText(adminClient, ping_roles);

            const announcementEmbed = {
              title: `¡${typeLabel}: ${titulo}!`,
              description: `${descripcion?.trim() ? descripcion.trim() + '\n\n' : ''}🔗 **[Ver enlace](${targetUrl})**`,
              color: 0xD6852D,
              image: url_imagen?.trim() ? { url: url_imagen.trim() } : undefined,
              footer: { text: `NRPG • ${categoria.toUpperCase()}` }
            };

            try {
              await editDiscordEmbed(targetChannelId, existingItem.discord_announcement_msg_id, announcementEmbed, mentionText || undefined);
            } catch (annErr) {
              console.error(`Error editing ${categoria} announcement Embed:`, annErr);
            }
          }
        }

        revalidatePath('/noticias');

        return NextResponse.json(updated);
      } else {
        const { data: inserted, error: insertErr } = await adminClient
          .from('info_noticias_index')
          .insert([cleanData])
          .select()
          .single();

        if (insertErr) throw insertErr;

        // Post announcement to the news/patch/event channel if configured (as Embed)
        if (channelKey) {
          const targetChannelId = await MasterServerService.getConfiguracion(adminClient, channelKey);
          if (targetChannelId) {
            const origin = new URL(request.url).origin;
            const targetUrl = `${origin}/noticias?id=${inserted.id}`;
            const isEvento = categoria === 'Evento';
            const typeLabel = isNoticia ? 'NUEVA NOTICIA' : isParche ? 'NUEVO PARCHE' : isEvento ? 'NUEVO EVENTO' : 'NUEVO ANUNCIO';

            const mentionText = await buildMentionText(adminClient, ping_roles);

            const announcementEmbed = {
              title: `¡${typeLabel}: ${titulo}!`,
              description: `${descripcion?.trim() ? descripcion.trim() + '\n\n' : ''}🔗 **[Ver enlace](${targetUrl})**`,
              color: 0xD6852D,
              image: url_imagen?.trim() ? { url: url_imagen.trim() } : undefined,
              footer: { text: `NRPG • ${categoria.toUpperCase()}` }
            };

            try {
              const annMsg = await sendDiscordEmbed(targetChannelId, announcementEmbed, mentionText || undefined);
              if (annMsg?.id) {
                await adminClient
                  .from('info_noticias_index')
                  .update({ discord_announcement_msg_id: annMsg.id })
                  .eq('id', inserted.id);
              }
            } catch (announcementErr) {
              console.error(`Error sending ${categoria} announcement Embed to Discord:`, announcementErr);
            }

            if (isEvento) {
              const announcementChannelId = await MasterServerService.getConfiguracion(adminClient, 'discord_event_announcement_channel_id');
              if (announcementChannelId && announcementChannelId !== targetChannelId) {
                try {
                  await sendDiscordEmbed(announcementChannelId, announcementEmbed, mentionText || undefined);
                } catch (annErr) {
                  console.error('Error sending event announcement Embed in fallback flow:', annErr);
                }
              }
            }
          }
        }

        revalidatePath('/noticias');

        return NextResponse.json(inserted);
      }
    }
  } catch (error: any) {
    console.error('API Admin News Error:', error);
    return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const adminClient = createAdminClient();
    const profile = await ProfileService.getProfile(user.id, adminClient);
    const isAdmin = profile?.roles?.some((r: string) => ['admin', 'moderador', 'narrador'].includes(r)) || user.user_metadata?.role === 'admin' || user.app_metadata?.role === 'admin';

    if (!isAdmin) {
      return NextResponse.json({ error: 'No tienes permisos de administrador para esta acción' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'ID no especificado' }, { status: 400 });
    }

    const { error } = await adminClient.from('info_noticias_index').delete().eq('id', parseInt(id, 10));
    if (error) throw error;

    revalidatePath('/noticias');

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('API Admin News DELETE Error:', error);
    return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
  }
}
