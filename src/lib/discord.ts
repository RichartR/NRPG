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

export async function deleteDiscordMessage(channelId: string, messageId: string) {
  if (!BOT_TOKEN) throw new Error('DISCORD_BOT_TOKEN no configurado');

  const response = await fetch(`${DISCORD_API_URL}/channels/${channelId}/messages/${messageId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bot ${BOT_TOKEN}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    // Mensaje ya eliminado — ignorar
    if (error?.code === 10008) return true;
    throw new Error(`Error de Discord (DELETE): ${JSON.stringify(error)}`);
  }

  return true;
}
export async function getDiscordChannel(supabase: any): Promise<string | null> {
  const { MasterServerService } = await import('@/services/supabase/master.server.service');
  return MasterServerService.getConfiguracion(supabase, 'discord_history_appearance_channel_id');
}

export async function getDiscordGuildId(supabase: any): Promise<string | null> {
  try {
    const { MasterServerService } = await import('@/services/supabase/master.server.service');
    const guildIdConfig = await MasterServerService.getConfiguracion(supabase, 'discord_guild_id');
    if (guildIdConfig && guildIdConfig.trim() !== '') {
      return guildIdConfig;
    }
  } catch (configErr) {
    console.error('Error fetching discord_guild_id config:', configErr);
  }

  const channelId = await getDiscordChannel(supabase);
  if (!channelId || !BOT_TOKEN) return null;

  try {
    const response = await fetch(`${DISCORD_API_URL}/channels/${channelId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bot ${BOT_TOKEN}`,
      },
    });
    if (!response.ok) return null;
    const channelData = await response.json();
    return channelData.guild_id || null;
  } catch (err) {
    console.error('Error fetching guild ID from channel:', err);
    return null;
  }
}

export async function assignDiscordRole(guildId: string, userId: string, roleId: string) {
  if (!BOT_TOKEN) throw new Error('DISCORD_BOT_TOKEN no configurado');

  const response = await fetch(`${DISCORD_API_URL}/guilds/${guildId}/members/${userId}/roles/${roleId}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bot ${BOT_TOKEN}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Error de Discord (PUT role): ${JSON.stringify(error)}`);
  }

  return true;
}

export async function removeDiscordRole(guildId: string, userId: string, roleId: string) {
  if (!BOT_TOKEN) throw new Error('DISCORD_BOT_TOKEN no configurado');

  const response = await fetch(`${DISCORD_API_URL}/guilds/${guildId}/members/${userId}/roles/${roleId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bot ${BOT_TOKEN}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Error de Discord (DELETE role): ${JSON.stringify(error)}`);
  }

  return true;
}
