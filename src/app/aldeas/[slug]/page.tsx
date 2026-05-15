import { createClient } from '@/utils/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, Shield, Users } from 'lucide-react';
import { MasterServerService } from '@/services/supabase/master.server.service';

export default async function AldeaDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();

  const aldea = await MasterServerService.getAldeaBySlug(supabase, slug);
  if (!aldea) return notFound();

  const clanes = await MasterServerService.getClanesByAldeaId(supabase, aldea.id);

  return (
    <div className="min-h-screen bg-black">
      {/* Hero Banner de la Aldea */}
      <div className="relative h-[60vh] min-h-[500px] overflow-hidden">
        {aldea.url_imagen && (
          <img 
            src={aldea.url_imagen} 
            alt={aldea.nombre_jap}
            className="w-full h-full object-cover opacity-40 grayscale group-hover:grayscale-0 transition-all duration-1000"
            referrerPolicy="no-referrer"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
        
        <div className="absolute inset-0 flex flex-col justify-end p-12 md:p-20 max-w-[1750px] mx-auto">
          <Link href="/aldeas" className="flex items-center gap-4 text-oro/60 hover:text-oro transition-all mb-12 text-xs xl:text-sm font-black uppercase tracking-[0.4em] group">
            <div className="w-2 h-2 bg-rojo-sangre rotate-45 group-hover:bg-oro transition-colors" /> 
            VOLVER A LAS NACIONES
          </Link>
          
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-6">
               <img src="https://game.gtimg.cn/images/hyrz/web2026/content-news-head.png" className="w-5 xl:w-8 h-auto" alt="icon" />
               <div className="px-6 py-2 bg-oro/10 border border-oro/20 text-oro text-[10px] xl:text-xs font-black uppercase tracking-[0.4em]" style={{ clipPath: 'polygon(5px 0, 100% 0, 100% calc(100% - 5px), calc(100% - 5px) 100%, 0 100%, 0 5px)' }}>
                 {aldea.nombre_español}
               </div>
            </div>
            <h1 className="ninja-title text-7xl xl:text-9xl leading-none">{aldea.abreviatura || aldea.nombre_jap}</h1>
            <p className="text-oro/40 text-xl xl:text-3xl font-black tracking-widest max-w-4xl italic uppercase opacity-80">
              "{aldea.nombre_completo || aldea.nombre_jap}"
            </p>
          </div>
        </div>
      </div>

      {/* Contenido: Listado de Clanes */}
      <div className="max-w-[1750px] mx-auto px-12 py-32">
        <div className="flex items-center gap-8 mb-20 bg-black/40 p-8 ninja-box ninja-border backdrop-blur-md">
          <img src="https://game.gtimg.cn/images/hyrz/web2026/content-news-head.png" className="w-5 xl:w-8 h-auto" alt="icon" />
          <h2 className="text-4xl xl:text-6xl font-black text-oro uppercase tracking-tight italic">CLANES Y TRADICIONES</h2>
          <div className="h-px flex-1 bg-oro/10" />
        </div>

        {clanes && clanes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 xl:gap-16">
            {clanes.map((clan) => (
              <Link 
                key={clan.id} 
                href={`/ramas/${clan.slug}`}
                className="group relative bg-black/60 backdrop-blur-md ninja-box ninja-border p-12 hover-ninja flex flex-col justify-between overflow-hidden transition-all"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-oro/5 rotate-45 -mr-16 -mt-16 pointer-events-none transition-all group-hover:bg-oro/10" />
                
                <div>
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-1.5 h-1.5 bg-rojo-sangre rotate-45" />
                    <h3 className="text-2xl xl:text-4xl font-black text-oro mb-2 uppercase tracking-tight group-hover:brightness-125 transition-all leading-none">{clan.nombre}</h3>
                  </div>
                  
                  <p className="text-gris-texto/80 text-base xl:text-xl leading-relaxed line-clamp-4 italic mb-10">
                    {clan.descripcion}
                  </p>
                </div>
                
                <div className="mt-auto flex items-center gap-4 text-oro font-black uppercase tracking-[0.2em] text-[10px] xl:text-xs group-hover:brightness-125 transition-all">
                  <span>Explorar Especialidades</span>
                  <div className="w-1.5 h-1.5 bg-oro rotate-45 group-hover:translate-x-2 transition-transform" />
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="bg-black/20 border border-oro/5 border-dashed ninja-box p-32 text-center">
             <h3 className="text-oro/10 font-black uppercase tracking-[0.6em] text-xl xl:text-2xl italic">ARCHIVOS CLÁNICOS NO DISPONIBLES</h3>
          </div>
        )}
      </div>
    </div>
  );
}
