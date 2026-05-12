import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';
import { GitBranch, ChevronRight, ChevronLeft } from 'lucide-react';

export default async function RamasPage() {
  const supabase = await createClient();

  // Obtener solo las ramas (especialidades) globales
  const { data: ramas } = await supabase
    .from('ramas_clanes')
    .select('*')
    .eq('tipo', 'rama')
    .eq('activo', true)
    .is('aldea_id', null)
    .order('nombre', { ascending: true });

  return (
    <div className="min-h-screen bg-black pt-24 pb-20 px-4">
      <div className="max-w-6xl mx-auto">
        <Link href="/documentos" className="inline-flex items-center gap-2 text-zinc-500 hover:text-white transition-colors mb-12 text-xs font-black uppercase tracking-widest group">
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Volver a documentos
        </Link>

        <header className="mb-20 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 mb-6">
            <GitBranch className="w-4 h-4 text-blue-500" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500">Artes Ninja</span>
          </div>
          <h1 className="text-6xl md:text-8xl font-black text-white tracking-tighter mb-6 uppercase">RAMAS</h1>
          <p className="text-zinc-500 max-w-2xl mx-auto text-lg leading-relaxed">
            Las especialidades básicas que todo ninja puede dominar, independientemente de su origen o aldea.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {ramas?.map((rama) => (
            <Link 
              key={rama.id} 
              href={`/ramas/${rama.slug}`}
              className="group relative bg-zinc-900/50 border border-zinc-800 rounded-[2.5rem] overflow-hidden hover:border-blue-500/50 transition-all flex flex-col h-full"
            >
              <div className="p-10 flex flex-col h-full relative z-10">
                <div className="w-16 h-16 rounded-3xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-8 group-hover:bg-blue-500 group-hover:scale-110 transition-all">
                  <GitBranch className="w-8 h-8 text-blue-500 group-hover:text-white" />
                </div>
                
                <div className="mb-6">
                  <h2 className="text-3xl font-black text-white tracking-tighter uppercase mb-1">{rama.nombre}</h2>
                  <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">{rama.nombre_español}</span>
                </div>

                <p className="text-zinc-500 text-sm leading-relaxed mb-10 line-clamp-3 italic">
                  "{rama.descripcion}"
                </p>

                <div className="mt-auto flex items-center gap-2 text-[10px] font-black text-white uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all translate-x-[-10px] group-hover:translate-x-0">
                  Ver técnicas <ChevronRight className="w-4 h-4 text-blue-500" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
