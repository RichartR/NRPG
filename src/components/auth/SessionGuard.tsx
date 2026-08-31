'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AuthService } from '@/services/supabase/auth.service';
import { ProfileService } from '@/services/supabase/profile.service';

/**
 * Keeps account bans enforced without making every public route dynamic.
 * Supabase is queried directly by the browser, so this does not consume
 * Vercel Function or Fast Origin Transfer for public page requests.
 */
export default function SessionGuard() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (pathname === '/banned' || pathname === '/blocked' || pathname === '/login') return;

    let cancelled = false;

    async function checkAccountBan() {
      try {
        const { data: { user } } = await AuthService.getUser();
        if (!user || cancelled) return;

        const profile = await ProfileService.getProfile(user.id);
        if (cancelled || !profile?.banned_until) return;

        if (new Date(profile.banned_until) > new Date()) {
          router.replace('/banned');
        }
      } catch (error) {
        console.error('Error comprobando el estado de la cuenta:', error);
      }
    }

    checkAccountBan();
    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  return null;
}
