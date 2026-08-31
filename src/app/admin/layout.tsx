import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { ProfileService } from '@/services/supabase/profile.service';
import AdminNavbar from '@/components/admin/AdminNavbar';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  // 1. Verificar sesión
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/');

  const profile = await ProfileService.getProfile(user.id, supabase);

  const allowedRoles = ['admin', 'moderador'];
  const userRoles = profile?.roles || [];
  const hasAccess = allowedRoles.some(role => userRoles.includes(role));

  if (!hasAccess) {
    redirect('/'); // Si no tiene ningún rol de administración, fuera
  }

  return (
    <div className="min-h-screen p-4 sm:p-8 xl:p-12 flex flex-col selection:bg-naranja-naruto selection:text-oro">
      {/* Fondo Global */}
      <div
        className="fixed inset-0 bg-cover bg-center bg-fixed z-[-10]"
        style={{ backgroundImage: 'url("/assets/ui/bg-list.webp")' }}
      />

      {/* Top Navigation Admin */}
      <AdminNavbar userRoles={userRoles} />

      {/* Contenido Principal Centrado */}
      <main className="w-full max-w-[1750px] mx-auto flex-1 flex flex-col">
        <div className="animate-in fade-in duration-500 flex-1 flex flex-col">
          {children}
        </div>
      </main>
    </div>
  );
}
