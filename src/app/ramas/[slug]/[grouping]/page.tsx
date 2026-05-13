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
    <div className="min-h-screen bg-black pt-24 pb-20 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Navegación */}
        <Link href={`/ramas/${slug}`} className="inline-flex items-center gap-2 text-zinc-500 hover:text-white transition-colors mb-12 text-xs font-black uppercase tracking-widest group">
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Volver a {rama.nombre}
        </Link>

        {/* Cabecera */}
        <header className="mb-16 border-l-4 border-blue-500 pl-8">
          <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] mb-2">{rama.nombre}</p>
          <h1 className="text-6xl font-black text-white tracking-tighter uppercase">{sub.nombre}</h1>
          <p className="text-zinc-500 mt-4 italic">&quot;{sub.descripcion}&quot;</p>
        </header>

        {/* Listado de Documentos */}
        <div className="grid grid-cols-1 gap-4">
          {documentos.length > 0 ? (
            documentos.map((doc) => (
              <Link
                key={doc.id}
                href={`/docs/${doc.clave}`}
                className="group flex items-center justify-between p-6 bg-zinc-900/50 border border-zinc-800 rounded-[2rem] hover:border-blue-500/50 transition-all shadow-xl"
              >
                <div className="flex items-center gap-6">
                  <div className="w-14 h-14 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center group-hover:bg-blue-500 transition-all group-hover:rotate-6">
                    <Sword className="w-6 h-6 text-zinc-500 group-hover:text-white" />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-white uppercase tracking-tight group-hover:text-blue-500 transition-colors">{doc.titulo}</h4>
                    <p className="text-zinc-500 text-sm line-clamp-2">{doc.descripcion}</p>
                  </div>
                </div>
                <div className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center group-hover:border-blue-500 transition-colors">
                  <ChevronRight className="w-5 h-5 text-zinc-700 group-hover:text-blue-500" />
                </div>
              </Link>
            ))
          ) : (
            <div className="text-center py-20 bg-zinc-900/30 border border-zinc-800 border-dashed rounded-[3rem]">
              <p className="text-zinc-600 font-black uppercase tracking-widest italic">No hay técnicas registradas en esta categoría.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
