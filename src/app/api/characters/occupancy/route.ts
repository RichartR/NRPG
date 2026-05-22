import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import { MasterServerService } from '@/services/supabase/master.server.service';

export async function GET() {
  const supabase = await createClient();

  try {
    // 1. Obtener personajes que ocupan cupo (activos OR inactivos por inactividad de menos de 6 meses)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const { data: charactersInCupos, error: errFetch } = await supabase
      .from('reg_characters')
      .select('id, aldea_id, reg_personajes_ramas!reg_personajes_ramas_personaje_id_fkey(rama_id)')
      .eq('eliminado_voluntario', false)
      .or(`activo.eq.true,and(activo.eq.false,archived_at.gt.${sixMonthsAgo.toISOString()})`);

    if (errFetch) throw errFetch;

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

    return NextResponse.json({
      countByAldea,
      countByClan,
      cuposMaximosAldea,
      cuposMaximosOrganizacion
    });
  } catch (error: any) {
    console.error('Occupancy fetch error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
