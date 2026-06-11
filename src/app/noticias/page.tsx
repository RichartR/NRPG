import { createClient } from '@/utils/supabase/server';
import { ProfileService } from '@/services/supabase/profile.service';
import NoticiasClientView from './NoticiasClientView';
import { unstable_cache } from 'next/cache';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const publicClient = createSupabaseClient(supabaseUrl, supabaseAnonKey);

const getCachedAllNews = unstable_cache(
  async () => {
    const { data } = await publicClient
      .from('info_noticias_index')
      .select('*')
      .order('id', { ascending: false });
    return data || [];
  },
  ['all-noticias-page'],
  { revalidate: 30 }
);

export default async function NoticiasPage() {
  let allNews: any[] = [];
  const mockNews = [
    { id: 1, discord_msg_id: '1', titulo: '¡Bienvenidos a NRPG!', categoria: 'Noticia', url_imagen: 'https://game.gtimg.cn/images/hyrz/web2026/kv.jpg' },
    { id: 2, discord_msg_id: '2', titulo: 'Parche 1.0.1: Balance de Taijutsu', categoria: 'Parche', url_imagen: 'https://game.gtimg.cn/images/hyrz/web2026/match.jpg' }
  ];

  // 2. Verificar rol de administrador de forma segura
  const supabase = await createClient();
  const [userRes, cachedNews] = await Promise.all([
    supabase.auth.getUser(),
    getCachedAllNews()
  ]);

  allNews = cachedNews || [];
  const rawNewsList = allNews && allNews.length > 0 ? allNews : mockNews;

  // Filter active news for players: any news that doesn't have `activo` explicitly set to false is active.
  // This is highly robust if the column is newly added or null.
  const playerNewsList = rawNewsList.filter((n: any) => n.activo !== false);
  const adminNewsList = rawNewsList;

  const user = userRes.data?.user;
  const profile = user ? await ProfileService.getProfile(user.id, supabase) : null;
  const isAdmin = profile?.role === 'admin';

  return (
    <NoticiasClientView
      newsList={playerNewsList}
      isAdmin={isAdmin}
      adminNews={adminNewsList}
    />
  );
}
