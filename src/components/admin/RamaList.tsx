'use client';

import { useState, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Edit2, Eye, EyeOff, GitBranch, MapPin, Search, PlusCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import RamaEditForm from './RamaEditForm';

export default function RamaList({ initialRamas, aldeas }: { initialRamas: any[], aldeas: any[] }) {
  const [editingRama, setEditingRama] = useState<any>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'inactive'>('active');
  const [search, setSearch] = useState('');
  
  const supabase = createClient();
  const router = useRouter();

  const toggleActive = async (id: number, currentStatus: boolean) => {
    const { error } = await supabase
      .from('ramas_clanes')
      .update({ activo: !currentStatus })
      .eq('id', id);

    if (!error) {
      router.refresh();
    }
  };

  const filteredRamas = useMemo(() => {
    return initialRamas.filter(rama => {
      const matchesTab = activeTab === 'active' ? rama.activo : !rama.activo;
      const matchesSearch = 
        rama.nombre.toLowerCase().includes(search.toLowerCase()) || 
        (rama.nombre_español && rama.nombre_español.toLowerCase().includes(search.toLowerCase())) ||
        rama.tipo.toLowerCase().includes(search.toLowerCase());
      return matchesTab && matchesSearch;
    });
  }, [initialRamas, activeTab, search]);

  return (
    <div className="space-y-6">
      {/* Controles Superiores */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center bg-zinc-900/50 p-6 rounded-3xl border border-zinc-800">
        <div className="flex gap-2 p-1 bg-zinc-950 border border-zinc-800 rounded-2xl">
          <button 
            onClick={() => setActiveTab('active')}
            className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${activeTab === 'active' ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20' : 'text-zinc-500 hover:text-white'}`}
          >
            ACTIVOS ({initialRamas.filter(r => r.activo).length})
          </button>
          <button 
            onClick={() => setActiveTab('inactive')}
            className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${activeTab === 'inactive' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-white'}`}
          >
            ARCHIVADOS ({initialRamas.filter(r => !r.activo).length})
          </button>
        </div>

        <div className="flex w-full md:w-auto gap-3">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
            <input 
              type="text" 
              placeholder="Buscar rama o clan..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-2.5 pl-10 pr-4 text-sm text-white focus:border-amber-500 outline-none transition-all"
            />
          </div>
          
          <button 
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 px-6 py-2.5 bg-amber-600 hover:bg-amber-500 text-black rounded-2xl font-bold text-sm transition-all shadow-lg shadow-amber-500/20"
          >
            <PlusCircle className="w-5 h-5" />
            NUEVO
          </button>
        </div>
      </div>

      {/* Listado de Ramas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredRamas.map((rama) => (
          <div 
            key={rama.id} 
            className="group bg-zinc-900 border border-zinc-800 rounded-3xl p-5 hover:border-amber-500/50 transition-all relative overflow-hidden"
          >
            <div className="relative z-10 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
                  rama.tipo === 'rama' ? 'bg-blue-500/10 border-blue-500/20' : 'bg-amber-500/10 border-amber-500/20'
                }`}>
                  <GitBranch className={`w-5 h-5 ${rama.tipo === 'rama' ? 'text-blue-500' : 'text-amber-500'}`} />
                </div>
                
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => toggleActive(rama.id, rama.activo)}
                    className={`p-2 rounded-lg border transition-all ${
                      rama.activo 
                        ? 'bg-amber-500/10 border-amber-500/20 text-amber-500 hover:bg-amber-500 hover:text-black' 
                        : 'bg-zinc-800 border-zinc-700 text-zinc-500 hover:bg-zinc-700 hover:text-white'
                    }`}
                  >
                    {rama.activo ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                  <button 
                    onClick={() => setEditingRama(rama)}
                    className="p-2 bg-zinc-800 border border-zinc-700 text-white rounded-lg hover:bg-zinc-700 transition-all shadow-sm"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h3 className="text-lg font-black text-white uppercase tracking-tight italic">{rama.nombre}</h3>
                  <span className={`px-2 py-0.5 text-[8px] font-black rounded border uppercase tracking-widest ${
                    rama.tipo === 'rama' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                  }`}>
                    {rama.tipo}
                  </span>
                </div>
                <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-3">
                  {rama.nombre_español || '---'}
                </p>

                {rama.aldeas ? (
                  <div className="flex items-center gap-1.5 text-[10px] text-emerald-500 font-black bg-emerald-500/5 border border-emerald-500/10 px-3 py-1.5 rounded-xl w-fit">
                    <MapPin className="w-3.5 h-3.5" /> {rama.aldeas.nombre_jap}
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-[10px] text-zinc-600 font-black bg-zinc-800/50 border border-zinc-800 px-3 py-1.5 rounded-xl w-fit">
                    <MapPin className="w-3.5 h-3.5 opacity-50" /> RAMA GLOBAL
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {filteredRamas.length === 0 && (
          <div className="col-span-full py-16 text-center bg-zinc-900/30 rounded-[2rem] border border-dashed border-zinc-800">
            <p className="text-zinc-600 font-bold italic text-sm text-zinc-500">No se han encontrado ramas o clanes con estos filtros.</p>
          </div>
        )}
      </div>

      {(editingRama || isAdding) && (
        <RamaEditForm 
          rama={editingRama} 
          aldeas={aldeas}
          onCancel={() => {
            setEditingRama(null);
            setIsAdding(false);
          }} 
        />
      )}
    </div>
  );
}
