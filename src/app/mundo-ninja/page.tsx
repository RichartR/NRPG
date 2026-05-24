import { createClient } from '@/utils/supabase/server';
import { MasterServerService } from '@/services/supabase/master.server.service';
import { ProfileService } from '@/services/supabase/profile.service';
import MundoNinjaClientView from './MundoNinjaClientView';

export default async function MundoNinjaSelectionPage() {
  const supabase = await createClient();

  const aldeas = await MasterServerService.getAldeasActivas(supabase);

  const [countsMap, maxCuposRaw] = await Promise.all([
    MasterServerService.getCharacterCountsByAldea(supabase, aldeas.map((a) => a.id)),
    MasterServerService.getConfiguracion(supabase, 'cupos_maximos_aldea'),
  ]);

  const maxCupos =
    maxCuposRaw != null && maxCuposRaw !== ''
      ? Number(maxCuposRaw)
      : 30;

  // 3. Verify administrator role safely on the server
  const { data: { user } } = await supabase.auth.getUser();
  const profile = user ? await ProfileService.getProfile(user.id) : null;
  const isAdmin = profile?.role === 'admin';

  // 4. Load admin-only villages (all active and inactive) if user is admin
  let adminAldeas: any[] = [];
  if (isAdmin) {
    adminAldeas = await MasterServerService.getAdminAldeas(supabase);
  }

  return (
    <MundoNinjaClientView
      aldeas={aldeas}
      countsMap={countsMap}
      maxCupos={maxCupos}
      isAdmin={isAdmin}
      adminAldeas={adminAldeas}
    />
  );
}
