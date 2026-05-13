'use client';

import { useState, useMemo } from 'react';
import { Edit2, Eye, EyeOff, MapPin, Search, PlusCircle, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import AldeaEditForm from './AldeaEditForm';
import { AdminService } from '@/services/supabase/admin.service';
import { useToastStore } from '@/components/ui/Toast';

export default function AldeaList({ initialAldeas }: { initialAldeas: any[] }) {
  const [editingAldea, setEditingAldea] = useState<any>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'inactive'>('active');
  const [search, setSearch] = useState('');
  const [loadingId, setLoadingId] = useState<number | null>(null);
  
  const router = useRouter();
  const addToast = useToastStore(state => state.addToast);

  const toggleActive = async (id: number, currentStatus: boolean) => {
    setLoadingId(id);
    try {
      await AdminService.saveAldea({ id, activo: !currentStatus });
      addToast(`Aldea ${!currentStatus ? 'activada' : 'archivada'}`, 'success');
      router.refresh();
    } catch (err: any) {
      addToast(err.message, 'error');
    } finally {
      setLoadingId(null);
    }
  };

  const filteredAldeas = useMemo(() => {
    return initialAldeas.filter(aldea => {
      const matchesTab = activeTab === 'active' ? aldea.activo : !aldea.activo;
      const matchesSearch = 
        aldea.nombre_jap.toLowerCase().includes(search.toLowerCase()) || 
        aldea.nombre_español.toLowerCase().includes(search.toLowerCase());
      return matchesTab && matchesSearch;
    });
  }, [initialAldeas, activeTab, search]);

  return (
    <div className="space-y-10">
      {/* Controles Superiores */}
      <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-center bg-zinc-900/30 p-8 rounded-[2.5rem] border border-zinc-800/50 backdrop-blur-md">
        <div className="flex gap-3 p-1.5 bg-black border border-zinc-800 rounded-[1.5rem]">
          {['active', 'inactive'].map((tab) => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all ${
                activeTab === tab 
                ? 'bg-emerald-600 text-black shadow-xl shadow-emerald-500/20' 
                : 'text-zinc-500 hover:text-white'
              }`}
            >
              {tab === 'active' ? 'Activas' : 'Archivadas'} 
              <span className="ml-2 opacity-40">({initialAldeas.filter(a => tab === 'active' ? a.activo : !a.activo).length})</span>
            </button>
          ))}
        </div>

        <div className="flex w-full md:w-auto gap-4">
          <div className="relative flex-1 md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
            <input 
              type="text" 
              placeholder="BUSCAR ALDEA O SECTOR..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-black border border-zinc-800 rounded-2xl py-4 pl-12 pr-6 text-xs font-bold text-white focus:border-emerald-500 outline-none transition-all placeholder:text-zinc-700"
            />
          </div>
          
          <button 
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-3 px-8 py-4 bg-white hover:bg-zinc-200 text-black rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-white/5 active:scale-95"
          >
            <PlusCircle className="w-5 h-5" />
            NUEVA
          </button>
        </div>
      </div>

      {/* Listado de Aldeas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAldeas.map((aldea) => (
          <div 
            key={aldea.id} 
            className="group bg-zinc-950 border border-zinc-900 rounded-[2.5rem] p-8 hover:border-emerald-500/30 transition-all relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-emerald-500/10 transition-all" />
            
            <div className="relative z-10 flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center overflow-hidden">
                  {aldea.url_imagen ? (
                    <img src={aldea.url_imagen} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" referrerPolicy="no-referrer" />
                  ) : (
                    <MapPin className="w-6 h-6 text-emerald-500" />
                  )}
                </div>
                
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => toggleActive(aldea.id, aldea.activo)}
                    disabled={loadingId === aldea.id}
                    className={`p-3 rounded-xl border transition-all ${
                      aldea.activo 
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500 hover:bg-emerald-600 hover:text-white' 
                        : 'bg-zinc-900 border-zinc-800 text-zinc-600 hover:bg-zinc-800 hover:text-white'
                    }`}
                  >
                    {loadingId === aldea.id ? <RefreshCw className="w-4 h-4 animate-spin" /> : (aldea.activo ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />)}
                  </button>
                  <button 
                    onClick={() => setEditingAldea(aldea)}
                    className="p-3 bg-white text-black rounded-xl hover:bg-zinc-200 transition-all active:scale-95 shadow-lg shadow-white/5"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-black text-white uppercase italic tracking-tighter mb-1">{aldea.nombre_jap}</h3>
                <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">{aldea.nombre_español}</p>
                <div className="mt-4 flex items-center gap-2">
                  <span className="px-3 py-1 bg-zinc-900 border border-zinc-800 rounded-full text-[8px] font-black text-zinc-400 uppercase tracking-widest">{aldea.abreviatura}</span>
                  <span className="px-3 py-1 bg-zinc-900 border border-zinc-800 rounded-full text-[8px] font-black text-zinc-400 uppercase tracking-widest font-mono italic">/{aldea.slug}</span>
                </div>
              </div>
            </div>
          </div>
        ))}

        {filteredAldeas.length === 0 && (
          <div className="col-span-full py-24 text-center bg-zinc-950/50 rounded-[3rem] border-2 border-dashed border-zinc-900">
            <p className="text-zinc-700 font-black uppercase italic tracking-[0.3em] text-sm">Sin núcleos detectados</p>
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
