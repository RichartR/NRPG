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
          {/* Imagen de fondo de la aldea */}
          {!isRenegado && aldea?.url_imagen && (
            <div className="absolute inset-0 z-0 opacity-[0.08] pointer-events-none scale-105">
              <img src={aldea.url_imagen} alt="" className="w-full h-full object-cover grayscale brightness-50" />
            </div>
          )}

          <Link href="/mundo-ninja" className="flex items-center gap-3 text-oro hover:brightness-125 transition-all group font-black uppercase tracking-widest text-[10px] sm:text-xs xl:text-sm mb-10 relative z-10">
            <div className={`w-2 h-2 ${isRenegado ? 'bg-rojo-sangre' : 'bg-oro'} rotate-45 group-hover:bg-oro transition-colors`} />
            <span>Volver al Mundo Ninja</span>
          </Link>

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-10 relative z-10">
            <div className="flex items-center gap-8">
              <div className={`w-24 h-24 xl:w-32 xl:h-32 bg-black/40 border ${isRenegado ? 'border-rojo-sangre/20' : 'border-oro/20'} ninja-clip-md overflow-hidden flex items-center justify-center shadow-2xl backdrop-blur-sm`}>
                {!isRenegado && aldea?.url_imagen ? (
                  <img src={aldea.url_imagen} alt="" className="w-full h-full object-cover filter brightness-95" />
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

        <div className="w-full">
          {ninjas.length > 0 ? (
            <div className={`ninja-card-oro overflow-hidden border ${isRenegado ? 'border-rojo-sangre/20' : 'border-oro/20'} bg-black/40 backdrop-blur-sm`}>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[600px]">
                  <thead>
                    <tr className={`border-b ${isRenegado ? 'border-rojo-sangre/10' : 'border-oro/10'} text-oro/40 text-[10px] xl:text-xs font-black uppercase tracking-[0.3em]`}>
                      <th className="py-6 px-8 w-24">Apariencia</th>
                      <th className="py-6 px-8">SHINOBI</th>
                      <th className="py-6 px-8 text-right w-40">RANGO</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isRenegado ? 'divide-rojo-sangre/5' : 'divide-oro/5'}`}>
                    {ninjas.map((ninja) => (
                      <tr key={ninja.id} className="group hover:bg-oro/5 transition-all duration-300">
                        <td className="py-5 px-8">
                          <div className={`w-12 h-12 shrink-0 border ${isRenegado ? 'border-rojo-sangre/20' : 'border-oro/20'} bg-black/40 overflow-hidden flex items-center justify-center ninja-clip-xs`}>
                            {ninja.url_img ? (
                              <img 
                                src={ninja.url_img} 
                                className="w-full h-full object-cover object-top" 
                                alt="Avatar" 
                              />
                            ) : (
                              <User className={`w-6 h-6 ${isRenegado ? 'text-rojo-sangre/40' : 'text-oro/25'}`} />
                            )}
                          </div>
                        </td>
                        <td className="py-5 px-8">
                          <Link href={`/ficha/${ninja.id}`} className="block">
                            <p className="ninja-title text-xl xl:text-2xl group-hover:text-white transition-colors leading-tight">
                              {ninja.nombre_ninja}
                            </p>
                            <p className="text-[10px] text-oro/30 font-black uppercase tracking-widest mt-1 italic">
                              @{ (Array.isArray(ninja.profiles) ? ninja.profiles[0]?.username : ninja.profiles?.username) || ninja.hobba_name }
                            </p>
                          </Link>
                        </td>
                        <td className="py-5 px-8 text-right">
                          <span className={`px-4 py-1.5 ${isRenegado ? 'bg-rojo-sangre/20 text-rojo-sangre border-rojo-sangre/40' : 'bg-oro/10 text-oro border-oro/20'} text-[10px] xl:text-xs font-black border uppercase tracking-widest ninja-clip-xs`}>
                            RANGO {ninja.rango}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="py-48 text-center ninja-card-oro opacity-50 flex flex-col items-center gap-8">
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
