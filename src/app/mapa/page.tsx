import { createClient } from '@/utils/supabase/server';
import { ProfileService } from '@/services/supabase/profile.service';
import MapaClientView from './MapaClientView';

export default async function MapaPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const profile = user ? await ProfileService.getProfile(user.id, supabase) : null;
  const isAdmin = profile?.role === 'admin' || profile?.roles?.includes('admin') || false;

  return <MapaClientView isAdmin={isAdmin} />;
}
