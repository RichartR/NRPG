import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import { ProfileService } from '@/services/supabase/profile.service';
import { createAdminClient } from '@/utils/supabase/admin';
import { assignDiscordRole, removeDiscordRole, getDiscordGuildId } from '@/lib/discord';
import { MasterServerService } from '@/services/supabase/master.server.service';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    // Verificar si el usuario que hace la petición es administrador
    const profile = await ProfileService.getProfile(user.id, supabase);
    if (!profile?.roles?.includes('admin')) {
      return NextResponse.json({ error: 'No tienes permisos de administrador para realizar esta acción' }, { status: 403 });
    }

    const { userId, roleId, action } = await request.json();
    if (!userId || !roleId || !action) {
      return NextResponse.json({ error: 'Faltan parámetros obligatorios' }, { status: 400 });
    }

    const adminClient = createAdminClient();

    // 1. Modificar la base de datos
    if (action === 'assign') {
      const { error } = await adminClient
        .from('reg_roles')
        .insert([{ user_id: userId, rol_id: roleId }]);
      if (error && error.code !== '23505') { // Ignorar error de clave duplicada
        throw error;
      }
      if (roleId === 'admin') {
        await adminClient
          .from('profiles')
          .update({ role: 'admin' })
          .eq('id', userId);
      }
    } else if (action === 'remove') {
      const { error } = await adminClient
        .from('reg_roles')
        .delete()
        .match({ user_id: userId, rol_id: roleId });
      if (error) throw error;
      if (roleId === 'admin') {
        await adminClient
          .from('profiles')
          .update({ role: 'user' })
          .eq('id', userId);
      }
    } else {
      return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
    }

    // 2. Intentar la sincronización con Discord
    try {
      // Obtener el ID de Discord del usuario
      const { data: targetProfile } = await adminClient
        .from('profiles')
        .select('discord_id')
        .eq('id', userId)
        .single();

      // Obtener el ID de Discord para el rol
      const { data: roleInfo } = await adminClient
        .from('info_roles')
        .select('id_rol_discord')
        .eq('id', roleId)
        .single();

      // Obtener el ID del servidor de Discord
      const guildId = await getDiscordGuildId(adminClient);

      if (targetProfile?.discord_id && roleInfo?.id_rol_discord && guildId) {
        if (action === 'assign') {
          await assignDiscordRole(guildId, targetProfile.discord_id, roleInfo.id_rol_discord);
        } else {
          await removeDiscordRole(guildId, targetProfile.discord_id, roleInfo.id_rol_discord);
        }
      }
    } catch (discordError: any) {
      console.error('Error al sincronizar rol con Discord:', discordError.message || discordError);
      // No arrojamos error para no bloquear la operación de la base de datos de la web
      return NextResponse.json({ 
        success: true, 
        warning: `El rol se guardó en la web, pero falló la sincronización con Discord: ${discordError.message || 'Error de API'}` 
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Admin Roles Sync Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
