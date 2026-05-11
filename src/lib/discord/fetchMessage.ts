export interface DiscordMessage {
  id: string;
  content: string;
  timestamp: string;
  author: {
    username: string;
    avatar: string;
  };
}

export async function fetchDiscordMessage(messageId: string): Promise<DiscordMessage | null> {
  const token = process.env.DISCORD_BOT_TOKEN;
  const channelId = process.env.DISCORD_NEWS_CHANNEL_ID;

  if (!token || !channelId) {
    console.warn("DISCORD_BOT_TOKEN or DISCORD_NEWS_CHANNEL_ID missing, returning mock data.");
    return {
      id: messageId,
      content: "**NOTICIA:** Nuevo Sistema de Combate\n**AUTOR:** Hokage\n**CUERPO:**\nHemos actualizado la calculadora para reflejar mejor el cansancio. ¡Revisa el glosario!",
      timestamp: new Date().toISOString(),
      author: {
        username: "MockBot",
        avatar: ""
      }
    };
  }

  try {
    const res = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages/${messageId}`, {
      headers: {
        Authorization: `Bot ${token}`,
      },
      next: {
        revalidate: 3600 // Cache por 1 hora
      }
    });

    if (!res.ok) {
      console.error(`Error fetching discord message: ${res.statusText}`);
      return null;
    }

    const data = await res.json();
    return {
      id: data.id,
      content: data.content,
      timestamp: data.timestamp,
      author: {
        username: data.author.username,
        avatar: data.author.avatar
      }
    };
  } catch (error) {
    console.error("fetchDiscordMessage error:", error);
    return null;
  }
}
