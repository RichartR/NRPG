import { unstable_cache } from 'next/cache';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { Suspense } from 'react';
import { MasterServerService } from '@/services/supabase/master.server.service';
import MundoNinjaVillageClientView from './MundoNinjaVillageClientView';

export const revalidate = 300; // ISR: revalida el censo cada 5 minutos

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const publicClient = createSupabaseClient(supabaseUrl, supabaseAnonKey);

// Cache de ninjas por aldea (5 min)
const getCachedNinjasByAldea = unstable_cache(
  (aldeaId: number | null) => MasterServerService.getNinjasByAldea(publicClient, aldeaId),
  ['ninjas-por-aldea'],
  { revalidate: 300 }
);

// Cache de aldea por id (5 min)
const getCachedAldeaById = unstable_cache(
  (aldeaId: number) => MasterServerService.getAldeaById(publicClient, aldeaId),
  ['aldea-por-id'],
  { revalidate: 300 }
);

// Cache de equipos por aldea (5 min)
const getCachedEquiposAldea = unstable_cache(
  (aldeaId: number) => MasterServerService.getEquiposAldea(publicClient, aldeaId),
  ['equipos-por-aldea'],
  { revalidate: 300 }
);

export default async function MundoNinjaPublicVillagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const isRenegado = id === 'renegados';

  // Todos los datos son públicos y se sirven desde la caché de ISR.
  // Búsqueda, paginación y sesión se resuelven en el cliente.
  const [aldea, ninjas, maxCuposRaw, rangosJerarquicosRaw, initialEquipos] = await Promise.all([
    isRenegado ? Promise.resolve(null) : getCachedAldeaById(Number(id)),
    getCachedNinjasByAldea(isRenegado ? null : Number(id)),
    isRenegado ? Promise.resolve(null) : MasterServerService.getCachedConfiguracion('cupos_maximos_aldea'),
    MasterServerService.getCachedConfiguracion('rangos_jerarquicos'),
    isRenegado ? Promise.resolve([]) : getCachedEquiposAldea(Number(id)),
  ]);

  const maxCupos =
    maxCuposRaw != null && maxCuposRaw !== ''
      ? Number(maxCuposRaw)
      : 30;

  const haAlcanzadoCupoAldea = !isRenegado && ninjas.length >= maxCupos;

  const aldeaParam = !isRenegado ? `?aldea_id=${id}` : '';

  const rangosJerarquicos = rangosJerarquicosRaw
    ? rangosJerarquicosRaw.split(',').map((s: string) => s.trim())
    : [];

  return (
    // Suspense requerido porque MundoNinjaVillageClientView usa useSearchParams
    <Suspense fallback={null}>
      <MundoNinjaVillageClientView
        id={id}
        isRenegado={isRenegado}
        aldea={aldea}
        ninjas={ninjas}
        maxCupos={maxCupos}
        haAlcanzadoCupoAldea={haAlcanzadoCupoAldea}
        aldeaParam={aldeaParam}
        rangosJerarquicos={rangosJerarquicos}
        initialEquipos={initialEquipos}
      />
    </Suspense>
  );
}
