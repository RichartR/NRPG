import { createClient } from '@/utils/supabase/server';
import { fetchDiscordMessage } from '@/lib/discord/fetchMessage';
import { MasterServerService } from '@/services/supabase/master.server.service';
import Breadcrumbs from '@/components/ui/Breadcrumbs';
import NewsGrid from './NewsGrid';

export default async function NoticiasPage() {
  const supabase = await createClient();
  
  let indexList: any[] = [];
  try {
    indexList = await MasterServerService.getNoticiasIndex(supabase, 10);
  } catch (error) {
    console.error("Error fetching news index:", error);
    return <div className="p-8 text-red-500">Error cargando el índice de noticias.</div>;
  }

  // Si no hay noticias, ponemos unas de prueba en la UI por si la DB está vacía
  const mockNews = [
    { discord_msg_id: '1', titulo: '¡Bienvenidos a NRPG!', categoria: 'Noticia', url_imagen: 'https://game.gtimg.cn/images/hyrz/web2026/kv.jpg' },
    { discord_msg_id: '2', titulo: 'Parche 1.0.1: Balance de Taijutsu', categoria: 'Parche', url_imagen: 'https://game.gtimg.cn/images/hyrz/web2026/match.jpg' }
  ];

  const listToRender = indexList && indexList.length > 0 ? indexList : mockNews;

  // Fetch the contents from Discord in parallel
  const newsWithContent = await Promise.all(
    listToRender.map(async (item: any) => {
      const msg = await fetchDiscordMessage(item.discord_msg_id);
      return {
        ...item,
        content: msg?.content || "Contenido no disponible.",
        timestamp: msg?.timestamp || new Date().toISOString(),
      };
    })
  );

  return (
    <div className="min-h-screen p-4 sm:p-8 xl:p-12 flex flex-col">
      <header className="w-full max-w-[1750px] mx-auto flex flex-col md:flex-row justify-between items-center gap-4 mb-10 ninja-card-oro p-6 sm:p-8 xl:p-10 relative z-50">
        <Breadcrumbs 
          items={[
            { label: 'Inicio', href: '/' },
            { label: 'Noticias' }
          ]} 
        />
        <div className="flex items-center gap-4">
          <img src="/assets/icons/shuriken.png" className="w-4 xl:w-6 h-auto" alt="icon" />
          <h1 className="text-lg xl:text-2xl font-black text-oro uppercase tracking-[0.3em] pt-1">
            Muro de Anuncios
          </h1>
        </div>
      </header>

      <main className="w-full max-w-[1750px] mx-auto space-y-12 flex-1">
        <div className="mb-10 ninja-card-oro p-8 sm:p-12 xl:p-16">
          <div className="flex items-center gap-6 mb-6">
            <img src="/assets/icons/shuriken.png" className="w-5 xl:w-8 h-auto" alt="icon" />
            <h1 className="ninja-title text-3xl sm:text-5xl xl:text-8xl">NOTICIAS Y EVENTOS</h1>
          </div>
          <p className="text-gris-texto text-base sm:text-lg xl:text-2xl max-w-4xl leading-relaxed">Mantente al día con las últimas actualizaciones del servidor, eventos de rol y parches de equilibrio.</p>
        </div>

        <NewsGrid newsList={newsWithContent} />
      </main>
    </div>
  );
}
