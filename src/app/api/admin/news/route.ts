import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { ProfileService } from '@/services/supabase/profile.service';
import { MasterServerService } from '@/services/supabase/master.server.service';
import { sendDiscordMessage, editDiscordMessage } from '@/lib/discord';
import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const adminClient = createAdminClient();
    const profile = await ProfileService.getProfile(user.id, adminClient);
    const isAdmin = profile?.roles?.includes('admin') || profile?.roles?.includes('moderador') || user.user_metadata?.role === 'admin' || user.app_metadata?.role === 'admin';

    if (!isAdmin) {
      return NextResponse.json({ error: 'No tienes permisos de administrador para esta acción' }, { status: 403 });
    }

    const { id, titulo, categoria, url_imagen, descripcion, activo, discord_msg_id, discord_content, ping_role } = await request.json();

    const cleanData: any = {
      titulo,
      categoria,
      url_imagen: url_imagen?.trim() || null,
      descripcion: descripcion?.trim() || null,
      activo
    };

    if (categoria === 'Evento' && discord_content) {
      const eventChannelId = await MasterServerService.getConfiguracion(adminClient, 'discord_event_channel_id');
      if (!eventChannelId) {
        return NextResponse.json({ error: 'Canal de Discord para eventos (discord_event_channel_id) no configurado en el sistema' }, { status: 400 });
      }

      // Determine Discord role mention
      let mentionText = '';
      if (ping_role === 'everyone') {
        mentionText = '@everyone';
      } else if (ping_role === 'here') {
        mentionText = '@here';
      } else if (ping_role === 'none') {
        mentionText = '';
      } else if (ping_role && ping_role !== 'default') {
        mentionText = `<@&${ping_role}>`;
      } else {
        const jugadorRoleId = await MasterServerService.getConfiguracion(adminClient, 'discord_jugador_role_id');
        mentionText = jugadorRoleId ? `<@&${jugadorRoleId}>` : '';
      }

      if (id) {
        // Edit existing event
        const { data: existingItem, error: fetchErr } = await adminClient
          .from('info_noticias_index')
          .select('discord_msg_id')
          .eq('id', id)
          .single();

        if (fetchErr || !existingItem) {
          return NextResponse.json({ error: 'No se encontró el evento a actualizar' }, { status: 404 });
        }

        const msgId = existingItem.discord_msg_id;
        if (msgId) {
          try {
            await editDiscordMessage(eventChannelId, msgId, discord_content);
          } catch (discordErr: any) {
            console.error('Error updating Discord message:', discordErr);
          }
        }

        cleanData.discord_msg_id = msgId;

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
        // Create new event with ping role if specified
        const eventContentWithPing = mentionText ? `${mentionText}\n${discord_content}` : discord_content;
        const discordMsg = await sendDiscordMessage(eventChannelId, eventContentWithPing);
        cleanData.discord_msg_id = discordMsg.id;

        const { data: inserted, error: insertErr } = await adminClient
          .from('info_noticias_index')
          .insert([cleanData])
          .select()
          .single();

        if (insertErr) throw insertErr;

        // Post announcement to the announcements channel if configured
        const announcementChannelId = await MasterServerService.getConfiguracion(adminClient, 'discord_event_announcement_channel_id');
        if (announcementChannelId) {
          const origin = new URL(request.url).origin;
          const announcementText = `${mentionText ? mentionText + '\n' : ''}**¡Nuevo Evento Publicado!**\n**Título:** ${titulo}\n**Enlace a la web:** ${origin}/noticias`;
          try {
            await sendDiscordMessage(announcementChannelId, announcementText);
          } catch (announcementErr) {
            console.error('Error sending event announcement to Discord:', announcementErr);
          }
        }

        revalidatePath('/noticias');

        return NextResponse.json(inserted);
      }
    } else {
      // Standard flow (Noticia, Parche, or Evento without direct discord_content)
      cleanData.discord_msg_id = discord_msg_id?.trim() || null;

      if (id) {
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
        const { data: inserted, error: insertErr } = await adminClient
          .from('info_noticias_index')
          .insert([cleanData])
          .select()
          .single();

        if (insertErr) throw insertErr;

        // Post announcement to the news/patch channel if configured
        const isNoticia = categoria === 'Noticia';
        const isParche = categoria === 'Parche';
        const channelKey = isNoticia ? 'discord_news_channel_id' : isParche ? 'discord_patch_channel_id' : null;

        if (channelKey) {
          const targetChannelId = await MasterServerService.getConfiguracion(adminClient, channelKey);
          if (targetChannelId) {
            const origin = new URL(request.url).origin;
            const jugadorRoleId = await MasterServerService.getConfiguracion(adminClient, 'discord_jugador_role_id');
            const roleMention = jugadorRoleId ? `<@&${jugadorRoleId}>` : '';
            const typeLabel = isNoticia ? 'Nueva Noticia' : 'Nuevo Parche';
            const actionVerb = isNoticia ? 'Publicada' : 'Publicado';

            let announcementText = `${roleMention}\n**¡${typeLabel} ${actionVerb}!**\n**Título:** ${titulo}\n**Enlace a la web:** ${origin}/noticias`;

            try {
              await sendDiscordMessage(targetChannelId, announcementText);
            } catch (announcementErr) {
              console.error(`Error sending ${categoria} announcement to Discord:`, announcementErr);
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
    const isAdmin = profile?.roles?.includes('admin') || profile?.roles?.includes('moderador') || user.user_metadata?.role === 'admin' || user.app_metadata?.role === 'admin';

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
