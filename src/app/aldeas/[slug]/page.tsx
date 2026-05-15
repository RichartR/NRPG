import { createClient } from '@/utils/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Map, ChevronRight } from 'lucide-react';
import { MasterServerService } from '@/services/supabase/master.server.service';

export default async function AldeaDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();

  const aldea = await MasterServerService.getAldeaBySlug(supabase, slug);
  if (!aldea) return notFound();

  const clanes = await MasterServerService.getClanesByAldeaId(supabase, aldea.id);

  return (
    <div className="min-h-screen p-4 sm:p-8 xl:p-12 flex flex-col">
      <header className="w-full max-w-[1750px] mx-auto flex flex-col md:flex-row justify-between items-center gap-10 mb-10 ninja-card-oro p-8 xl:p-10 z-50">
        <Link href="/aldeas" className="flex items-center gap-4 text-oro hover:brightness-125 transition-all group font-black uppercase tracking-widest text-sm xl:text-lg">
          <div className="w-2 xl:w-3 h-2 xl:h-3 bg-rojo-sangre rotate-45 group-hover:bg-oro transition-colors" />
          Volver a las Naciones
        </Link>
        <div className="flex items-center gap-4">
          <Map className="w-5 xl:w-7 h-auto text-oro" />
          <h1 className="text-xl xl:text-2xl font-black text-oro uppercase tracking-[0.3em]">
            Archivo de <span className="text-oro/40">Aldea</span>
          </h1>
        </div>
      </header>

      <main className="w-full max-w-[1750px] mx-auto flex-1">
        <div className="relative h-[400px] xl:h-[500px] overflow-hidden ninja-card-oro mb-16">
          {aldea.url_imagen && (
            <img 
              src={aldea.url_imagen} 
              alt="" 
              className="w-full h-full object-cover opacity-90 transition-all duration-1000"
              referrerPolicy="no-referrer"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
          <div className="absolute bottom-12 left-12 z-10">
            <h1 className="ninja-title text-6xl xl:text-9xl leading-none mb-4 tracking-tighter">
              {aldea.abreviatura || aldea.nombre_jap}
            </h1>
            <p className="text-oro/80 text-xl xl:text-3xl font-black tracking-widest uppercase italic">
              {aldea.nombre_completo || aldea.nombre_jap}
            </p>
          </div>
        </div>

        <div className="mb-16">
          <div className="flex items-center gap-4 mb-10">
            <h2 className="ninja-title text-4xl xl:text-6xl">Clanes y Tradiciones</h2>
          </div>
          
          {clanes && clanes.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 xl:gap-16">
              {clanes.map((clan) => (
                <Link 
                  key={clan.id} 
                  href={`/ramas/${clan.slug}`}
                  className="group relative overflow-hidden ninja-card-oro p-10 xl:p-16 hover-ninja flex flex-col justify-between min-h-[400px] xl:min-h-[450px]"
                >
                  <div className="relative z-10">
                    <div className="flex items-center gap-4 mb-8">
                      <h3 className="ninja-title text-3xl xl:text-5xl group-hover:text-oro transition-all leading-none">{clan.nombre}</h3>
                    </div>
                    <p className="text-gris-texto/80 text-lg xl:text-2xl leading-relaxed mb-12 italic line-clamp-5">
                      {clan.descripcion}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-4 text-oro font-black uppercase tracking-[0.2em] text-xs xl:text-base group-hover:brightness-125 transition-all relative z-10">
                    <span>Explorar Doctrina</span>
                    <div className="w-1.5 h-1.5 bg-oro rotate-45 group-hover:translate-x-2 transition-transform" />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="ninja-card-oro p-20 text-center opacity-40">
               <h3 className="text-oro font-black uppercase tracking-widest text-2xl">Archivos no disponibles</h3>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
