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
    <div className="flex min-h-screen bg-black text-oro/80">
      {/* Sidebar Admin */}
      <aside className="w-80 bg-black border-r border-oro/10 p-8 flex flex-col gap-10 sticky top-0 h-screen z-[100] backdrop-blur-xl">
        <div className="flex flex-col gap-2 px-2">
          <div className="flex items-center gap-4">
             <div className="w-1.5 h-1.5 bg-rojo-sangre rotate-45" />
             <h1 className="ninja-title text-4xl leading-none">NRPG</h1>
          </div>
          <span className="text-[10px] uppercase tracking-[0.4em] font-black text-oro/40 ml-5">SISTEMA ADMINISTRATIVO</span>
        </div>

        <nav className="flex-1 space-y-2 overflow-y-auto pr-4 scrollbar-hide">
          <div className="pb-6">
            <p className="px-5 text-[10px] font-black text-oro/20 uppercase tracking-[0.4em] mb-6 flex items-center gap-4">
              <div className="flex-1 h-px bg-oro/5" />
              PRINCIPAL
              <div className="flex-1 h-px bg-oro/5" />
            </p>
            
            <Link href="/admin" className="flex items-center gap-4 p-4 hover:bg-oro/5 transition-all font-black text-xs xl:text-sm group relative overflow-hidden" style={{ clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)' }}>
              <LayoutDashboard className="w-5 h-5 text-oro/40 group-hover:text-oro transition-colors" />
              <span className="group-hover:translate-x-1 transition-transform uppercase tracking-widest">Dashboard</span>
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-oro opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
          </div>

          <div>
            <p className="px-5 text-[10px] font-black text-oro/20 uppercase tracking-[0.4em] mb-6 flex items-center gap-4">
              <div className="flex-1 h-px bg-oro/5" />
              MÓDULOS
              <div className="flex-1 h-px bg-oro/5" />
            </p>
            <div className="space-y-1">
              {[
                { href: '/admin/sistemas', icon: Settings, label: 'Sistemas' },
                { href: '/admin/aldeas', icon: Map, label: 'Aldeas' },
                { href: '/admin/misiones', icon: ScrollText, label: 'Misiones' },
                { href: '/admin/ramas', icon: GitBranch, label: 'Ramas' },
                { href: '/admin/combate', icon: Sword, label: 'Biblioteca' },
                { href: '/admin/documentos', icon: FileText, label: 'Documentos' },
              ].map((item) => (
                <Link 
                  key={item.href}
                  href={item.href} 
                  className="flex items-center gap-4 p-4 hover:bg-oro/5 transition-all font-black text-xs xl:text-sm group relative overflow-hidden" 
                  style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}
                >
                  <item.icon className="w-5 h-5 text-oro/40 group-hover:text-oro transition-colors" />
                  <span className="group-hover:translate-x-1 transition-transform uppercase tracking-widest">{item.label}</span>
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-oro opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              ))}
            </div>
          </div>

          <div className="pt-10 mt-10 border-t border-oro/5">
            <Link href="/" className="flex items-center gap-4 p-4 text-rojo-sangre/60 hover:text-rojo-sangre hover:bg-rojo-sangre/5 transition-all font-black text-xs xl:text-sm group" style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}>
              <LogOut className="w-5 h-5" />
              <span className="uppercase tracking-widest">Regresar al Mundo</span>
            </Link>
          </div>
        </nav>
      </aside>

      {/* Contenido Principal */}
      <main className="flex-1 overflow-y-auto relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,230,159,0.03),transparent)] pointer-events-none" />
        {children}
      </main>
    </div>
  );
}
