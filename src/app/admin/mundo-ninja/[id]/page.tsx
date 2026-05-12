import { createClient } from '@/utils/supabase/server';
import { MapPin, ChevronLeft, UserPlus, User, Search } from 'lucide-react';
import Link from 'next/link';

export default async function AldeaNinjasPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { id } = await params;
  const isRenegado = id === 'renegados';

  // 1. Obtener datos de la aldea
  const { data: aldea } = !isRenegado ? await supabase
    .from('aldeas')
    .select('*')
    .eq('id', Number(id))
    .single() : { data: null };

  // 2. Obtener ninjas de esta aldea
  let query = supabase
    .from('characters')
    .select('*, aldeas(nombre_completo)')
    .order('nombre_ninja');

  if (isRenegado) {
    query = query.is('aldea_id', null);
  } else {
    query = query.eq('aldea_id', Number(id));
  }

  const { data: ninjas } = await query;

  return (
    <div className="min-h-screen bg-black pt-24 pb-20 px-4">
      <div className="max-w-7xl mx-auto">
        <header className="mb-12">
          <Link href="/admin/mundo-ninja" className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors mb-4 text-xs font-black uppercase tracking-widest group">
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Volver al Mundo Ninja
          </Link>
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-6">
              <div className={`w-20 h-20 rounded-3xl bg-zinc-900 border border-zinc-800 p-4 flex items-center justify-center shadow-xl`}>
                {!isRenegado && aldea?.url_icono ? (
                  <img src={aldea.url_icono} alt="" className="w-full h-full object-contain" />
                ) : (
                  <MapPin className={`w-8 h-8 ${isRenegado ? 'text-red-500' : 'text-emerald-500'}`} />
                )}
              </div>
              <div>
                <h1 className="text-4xl md:text-5xl font-black text-white tracking-tighter uppercase italic">
                  {isRenegado ? 'SIN ALDEA / RENEGADOS' : aldea?.nombre_completo}
                </h1>
                <p className="text-zinc-500 text-sm font-medium uppercase tracking-widest">
                  Directorio de Shinobis • {ninjas?.length || 0} Registrados
                </p>
              </div>
            </div>

            <Link 
              href={`/admin/crear-ficha?${!isRenegado ? `aldea_id=${id}` : ''}`} 
              className="flex items-center justify-center gap-3 px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-black rounded-[2rem] font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-emerald-500/20"
            >
              <UserPlus className="w-5 h-5" /> Registrar Nuevo Ninja
            </Link>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {ninjas && ninjas.length > 0 ? (
            ninjas.map((ninja) => (
              <NinjaCard key={ninja.id} ninja={ninja} variant={isRenegado ? 'renegado' : 'default'} />
            ))
          ) : (
            <div className="col-span-full py-32 text-center bg-zinc-900/20 rounded-[3rem] border border-dashed border-zinc-800">
              <User className="w-12 h-12 text-zinc-800 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-zinc-500 uppercase italic">No hay ninjas registrados</h3>
              <p className="text-zinc-600 text-sm mt-1">Sé el primero en registrar un shinobi en esta sección.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function NinjaCard({ ninja, variant = 'default' }: { ninja: any, variant?: 'default' | 'renegado' }) {
  return (
    <Link 
      href={`/ficha/${ninja.id}`}
      className={`group relative bg-zinc-900/50 border ${variant === 'renegado' ? 'border-red-900/20 hover:border-red-500/40' : 'border-zinc-800 hover:border-emerald-500/40'} rounded-[2.5rem] p-6 transition-all hover:-translate-y-2 overflow-hidden shadow-lg hover:shadow-2xl`}
    >
      <div className="relative z-10 flex flex-col h-full justify-between">
        <div className="flex items-center justify-between mb-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${variant === 'renegado' ? 'bg-red-500/10' : 'bg-emerald-500/10'}`}>
            <User className={`w-6 h-6 ${variant === 'renegado' ? 'text-red-500' : 'text-emerald-500'}`} />
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">{ninja.rango}</span>
            <span className="text-[8px] font-bold text-zinc-700 uppercase tracking-tighter">{ninja.rango_jerarquico}</span>
          </div>
        </div>
        
        <div className="mb-6">
          <h4 className="text-2xl font-black text-white tracking-tight leading-none mb-1 uppercase italic group-hover:text-emerald-500 transition-colors">{ninja.nombre_ninja}</h4>
          <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-[0.2em]">{ninja.hobba_name}</p>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-zinc-800/50">
          <div className="flex gap-2">
            {Object.entries(ninja.stats_base || {}).slice(0, 3).map(([stat, val]: any) => (
              <div key={stat} className="flex flex-col">
                <span className="text-[7px] text-zinc-600 font-black uppercase">{stat}</span>
                <span className="text-[10px] text-zinc-400 font-bold">{val}</span>
              </div>
            ))}
          </div>
          <span className="text-[8px] font-black uppercase text-zinc-500 group-hover:text-white transition-colors">Ver Detalles →</span>
        </div>
      </div>

      {/* Decoración de fondo */}
      <div className={`absolute -right-6 -bottom-6 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity ${variant === 'renegado' ? 'text-red-500' : 'text-emerald-500'}`}>
        <User className="w-32 h-32 rotate-12" />
      </div>
    </Link>
  );
}
