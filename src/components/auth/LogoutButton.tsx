'use client';

import { AuthService } from '@/services/supabase/auth.service';
import { useRouter } from 'next/navigation';

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
      className="text-oro/60 hover:text-oro transition-all flex items-center gap-3 bg-rojo-sangre/10 px-8 py-2.5 border border-oro/20 hover:border-oro/40 hover:bg-rojo-sangre/20 font-black uppercase tracking-widest text-[10px]"
      style={{ clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)' }}
    >
      Salir
    </button>
  );
}


