import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { getDiscordGuildId, getDiscordGuildRoles } from '@/lib/discord';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const adminClient = createAdminClient();
    const guildId = await getDiscordGuildId(adminClient);
    if (!guildId) return NextResponse.json({ roles: [] });

    const roles = await getDiscordGuildRoles(guildId);
    const formattedRoles = (roles || [])
      .filter((r: any) => r.name !== '@everyone')
      .map((r: any) => ({
        id: r.id,
        name: `@${r.name}`,
        color: r.color
      }));

    return NextResponse.json({ roles: formattedRoles });
  } catch (err: any) {
    console.error('Error fetching discord roles:', err);
    return NextResponse.json({ roles: [] });
  }
}
