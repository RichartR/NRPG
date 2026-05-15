import { createClient } from '@/utils/supabase/server';
import { MapPin, ChevronLeft, Globe, Users } from 'lucide-react';
import Link from 'next/link';
import { MasterServerService } from '@/services/supabase/master.server.service';

export default async function MundoNinjaSelectionPage() {
  const supabase = await createClient();
  
  const aldeas = await MasterServerService.getAldeasActivas(supabase);
  const countsMap = await MasterServerService.getCharacterCountsByAldea(supabase, aldeas.map(a => a.id));

  const getCount = (id: number | null) => {
    return id ? (countsMap[id] || 0) : (countsMap['renegados'] || 0);
  };

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
            MUNDO NINJA
          </h1>
        </div>
      </header>

      <main className="w-full max-w-[1750px] mx-auto flex-1">
        <div className="mb-20 bg-black/40 p-12 xl:p-16 ninja-box ninja-border backdrop-blur-md">
          <div className="flex items-center gap-6 mb-6">
            <img src="https://game.gtimg.cn/images/hyrz/web2026/content-news-head.png" className="w-5 xl:w-8 h-auto" alt="icon" />
            <h1 className="ninja-title text-5xl xl:text-8xl">Shinobis de las Naciones</h1>
          </div>
          <p className="text-gris-texto text-lg xl:text-2xl max-w-4xl leading-relaxed">Descubre a los ninjas que forjan la historia de las grandes aldeas ocultas y el destino del mundo.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 xl:gap-16">
          {aldeas?.map((aldea) => (
            <Link 
              key={aldea.id}
              href={`/mundo-ninja/${aldea.id}`}
              className="group relative bg-black/60 border border-oro/10 ninja-box p-8 xl:p-12 hover:border-oro/30 transition-all overflow-hidden flex items-center justify-between"
            >
              <div className="relative z-10 flex items-center gap-8">
                <div className="w-20 xl:w-28 h-20 xl:h-28 bg-black/40 border border-oro/20 p-4 flex items-center justify-center shrink-0 shadow-xl group-hover:scale-110 transition-transform">
                  {aldea.url_icono ? (
                    <img src={aldea.url_icono} alt="" className="w-full h-full object-contain" />
                  ) : (
                    <div className="w-4 h-4 bg-oro/20 rotate-45" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-4 mb-2">
                    <h3 className="text-3xl xl:text-5xl font-black text-oro uppercase tracking-tight group-hover:brightness-125 transition-all">{aldea.nombre_jap}</h3>
                    <span className="px-3 py-1 bg-rojo-sangre text-oro text-[10px] xl:text-xs font-black border border-oro/20 uppercase tracking-widest">{aldea.abreviatura}</span>
                  </div>
                  <p className="text-oro/40 text-sm xl:text-lg font-black uppercase tracking-[0.3em]">{aldea.nombre_español}</p>
                </div>
              </div>

              <div className="relative z-10 flex flex-col items-end gap-1">
                <span className="text-4xl xl:text-6xl font-black text-oro/10 group-hover:text-oro/30 transition-colors leading-none">{getCount(aldea.id)}</span>
                <span className="text-[10px] xl:text-xs font-black text-oro/40 uppercase tracking-widest">Shinobis</span>
              </div>

              {aldea.url_imagen && (
                <div className="absolute inset-0 z-0 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity pointer-events-none">
                  <img src={aldea.url_imagen} alt="" className="w-full h-full object-cover grayscale" />
                </div>
              )}
            </Link>
          ))}

          {/* Sin Aldea / Renegados */}
          <Link 
            href="/mundo-ninja/renegados"
            className="group relative bg-black/60 border border-oro/10 ninja-box p-8 xl:p-12 hover:border-oro/30 transition-all overflow-hidden md:col-span-2 flex items-center justify-between"
          >
            <div className="relative z-10 flex items-center gap-8">
              <div className="w-20 xl:w-28 h-20 xl:h-28 bg-rojo-sangre/5 border border-rojo-sangre/20 p-4 flex items-center justify-center shrink-0 shadow-xl group-hover:scale-110 transition-transform">
                <div className="w-6 xl:w-8 h-6 xl:h-8 bg-rojo-sangre rotate-45" />
              </div>
              <div>
                <h3 className="text-3xl xl:text-5xl font-black text-oro uppercase tracking-tight group-hover:text-rojo-sangre transition-colors">SIN ALDEA / RENEGADOS</h3>
                <p className="text-oro/40 text-sm xl:text-lg font-black uppercase tracking-[0.3em]">Shinobis sin afiliación o exiliados.</p>
              </div>
            </div>

            <div className="relative z-10 flex flex-col items-end gap-1">
              <span className="text-4xl xl:text-6xl font-black text-oro/10 group-hover:text-rojo-sangre/30 transition-colors leading-none">{getCount(null)}</span>
              <span className="text-[10px] xl:text-xs font-black text-oro/40 uppercase tracking-widest">Shinobis</span>
            </div>
          </Link>
        </div>
      </main>
    </div>

  );
}
