'use client';

import { useState, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Edit2, Eye, EyeOff, MapPin, Search, PlusCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import AldeaEditForm from './AldeaEditForm';

export default function AldeaList({ initialAldeas }: { initialAldeas: any[] }) {
  const [editingAldea, setEditingAldea] = useState<any>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'inactive'>('active');
  const [search, setSearch] = useState('');
  
  const supabase = createClient();
  const router = useRouter();

  const toggleActive = async (id: number, currentStatus: boolean) => {
    const { error } = await supabase
      .from('aldeas')
      .update({ activo: !currentStatus })
      .eq('id', id);

    if (!error) {
      router.refresh();
    }
  };

  const filteredAldeas = useMemo(() => {
    return initialAldeas.filter(aldea => {
      const matchesTab = activeTab === 'active' ? aldea.activo : !aldea.activo;
      const matchesSearch = 
        aldea.nombre_jap.toLowerCase().includes(search.toLowerCase()) || 
        aldea.nombre_español.toLowerCase().includes(search.toLowerCase()) ||
        aldea.abreviatura.toLowerCase().includes(search.toLowerCase());
      return matchesTab && matchesSearch;
    });
  }, [initialAldeas, activeTab, search]);

  return (
    <div className="space-y-6">
      {/* Controles Superiores */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center bg-zinc-900/50 p-6 rounded-3xl border border-zinc-800">
        <div className="flex gap-2 p-1 bg-zinc-950 border border-zinc-800 rounded-2xl">
          <button 
            onClick={() => setActiveTab('active')}
            className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${activeTab === 'active' ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20' : 'text-zinc-500 hover:text-white'}`}
          >
            ACTIVOS ({initialAldeas.filter(a => a.activo).length})
          </button>
          <button 
            onClick={() => setActiveTab('inactive')}
            className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${activeTab === 'inactive' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-white'}`}
          >
            ARCHIVADOS ({initialAldeas.filter(a => !a.activo).length})
          </button>
        </div>

        <div className="flex w-full md:w-auto gap-3">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
            <input 
              type="text" 
              placeholder="Buscar aldea..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-2.5 pl-10 pr-4 text-sm text-white focus:border-emerald-500 outline-none transition-all"
            />
          </div>
          
          <button 
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-black rounded-2xl font-bold text-sm transition-all shadow-lg shadow-emerald-500/20"
          >
            <PlusCircle className="w-5 h-5" />
            NUEVA
          </button>
        </div>
      </div>

      {/* Listado de Aldeas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredAldeas.map((aldea) => (
          <div 
            key={aldea.id} 
            className="group bg-zinc-900 border border-zinc-800 rounded-[2rem] p-6 hover:border-emerald-500/50 transition-all relative overflow-hidden"
          >
            {/* Background Decorator */}
            {aldea.url_imagen && (
              <div className="absolute inset-0 opacity-5 pointer-events-none">
                <img src={aldea.url_imagen} alt="" className="w-full h-full object-cover" />
              </div>
            )}

            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 rounded-2xl bg-zinc-800 border border-zinc-700 p-3 flex items-center justify-center shrink-0">
                  {aldea.url_icono ? (
                    <img src={aldea.url_icono} alt="" className="w-full h-full object-contain" />
                  ) : (
                    <MapPin className="w-6 h-6 text-zinc-600" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-xl font-black text-white uppercase tracking-tight italic">{aldea.nombre_jap}</h3>
                    <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 text-[9px] font-black rounded border border-emerald-500/20 uppercase tracking-widest">{aldea.abreviatura}</span>
                  </div>
                  <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">{aldea.nombre_español}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button 
                  onClick={() => toggleActive(aldea.id, aldea.activo)}
                  className={`p-2.5 rounded-xl border transition-all ${
                    aldea.activo 
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500 hover:bg-emerald-500 hover:text-black' 
                      : 'bg-zinc-800 border-zinc-700 text-zinc-500 hover:bg-zinc-700 hover:text-white'
                  }`}
                  title={aldea.activo ? 'Ocultar aldea' : 'Publicar aldea'}
                >
                  {aldea.activo ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
                <button 
                  onClick={() => setEditingAldea(aldea)}
                  className="p-2.5 bg-zinc-800 border border-zinc-700 text-white rounded-xl hover:bg-zinc-700 transition-all shadow-sm"
                  title="Editar aldea"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {filteredAldeas.length === 0 && (
          <div className="col-span-full py-20 text-center bg-zinc-900/30 rounded-[2.5rem] border border-dashed border-zinc-800">
            <p className="text-zinc-600 font-bold italic">No se han encontrado aldeas con estos filtros.</p>
          </div>
        )}
      </div>

      {(editingAldea || isAdding) && (
        <AldeaEditForm 
          aldea={editingAldea} 
          onCancel={() => {
            setEditingAldea(null);
            setIsAdding(false);
          }} 
        />
      )}
    </div>
  );
}
