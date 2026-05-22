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
    const { MasterServerService } = await import('@/services/supabase/master.server.service');
    const channelId = await MasterServerService.getConfiguracion(supabase, 'discord_history_appearance_channel_id');

    // Intercept mock IDs or missing configurations
    if (!token || !channelId || messageId === '1' || messageId === '2') {
      console.warn("DISCORD_BOT_TOKEN/channel missing or mock ID requested, returning mock data.");
      return {
        id: messageId,
        content: messageId === '1' 
          ? "**NOTICIA:** ¡Bienvenidos al nuevo servidor de NRPG! Revisa las secciones para ver las reglas, mapas, sistemas y crear tu primer personaje shinobi."
          : "**PARCHE:** Ajustes generales de equilibrio, balance de Taijutsu y optimizaciones en la calculadora de combate.",
        timestamp: new Date().toISOString(),
        author: {
          username: "Sistema",
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
      if (res.status === 404) {
        console.warn(`Discord message not found (404): ${messageId}`);
      } else {
        console.error(`Error fetching discord message (${res.status}): ${res.statusText}`);
      }
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
