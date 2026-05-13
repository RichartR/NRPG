import { createClient } from '@/utils/supabase/server';
import { fetchDiscordMessage } from '@/lib/discord/fetchMessage';
import { Megaphone, CalendarRange, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { MasterServerService } from '@/services/supabase/master.server.service';

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
    { discord_msg_id: '1', titulo: '¡Bienvenidos a NRPG Engine!', categoria: 'Noticia' },
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
    <div className="min-h-screen bg-zinc-950 p-4 md:p-8">
      <header className="max-w-4xl mx-auto flex justify-between items-center mb-12">
        <Link href="/" className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors group">
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          Volver al Dashboard
        </Link>
        <h1 className="text-xl font-bold text-zinc-500 flex items-center gap-2">
          <Megaphone className="w-5 h-5 text-orange-500" />
          Muro de Anuncios
        </h1>
      </header>

      <main className="max-w-4xl mx-auto space-y-8">
        {newsWithContent.map((news: any) => (
          <article key={news.discord_msg_id} className="group bg-zinc-900/50 border border-zinc-800/50 rounded-3xl p-6 md:p-8 backdrop-blur-md hover:border-zinc-700 transition-all">
            <div className="flex justify-between items-start mb-6">
              <div className="space-y-3">
                <div className="flex items-center gap-4">
                  <span className={`px-4 py-1 text-[10px] font-black uppercase tracking-widest rounded-full border ${getCategoryStyles(news.categoria)}`}>
                    {news.categoria || 'Noticia'}
                  </span>
                  <span className="text-zinc-500 text-xs font-bold flex items-center gap-1.5">
                    <CalendarRange className="w-3.5 h-3.5" />
                    {new Date(news.timestamp).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </span>
                </div>
                <h2 className="text-3xl font-black text-white tracking-tight group-hover:text-orange-500 transition-colors">
                  {news.titulo}
                </h2>
              </div>
            </div>
            
            <div className="prose prose-invert max-w-none">
              {news.content.split('\n').map((line: string, i: number) => (
                <p key={i} className="text-zinc-400 leading-relaxed mb-3 last:mb-0">
                  {/* Procesamiento simple de negritas en cualquier parte de la línea */}
                  {line.split(/(\*\*.*?\*\*)/g).map((part, index) => 
                    part.startsWith('**') && part.endsWith('**') 
                      ? <strong key={index} className="text-white font-bold">{part.slice(2, -2)}</strong>
                      : part
                  )}
                </p>
              ))}
            </div>
          </article>
        ))}
      </main>
    </div>
  );
}
