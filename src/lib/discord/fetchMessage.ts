import { createClient } from '@/utils/supabase/server';

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
  
  try {
    const supabase = await createClient();
    const { data: config } = await supabase
      .from('configuracion_sistema')
      .select('valor')
      .eq('clave', 'discord_history_appearance_channel_id')
      .single();

    const channelId = config?.valor as string;

    if (!token || !channelId) {
      console.warn("DISCORD_BOT_TOKEN or channel config missing, returning mock data.");
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
