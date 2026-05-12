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
    throw new Error(`Error de Discord (GET): ${JSON.stringify(error)}`);
  }

  return response.json();
}
export async function getDiscordChannel(supabase: any) {
  const { data: config } = await supabase
    .from('configuracion_sistema')
    .select('valor')
    .eq('clave', 'discord_history_appearance_channel_id')
    .single();
  return config?.valor as string;
}
