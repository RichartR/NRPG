import { createClient } from '@/utils/supabase/server';
import { MasterServerService } from '@/services/supabase/master.server.service';
import { ProfileService } from '@/services/supabase/profile.service';
import MundoNinjaClientView from './MundoNinjaClientView';

export default async function MundoNinjaSelectionPage() {
  const supabase = await createClient();

  const [aldeas, { data: { user } }] = await Promise.all([
    MasterServerService.getCachedAldeasActivas(),
    supabase.auth.getUser()
  ]);

  const [countsMap, maxCuposRaw, profile] = await Promise.all([
    MasterServerService.getCharacterCountsByAldea(supabase, aldeas.map((a) => a.id)),
    MasterServerService.getConfiguracion(supabase, 'cupos_maximos_aldea'),
    user ? ProfileService.getProfile(user.id, supabase) : Promise.resolve(null)
  ]);

  const maxCupos =
    maxCuposRaw != null && maxCuposRaw !== ''
      ? Number(maxCuposRaw)
      : 30;

  const isAdmin = profile?.roles?.includes('admin') || false;

  // 4. Load admin-only villages (all active and inactive) if user is admin
  let adminAldeas: any[] = [];
  let initialConfigReseteo: any = null;
  if (isAdmin) {
    const [aldeasData, reseteoData] = await Promise.all([
      MasterServerService.getAdminAldeas(supabase),
      supabase
        .from('sys_configuracion_sistema')
        .select('*')
        .eq('clave', 'periodo_reseteos_gratuitos')
        .maybeSingle()
    ]);
    adminAldeas = aldeasData;
    initialConfigReseteo = reseteoData.data;
  }

  return (
    <MundoNinjaClientView
      aldeas={aldeas}
      countsMap={countsMap}
      maxCupos={maxCupos}
      isAdmin={isAdmin}
      adminAldeas={adminAldeas}
      initialConfigReseteo={initialConfigReseteo}
    />
  );
}
