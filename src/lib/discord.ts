const DISCORD_API_URL = 'https://discord.com/api/v10';
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

export async function sendDiscordMessage(channelId: string, content: string) {
  if (!BOT_TOKEN) throw new Error('DISCORD_BOT_TOKEN no configurado');

  const response = await fetch(`${DISCORD_API_URL}/channels/${channelId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bot ${BOT_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ content }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Error de Discord (POST): ${JSON.stringify(error)}`);
  }

  return response.json();
}

export async function editDiscordMessage(channelId: string, messageId: string, content: string) {
  if (!BOT_TOKEN) throw new Error('DISCORD_BOT_TOKEN no configurado');

  const response = await fetch(`${DISCORD_API_URL}/channels/${channelId}/messages/${messageId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bot ${BOT_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ content }),
  });

  if (!response.ok) {
    const error = await response.json();
    // Mensaje eliminado en Discord — ignorar silenciosamente
    if (error?.code === 10008) return null;
    throw new Error(`Error de Discord (PATCH): ${JSON.stringify(error)}`);
  }

  return response.json();
}

export async function getDiscordMessage(channelId: string, messageId: string) {
  if (!BOT_TOKEN) throw new Error('DISCORD_BOT_TOKEN no configurado');

  const response = await fetch(`${DISCORD_API_URL}/channels/${channelId}/messages/${messageId}`, {
    method: 'GET',
    headers: {
      Authorization: `Bot ${BOT_TOKEN}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    // Mensaje eliminado o no encontrado — devolver null en lugar de lanzar error
    if (error?.code === 10008) return null;
    throw new Error(`Error de Discord (GET): ${JSON.stringify(error)}`);
  }

  return response.json();
}
export async function getDiscordChannel(supabase: any): Promise<string | null> {
  const { MasterServerService } = await import('@/services/supabase/master.server.service');
  return MasterServerService.getConfiguracion(supabase, 'discord_history_appearance_channel_id');
}
