import { createClient } from '@/utils/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
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
    <div className="min-h-screen pt-24 pb-20 px-4 flex flex-col">
      <header className="w-full max-w-[1750px] mx-auto flex flex-col md:flex-row justify-between items-center gap-10 mb-16 ninja-card-oro p-8 xl:p-12 z-50">
        <Link href={`/ramas/${slug}`} className="flex items-center gap-4 text-oro hover:brightness-125 transition-all group font-black uppercase tracking-widest text-sm xl:text-lg">
          <div className="w-2 xl:w-3 h-2 xl:h-3 bg-rojo-sangre rotate-45 group-hover:bg-oro transition-colors" />
          VOLVER A {rama.nombre}
        </Link>
        <div className="flex items-center gap-4">
          <img src="/assets/icons/shuriken.png" className="w-4 xl:w-6 h-auto" alt="icon" />
          <h1 className="text-xl xl:text-2xl font-black text-oro uppercase tracking-[0.3em]">
             ARCHIVO DE <span className="text-oro/40">DOCTRINA</span>
          </h1>
        </div>
      </header>

      <main className="w-full max-w-[1750px] mx-auto flex-1">
        <div className="mb-16 ninja-card-oro p-12 xl:p-16 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-12 opacity-[0.02] pointer-events-none group-hover:opacity-[0.05] transition-opacity">
             <img src="/assets/icons/shuriken.png" className="w-64 h-64 rotate-12" alt="bg" />
          </div>
          <div className="flex items-center gap-6 mb-8 relative z-10">
            <h1 className="ninja-title text-6xl xl:text-9xl">{sub.nombre}</h1>
          </div>
          <p className="text-gris-texto text-xl xl:text-3xl max-w-4xl leading-relaxed italic relative z-10">
            &quot;{sub.descripcion}&quot;
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 xl:gap-12">
          {documentos.map((doc) => (
            <Link
              key={doc.id}
              href={`/docs/${doc.clave}`}
              className="group flex items-center justify-between p-10 ninja-card-oro hover-ninja transition-all relative overflow-hidden"
            >
              <div className="flex items-center gap-8 relative z-10">
                <div className="w-16 h-16 bg-oro/5 border border-oro/10 flex items-center justify-center group-hover:bg-oro transition-all duration-500 ninja-clip-md">
                   <img src="/assets/icons/shuriken.png" className="w-8 h-8 group-hover:invert transition-all" alt="icon" />
                </div>
                <div>
                  <h4 className="ninja-title text-3xl xl:text-4xl group-hover:text-oro transition-colors italic leading-none mb-2">{doc.titulo}</h4>
                  <p className="text-oro/40 text-[10px] uppercase font-black tracking-widest">{doc.descripcion || 'Pergamino de Combate'}</p>
                </div>
              </div>
              <div className="w-10 h-10 flex items-center justify-center border border-oro/20 text-oro group-hover:bg-oro group-hover:text-rojo-sangre transition-all">
                 <ChevronRight className="w-6 h-6" />
              </div>
            </Link>
          ))}
          
          {documentos.length === 0 && (
            <div className="col-span-full text-center py-40 ninja-card-oro opacity-40">
              <p className="text-oro/40 font-black uppercase tracking-[0.6em] text-xl xl:text-2xl italic">ARCHIVOS NO DISPONIBLES</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
