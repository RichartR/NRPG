import { createClient } from '@/utils/supabase/server';
import { MasterServerService } from '@/services/supabase/master.server.service';
import { CharacterServerService } from '@/services/supabase/character.server.service';
import MundoNinjaVillageClientView from './MundoNinjaVillageClientView';
import { searchAny } from '@/lib/utils/search';

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

  // Datos de la aldea, ninjas, elegibilidad, cupos máximos y equipos — todo en paralelo
  const [aldea, ninjas, haAlcanzadoLimite, maxCuposRaw, rangosJerarquicosRaw, initialEquipos] = await Promise.all([
    isRenegado ? Promise.resolve(null) : MasterServerService.getAldeaById(supabase, Number(id)),
    MasterServerService.getNinjasByAldea(supabase, isRenegado ? null : Number(id)),
    user ? CharacterServerService.hasReachedCharacterLimit(supabase, user.id) : Promise.resolve(false),
    isRenegado ? Promise.resolve(null) : MasterServerService.getConfiguracion(supabase, 'cupos_maximos_aldea'),
    MasterServerService.getConfiguracion(supabase, 'rangos_jerarquicos'),
    isRenegado ? Promise.resolve([]) : MasterServerService.getEquiposAldea(supabase, Number(id)),
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
      const profileUsername = (Array.isArray(ninja.profiles) ? ninja.profiles[0]?.username : ninja.profiles?.username) || ninja.hobba_name || '';
      return searchAny(searchQuery, [ninja.nombre_ninja, profileUsername]);
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

  const rangosJerarquicos = rangosJerarquicosRaw
    ? rangosJerarquicosRaw.split(',').map((s: string) => s.trim())
    : [];

  return (
    <MundoNinjaVillageClientView
      id={id}
      isRenegado={isRenegado}
      aldea={aldea}
      ninjas={ninjas}
      maxCupos={maxCupos}
      puedeCrearFicha={puedeCrearFicha}
      aldeaParam={aldeaParam}
      searchQuery={searchQuery}
      filteredNinjas={filteredNinjas}
      paginatedNinjas={paginatedNinjas}
      totalPages={totalPages}
      currentPage={currentPage}
      searchParamSuffix={searchParamSuffix}
      rangosJerarquicos={rangosJerarquicos}
      initialEquipos={initialEquipos}
    />
  );
}
