import { createClient } from '@/utils/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, Zap, Shield, Sword, ChevronRight } from 'lucide-react';

export default async function RamaDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();

  // 1. Obtener datos de la rama e incluir el slug de la aldea si es un clan
  const { data: rama } = await supabase
    .from('ramas_clanes')
    .select('*, aldeas(slug, abreviatura)')
    .eq('slug', slug)
    .single();

  if (!rama) return notFound();

  // Determinar URL de retorno dinámica
  const backUrl = rama.tipo === 'clan' && rama.aldeas?.slug 
    ? `/aldeas/${rama.aldeas.slug}` 
    : '/ramas';
  
  const backText = rama.tipo === 'clan' && rama.aldeas?.abreviatura
    ? `Volver a ${rama.aldeas.abreviatura}`
    : 'Volver a ramas';

  // 2. Obtener SUB-ESPECIALIDADES
  const { data: subEspecialidades } = await supabase
    .from('sub_especialidades')
    .select('*')
    .eq('rama_id', rama.id)
    .eq('activo', true)
    .order('nombre', { ascending: true });

  const tieneSubEspecialidades = subEspecialidades && subEspecialidades.length > 0;

  // 3. Obtener documentos directos
  let { data: documentos } = await supabase
    .from('documentos_combate')
    .select('*')
    .eq('rama_id', rama.id)
    .is('sub_especialidad_id', null)
    .eq('activo', true);

  return (
    <div className="min-h-screen bg-black pt-24 pb-20 px-4">
      <div className="max-w-6xl mx-auto">
        <Link href={backUrl} className="inline-flex items-center gap-2 text-zinc-500 hover:text-white transition-colors mb-12 text-xs font-black uppercase tracking-widest group">
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> {backText}
        </Link>

        <header className="mb-16">
          <div className="flex items-center gap-4 mb-6 text-blue-500">
            <Zap className="w-8 h-8" />
            <div className="h-[1px] w-20 bg-blue-500/30" />
          </div>
          <h1 className="text-6xl md:text-7xl font-black text-white tracking-tighter uppercase mb-4">{rama.nombre}</h1>
          <p className="text-zinc-500 text-xl max-w-2xl italic leading-relaxed">
            "{rama.descripcion}"
          </p>
        </header>

        {tieneSubEspecialidades && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {subEspecialidades.map((sub) => (
              <Link 
                key={sub.id}
                href={`/ramas/${slug}/${sub.slug}`}
                className="group relative p-8 bg-zinc-900 border border-zinc-800 rounded-[2.5rem] hover:border-blue-500/50 transition-all overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform">
                  <Shield className="w-32 h-32 text-blue-500" />
                </div>
                <h3 className="text-3xl font-black text-white mb-2 uppercase tracking-tighter relative z-10">{sub.nombre}</h3>
                <p className="text-zinc-500 text-xs line-clamp-2 mb-6 relative z-10">{sub.nombre_español || sub.descripcion}</p>
                <div className="flex items-center gap-2 text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] relative z-10">
                  Explorar especialidad <ChevronRight className="w-4 h-4" />
                </div>
              </Link>
            ))}
          </div>
        )}

        {documentos && documentos.length > 0 && (
          <div className="space-y-4">
            {tieneSubEspecialidades && (
              <h3 className="text-sm font-black text-zinc-700 uppercase tracking-[0.3em] mb-6">Documentos Generales</h3>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {documentos.map((doc) => (
                <Link 
                  key={doc.id}
                  href={`/docs/${doc.clave}`}
                  className="group flex items-center justify-between p-6 bg-zinc-900/50 border border-zinc-800 rounded-3xl hover:border-blue-500/50 transition-all shadow-xl"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 group-hover:bg-blue-500 transition-colors">
                      <Sword className="w-5 h-5 text-blue-500 group-hover:text-white" />
                    </div>
                    <div>
                      <h4 className="text-white font-bold uppercase tracking-tight group-hover:text-blue-500 transition-colors">{doc.titulo}</h4>
                      <p className="text-zinc-500 text-xs line-clamp-1">{doc.descripcion}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-zinc-700 group-hover:text-blue-500 transition-colors" />
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
