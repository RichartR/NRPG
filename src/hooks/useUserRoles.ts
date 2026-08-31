'use client';

import { useEffect, useState } from 'react';
import { AuthService } from '@/services/supabase/auth.service';
import { ProfileService } from '@/services/supabase/profile.service';

export function useUserRoles() {
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadRoles() {
      try {
        const { data: { user } } = await AuthService.getUser();
        if (!user || cancelled) return;
        const profile = await ProfileService.getProfile(user.id);
        if (!cancelled) setRoles(profile?.roles || []);
      } catch (error) {
        console.error('Error cargando los permisos del usuario:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadRoles();
    return () => {
      cancelled = true;
    };
  }, []);

  return { roles, loading };
}
