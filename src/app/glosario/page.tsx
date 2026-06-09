import { createClient } from '@/utils/supabase/server';
import { MasterServerService } from '@/services/supabase/master.server.service';
import GlosarioView from '@/components/glosario/GlosarioView';
import Breadcrumbs from '@/components/ui/Breadcrumbs';

export default async function GlosarioPage() {
  const supabase = await createClient();

  // Fetch data in parallel
  const [categorias, subcategorias, glosarios, ramas, aldeas, subespecialidades, entrenamientos] = await Promise.all([
    MasterServerService.getGlosarioCategorias(supabase),
    MasterServerService.getGlosarioSubcategorias(supabase),
    MasterServerService.getGlosarios(supabase),
    MasterServerService.getRamas(supabase),
    MasterServerService.getAldeasActivas(supabase),
    MasterServerService.getSubEspecialidades(supabase),
    MasterServerService.getAdminEntrenamientos(supabase)
  ]);

  // Mapear entrenamientos a la estructura de Glosario
  const mappedEntrenamientos = (entrenamientos || [])
    .filter((e: any) => e.activo)
    .map((e: any) => ({
      id: 100000 + e.id,
      categoria_id: 5,
      subcategoria_id: undefined,
      aldea_id: e.info_ramas_clanes?.aldea_id || null,
      rama_clan_id: e.id_ramaclan,
      sub_especialidad_id: e.id_subespecialidad,
      nombre_es: e.nombre_esp,
      nombre_jp: e.nombre_jp,
      requisitos: e.requisitos || (e.rango ? { rango: e.rango } : {}),
      coste_exp: e.coste_exp || 0,
      coste_ryous: e.coste_ryous || 0,
      coste_puntos_aprendizaje: e.coste_puntos_aprendizaje || 0,
      activo: true
    }));

  const combinedGlosarios = [...glosarios, ...mappedEntrenamientos];

  // 1. Obtener personajes que ocupan cupo (activos OR inactivos por inactividad de menos de 6 meses)
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const { data: charactersInCupos } = await supabase
    .from('reg_characters')
    .select('id, aldea_id, reg_personajes_ramas!reg_personajes_ramas_personaje_id_fkey(rama_id)')
    .eq('eliminado_voluntario', false)
    .or(`activo.eq.true,and(activo.eq.false,archived_at.gt.${sixMonthsAgo.toISOString()})`);

  const countByAldea: Record<number, number> = {};
  const countByClan: Record<number, number> = {};

  charactersInCupos?.forEach(c => {
    if (c.aldea_id) {
      countByAldea[c.aldea_id] = (countByAldea[c.aldea_id] || 0) + 1;
    }
    const ramas = c.reg_personajes_ramas;
    if (Array.isArray(ramas)) {
      ramas.forEach((r: any) => {
        if (r.rama_id) {
          countByClan[r.rama_id] = (countByClan[r.rama_id] || 0) + 1;
        }
      });
    } else if (ramas && (ramas as any).rama_id) {
      const rId = (ramas as any).rama_id;
      countByClan[rId] = (countByClan[rId] || 0) + 1;
    }
  });

  // 3. Obtener límites de configuración
  const limitAldeaRaw = await MasterServerService.getConfiguracion(supabase, 'cupos_maximos_aldea');
  const limitOrganizacionRaw = await MasterServerService.getConfiguracion(supabase, 'cupos_maximos_organizacion');

  const cuposMaximosAldea = limitAldeaRaw != null && limitAldeaRaw !== '' ? Number(limitAldeaRaw) : 10;
  const cuposMaximosOrganizacion = limitOrganizacionRaw != null && limitOrganizacionRaw !== '' ? Number(limitOrganizacionRaw) : 10;

  return (
    <div className="min-h-screen p-4 sm:p-8 xl:p-12 flex flex-col">
      {/* Header */}
      <header className="w-full max-w-[1750px] mx-auto flex flex-col md:flex-row justify-between items-center gap-10 mb-10 ninja-card-oro p-8 xl:p-10 z-50">
        <Breadcrumbs
          items={[
            { label: 'Inicio', href: '/' },
            { label: 'Biblioteca', href: '/documentos' },
            { label: 'Glosario' }
          ]}
        />
        <div className="flex items-center gap-4">
          <img src="/assets/icons/shuriken.png" className="w-4 xl:w-6 h-auto" alt="icon" />
          <h1 className="text-xl xl:text-2xl font-black text-oro uppercase tracking-[0.3em]">
            Glosario <span className="text-oro/40">Shinobi</span>
          </h1>
        </div>
      </header>

      <main className="w-full max-w-[1750px] mx-auto flex-1">
        <GlosarioView
          categorias={categorias}
          subcategorias={subcategorias}
          glosarios={combinedGlosarios}
          ramas={ramas}
          aldeas={aldeas}
          subespecialidades={subespecialidades}
          countByAldea={countByAldea}
          countByClan={countByClan}
          cuposMaximosAldea={cuposMaximosAldea}
          cuposMaximosOrganizacion={cuposMaximosOrganizacion}
        />
      </main>
    </div>
  );
}
