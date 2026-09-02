'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AuthService } from '@/services/supabase/auth.service';
import { ProfileService } from '@/services/supabase/profile.service';
import ProfileSettings from './ProfileSettings';
import NotificationBell from './NotificationBell';
import AdminNotificationBadge from '@/components/admin/AdminNotificationBadge';
import LogoutButton from '@/components/auth/LogoutButton';
import type { Profile } from '@/domain/types';

const SHOW_LOGIN_BUTTON = true;

export default function HomeUserControls() {
  const [account, setAccount] = useState<{ userId: string; profile: Profile } | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadAccount() {
      try {
        const { data: { user } } = await AuthService.getUser();
        if (!user || cancelled) return;
        const profile = await ProfileService.getProfile(user.id);
        if (!cancelled) setAccount({ userId: user.id, profile });
      } catch (error) {
        console.error('Error cargando los controles de usuario:', error);
      }
    }

    loadAccount();
    return () => {
      cancelled = true;
    };
  }, []);

  const roles: string[] = account?.profile?.roles || [];
  const canManageContent = roles.some((role) => ['admin', 'moderador', 'narrador'].includes(role));
  const canOpenAdmin = roles.some((role) => ['admin', 'moderador'].includes(role));

  return (
    <div className="flex flex-col justify-between items-center lg:items-end gap-4 w-full lg:w-auto self-stretch pt-2 pb-0">
      {account && (
        <div className="flex items-center gap-4 sm:gap-6 justify-center lg:justify-end">
          <ProfileSettings profile={account.profile} userId={account.userId} />
          <NotificationBell />
        </div>
      )}

      <nav className="flex flex-wrap items-center justify-center lg:justify-end gap-3 sm:gap-4 mt-auto">
        {canManageContent && (
          <Link
            href="/combate"
            className="flex items-center gap-3 px-6 py-3 bg-white text-naranja-naruto border border-white hover:bg-white/90 hover:brightness-110 transition-all font-black text-xs uppercase tracking-[0.2em] cursor-pointer shadow-md"
            style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}
          >
            SALAS DE COMBATE
          </Link>
        )}
        {canOpenAdmin && (
          <>
            <Link
              href="/admin"
              className="flex items-center gap-3 px-6 py-3 bg-white text-naranja-naruto border border-white hover:bg-white/90 hover:brightness-110 transition-all group font-black text-xs uppercase tracking-[0.2em] cursor-pointer shadow-md"
              style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}
            >
              PANEL ADMIN
            </Link>
            <AdminNotificationBadge />
          </>
        )}
        {account ? (
          <LogoutButton />
        ) : SHOW_LOGIN_BUTTON ? (
          <Link href="/login" className="px-6 py-3.5 ninja-btn-oro text-xs sm:text-sm font-black uppercase tracking-widest text-center">
            INICIAR SESIÓN
          </Link>
        ) : null}
      </nav>
    </div>
  );
}
