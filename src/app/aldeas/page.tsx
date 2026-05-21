import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';
import { Map, ChevronRight, ChevronLeft } from 'lucide-react';
import { MasterServerService } from '@/services/supabase/master.server.service';
import Breadcrumbs from '@/components/ui/Breadcrumbs';

function getTitleFontSize(name: string) {
  const len = name.length;
  if (len <= 4) {
    return "text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-5xl 2xl:text-6xl";
  }
  if (len <= 7) {
    return "text-2xl sm:text-3xl md:text-4xl lg:text-4xl xl:text-4xl 2xl:text-5xl";
  }
  return "text-xl sm:text-2xl md:text-3xl lg:text-3xl xl:text-3xl 2xl:text-4xl";
}

export default async function AldeasPage() {
  const supabase = await createClient();
  const aldeas = await MasterServerService.getAldeasActivas(supabase);

  return (
    <div className="min-h-screen p-4 sm:p-8 xl:p-12 flex flex-col">
      <header className="w-full max-w-[1750px] mx-auto flex flex-col md:flex-row justify-between items-center gap-10 mb-10 ninja-card-oro p-8 xl:p-10 z-50">
        <Breadcrumbs 
          items={[
            { label: 'Inicio', href: '/' },
            { label: 'Biblioteca', href: '/documentos' },
            { label: 'Aldeas y Organizaciones' }
          ]} 
        />
        <div className="flex items-center gap-4">
          <Map className="w-5 xl:w-7 h-auto text-oro" />
          <h1 className="text-xl xl:text-2xl font-black text-oro uppercase tracking-[0.3em]">
            Naciones <span className="text-oro/40">Ocultas</span>
          </h1>
        </div>
      </header>

      <main className="w-full max-w-[1750px] mx-auto flex-1">
        <div className="mb-20 ninja-card-oro p-12 xl:p-16">
          <div className="flex items-center gap-6 mb-6">
            <h1 className="ninja-title text-5xl xl:text-8xl uppercase leading-none">Aldeas y Organizaciones</h1>
          </div>
          <p className="text-gris-texto text-lg xl:text-2xl max-w-4xl leading-relaxed">
            Las grandes potencias que mantienen el equilibrio del poder shinobi. Cada aldea posee su propia historia, clanes legendarios y geografía sagrada.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10 xl:gap-16">
          {aldeas.map((aldea) => (
            <Link 
              key={aldea.id} 
              href={`/aldeas/${aldea.slug}`}
              className="group relative overflow-hidden ninja-card-oro flex flex-col h-[500px] xl:h-[600px] hover-ninja"
            >
              <div className="h-2/3 relative overflow-hidden border-b border-oro/10 bg-black">
                {aldea.url_imagen ? (
                  <img 
                    src={aldea.url_imagen} 
                    alt="" 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000 opacity-90"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full bg-oro/5" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                
                <div className="absolute bottom-8 left-8 right-8 z-10">
                  <div className="flex flex-col gap-1 min-w-0">
                    <h2 className={`ninja-title ${getTitleFontSize(aldea.abreviatura || aldea.nombre_jap)} group-hover:text-oro transition-all leading-tight py-1`}>{aldea.abreviatura || aldea.nombre_jap}</h2>
                    <span className="text-[10px] sm:text-xs md:text-sm lg:text-base xl:text-lg font-black text-oro/40 uppercase tracking-[0.2em] sm:tracking-[0.4em] break-words">{aldea.nombre_español}</span>
                  </div>
                </div>
              </div>

              <div className="p-10 xl:p-12 flex flex-col flex-1 relative z-10">
                <p className="text-gris-texto/80 text-base sm:text-lg md:text-xl xl:text-2xl leading-relaxed mb-8 line-clamp-3">
                  {aldea.descripcion}
                </p>

                <div className="mt-auto flex items-center justify-between gap-6">
                  <div className="flex items-center gap-4 text-oro font-black uppercase tracking-[0.2em] text-xs md:text-sm lg:text-base xl:text-lg group-hover:brightness-125 transition-all">
                    <span>Explorar Lore</span>
                    <div className="w-1.5 h-1.5 bg-oro rotate-45 group-hover:translate-x-2 transition-transform" />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
