import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';
import { GitBranch, ChevronRight, ChevronLeft } from 'lucide-react';
import { MasterServerService } from '@/services/supabase/master.server.service';

export default async function RamasPage() {
  const supabase = await createClient();

  const ramas = await MasterServerService.getRamasGlobales(supabase);

  return (
    <div className="min-h-screen p-4 sm:p-8 xl:p-12 flex flex-col">
      <header className="w-full max-w-[1750px] mx-auto flex justify-between items-center mb-10 ninja-card-oro p-8 xl:p-10 relative z-50">
        <Link href="/" className="flex items-center gap-4 text-oro hover:brightness-125 transition-all group font-black uppercase tracking-widest text-sm xl:text-lg">
          <div className="w-2 xl:w-3 h-2 xl:h-3 bg-rojo-sangre rotate-45 group-hover:bg-oro transition-colors" />
          Volver al Dashboard
        </Link>
        <div className="flex items-center gap-4">
          <img src="https://game.gtimg.cn/images/hyrz/web2026/content-news-head.png" className="w-4 xl:w-6 h-auto" alt="icon" />
          <h1 className="text-xl xl:text-2xl font-black text-oro uppercase tracking-[0.3em]">
            Especialidades Ninja
          </h1>
        </div>
      </header>

      <main className="w-full max-w-[1750px] mx-auto flex-1">
        <div className="mb-10 ninja-card-oro p-12 xl:p-16">
          <div className="flex items-center gap-6 mb-6">
            <img src="https://game.gtimg.cn/images/hyrz/web2026/content-news-head.png" className="w-5 xl:w-8 h-auto" alt="icon" />
            <h1 className="ninja-title text-5xl xl:text-8xl">RAMAS PRINCIPALES</h1>
          </div>
          <p className="text-gris-texto text-lg xl:text-2xl max-w-4xl leading-relaxed">Las especialidades fundamentales que definen el camino de cada shinobi en el campo de batalla.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10 xl:gap-16">
          {ramas?.map((rama) => (
            <Link 
              key={rama.id} 
              href={`/ramas/${rama.slug}`}
              className="group relative bg-black/60 backdrop-blur-md p-10 xl:p-14 ninja-box ninja-border hover-ninja flex flex-col justify-between min-h-[350px]"
            >
              <div className="relative z-10">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-3 h-3 bg-rojo-sangre rotate-45" />
                  <div>
                    <h2 className="text-3xl xl:text-4xl font-black text-oro uppercase tracking-tight leading-none mb-2 group-hover:brightness-125 transition-all">{rama.nombre}</h2>
                    <span className="text-[10px] xl:text-xs font-black text-oro/40 uppercase tracking-[0.3em]">{rama.nombre_español}</span>
                  </div>
                </div>

                <p className="text-gris-texto/80 text-base xl:text-xl leading-relaxed mb-10 line-clamp-3 italic">
                  "{rama.descripcion}"
                </p>
              </div>

              <div className="flex items-center gap-4 text-oro font-black uppercase tracking-[0.2em] text-xs xl:text-base group-hover:brightness-125 transition-all">
                <span>Dominar Rama</span>
                <div className="w-1.5 h-1.5 bg-oro rotate-45 group-hover:translate-x-2 transition-transform" />
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>

  );
}
