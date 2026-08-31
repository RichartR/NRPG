import { MasterServerService } from '@/services/supabase/master.server.service';
import BienvenidaClientView from './BienvenidaClientView';

export const revalidate = 1200;

export default async function BienvenidaPage() {
  const docs = await MasterServerService.getCachedDocumentosByCategoria('bienvenida');
  return <BienvenidaClientView initialDocs={docs} />;
}
