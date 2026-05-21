import { createClient } from '@/utils/supabase/server';
import { fetchDiscordMessage } from '@/lib/discord/fetchMessage';
import { Megaphone, CalendarRange, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { MasterServerService } from '@/services/supabase/master.server.service';
import Breadcrumbs from '@/components/ui/Breadcrumbs';

// Helper para obtener estilos de categoría de forma limpia
const getCategoryStyles = (categoria: string) => {
  switch (categoria) {
    case 'Parche':
      return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    case 'Evento':
      return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
    default:
      return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
  }
};

export default async function NoticiasPage() {
  const supabase = await createClient();
  
  let indexList: any[] = [];
  try {
    indexList = await MasterServerService.getNoticiasIndex(supabase, 10);
  } catch {
    return <div className="p-8 text-red-500">Error cargando el índice de noticias.</div>;
  }

  // Si no hay noticias, ponemos unas de prueba en la UI por si la DB está vacía
  const mockNews = [
    { discord_msg_id: '1', titulo: '¡Bienvenidos a NRPG!', categoria: 'Noticia' },
    { discord_msg_id: '2', titulo: 'Parche 1.0.1: Balance de Taijutsu', categoria: 'Parche' }
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

        {newsWithContent.map((news: any) => (
          <article key={news.discord_msg_id} className="group bg-black/60 border border-oro/10 ninja-box p-10 xl:p-16 backdrop-blur-md hover:border-oro/30 transition-all relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-oro/5 rounded-full blur-3xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />
            
            <div className="relative z-10">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                <div className="flex items-center gap-6">
                  <span className="px-6 py-2 text-xs xl:text-sm font-black bg-rojo-sangre text-oro uppercase tracking-[0.3em] ninja-box">
                    {news.categoria || 'Noticia'}
                  </span>
                  <div className="flex items-center gap-3 text-oro/60 text-xs xl:text-base font-bold uppercase tracking-widest">
                    <div className="w-1.5 h-1.5 bg-oro/40 rotate-45" />
                    {new Date(news.timestamp).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </div>
                </div>
              </div>
              
              <h2 className="text-4xl xl:text-6xl font-black text-oro mb-10 tracking-tight group-hover:brightness-125 transition-all uppercase font-ninja">
                {news.titulo}
              </h2>
              
              <div className="prose prose-invert max-w-none prose-p:text-gris-texto prose-p:text-lg xl:prose-p:text-2xl xl:prose-p:leading-relaxed">
                {news.content.split('\n').map((line: string, i: number) => (
                  <p key={i} className="mb-6 last:mb-0">
                    {line.split(/(\*\*.*?\*\*)/g).map((part, index) => 
                      part.startsWith('**') && part.endsWith('**') 
                        ? <strong key={index} className="text-oro font-black">{part.slice(2, -2)}</strong>
                        : part
                    )}
                  </p>
                ))}
              </div>
            </div>
          </article>
        ))}
      </main>
    </div>

  );
}
