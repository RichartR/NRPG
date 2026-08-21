import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getDiscordUser } from '@/lib/discord';

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, discord_id, username')
      .eq('id', user.id)
      .single();

    if (!profile || !profile.discord_id) {
      return NextResponse.json({ error: 'Perfil sin vincular a Discord' }, { status: 400 });
    }

    const discordUser = await getDiscordUser(profile.discord_id);
    if (!discordUser || !discordUser.username) {
      return NextResponse.json({ error: 'No se pudo obtener la información de Discord' }, { status: 502 });
    }

    const newUsername = discordUser.username.replace(/\s+/g, '_');
    const updates: any = {
      last_discord_sync: new Date().toISOString()
    };

    if (newUsername && newUsername !== profile.username) {
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', newUsername)
        .neq('id', user.id)
        .maybeSingle();

      if (!existing) {
        updates.username = newUsername;
      }
    }

    await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id);

    return NextResponse.json({
      success: true,
      message: 'Cuenta sincronizada con Discord exitosamente',
      username: updates.username || profile.username
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error interno del servidor' }, { status: 500 });
  }
}
