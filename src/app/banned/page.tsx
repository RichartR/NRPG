import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { Gavel, Calendar, Clock, LogOut } from 'lucide-react';

export const metadata = {
  title: 'Cuenta Suspendida - NRPG',
  description: 'Tu cuenta de usuario ha sido suspendida temporalmente.',
};

export default async function BannedPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Obtener perfil para verificar estado de baneo
  const { data: profile } = await supabase
    .from('profiles')
    .select('username, banned_until, ban_reason')
    .eq('id', user.id)
    .single();

  const now = new Date();
  const bannedUntil = profile?.banned_until ? new Date(profile.banned_until) : null;
  const isBanned = bannedUntil === null || bannedUntil > now;

  // Si no está baneado, redirigir al inicio
  if (!profile || (profile.banned_until && !isBanned)) {
    redirect('/');
  }

  const handleSignOut = async () => {
    'use server';
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect('/login');
  };

  return (
    <div
      className="min-h-screen flex flex-col justify-center items-center p-4 text-white relative overflow-hidden"
      style={{
        backgroundImage: "url('/assets/ui/bg-list.jpg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      <div className="w-full max-w-[650px] bg-black/75 backdrop-blur-md border border-rojo-sangre/20 p-10 xl:p-14 relative rounded-lg">
        {/* Red warning border accents */}
        <div className="absolute top-0 left-0 w-10 h-[1px] bg-rojo-sangre" />
        <div className="absolute top-0 left-0 w-[1px] h-10 bg-rojo-sangre" />
        <div className="absolute bottom-0 right-0 w-10 h-[1px] bg-rojo-sangre" />
        <div className="absolute bottom-0 right-0 w-[1px] h-10 bg-rojo-sangre" />

        <div className="flex justify-center mb-8">
          <div className="w-28 h-28 rounded-full border-2 border-rojo-sangre bg-white overflow-hidden flex items-center justify-center transition-transform duration-300">
            <img src="/assets/images/jiraiya_angry.png" alt="Jiraiya Enojado" className="w-full h-full object-cover" />
          </div>
        </div>

        <h1 className="text-3xl font-black uppercase tracking-[0.2em] text-oro mb-2 font-ninja text-center">
          ACCESO SUSPENDIDO
        </h1>

        <p className="text-oro/40 text-xs font-black uppercase tracking-[0.4em] mb-10 text-center">
          Cuenta: {profile.username}
        </p>

        <div className="space-y-6 text-left mb-10">
          <div className="p-6 border border-rojo-sangre/15 bg-rojo-sangre/[0.02] rounded">
            <h3 className="text-oro/40 text-caption font-black uppercase tracking-widest mb-2">
              Motivo de la Suspensión:
            </h3>
            <p className="text-white text-sm leading-relaxed font-semibold italic">
              "{profile.ban_reason || 'Incumplimiento de las normas de la comunidad.'}"
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 border border-oro/10 bg-zinc-900/40 rounded flex items-center gap-4">
              <Calendar className="w-6 h-6 text-oro/60 shrink-0" />
              <div>
                <span className="text-oro/30 text-caption font-black uppercase tracking-wider block">
                  Fecha de Expiración
                </span>
                <span className="text-xs font-bold text-white uppercase mt-0.5 block">
                  {bannedUntil
                    ? bannedUntil.toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })
                    : 'PERMANENTE'}
                </span>
              </div>
            </div>

            <div className="p-5 border border-oro/10 bg-zinc-900/40 rounded flex items-center gap-4">
              <Clock className="w-6 h-6 text-oro/60 shrink-0" />
              <div>
                <span className="text-oro/30 text-caption font-black uppercase tracking-wider block">
                  Hora de Expiración
                </span>
                <span className="text-xs font-bold text-white uppercase mt-0.5 block">
                  {bannedUntil
                    ? bannedUntil.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
                    : '∞'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 items-center">
          {bannedUntil && (
            <p className="text-zinc-500 text-caption font-black uppercase tracking-widest text-center">
              El acceso se restablecerá automáticamente al cumplirse la fecha de expiración.
            </p>
          )}

          <form action={handleSignOut} className="w-full">
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-3 bg-oro text-rojo-sangre py-4 px-6 font-black uppercase tracking-[0.2em] text-xs transition-all hover:brightness-110 active:scale-95 cursor-pointer"
              style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}
            >
              <LogOut className="w-4 h-4 stroke-[2.5]" />
              Cerrar Sesión
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
