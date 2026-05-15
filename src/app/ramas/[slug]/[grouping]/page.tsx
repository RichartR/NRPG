import { createClient } from '@/utils/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, Sword, ChevronRight } from 'lucide-react';
import { MasterServerService } from '@/services/supabase/master.server.service';

export default async function GroupingDetailPage({ params }: { params: Promise<{ slug: string, grouping: string }> }) {
  const { slug, grouping } = await params;
  const supabase = await createClient();

  const rama = await MasterServerService.getRamaBySlug(supabase, slug);
  if (!rama) return notFound();

  const sub = await MasterServerService.getSubEspecialidadBySlug(supabase, rama.id, grouping);
  if (!sub) return notFound();

  const documentos = await MasterServerService.getDocumentosCombateBySubEspecialidad(supabase, sub.id);

  return (
    <div className="min-h-screen bg-black pt-32 pb-20 px-8 sm:px-12 xl:px-20">
      <div className="max-w-[1750px] mx-auto">
        {/* Navegación */}
        <Link href={`/ramas/${slug}`} className="inline-flex items-center gap-4 text-oro/60 hover:text-oro transition-all mb-16 text-xs xl:text-sm font-black uppercase tracking-[0.4em] group">
          <div className="w-2 h-2 bg-rojo-sangre rotate-45 group-hover:bg-oro transition-colors" /> 
          VOLVER A {rama.nombre}
        </Link>

        {/* Cabecera */}
        <header className="mb-20 bg-black/60 p-12 xl:p-16 ninja-box ninja-border backdrop-blur-md relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-oro/5 rounded-full blur-[100px] -mr-48 -mt-48 pointer-events-none" />
          <div className="flex items-center gap-6 mb-8 text-oro">
            <img src="https://game.gtimg.cn/images/hyrz/web2026/content-news-head.png" className="w-5 xl:w-8 h-auto" alt="icon" />
            <div className="h-px w-24 bg-oro/20" />
            <span className="text-[10px] xl:text-xs font-black uppercase tracking-[0.4em] opacity-40">{rama.nombre}</span>
          </div>
          <h1 className="ninja-title text-6xl xl:text-8xl leading-none">{sub.nombre}</h1>
          <p className="text-gris-texto text-xl xl:text-3xl mt-8 max-w-4xl italic leading-relaxed opacity-80">&quot;{sub.descripcion}&quot;</p>
        </header>

        {/* Listado de Documentos */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 xl:gap-12">
          {documentos.length > 0 ? (
            documentos.map((doc) => (
              <Link
                key={doc.id}
                href={`/docs/${doc.clave}`}
                className="group flex items-center justify-between p-10 bg-black/60 backdrop-blur-md border border-oro/10 ninja-box hover:border-oro/40 transition-all overflow-hidden"
              >
                <div className="flex items-center gap-10">
                  <div className="w-20 h-20 bg-oro/5 border border-oro/10 flex items-center justify-center group-hover:bg-oro transition-all" style={{ clipPath: 'polygon(15px 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%, 0 15px)' }}>
                    <Sword className="w-8 h-8 text-oro group-hover:text-rojo-sangre transition-colors" />
                  </div>
                  <div>
                    <h4 className="text-2xl xl:text-4xl font-black text-oro uppercase tracking-tight group-hover:brightness-125 transition-all leading-none mb-3 italic">{doc.titulo}</h4>
                    <p className="text-oro/30 text-xs xl:text-sm line-clamp-1 uppercase font-black tracking-widest">{doc.descripcion}</p>
                  </div>
                </div>
                <div className="w-12 h-12 flex items-center justify-center bg-oro/5 border border-oro/10 text-oro group-hover:bg-oro group-hover:text-rojo-sangre transition-all" style={{ clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)' }}>
                  <ChevronRight className="w-7 h-7" />
                </div>
              </Link>
            ))
          ) : (
            <div className="col-span-full text-center py-40 bg-black/20 border border-oro/5 border-dashed ninja-box">
              <p className="text-oro/10 font-black uppercase tracking-[0.6em] text-xl xl:text-2xl italic">ARCHIVOS DOCTRINARIOS NO DISPONIBLES</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
