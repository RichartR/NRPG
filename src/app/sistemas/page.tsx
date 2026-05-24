import { createClient } from '@/utils/supabase/server';
import { MasterServerService } from '@/services/supabase/master.server.service';
import { ProfileService } from '@/services/supabase/profile.service';
import SistemasClientView from './SistemasClientView';

export default async function SistemasPage() {
  const supabase = await createClient();
  
  // 1. Obtener documentos normales de la categoría 'sistemas' para el jugador
  const docs = await MasterServerService.getDocumentosSistemas(supabase);

  // 2. Verificar rol de administrador de forma segura en el servidor
  const { data: { user } } = await supabase.auth.getUser();
  const profile = user ? await ProfileService.getProfile(user.id) : null;
  const isAdmin = profile?.role === 'admin';

  // 3. Cargar datos administrativos adicionales solo si es admin
  let adminDocs: any[] = [];
  let adminCategories: any[] = [];

  if (isAdmin) {
    [adminDocs, adminCategories] = await Promise.all([
      MasterServerService.getAdminDocumentosSistemasByCategories(supabase, ['sistemas']),
      MasterServerService.getCategoriaDocumentos(supabase, ['sistemas'])
    ]);
  }

  return (
    <SistemasClientView 
      initialDocs={docs}
      isAdmin={isAdmin}
      adminDocs={adminDocs}
      adminCategories={adminCategories}
    />
  );
}
