import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const discordIdentity = user.identities?.find(i => i.provider === 'discord');
    const discordMeta = user.user_metadata;

    const newUsername = discordMeta?.custom_claims?.global_name ||
                        discordMeta?.global_name ||
                        discordMeta?.full_name ||
                        discordMeta?.name ||
                        discordIdentity?.identity_data?.global_name ||
                        discordIdentity?.identity_data?.custom_claims?.global_name ||
                        user.email?.split('@')[0];

    if (!newUsername) {
      return NextResponse.json({ error: 'No se pudo obtener el nombre de usuario desde Discord' }, { status: 400 });
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ username: newUsername })
      .eq('id', user.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, username: newUsername });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error interno del servidor' }, { status: 500 });
  }
}
