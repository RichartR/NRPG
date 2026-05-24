import { createClient } from '@/utils/supabase/server';
import { ProfileService } from '@/services/supabase/profile.service';
import NoticiasClientView from './NoticiasClientView';

export default async function NoticiasPage() {
  const supabase = await createClient();

  // 1. Obtener todos los índices de noticias para la vista de jugador y admin
  let allNews: any[] = [];
  try {
    const { data, error } = await supabase
      .from('info_noticias_index')
      .select('*')
      .order('id', { ascending: false });
    if (error) throw error;
    allNews = data || [];
  } catch (error) {
    console.error("Error fetching news index:", error);
    return <div className="p-8 text-red-500">Error cargando el índice de noticias.</div>;
  }

  // Si no hay noticias, ponemos unas de prueba en la UI por si la DB está vacía
  const mockNews = [
    { id: 1, discord_msg_id: '1', titulo: '¡Bienvenidos a NRPG!', categoria: 'Noticia', url_imagen: 'https://game.gtimg.cn/images/hyrz/web2026/kv.jpg' },
    { id: 2, discord_msg_id: '2', titulo: 'Parche 1.0.1: Balance de Taijutsu', categoria: 'Parche', url_imagen: 'https://game.gtimg.cn/images/hyrz/web2026/match.jpg' }
  ];

  const rawNewsList = allNews && allNews.length > 0 ? allNews : mockNews;

  // Filter active news for players: any news that doesn't have `activo` explicitly set to false is active.
  // This is highly robust if the column is newly added or null.
  const playerNewsList = rawNewsList.filter((n: any) => n.activo !== false);
  const adminNewsList = rawNewsList;

  // 2. Verificar rol de administrador de forma segura
  const { data: { user } } = await supabase.auth.getUser();
  const profile = user ? await ProfileService.getProfile(user.id) : null;
  const isAdmin = profile?.role === 'admin';

  return (
    <NoticiasClientView
      newsList={playerNewsList}
      isAdmin={isAdmin}
      adminNews={adminNewsList}
    />
  );
}
