import { createClient } from '@/utils/supabase/server';
import { sendDiscordMessage, editDiscordMessage, getDiscordMessage } from '@/lib/discord';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const messageId = searchParams.get('messageId');

  if (!messageId) {
    return NextResponse.json({ error: 'Falta messageId' }, { status: 400 });
  }

  try {
    const supabase = await createClient();
    
    // Obtener el canal de la configuración
    const { data: config } = await supabase
      .from('configuracion_sistema')
      .select('valor')
      .eq('clave', 'discord_history_appearance_channel_id')
      .single();

    const channelId = config?.valor as string;

    if (!channelId) {
      throw new Error('Canal de Discord no configurado en el sistema');
    }

    const discordMsg = await getDiscordMessage(channelId, messageId);
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

    // 1. Obtener canal de Discord
    const { data: config } = await supabase
      .from('configuracion_sistema')
      .select('valor')
      .eq('clave', 'discord_history_appearance_channel_id')
      .single();

    const channelId = config?.valor as string;

    if (!channelId) {
      throw new Error('Canal de Discord no configurado en el sistema');
    }

    // 2. Enviar a Discord
    const discordMsg = await sendDiscordMessage(channelId, content);

    // 3. Guardar en Supabase
    const { error: dbError } = await supabase
      .from('personajes_mensajes')
      .insert({
        personaje_id,
        discord_message_id: discordMsg.id,
        tipo,
      });

    if (dbError) throw dbError;

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

    // 1. Obtener canal de Discord
    const { data: config } = await supabase
      .from('configuracion_sistema')
      .select('valor')
      .eq('clave', 'discord_history_appearance_channel_id')
      .single();

    const channelId = config?.valor as string;

    if (!channelId) {
      throw new Error('Canal de Discord no configurado en el sistema');
    }

    // 2. Editar en Discord
    await editDiscordMessage(channelId, messageId, content);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('API Error (PATCH):', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
