import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { LayoutDashboard, FileText, Settings, LogOut, ShieldCheck, Map, GitBranch, Sword, ScrollText } from 'lucide-react';
import { ProfileService } from '@/services/supabase/profile.service';
import AdminNotificationBadge from '@/components/admin/AdminNotificationBadge';

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
    <div className="flex h-screen text-oro/80 selection:bg-oro/20 relative overflow-hidden bg-transparent">
      {/* Fondo Global (Sin filtros que lo oscurezcan) */}
      <div 
        className="fixed inset-0 bg-cover bg-center bg-fixed z-[-10]" 
        style={{ backgroundImage: 'url("/assets/ui/bg-list.jpg")' }} 
      />
      
      {/* Sidebar Admin */}
      <aside className="w-80 bg-black/40 border-r border-oro/5 p-8 flex flex-col gap-10 h-full z-[100] backdrop-blur-2xl">
        <div className="flex flex-col gap-2 px-2">
          <div className="flex items-center gap-4">
             <div className="w-2 h-2 bg-rojo-sangre rotate-45 shadow-[0_0_10px_rgba(184,32,32,0.5)]" />
             <h1 className="ninja-title text-4xl leading-none tracking-tighter">NRPG</h1>
          </div>
          <span className="text-[9px] uppercase tracking-[0.5em] font-black text-oro/30 ml-6">SISTEMA ADMINISTRATIVO</span>
        </div>

        <nav className="flex-1 space-y-8 overflow-y-auto pr-2 custom-scrollbar">
          <div>
            <div className="px-5 text-[9px] font-black text-oro/20 uppercase tracking-[0.4em] mb-6 flex items-center gap-3">
              <div className="flex-1 h-px bg-oro/5" />
              PRINCIPAL
              <div className="flex-1 h-px bg-oro/5" />
            </div>
            
            <Link href="/admin" className="flex items-center gap-4 p-4 hover:bg-oro/[0.03] transition-all font-black text-xs xl:text-sm group relative overflow-hidden rounded-sm">
              <LayoutDashboard className="w-4 h-4 text-oro/30 group-hover:text-oro transition-colors" />
              <span className="group-hover:translate-x-1 transition-transform uppercase tracking-widest">Dashboard</span>
              <div className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-[2px] bg-oro opacity-0 group-hover:opacity-100 transition-all" />
            </Link>
          </div>

          <div>
            <div className="px-5 text-[9px] font-black text-oro/20 uppercase tracking-[0.4em] mb-6 flex items-center gap-3">
              <div className="flex-1 h-px bg-oro/5" />
              MÓDULOS
              <div className="flex-1 h-px bg-oro/5" />
            </div>
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
                  className="flex items-center gap-4 p-4 hover:bg-oro/[0.03] transition-all font-black text-xs xl:text-sm group relative overflow-hidden rounded-sm"
                >
                  <item.icon className="w-4 h-4 text-oro/30 group-hover:text-oro transition-colors" />
                  <span className="group-hover:translate-x-1 transition-transform uppercase tracking-widest">{item.label}</span>
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-[2px] bg-oro opacity-0 group-hover:opacity-100 transition-all" />
                </Link>
              ))}
              <AdminNotificationBadge isSidebar={true} />
            </div>
          </div>

          <div className="pt-10 mt-10 border-t border-oro/5">
            <Link href="/" className="flex items-center gap-4 p-4 text-rojo-sangre/40 hover:text-rojo-sangre hover:bg-rojo-sangre/5 transition-all font-black text-[10px] xl:text-xs group rounded-sm">
              <LogOut className="w-4 h-4" />
              <span className="uppercase tracking-widest">Regresar al Mundo</span>
            </Link>
          </div>
        </nav>
      </aside>

      {/* Contenido Principal */}
      <main className="flex-1 overflow-y-auto relative bg-transparent">
        <div className="relative z-10 p-12 xl:p-20">
          {children}
        </div>
      </main>
    </div>
  );
}
