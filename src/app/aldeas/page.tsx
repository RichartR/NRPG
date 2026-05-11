import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';
import { Map, ChevronRight, ChevronLeft } from 'lucide-react';

export default async function AldeasPage() {
  const supabase = await createClient();

  // Obtener solo las aldeas activas
  const { data: aldeas } = await supabase
    .from('aldeas')
    .select('*')
    .eq('activo', true)
    .order('nombre_jap', { ascending: true });

  return (
    <div className="min-h-screen bg-black pt-24 pb-20 px-4">
      <div className="max-w-6xl mx-auto">
        <Link href="/documentos" className="inline-flex items-center gap-2 text-zinc-500 hover:text-white transition-colors mb-12 text-xs font-black uppercase tracking-widest group">
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Volver a documentos
        </Link>

        <header className="mb-20 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-6">
            <Map className="w-4 h-4 text-emerald-500" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500">Geografía Ninja</span>
          </div>
          <h1 className="text-6xl md:text-8xl font-black text-white tracking-tighter mb-6 uppercase">ALDEAS</h1>
          <p className="text-zinc-500 max-w-2xl mx-auto text-lg leading-relaxed">
            Las grandes naciones ocultas que mantienen el equilibrio del mundo. Cada una con su propia cultura, clanes y tradiciones.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {aldeas?.map((aldea) => (
            <Link 
              key={aldea.id} 
              href={`/aldeas/${aldea.slug}`}
              className="group relative bg-zinc-900/50 border border-zinc-800 rounded-[2.5rem] overflow-hidden hover:border-emerald-500/50 transition-all flex flex-col h-full"
            >
              {/* Imagen de fondo (Banner) */}
              <div className="h-48 relative overflow-hidden">
                {aldea.url_imagen ? (
                  <img 
                    src={aldea.url_imagen} 
                    alt="" 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 opacity-40 group-hover:opacity-60"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full bg-zinc-800" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 to-transparent" />
                
                {/* Icono de la aldea flotante */}
                <div className="absolute -bottom-6 left-8 w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 p-3 flex items-center justify-center shadow-2xl group-hover:border-emerald-500/50 transition-colors">
                  {aldea.url_icono ? (
                    <img src={aldea.url_icono} alt="" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                  ) : (
                    <Map className="w-6 h-6 text-zinc-600" />
                  )}
                </div>
              </div>

              <div className="p-8 pt-10 flex flex-col flex-1">
                <div className="mb-6">
                  <div className="flex items-baseline gap-2 mb-1">
                    <h2 className="text-3xl font-black text-white tracking-tighter uppercase">{aldea.abreviatura || aldea.nombre_jap}</h2>
                    <span className="text-xs font-bold text-emerald-500 uppercase tracking-widest">{aldea.nombre_español}</span>
                  </div>
                  <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.2em]">{aldea.nombre_completo || aldea.nombre_jap}</p>
                </div>

                <p className="text-zinc-400 text-sm leading-relaxed mb-8 line-clamp-3">
                  {aldea.descripcion}
                </p>

                <div className="mt-auto flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[10px] font-black text-white uppercase tracking-widest bg-zinc-800 px-4 py-2 rounded-full">
                    Explorar Lore <ChevronRight className="w-4 h-4 text-emerald-500" />
                  </div>
                  <span className="text-[10px] text-zinc-600 font-mono italic">#{aldea.slug}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
