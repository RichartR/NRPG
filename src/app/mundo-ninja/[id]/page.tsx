import { createClient } from '@/utils/supabase/server';
import { MapPin, ChevronLeft, User, UserPlus, LogIn } from 'lucide-react';
import Link from 'next/link';
import { MasterServerService } from '@/services/supabase/master.server.service';
import { CharacterServerService } from '@/services/supabase/character.server.service';

export default async function MundoNinjaPublicVillagePage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { id } = await params;
  const isRenegado = id === 'renegados';

  // Sesión del usuario (no redirige si no está logueado)
  const { data: { user } } = await supabase.auth.getUser();

  // Datos de la aldea, ninjas y elegibilidad — todo en paralelo
  const [aldea, ninjas, haAlcanzadoLimite] = await Promise.all([
    isRenegado ? Promise.resolve(null) : MasterServerService.getAldeaById(supabase, Number(id)),
    MasterServerService.getNinjasByAldea(supabase, isRenegado ? null : Number(id)),
    user ? CharacterServerService.hasReachedCharacterLimit(supabase, user.id) : Promise.resolve(false),
  ]);

  // Puede crear ficha: está logueado Y no ha alcanzado el límite configurado
  const puedeCrearFicha = !!user && !haAlcanzadoLimite;

  const aldeaParam = !isRenegado ? `?aldea_id=${id}` : '';

  return (
    <div className="min-h-screen bg-black pt-24 pb-20 px-4">
      <div className="max-w-7xl mx-auto">
        <header className="mb-12">
          <Link href="/mundo-ninja" className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors mb-4 text-xs font-black uppercase tracking-widest group">
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Volver al Mundo Ninja
          </Link>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 rounded-3xl bg-zinc-900 border border-zinc-800 p-4 flex items-center justify-center shadow-xl">
                {!isRenegado && aldea?.url_icono ? (
                  <img src={aldea.url_icono} alt="" className="w-full h-full object-contain" />
                ) : (
                  <MapPin className={`w-8 h-8 ${isRenegado ? 'text-red-500' : 'text-emerald-500'}`} />
                )}
              </div>
              <div>
                <h1 className="text-4xl md:text-5xl font-black text-white tracking-tighter uppercase italic">
                  {isRenegado ? 'SIN ALDEA / RENEGADOS' : aldea?.nombre_completo}
                </h1>
                <p className="text-zinc-500 text-sm font-medium uppercase tracking-widest">
                  Shinobis Registrados • {ninjas.length}
                </p>
              </div>
            </div>

            {/* CTA de creación de ficha */}
            {puedeCrearFicha ? (
              <Link
                href={`/crear-ficha${aldeaParam}`}
                className="flex items-center justify-center gap-3 px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-black rounded-[2rem] font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-emerald-500/20 active:scale-95"
              >
                <UserPlus className="w-5 h-5" /> Crear mi Ficha
              </Link>
            ) : !user ? (
              <Link
                href="/login"
                className="flex items-center justify-center gap-3 px-8 py-4 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 hover:border-zinc-500 rounded-[2rem] font-black text-xs uppercase tracking-widest transition-all active:scale-95"
              >
                <LogIn className="w-5 h-5" /> Iniciar Sesión para unirte
              </Link>
            ) : (
              // Tiene personaje activo — mostrar enlace a su ficha
              <div className="flex items-center gap-3 px-8 py-4 bg-zinc-900/50 border border-zinc-800 rounded-[2rem] text-xs font-black uppercase tracking-widest text-zinc-500">
                <User className="w-5 h-5" /> Ya tienes un personaje activo
              </div>
            )}
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {ninjas.length > 0 ? (
            ninjas.map((ninja) => (
              <NinjaPublicCard key={ninja.id} ninja={ninja} variant={isRenegado ? 'renegado' : 'default'} />
            ))
          ) : (
            <div className="col-span-full py-32 text-center bg-zinc-900/20 rounded-[3rem] border border-dashed border-zinc-800">
              <User className="w-12 h-12 text-zinc-800 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-zinc-500 uppercase italic">Aún no hay ninjas registrados</h3>
              {puedeCrearFicha && (
                <Link
                  href={`/crear-ficha${aldeaParam}`}
                  className="inline-flex items-center gap-2 mt-6 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-black rounded-2xl font-black text-xs uppercase tracking-widest transition-all"
                >
                  <UserPlus className="w-4 h-4" /> Sé el primero
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function NinjaPublicCard({ ninja, variant = 'default' }: { ninja: any, variant?: 'default' | 'renegado' }) {
  return (
    <Link
      href={`/ficha/${ninja.id}`}
      className={`group relative bg-zinc-900/40 border ${variant === 'renegado' ? 'border-red-900/20 hover:border-red-500/30' : 'border-zinc-800 hover:border-emerald-500/30'} rounded-[2.5rem] p-6 transition-all hover:-translate-y-1 overflow-hidden shadow-lg hover:shadow-2xl`}
    >
      <div className="relative z-10 flex flex-col h-full justify-between">
        <div className="flex items-center justify-between mb-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${variant === 'renegado' ? 'bg-red-500/10' : 'bg-emerald-500/10'}`}>
            <User className={`w-6 h-6 ${variant === 'renegado' ? 'text-red-500' : 'text-emerald-500'}`} />
          </div>
          <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">{ninja.rango}</span>
        </div>

        <div className="mb-6">
          <h4 className="text-2xl font-black text-white tracking-tight leading-none mb-1 uppercase italic">{ninja.nombre_ninja}</h4>
          <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-[0.2em]">{ninja.hobba_name}</p>
        </div>

        <div className="pt-4 border-t border-zinc-800/50 flex flex-wrap gap-2">
          {Object.entries(ninja.stats_base || {}).slice(0, 4).map(([stat, val]: any) => (
            <div key={stat} className="flex flex-col">
              <span className="text-[7px] text-zinc-600 font-black uppercase tracking-tighter">{stat}</span>
              <span className="text-[10px] text-zinc-300 font-mono font-bold">{val}</span>
            </div>
          ))}
        </div>
      </div>

      <div className={`absolute -right-6 -bottom-6 opacity-[0.02] group-hover:opacity-[0.06] transition-opacity ${variant === 'renegado' ? 'text-red-500' : 'text-emerald-500'}`}>
        <User className="w-32 h-32 rotate-12" />
      </div>
    </Link>
  );
}
