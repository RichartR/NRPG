import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import { ProfileService } from '@/services/supabase/profile.service';
import { createAdminClient } from '@/utils/supabase/admin';
import { getDiscordGuildId, assignDiscordRole } from '@/lib/discord';
import { MasterServerService } from '@/services/supabase/master.server.service';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    // Verificar si es administrador
    const profile = await ProfileService.getProfile(user.id, supabase);
    if (!profile?.roles?.includes('admin')) {
      return NextResponse.json({ error: 'No tienes permisos de administrador para esta acción' }, { status: 403 });
    }

    const adminClient = createAdminClient();

    // 1. Obtener todos los personajes activos y no eliminados
    const { data: characters, error: charError } = await adminClient
      .from('reg_characters')
      .select(`
        id,
        user_id,
        aldea_id,
        nombre_ninja,
        profiles:user_id(discord_id)
      `)
      .eq('activo', true)
      .eq('eliminado_voluntario', false);

    if (charError) throw charError;

    // 2. Obtener todas las aldeas y sus mapeos de roles
    const { data: aldeas, error: aldeaError } = await adminClient
      .from('info_aldeas')
      .select('id, id_rol_discord');

    if (aldeaError) throw aldeaError;

    const aldeaRolesMap = new Map(aldeas?.map(a => [a.id, a.id_rol_discord]));
    
    // Obtener rol de renegado configurado
    const renegadoRoleId = await MasterServerService.getConfiguracion(adminClient, 'discord_renegado_role_id');

    // Obtener ID del servidor de Discord
    const guildId = await getDiscordGuildId(adminClient);
    if (!guildId) {
      return NextResponse.json({ error: 'No se pudo determinar el ID del servidor de Discord. Verifica la configuración.' }, { status: 400 });
    }

    let syncedCount = 0;
    let failedCount = 0;
    const failures = [];

    // 3. Sincronizar uno a uno
    for (const char of (characters || [])) {
      const profileInfo: any = char.profiles;
      const discordId = profileInfo?.discord_id;

      if (!discordId) {
        // Ignorar usuarios sin cuenta de Discord vinculada
        continue;
      }

      let roleIdToAssign = null;
      if (char.aldea_id) {
        roleIdToAssign = aldeaRolesMap.get(char.aldea_id);
      } else {
        roleIdToAssign = renegadoRoleId;
      }

      if (roleIdToAssign) {
        try {
          await assignDiscordRole(guildId, discordId, roleIdToAssign);
          syncedCount++;
        } catch (err: any) {
          console.error(`Error al sincronizar rol de Discord para ${char.nombre_ninja}:`, err.message);
          failedCount++;
          failures.push(`${char.nombre_ninja}: ${err.message || 'Error de API'}`);
        }
      }
    }

    return NextResponse.json({
      success: true,
      syncedCount,
      failedCount,
      failures
    });

  } catch (error: any) {
    console.error('Retroactive Village Roles Sync Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
