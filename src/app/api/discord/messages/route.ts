import { createClient } from '@/utils/supabase/server';
import { sendDiscordMessage, editDiscordMessage, getDiscordMessage, getDiscordChannel } from '@/lib/discord';
import { NextResponse } from 'next/server';
import { MasterServerService } from '@/services/supabase/master.server.service';
import { CharacterServerService } from '@/services/supabase/character.server.service';


export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const messageId = searchParams.get('messageId');
  const categoria = searchParams.get('categoria')?.toLowerCase();
  const explicitChannelId = searchParams.get('channelId');

  if (!messageId) {
    return NextResponse.json({ error: 'Falta messageId' }, { status: 400 });
  }

  const token = process.env.DISCORD_BOT_TOKEN;

  try {
    const supabase = await createClient();

    let channelId = explicitChannelId?.trim() || null;

    if (!channelId) {
      let configKey = 'discord_history_appearance_channel_id';
      if (categoria === 'noticia') {
        configKey = 'discord_news_channel_id';
      } else if (categoria === 'parche') {
        configKey = 'discord_patch_channel_id';
      } else if (categoria === 'evento') {
        const announcementChan = await MasterServerService.getConfiguracion(supabase, 'discord_event_announcement_channel_id');
        configKey = announcementChan ? 'discord_event_announcement_channel_id' : 'discord_event_channel_id';
      }

      channelId = await MasterServerService.getConfiguracion(supabase, configKey);
    }

    if (!channelId || !token) {
      console.warn(`[Discord API] Bot token o canal (${channelId || 'desconocido'}) no configurados. Cargando mock fallback.`);
      return NextResponse.json({
        content: "Contenido no disponible (Canal de Discord o token no configurados en el sistema).",
        timestamp: new Date().toISOString()
      }, { status: 200 });
    }

    try {
      const discordMsg = await getDiscordMessage(channelId, messageId);

      // Mensaje no encontrado en Discord (eliminado o canal incorrecto)
      if (!discordMsg) {
        return NextResponse.json({
          content: "Contenido no disponible o mensaje eliminado en Discord.",
          timestamp: new Date().toISOString()
        }, { status: 200 });
      }

      const extractedContent = discordMsg.embeds?.[0]?.description || discordMsg.content || "Contenido no disponible.";

      return NextResponse.json({
        content: extractedContent,
        timestamp: discordMsg.timestamp || new Date().toISOString()
      }, {
        headers: {
          'Cache-Control': 'public, max-age=300, s-maxage=1800, stale-while-revalidate=86400',
        }
      });
    } catch (discordError: any) {
      console.error(`[Discord API] Error recuperando mensaje ${messageId} en canal ${channelId}:`, discordError.message);

      return NextResponse.json({
        content: "Contenido no disponible (canal de Discord incorrecto, privado o mensaje inexistente).",
        timestamp: new Date().toISOString()
      }, {
        status: 200,
        headers: {
          'Cache-Control': 'public, max-age=60, s-maxage=300',
        }
      });
    }
  } catch (error: any) {
    console.error('API Error (GET) general:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { personaje_id, content, tipo } = await request.json();

    if (!personaje_id || !content || !tipo) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }

    const supabase = await createClient();

    const channelId = await getDiscordChannel(supabase);
    if (!channelId) {
      throw new Error('Canal de Discord no configurado en el sistema');
    }

    const discordMsg = await sendDiscordMessage(channelId, content);

    await CharacterServerService.insertPersonajeMensaje(supabase, personaje_id, discordMsg.id, tipo);

    return NextResponse.json({ success: true, messageId: discordMsg.id });
  } catch (error: any) {
    console.error('API Error (POST):', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { messageId, content } = await request.json();

    if (!messageId || !content) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }

    const supabase = await createClient();
    const channelId = await getDiscordChannel(supabase);

    if (!channelId) {
      throw new Error('Canal de Discord no configurado en el sistema');
    }

    await editDiscordMessage(channelId, messageId, content);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('API Error (PATCH):', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
