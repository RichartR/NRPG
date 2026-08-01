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
      className="text-black hover:text-white transition-all flex items-center gap-2.5 bg-naranja-naruto px-6 py-3 border border-oro/20 hover:border-naranja-naruto/60 hover:bg-naranja-naruto/80 font-black uppercase tracking-[0.2em] text-xs shadow-lg cursor-pointer"
      style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}
    >
      Salir
    </button>
  );
}


