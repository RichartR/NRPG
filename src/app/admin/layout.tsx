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

  const profile = await ProfileService.getProfile(user.id);

  if (profile?.role !== 'admin') {
    redirect('/'); // Si no es admin, fuera
  }

  return (
    <div className="min-h-screen p-4 sm:p-8 xl:p-12 flex flex-col selection:bg-rojo-sangre selection:text-oro">
      {/* Fondo Global */}
      <div
        className="fixed inset-0 bg-cover bg-center bg-fixed z-[-10]"
        style={{ backgroundImage: 'url("/assets/ui/bg-list.jpg")' }}
      />

      {/* Top Navigation Admin */}
      <AdminNavbar />

      {/* Contenido Principal Centrado */}
      <main className="w-full max-w-[1750px] mx-auto flex-1 flex flex-col">
        <div className="animate-in fade-in duration-500 flex-1 flex flex-col">
          {children}
        </div>
      </main>
    </div>
  );
}
