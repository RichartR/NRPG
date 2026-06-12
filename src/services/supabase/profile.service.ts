import { Profile } from '@/domain/types';
import { createClient } from '@/utils/supabase/client';

export const ProfileService = {
  async getProfile(userId: string, client?: any) {
    const supabase = client || createClient();
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (error) throw error;
    return data;
  },

  async getActiveCharacterId(userId: string, client?: any): Promise<number | null> {
    const supabase = client || createClient();
    const { data, error } = await supabase
      .from('profiles')
      .select('active_char_id')
      .eq('id', userId)
      .single();
    if (error) throw error;
    return data?.active_char_id;
  },

  async updateProfile(userId: string, updates: Partial<Profile>, client?: any) {
    const supabase = client || createClient();
    
    // Intentamos la actualización normal
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId);

    // Si da error 400 y estamos intentando actualizar url_img, 
    // es posible que la columna no exista, así que probamos con url_avatar
    if (error && error.code === '42703' && 'url_img' in updates) {
      const { url_img, ...rest } = updates;
      return await supabase
        .from('profiles')
        .update({ ...rest, url_avatar: url_img })
        .eq('id', userId);
    }

    if (error) throw error;
  },

  async updateUserIP(userId: string, ip: string, client?: any) {
    const supabase = client || createClient();

    // 1. Actualizar la IP del usuario en su perfil
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ last_ip: ip })
      .eq('id', userId);

    if (updateError) {
      console.error('Error al actualizar la IP del usuario:', updateError);
      return;
    }

    try {
      // 2. Comprobar si la IP está en la lista blanca
      const { data: whitelisted, error: whiteError } = await supabase
        .from('sys_whitelisted_ips')
        .select('ip')
        .eq('ip', ip)
        .maybeSingle();

      if (whiteError) throw whiteError;
      if (whitelisted) {
        // IP autorizada, no emitir alertas de duplicados
        return;
      }

      // 3. Buscar otros perfiles con la misma IP
      const { data: dupProfiles, error: dupError } = await supabase
        .from('profiles')
        .select('id, username')
        .eq('last_ip', ip)
        .neq('id', userId);

      if (dupError) throw dupError;

      if (dupProfiles && dupProfiles.length > 0) {
        // Obtener el perfil actual para incluir su username
        const { data: currentProfile, error: curProfileError } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', userId)
          .single();

        if (curProfileError) throw curProfileError;

        const currentUsername = currentProfile?.username || 'Usuario Desconocido';

        for (const dup of dupProfiles) {
          const dupUsername = dup.username || 'Usuario Desconocido';
          const msg = `Posible cuenta clon: Los usuarios ${currentUsername} (ID: ${userId}) y ${dupUsername} (ID: ${dup.id}) han iniciado sesión desde la misma IP (${ip}).`;

          // Comprobar si ya existe una alerta de IP duplicada para este par de usuarios en estado 'pendiente'
          const searchPattern = `%${userId}%${dup.id}%`;
          const searchPatternReverse = `%${dup.id}%${userId}%`;

          const { data: existingNotif, error: notifCheckError } = await supabase
            .from('sys_notificaciones_admin')
            .select('id')
            .eq('estado', 'pendiente')
            .or(`mensaje.like.${searchPattern},mensaje.like.${searchPatternReverse}`)
            .limit(1);

          if (notifCheckError) throw notifCheckError;

          if (!existingNotif || existingNotif.length === 0) {
            // Insertar la alerta en sys_notificaciones_admin
            const { error: insertError } = await supabase
              .from('sys_notificaciones_admin')
              .insert({
                mensaje: msg,
                estado: 'pendiente'
              });

            if (insertError) throw insertError;
          }
        }
      }
    } catch (err) {
      console.error('Error en el sistema de detección de IP duplicada:', err);
    }
  },

  async getUsersList(client?: any) {
    const supabase = client || createClient();
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        *,
        active_character:reg_characters!profiles_active_char_id_fkey(
          id,
          nombre_ninja,
          url_img,
          rango,
          aldeas:info_aldeas(nombre_completo)
        )
      `)
      .order('username', { ascending: true });
    if (error) throw error;
    return data;
  },

  async banUser(userId: string, reason: string, bannedUntil: string | null, client?: any) {
    const supabase = client || createClient();
    
    // 1. Obtener la IP actual del perfil
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('last_ip')
      .eq('id', userId)
      .single();
    
    if (profileError) throw profileError;

    // 2. Suspender cuenta en profiles
    const { error: banError } = await supabase
      .from('profiles')
      .update({
        banned_until: bannedUntil || null,
        ban_reason: reason
      })
      .eq('id', userId);
    
    if (banError) throw banError;

    // 3. Bloquear IP si existe
    if (profile?.last_ip) {
      const { error: ipError } = await supabase
        .from('sys_blocked_ips')
        .upsert({
          ip: profile.last_ip,
          reason: `Baneo de cuenta del usuario ID: ${userId}. Motivo: ${reason}`,
          blocked_until: bannedUntil || null,
          created_at: new Date().toISOString()
        });
      if (ipError) throw ipError;
    }
  },

  async unbanUser(userId: string, client?: any) {
    const supabase = client || createClient();

    // 1. Obtener la IP actual del perfil
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('last_ip')
      .eq('id', userId)
      .single();
    
    if (profileError) throw profileError;

    // 2. Levantar suspensión de cuenta
    const { error: banError } = await supabase
      .from('profiles')
      .update({
        banned_until: null,
        ban_reason: null
      })
      .eq('id', userId);
    
    if (banError) throw banError;

    // 3. Desbloquear IP si existe
    if (profile?.last_ip) {
      const { error: ipError } = await supabase
        .from('sys_blocked_ips')
        .delete()
        .eq('ip', profile.last_ip);
      if (ipError) throw ipError;
    }
  }
};
