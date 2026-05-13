'use client';

import { AuthService } from '@/services/supabase/auth.service';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';

export default function LogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    await AuthService.signOut();
    router.refresh();
    router.push('/login');
  };

  return (
    <button
      onClick={handleLogout}
      className="text-zinc-400 hover:text-white transition-colors flex items-center gap-2 bg-zinc-950 px-4 py-2 rounded-xl border border-zinc-800 hover:border-zinc-700"
    >
      <LogOut className="w-4 h-4" />
      Salir
    </button>
  );
}
