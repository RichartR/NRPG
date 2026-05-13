import { createClient } from '@/utils/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, Shield, Users } from 'lucide-react';

export default async function AldeaDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();

  // 1. Obtener datos de la aldea
  const { data: aldea } = await supabase
    .from('aldeas')
    .select('*')
    .eq('slug', slug)
    .single();

  if (!aldea) return notFound();

  // 2. Obtener los clanes vinculados a esta aldea
  const { data: clanes } = await supabase
    .from('ramas_clanes')
    .select('*')
    .eq('aldea_id', aldea.id)
    .eq('tipo', 'clan')
    .eq('activo', true)
    .order('nombre', { ascending: true });

  return (
    <div className="min-h-screen bg-black">
      {/* Hero Banner de la Aldea */}
      <div className="relative h-[50vh] min-h-[400px] overflow-hidden">
        {aldea.url_imagen && (
          <img 
            src={aldea.url_imagen} 
            alt={aldea.nombre_jap}
            className="w-full h-full object-cover opacity-50"
            referrerPolicy="no-referrer"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
        
        <div className="absolute inset-0 flex flex-col justify-end p-8 md:p-20 max-w-7xl mx-auto">
          <Link href="/aldeas" className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors mb-8 text-xs font-black uppercase tracking-widest group">
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Volver a aldeas
          </Link>
          
          <div className="flex items-center gap-6 mb-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-6xl md:text-8xl font-black text-white tracking-tighter uppercase">{aldea.abreviatura || aldea.nombre_jap}</h1>
                <div className="px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[10px] font-black uppercase tracking-widest">
                  {aldea.nombre_español}
                </div>
              </div>
              <p className="text-zinc-400 text-lg md:text-xl font-medium tracking-tight max-w-2xl italic">
                "{aldea.nombre_completo || aldea.nombre_jap}"
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Contenido: Listado de Clanes */}
      <div className="max-w-7xl mx-auto px-8 py-20">
        <div className="flex items-center gap-4 mb-12">
          <div className="bg-emerald-500/10 p-3 rounded-2xl border border-emerald-500/20">
            <Users className="w-6 h-6 text-emerald-500" />
          </div>
          <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Clanes y Especialidades</h2>
          <div className="h-[1px] flex-1 bg-gradient-to-r from-zinc-800 to-transparent" />
        </div>

        {clanes && clanes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {clanes.map((clan) => (
              <Link 
                key={clan.id} 
                href={`/ramas/${clan.slug}`}
                className="group relative bg-zinc-900 border border-zinc-800 p-8 rounded-[2rem] hover:border-emerald-500/50 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start mb-6">
                    <div className="w-12 h-12 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center group-hover:bg-emerald-500 transition-colors">
                      <Shield className="w-5 h-5 text-zinc-500 group-hover:text-white" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2 uppercase tracking-tight group-hover:text-emerald-500 transition-colors">{clan.nombre}</h3>
                  <p className="text-zinc-500 text-sm leading-relaxed line-clamp-3 italic">
                    {clan.descripcion}
                  </p>
                </div>
                
                <div className="mt-8 flex items-center text-[10px] font-black text-emerald-500 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all translate-x-[-10px] group-hover:translate-x-0">
                  Ver información del clan
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="bg-zinc-900/50 border border-zinc-800 border-dashed rounded-[3rem] p-20 text-center">
            <Users className="w-12 h-12 text-zinc-800 mx-auto mb-4" />
            <p className="text-zinc-600 font-bold italic">Todavía no hay clanes registrados en esta aldea.</p>
          </div>
        )}
      </div>
    </div>
  );
}
