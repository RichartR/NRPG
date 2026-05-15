import { createClient } from '@/utils/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, Zap, Shield, Sword, ChevronRight } from 'lucide-react';
import { MasterServerService } from '@/services/supabase/master.server.service';

export default async function RamaDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();

  const rama = await MasterServerService.getRamaBySlug(supabase, slug);
  if (!rama) return notFound();

  // Determinar URL de retorno dinámica
  const backUrl = rama.tipo === 'clan' && rama.aldeas?.slug
    ? `/aldeas/${rama.aldeas.slug}`
    : '/ramas';

  const backText = rama.tipo === 'clan' && rama.aldeas?.abreviatura
    ? `Volver a ${rama.aldeas.abreviatura}`
    : 'Volver a ramas';

  const [subEspecialidades, documentos] = await Promise.all([
    MasterServerService.getSubEspecialidadesByRama(supabase, rama.id),
    MasterServerService.getDocumentosCombateByRama(supabase, rama.id),
  ]);

  const tieneSubEspecialidades = subEspecialidades.length > 0;

  return (
    <div className="min-h-screen bg-black pt-32 pb-20 px-8 sm:px-12 xl:px-20">
      <div className="max-w-[1750px] mx-auto">
        <Link href={backUrl} className="inline-flex items-center gap-4 text-oro/60 hover:text-oro transition-all mb-16 text-xs xl:text-sm font-black uppercase tracking-[0.4em] group">
          <div className="w-2 h-2 bg-rojo-sangre rotate-45 group-hover:bg-oro transition-colors" /> {backText}
        </Link>

        <header className="mb-20 bg-black/60 p-12 xl:p-16 ninja-box ninja-border backdrop-blur-md relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-oro/5 rounded-full blur-[100px] -mr-48 -mt-48 pointer-events-none" />
          <div className="flex items-center gap-6 mb-8 text-oro">
            <img src="https://game.gtimg.cn/images/hyrz/web2026/content-news-head.png" className="w-5 xl:w-8 h-auto" alt="icon" />
            <div className="h-px w-24 bg-oro/20" />
            <span className="text-[10px] xl:text-xs font-black uppercase tracking-[0.4em] opacity-40">ESPECIALIZACIÓN SHINOBI</span>
          </div>
          <h1 className="ninja-title text-6xl xl:text-8xl leading-none">{rama.nombre}</h1>
          <p className="text-gris-texto text-xl xl:text-3xl mt-8 max-w-4xl italic leading-relaxed opacity-80">
            &quot;{rama.descripcion}&quot;
          </p>
        </header>

        {tieneSubEspecialidades && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 xl:gap-12 mb-20">
            {subEspecialidades.map((sub) => (
              <Link
                key={sub.id}
                href={`/ramas/${slug}/${sub.slug}`}
                className="group relative p-12 bg-black/60 backdrop-blur-md ninja-box ninja-border hover-ninja flex flex-col justify-between overflow-hidden transition-all"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-oro/5 rotate-45 -mr-16 -mt-16 pointer-events-none group-hover:bg-oro/10 transition-all" />
                
                <div>
                   <div className="flex items-center gap-4 mb-10">
                     <div className="w-1.5 h-1.5 bg-rojo-sangre rotate-45" />
                     <h3 className="text-3xl xl:text-5xl font-black text-oro uppercase tracking-tighter relative z-10 leading-none">{sub.nombre}</h3>
                   </div>
                   <p className="text-gris-texto/80 text-base xl:text-xl line-clamp-3 mb-10 relative z-10 italic">{sub.nombre_español || sub.descripcion}</p>
                </div>

                <div className="flex items-center gap-4 text-[10px] xl:text-xs font-black text-oro uppercase tracking-[0.2em] relative z-10 group-hover:brightness-125 transition-all">
                  <span>Explorar Doctrina</span>
                  <div className="w-1.5 h-1.5 bg-oro rotate-45 group-hover:translate-x-2 transition-transform" />
                </div>
              </Link>
            ))}
          </div>
        )}

        {documentos.length > 0 && (
          <div className="space-y-10">
            {tieneSubEspecialidades && (
              <div className="flex items-center gap-6 mb-12">
                 <h3 className="text-xs xl:text-sm font-black text-oro/40 uppercase tracking-[0.4em]">Archivos Doctrinarios</h3>
                 <div className="h-px flex-1 bg-oro/10" />
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 xl:gap-8">
              {documentos.map((doc) => (
                <Link
                  key={doc.id}
                  href={`/docs/${doc.clave}`}
                  className="group flex items-center justify-between p-8 bg-black/40 border border-oro/10 ninja-box hover:border-oro/40 transition-all backdrop-blur-sm"
                >
                  <div className="flex items-center gap-8">
                    <div className="w-16 h-16 bg-oro/5 border border-oro/10 flex items-center justify-center group-hover:bg-oro transition-all" style={{ clipPath: 'polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)' }}>
                      <Sword className="w-6 h-6 text-oro group-hover:text-rojo-sangre transition-colors" />
                    </div>
                    <div>
                      <h4 className="text-xl xl:text-2xl font-black text-oro uppercase tracking-tight group-hover:brightness-125 transition-all leading-none mb-2 italic">{doc.titulo}</h4>
                      <p className="text-oro/30 text-xs xl:text-sm line-clamp-1 uppercase font-black tracking-widest">{doc.descripcion}</p>
                    </div>
                  </div>
                  <div className="w-10 h-10 flex items-center justify-center bg-oro/5 border border-oro/10 text-oro group-hover:bg-oro group-hover:text-rojo-sangre transition-all" style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}>
                     <ChevronRight className="w-6 h-6" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
