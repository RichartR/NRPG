import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';
import { Map, ChevronRight, ChevronLeft } from 'lucide-react';
import { MasterServerService } from '@/services/supabase/master.server.service';

export default async function AldeasPage() {
  const supabase = await createClient();
  const aldeas = await MasterServerService.getAldeasActivas(supabase);

  return (
    <div className="min-h-screen p-4 sm:p-8 xl:p-12 flex flex-col">
      <header className="w-full max-w-[1750px] mx-auto flex flex-col md:flex-row justify-between items-center gap-10 mb-10 ninja-card-oro p-8 xl:p-10 z-50">
        <Link href="/documentos" className="flex items-center gap-4 text-oro hover:brightness-125 transition-all group font-black uppercase tracking-widest text-sm xl:text-lg">
          <div className="w-2 xl:w-3 h-2 xl:h-3 bg-rojo-sangre rotate-45 group-hover:bg-oro transition-colors" />
          Volver a Biblioteca
        </Link>
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
                
                <div className="absolute bottom-8 left-10 z-10">
                  <div className="flex flex-col gap-2">
                    <h2 className="ninja-title text-4xl xl:text-6xl group-hover:text-oro transition-all">{aldea.abreviatura || aldea.nombre_jap}</h2>
                    <span className="text-xs font-black text-oro/40 uppercase tracking-[0.4em]">{aldea.nombre_español}</span>
                  </div>
                </div>
              </div>

              <div className="p-10 xl:p-12 flex flex-col flex-1 relative z-10">
                <p className="text-gris-texto/80 text-lg xl:text-xl leading-relaxed mb-8 line-clamp-3">
                  {aldea.descripcion}
                </p>

                <div className="mt-auto flex items-center justify-between gap-6">
                  <div className="flex items-center gap-4 text-oro font-black uppercase tracking-[0.2em] text-xs xl:text-base group-hover:brightness-125 transition-all">
                    <span>Explorar Lore</span>
                    <div className="w-1.5 h-1.5 bg-oro rotate-45 group-hover:translate-x-2 transition-transform" />
                  </div>
                  <span className="text-[10px] text-oro/10 font-black tracking-widest italic shrink-0">#{aldea.slug}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
