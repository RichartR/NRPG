import { createClient } from '@/utils/supabase/server';
import { MasterServerService } from '@/services/supabase/master.server.service';
import { ProfileService } from '@/services/supabase/profile.service';
import BienvenidaClientView from './BienvenidaClientView';

export default async function BienvenidaPage() {
  const supabase = await createClient();

  const [docs, { data: { user } }] = await Promise.all([
    MasterServerService.getDocumentosByCategoria(supabase, 'bienvenida'),
    supabase.auth.getUser()
  ]);

  const profile = user ? await ProfileService.getProfile(user.id, supabase) : null;
  const isAdmin = profile?.role === 'admin';

  let adminDocs: any[] = [];
  let adminCategories: any[] = [];

  if (isAdmin) {
    [adminDocs, adminCategories] = await Promise.all([
      MasterServerService.getAdminDocumentosSistemasByCategories(supabase, ['bienvenida']),
      MasterServerService.getCategoriaDocumentos(supabase, ['bienvenida'])
    ]);
  }

  return (
    <BienvenidaClientView
      initialDocs={docs}
      isAdmin={isAdmin}
      adminDocs={adminDocs}
      adminCategories={adminCategories}
    />
  );
}
