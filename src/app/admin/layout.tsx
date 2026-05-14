import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { LayoutDashboard, FileText, Settings, LogOut, ShieldCheck, Map, GitBranch, Sword, ScrollText } from 'lucide-react';
import { ProfileService } from '@/services/supabase/profile.service';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  // 1. Verificar sesión
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/');

  const profile = await ProfileService.getProfile(user.id);

  if (profile?.role !== 'admin') {
    redirect('/'); // Si no es admin, fuera
  }

  return (
    <div className="flex min-h-screen bg-zinc-950 text-zinc-300">
      {/* Sidebar Admin */}
      <aside className="w-64 bg-zinc-900 border-r border-zinc-800 p-6 flex flex-col gap-8 sticky top-0 h-screen">
        <div className="flex items-center gap-3 px-2">
          <div className="bg-orange-500 p-2 rounded-lg">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-white font-black tracking-tighter leading-none">NRPG</h1>
            <span className="text-[10px] uppercase tracking-widest font-bold text-orange-500">Admin Panel</span>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto pr-2 custom-scrollbar">
          <p className="px-3 text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em] mb-4">Principal</p>
          
          <Link href="/admin" className="flex items-center gap-3 p-3 rounded-xl hover:bg-zinc-800 hover:text-white transition-all font-bold text-sm group">
            <LayoutDashboard className="w-5 h-5 text-zinc-500 group-hover:text-orange-500 transition-colors" />
            Dashboard
          </Link>

          <div className="pt-6 pb-2">
            <p className="px-3 text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em] mb-4">Módulos</p>
          </div>

          <Link href="/admin/sistemas" className="flex items-center gap-3 p-3 rounded-xl hover:bg-zinc-800 hover:text-white transition-all font-bold text-sm group">
            <Settings className="w-5 h-5 text-zinc-500 group-hover:text-orange-500 transition-colors" />
            Sistemas
          </Link>

          <Link href="/admin/aldeas" className="flex items-center gap-3 p-3 rounded-xl hover:bg-zinc-800 hover:text-white transition-all font-bold text-sm group">
            <Map className="w-5 h-5 text-zinc-500 group-hover:text-orange-500 transition-colors" />
            Aldeas
          </Link>

          <Link href="/admin/misiones" className="flex items-center gap-3 p-3 rounded-xl hover:bg-zinc-800 hover:text-white transition-all font-bold text-sm group">
            <ScrollText className="w-5 h-5 text-zinc-500 group-hover:text-orange-500 transition-colors" />
            Misiones
          </Link>

          <Link href="/admin/ramas" className="flex items-center gap-3 p-3 rounded-xl hover:bg-zinc-800 hover:text-white transition-all font-bold text-sm group">
            <GitBranch className="w-5 h-5 text-zinc-500 group-hover:text-orange-500 transition-colors" />
            Ramas
          </Link>

          <Link href="/admin/combate" className="flex items-center gap-3 p-3 rounded-xl hover:bg-zinc-800 hover:text-white transition-all font-bold text-sm group">
            <Sword className="w-5 h-5 text-zinc-500 group-hover:text-orange-500 transition-colors" />
            Biblioteca
          </Link>

          <Link href="/admin/documentos" className="flex items-center gap-3 p-3 rounded-xl hover:bg-zinc-800 hover:text-white transition-all font-bold text-sm group">
            <FileText className="w-5 h-5 text-zinc-500 group-hover:text-orange-500 transition-colors" />
            Documentos
          </Link>

          <div className="pt-8 mt-8 border-t border-zinc-800">
            <Link href="/" className="flex items-center gap-3 p-3 rounded-xl hover:bg-red-500/10 hover:text-red-500 transition-all font-bold text-sm group">
              <LogOut className="w-5 h-5 text-zinc-500 group-hover:text-red-500" />
              Salir a la Web
            </Link>
          </div>
        </nav>
      </aside>

      {/* Contenido Principal */}
      <main className="flex-1 p-8 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
