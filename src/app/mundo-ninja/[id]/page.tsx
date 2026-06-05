import { createClient } from '@/utils/supabase/server';
import { MapPin, User, UserPlus, LogIn } from 'lucide-react';
import Link from 'next/link';
import { MasterServerService } from '@/services/supabase/master.server.service';
import { CharacterServerService } from '@/services/supabase/character.server.service';
import { NinjaSearchInput } from '@/components/character/NinjaSearchInput';
import Breadcrumbs from '@/components/ui/Breadcrumbs';

export default async function MundoNinjaPublicVillagePage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string; search?: string }>;
}) {
  const supabase = await createClient();
  const { id } = await params;
  const resolvedSearchParams = await searchParams;
  const isRenegado = id === 'renegados';

  // Sesión del usuario (no redirige si no está logueado)
  const { data: { user } } = await supabase.auth.getUser();

  // Datos de la aldea, ninjas, elegibilidad y cupos máximos — todo en paralelo
  const [aldea, ninjas, haAlcanzadoLimite, maxCuposRaw] = await Promise.all([
    isRenegado ? Promise.resolve(null) : MasterServerService.getAldeaById(supabase, Number(id)),
    MasterServerService.getNinjasByAldea(supabase, isRenegado ? null : Number(id)),
    user ? CharacterServerService.hasReachedCharacterLimit(supabase, user.id) : Promise.resolve(false),
    isRenegado ? Promise.resolve(null) : MasterServerService.getConfiguracion(supabase, 'cupos_maximos_aldea'),
  ]);

  const maxCupos =
    maxCuposRaw != null && maxCuposRaw !== ''
      ? Number(maxCuposRaw)
      : 30;

  const haAlcanzadoCupoAldea = !isRenegado && ninjas.length >= maxCupos;

  // Puede crear ficha: está logueado Y no ha alcanzado el límite configurado Y la aldea no está llena
  const puedeCrearFicha = !!user && !haAlcanzadoLimite && !haAlcanzadoCupoAldea;

  const aldeaParam = !isRenegado ? `?aldea_id=${id}` : '';

  // Filtrado por buscador (por nombre del ninja o por cuenta de Discord / nombre de usuario)
  const searchQuery = resolvedSearchParams.search || '';
  const filteredNinjas = searchQuery
    ? ninjas.filter((ninja) => {
      const nombreMatches = ninja.nombre_ninja.toLowerCase().includes(searchQuery.toLowerCase());
      const profileUsername = (Array.isArray(ninja.profiles) ? ninja.profiles[0]?.username : ninja.profiles?.username) || ninja.hobba_name || '';
      const discordMatches = profileUsername.toLowerCase().includes(searchQuery.toLowerCase());
      return nombreMatches || discordMatches;
    })
    : ninjas;

  // Configuración de Paginación (10 elementos por página sobre el set filtrado)
  const itemsPerPage = 10;
  const totalItems = filteredNinjas.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const pageParam = Number(resolvedSearchParams.page) || 1;
  const currentPage = Math.max(1, Math.min(pageParam, totalPages || 1));
  const paginatedNinjas = filteredNinjas.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const searchParamSuffix = searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : '';

  return (
    <div className="pt-24 pb-20 px-4">
      <div className="max-w-[1750px] mx-auto w-full">
        <header className={`mb-12 ${isRenegado ? 'ninja-card-rojo' : 'ninja-card-oro'} p-8 xl:p-12 relative overflow-hidden`}>
          {/* Imagen de fondo de la aldea */}
          {!isRenegado && aldea?.url_imagen && (
            <div className="absolute inset-0 z-0 opacity-[0.08] pointer-events-none scale-105">
              <img src={aldea.url_imagen} alt="" className="w-full h-full object-cover grayscale brightness-50" />
            </div>
          )}

          <div className="relative z-10 mb-10">
            <Breadcrumbs
              items={[
                { label: 'Inicio', href: '/' },
                { label: 'Mundo Ninja', href: '/mundo-ninja' },
                { label: isRenegado ? 'Renegados / Ninjas sin Aldea' : (aldea?.abreviatura || aldea?.nombre_completo || '') }
              ]}
            />
          </div>

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
                  <span className={`text-caption xl:text-xs font-black ${isRenegado ? 'text-rojo-sangre/60' : 'text-oro/60'} uppercase tracking-[0.3em]`}>
                    SHINOBIS REGISTRADOS
                  </span>
                  <div className={`w-1 h-1 ${isRenegado ? 'bg-rojo-sangre/20' : 'bg-oro/20'} rotate-45`} />
                  <span className="text-xl xl:text-2xl font-black text-oro italic leading-none">
                    {isRenegado ? ninjas.length : `${ninjas.length}/${maxCupos}`}
                  </span>
                </div>
              </div>
            </div>

            {/* CTA de creación de ficha */}
            <div className="shrink-0">
              {!user ? (
                <Link
                  href="/login"
                  className="flex items-center justify-center gap-4 px-10 py-5 ninja-btn-ghost text-xs xl:text-sm"
                >
                  <LogIn className="w-5 h-5" /> INICIAR SESIÓN
                </Link>
              ) : haAlcanzadoLimite ? (
                <div className="flex items-center gap-4 px-10 py-5 bg-black/20 border border-oro/10 ninja-clip-sm text-caption xl:text-xs font-black uppercase tracking-widest text-oro/40 italic backdrop-blur-sm">
                  <User className="w-5 h-5 opacity-20" /> Ya posees un personaje activo
                </div>
              ) : haAlcanzadoCupoAldea ? (
                <div className="flex items-center gap-4 px-10 py-5 bg-rojo-sangre/10 border border-rojo-sangre/30 ninja-clip-sm text-caption xl:text-xs font-black uppercase tracking-widest text-rojo-sangre/70 italic backdrop-blur-sm shadow-[0_0_15px_rgba(185,28,28,0.15)]">
                  <User className="w-5 h-5 opacity-40 text-rojo-sangre" /> Cupos agotados en esta aldea
                </div>
              ) : (
                <Link
                  href={`/crear-ficha${aldeaParam}`}
                  className={`flex items-center justify-center gap-4 px-10 py-5 ${isRenegado ? 'ninja-btn-rojo' : 'ninja-btn-oro'} text-xs xl:text-sm`}
                >
                  <UserPlus className="w-5 h-5" /> CREAR PERSONAJE
                </Link>
              )}
            </div>
          </div>
        </header>

        <div className="w-full space-y-6">
          {/* Buscador de Ninjas */}
          {ninjas.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pb-2">
              <NinjaSearchInput isRenegado={isRenegado} placeholder="Buscar shinobi por nombre..." />
              {searchQuery && (
                <span className={`text-caption font-black ${isRenegado ? 'text-rojo-sangre/40' : 'text-oro/40'} uppercase tracking-[0.2em] italic`}>
                  Encontrados {filteredNinjas.length} de {ninjas.length} registrados
                </span>
              )}
            </div>
          )}

          {filteredNinjas.length > 0 ? (
            <div className={`ninja-card-oro overflow-hidden border ${isRenegado ? 'border-rojo-sangre/20' : 'border-oro/20'} bg-black/40 backdrop-blur-sm`}>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead>
                    <tr className={`border-b ${isRenegado ? 'border-rojo-sangre/10' : 'border-oro/10'} text-oro/40 text-caption xl:text-xs font-black uppercase tracking-[0.3em]`}>
                      <th className="py-6 px-8 w-24 whitespace-nowrap">Apariencia</th>
                      <th className="py-6 px-8 w-full whitespace-nowrap">SHINOBI</th>
                      <th className="py-6 px-8 text-center whitespace-nowrap">JERARQUÍA</th>
                      <th className="py-6 px-8 text-right whitespace-nowrap">RANGO</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isRenegado ? 'divide-rojo-sangre/5' : 'divide-oro/5'}`}>
                    {paginatedNinjas.map((ninja) => (
                      <tr key={ninja.id} className="group hover:bg-oro/5 transition-all duration-300 relative cursor-pointer">
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
                          <Link href={`/ficha/${ninja.id}`} className="block after:absolute after:inset-0 after:z-10">
                            <p className="ninja-title text-xl xl:text-2xl group-hover:text-white transition-colors leading-tight">
                              {ninja.nombre_ninja}
                            </p>
                            <p className="text-caption text-oro/30 font-black uppercase tracking-widest mt-1 italic whitespace-nowrap">
                              @{(Array.isArray(ninja.profiles) ? ninja.profiles[0]?.username : ninja.profiles?.username) || ninja.hobba_name}
                            </p>
                          </Link>
                        </td>
                        <td className="py-5 px-8 text-center whitespace-nowrap">
                          <span className={`text-caption xl:text-xs font-black ${isRenegado ? 'text-rojo-sangre/60' : 'text-oro/60'} uppercase tracking-widest whitespace-nowrap`}>
                            {ninja.rango_jerarquico || 'SIN RANGO'}
                          </span>
                        </td>
                        <td className="py-5 px-8 text-right whitespace-nowrap">
                          <span className={`inline-block px-4 py-1.5 ${isRenegado ? 'bg-rojo-sangre/20 text-rojo-sangre border-rojo-sangre/40' : 'bg-oro/10 text-oro border-oro/20'} text-caption xl:text-xs font-black border uppercase tracking-widest ninja-clip-xs whitespace-nowrap`}>
                            RANGO {ninja.rango}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Controles de Paginación */}
              {totalPages > 1 && (
                <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 px-8 py-6 border-t ${isRenegado ? 'border-rojo-sangre/10' : 'border-oro/10'} bg-black/20 text-xs font-black uppercase tracking-widest`}>
                  <div>
                    <span className="text-oro/40">
                      Mostrando {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, totalItems)} de {totalItems} shinobis
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    {currentPage > 1 ? (
                      <Link
                        href={`/mundo-ninja/${id}?page=${currentPage - 1}${searchParamSuffix}`}
                        className={`px-4 py-2 border ${isRenegado ? 'border-rojo-sangre/30 hover:bg-rojo-sangre/20 text-rojo-sangre hover:text-white' : 'border-oro/30 hover:bg-oro/20 text-oro hover:text-white'} transition-all`}
                        style={{ clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)' }}
                      >
                        Anterior
                      </Link>
                    ) : (
                      <span
                        className="px-4 py-2 border border-oro/5 text-oro/10 cursor-not-allowed"
                        style={{ clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)' }}
                      >
                        Anterior
                      </span>
                    )}

                    <span className="text-oro font-black">
                      {currentPage} / {totalPages}
                    </span>

                    {currentPage < totalPages ? (
                      <Link
                        href={`/mundo-ninja/${id}?page=${currentPage + 1}${searchParamSuffix}`}
                        className={`px-4 py-2 border ${isRenegado ? 'border-rojo-sangre/30 hover:bg-rojo-sangre/20 text-rojo-sangre hover:text-white' : 'border-oro/30 hover:bg-oro/20 text-oro hover:text-white'} transition-all`}
                        style={{ clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)' }}
                      >
                        Siguiente
                      </Link>
                    ) : (
                      <span
                        className="px-4 py-2 border border-oro/5 text-oro/10 cursor-not-allowed"
                        style={{ clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)' }}
                      >
                        Siguiente
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : ninjas.length > 0 ? (
            /* Filtro vacío (ninjas existen en la aldea pero ninguno coincide) */
            <div className={`py-32 text-center ${isRenegado ? 'ninja-card-rojo' : 'ninja-card-oro'} opacity-75 flex flex-col items-center gap-6`}>
              <User className="w-16 h-16 text-oro/10 animate-pulse" />
              <div className="space-y-2">
                <h3 className="text-lg xl:text-xl font-black text-oro/40 uppercase tracking-[0.3em] italic leading-none">NO SE ENCONTRARON SHINOBIS</h3>
                <p className="text-caption font-black text-oro/20 uppercase tracking-[0.4em]">Ninguna ficha coincide con &quot;{searchQuery}&quot;</p>
              </div>
              <Link
                href={`/mundo-ninja/${id}`}
                className={`px-6 py-3 border ${isRenegado ? 'border-rojo-sangre/30 hover:bg-rojo-sangre/20 text-rojo-sangre' : 'border-oro/30 hover:bg-oro/20 text-oro'} text-caption xl:text-xs font-black uppercase tracking-widest mt-2`}
                style={{ clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)' }}
              >
                Limpiar búsqueda
              </Link>
            </div>
          ) : (
            /* Aldea vacía (No hay fichas creadas aún) */
            <div className={`py-48 text-center ${isRenegado ? 'ninja-card-rojo' : 'ninja-card-oro'} opacity-50 flex flex-col items-center gap-8`}>
              <User className="w-24 h-24 text-oro/10" />
              <div className="space-y-2">
                <h3 className="text-xl xl:text-2xl font-black text-oro/40 uppercase tracking-[0.4em] italic leading-none">AÚN NO HAY SHINOBIS EN ESTA REGIÓN</h3>
                <p className="text-caption xl:text-xs font-black text-oro/20 uppercase tracking-[0.6em]">EL DESTINO AGUARDA A SU PRIMER HÉROE</p>
              </div>
              {puedeCrearFicha && (
                <Link
                  href={`/crear-ficha${aldeaParam}`}
                  className={`mt-6 px-10 py-5 ${isRenegado ? 'ninja-btn-rojo' : 'ninja-btn-oro'}`}
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
