import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';
import { Map, ChevronRight, ChevronLeft } from 'lucide-react';
import { MasterServerService } from '@/services/supabase/master.server.service';

export default async function AldeasPage() {
  const supabase = await createClient();

  const aldeas = await MasterServerService.getAldeasActivas(supabase);

  return (
    <div className="min-h-screen p-4 sm:p-8 xl:p-20 flex flex-col">
      <header className="w-full max-w-[1750px] mx-auto flex justify-between items-center mb-16 bg-black/60 p-8 xl:p-10 ninja-box ninja-border backdrop-blur-md relative z-50">
        <Link href="/" className="flex items-center gap-4 text-oro hover:brightness-125 transition-all group font-black uppercase tracking-widest text-sm xl:text-lg">
          <div className="w-2 xl:w-3 h-2 xl:h-3 bg-rojo-sangre rotate-45 group-hover:bg-oro transition-colors" />
          Volver al Dashboard
        </Link>
        <div className="flex items-center gap-4">
          <img src="https://game.gtimg.cn/images/hyrz/web2026/content-news-head.png" className="w-4 xl:w-6 h-auto" alt="icon" />
          <h1 className="text-xl xl:text-2xl font-black text-oro uppercase tracking-[0.3em]">
            Geografía del Mundo
          </h1>
        </div>
      </header>

      <main className="w-full max-w-[1750px] mx-auto flex-1">
        <div className="mb-20 bg-black/40 p-12 xl:p-16 ninja-box ninja-border backdrop-blur-md">
          <div className="flex items-center gap-6 mb-6">
            <img src="https://game.gtimg.cn/images/hyrz/web2026/content-news-head.png" className="w-5 xl:w-8 h-auto" alt="icon" />
            <h1 className="ninja-title text-5xl xl:text-8xl">NACIONES OCULTAS</h1>
          </div>
          <p className="text-gris-texto text-lg xl:text-2xl max-w-4xl leading-relaxed">Las grandes naciones que mantienen el equilibrio del poder. Cada aldea posee su propia historia, clanes y tradiciones únicas.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10 xl:gap-16">
          {aldeas.map((aldea) => (
            <Link 
              key={aldea.id} 
              href={`/aldeas/${aldea.slug}`}
              className="group relative bg-black/60 backdrop-blur-md ninja-box ninja-border hover-ninja flex flex-col h-full"
            >
              {/* Imagen de fondo (Banner) */}
              <div className="h-56 xl:h-72 relative overflow-hidden border-b border-oro/10">
                {aldea.url_imagen ? (
                  <img 
                    src={aldea.url_imagen} 
                    alt="" 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000 opacity-30 group-hover:opacity-50 grayscale"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full bg-black/40" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent opacity-60" />
                
                <div className="absolute bottom-6 left-8 z-10">
                  <div className="flex items-baseline gap-3 mb-1">
                    <h2 className="text-3xl xl:text-5xl font-black text-oro uppercase tracking-tighter group-hover:brightness-125 transition-all">{aldea.abreviatura || aldea.nombre_jap}</h2>
                    <span className="text-xs xl:text-sm font-bold text-oro/60 uppercase tracking-widest">{aldea.nombre_español}</span>
                  </div>
                </div>
              </div>

              <div className="p-8 xl:p-10 flex flex-col flex-1 relative z-10">
                <p className="text-gris-texto/80 text-base xl:text-xl leading-relaxed mb-10 line-clamp-3">
                  {aldea.descripcion}
                </p>

                <div className="mt-auto flex items-center justify-between">
                  <div className="flex items-center gap-4 text-oro font-black uppercase tracking-[0.2em] text-xs xl:text-base group-hover:brightness-125 transition-all">
                    <span>Explorar Lore</span>
                    <div className="w-1.5 h-1.5 bg-oro rotate-45 group-hover:translate-x-2 transition-transform" />
                  </div>
                  <span className="text-[10px] xl:text-xs text-oro/20 font-mono italic">#{aldea.slug}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>

  );
}
