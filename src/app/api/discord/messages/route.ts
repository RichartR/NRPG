import { createClient } from '@/utils/supabase/server';
import { sendDiscordMessage, editDiscordMessage, getDiscordMessage, getDiscordChannel } from '@/lib/discord';
import { NextResponse } from 'next/server';
import { MasterServerService } from '@/services/supabase/master.server.service';
import { CharacterServerService } from '@/services/supabase/character.server.service';


export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const messageId = searchParams.get('messageId');

  if (!messageId) {
    return NextResponse.json({ error: 'Falta messageId' }, { status: 400 });
  }

  try {
    const supabase = await createClient();
    const channelId = await MasterServerService.getConfiguracion(supabase, 'discord_history_appearance_channel_id');

    if (!channelId) {
      throw new Error('Canal de Discord no configurado en el sistema');
    }

    const discordMsg = await getDiscordMessage(channelId, messageId);

    // Mensaje no encontrado en Discord (eliminado o canal incorrecto)
    if (!discordMsg) {
      return NextResponse.json({ content: null, deleted: true }, { status: 200 });
    }

    return NextResponse.json(discordMsg);
  } catch (error: any) {
    console.error('API Error (GET):', error);
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
