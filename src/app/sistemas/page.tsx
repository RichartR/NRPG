import { MasterServerService } from '@/services/supabase/master.server.service';
import SistemasClientView from './SistemasClientView';

export const revalidate = 1200;

export default async function SistemasPage() {
  const docs = await MasterServerService.getCachedDocumentosSistemas();
  return <SistemasClientView initialDocs={docs} />;
}
