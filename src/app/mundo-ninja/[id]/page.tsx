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
    <div className="min-h-screen pt-24 pb-20 px-4">
      <div className="max-w-[1750px] mx-auto w-full">
        <header className={`mb-12 ${isRenegado ? 'ninja-card-rojo' : 'ninja-card-oro'} p-8 xl:p-12 relative overflow-hidden`}>
          <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none">
             <MapPin className="w-64 h-64 rotate-12" />
          </div>

          <Link href="/mundo-ninja" className="flex items-center gap-3 text-oro hover:brightness-125 transition-all group font-black uppercase tracking-widest text-[10px] sm:text-xs xl:text-sm mb-10 relative z-10">
            <div className={`w-2 h-2 ${isRenegado ? 'bg-rojo-sangre' : 'bg-oro'} rotate-45 group-hover:bg-oro transition-colors`} />
            <span>Volver al Mundo Ninja</span>
          </Link>

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-10 relative z-10">
            <div className="flex items-center gap-8">
              <div className={`w-24 h-24 xl:w-32 xl:h-32 bg-black/40 border ${isRenegado ? 'border-rojo-sangre/20' : 'border-oro/20'} ninja-clip-md p-6 flex items-center justify-center shadow-2xl backdrop-blur-sm`}>
                {!isRenegado && aldea?.url_icono ? (
                  <img src={aldea.url_icono} alt="" className="w-full h-full object-contain filter drop-shadow-[0_0_10px_rgba(255,215,0,0.3)]" />
                ) : (
                  <MapPin className={`w-12 h-12 ${isRenegado ? 'text-rojo-sangre' : 'text-oro'} drop-shadow-[0_0_15px_rgba(0,0,0,0.5)]`} />
                )}
              </div>
              <div>
                <h1 className="ninja-title text-4xl xl:text-7xl mb-2">
                  {isRenegado ? 'RENEGADOS' : aldea?.nombre_completo}
                </h1>
                <div className="flex items-center gap-4">
                  <span className={`text-[10px] xl:text-xs font-black ${isRenegado ? 'text-rojo-sangre/60' : 'text-oro/60'} uppercase tracking-[0.3em]`}>
                    SHINOBIS REGISTRADOS
                  </span>
                  <div className={`w-1 h-1 ${isRenegado ? 'bg-rojo-sangre/20' : 'bg-oro/20'} rotate-45`} />
                  <span className="text-xl xl:text-2xl font-black text-oro italic leading-none">{ninjas.length}</span>
                </div>
              </div>
            </div>

            {/* CTA de creación de ficha */}
            <div className="shrink-0">
              {puedeCrearFicha ? (
                <Link
                  href={`/crear-ficha${aldeaParam}`}
                  className={`flex items-center justify-center gap-4 px-10 py-5 ${isRenegado ? 'ninja-btn-rojo' : 'ninja-btn-oro'} text-xs xl:text-sm`}
                >
                  <UserPlus className="w-5 h-5" /> UNIRSE A ESTA SENDA
                </Link>
              ) : !user ? (
                <Link
                  href="/login"
                  className="flex items-center justify-center gap-4 px-10 py-5 ninja-btn-ghost text-xs xl:text-sm"
                >
                  <LogIn className="w-5 h-5" /> INICIAR SESIÓN
                </Link>
              ) : (
                <div className="flex items-center gap-4 px-10 py-5 bg-black/20 border border-oro/10 ninja-clip-sm text-[10px] xl:text-xs font-black uppercase tracking-widest text-oro/40 italic backdrop-blur-sm">
                  <User className="w-5 h-5 opacity-20" /> Ya posees un personaje activo
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {ninjas.length > 0 ? (
            ninjas.map((ninja) => (
              <NinjaPublicCard key={ninja.id} ninja={ninja} variant={isRenegado ? 'renegado' : 'default'} />
            ))
          ) : (
            <div className="col-span-full py-48 text-center ninja-card-oro opacity-50 flex flex-col items-center gap-8">
              <User className="w-24 h-24 text-oro/10" />
              <div className="space-y-2">
                 <h3 className="text-xl xl:text-2xl font-black text-oro/40 uppercase tracking-[0.4em] italic leading-none">AÚN NO HAY SHINOBIS EN ESTA REGIÓN</h3>
                 <p className="text-[10px] xl:text-xs font-black text-oro/20 uppercase tracking-[0.6em]">EL DESTINO AGUARDA A SU PRIMER HÉROE</p>
              </div>
              {puedeCrearFicha && (
                <Link
                  href={`/crear-ficha${aldeaParam}`}
                  className="mt-6 px-10 py-5 ninja-btn-oro"
                >
                  <UserPlus className="w-5 h-5" /> INICIAR MI CAMINO
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
  const isRenegado = variant === 'renegado';
  return (
    <Link
      href={`/ficha/${ninja.id}`}
      className={`group relative transition-all duration-500 hover:-translate-y-2 ${isRenegado ? 'ninja-card-rojo' : 'ninja-card-oro'} p-8 xl:p-10 overflow-hidden hover-ninja`}
    >
      <div className="relative z-10 flex flex-col h-full">
        <div className="flex items-center justify-between mb-8">
          <div className={`w-14 h-14 bg-black/40 border ${isRenegado ? 'border-rojo-sangre/20' : 'border-oro/20'} ninja-clip-xs flex items-center justify-center backdrop-blur-sm`}>
            <User className={`w-6 h-6 ${isRenegado ? 'text-rojo-sangre' : 'text-oro'} opacity-60`} />
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[9px] font-black text-oro/20 uppercase tracking-widest mb-1">RANGO</span>
            <span className={`text-sm font-black ${isRenegado ? 'text-rojo-sangre' : 'text-oro'} uppercase tracking-widest`}>{ninja.rango}</span>
          </div>
        </div>

        <div className="mb-10">
          <h4 className="ninja-title text-2xl xl:text-4xl mb-1 group-hover:text-white transition-colors">
            {ninja.nombre_ninja}
          </h4>
          <div className="flex items-center gap-3">
             <div className="w-4 h-px bg-oro/20" />
             <p className="text-oro/40 text-[9px] font-black uppercase tracking-[0.3em] italic">{ninja.hobba_name}</p>
          </div>
        </div>

        <div className="pt-6 border-t border-oro/10 grid grid-cols-4 gap-4">
          {Object.entries(ninja.stats_base || {}).slice(0, 4).map(([stat, val]: any) => (
            <div key={stat} className="flex flex-col">
              <span className="text-[8px] text-oro/20 font-black uppercase tracking-widest mb-1">{stat}</span>
              <span className="text-xs text-oro/60 font-black italic">{val}</span>
            </div>
          ))}
        </div>
      </div>

      <div className={`absolute -right-8 -bottom-8 opacity-[0.02] group-hover:opacity-[0.08] transition-all duration-700 pointer-events-none`}>
        <User className={`w-40 h-40 rotate-12 ${isRenegado ? 'text-rojo-sangre' : 'text-oro'}`} />
      </div>
    </Link>
  );
}
