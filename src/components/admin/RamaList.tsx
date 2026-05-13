'use client';

import { useState, useMemo } from 'react';
import { Edit2, Eye, EyeOff, GitBranch, MapPin, Search, PlusCircle, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import RamaEditForm from './RamaEditForm';
import { AdminService } from '@/services/supabase/admin.service';
import { useToastStore } from '@/components/ui/Toast';

export default function RamaList({ initialRamas, aldeas }: { initialRamas: any[], aldeas: any[] }) {
  const [editingRama, setEditingRama] = useState<any>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'inactive'>('active');
  const [search, setSearch] = useState('');
  const [loadingId, setLoadingId] = useState<number | null>(null);
  
  const router = useRouter();
  const addToast = useToastStore(state => state.addToast);

  const toggleActive = async (id: number, currentStatus: boolean) => {
    setLoadingId(id);
    try {
      await AdminService.saveRamaClan({ id, activo: !currentStatus });
      addToast(`Registro ${!currentStatus ? 'activado' : 'archivado'}`, 'success');
      router.refresh();
    } catch (err: any) {
      addToast(err.message, 'error');
    } finally {
      setLoadingId(null);
    }
  };

  const filteredRamas = useMemo(() => {
    return initialRamas.filter(rama => {
      const matchesTab = activeTab === 'active' ? rama.activo : !rama.activo;
      const matchesSearch = 
        rama.nombre.toLowerCase().includes(search.toLowerCase()) || 
        rama.tipo.toLowerCase().includes(search.toLowerCase());
      return matchesTab && matchesSearch;
    });
  }, [initialRamas, activeTab, search]);

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-center bg-zinc-900/30 p-8 rounded-[2.5rem] border border-zinc-800/50 backdrop-blur-md">
        <div className="flex gap-3 p-1.5 bg-black border border-zinc-800 rounded-[1.5rem]">
          {['active', 'inactive'].map((tab) => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all ${
                activeTab === tab 
                ? 'bg-purple-600 text-white shadow-xl shadow-purple-900/20' 
                : 'text-zinc-500 hover:text-white'
              }`}
            >
              {tab === 'active' ? 'Activos' : 'Archivados'} 
              <span className="ml-2 opacity-40">({initialRamas.filter(r => tab === 'active' ? r.activo : !r.activo).length})</span>
            </button>
          ))}
        </div>

        <div className="flex w-full md:w-auto gap-4">
          <div className="relative flex-1 md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
            <input 
              type="text" 
              placeholder="BUSCAR RAMA O CLAN..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-black border border-zinc-800 rounded-2xl py-4 pl-12 pr-6 text-xs font-bold text-white focus:border-purple-500 outline-none transition-all placeholder:text-zinc-700"
            />
          </div>
          
          <button 
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-3 px-8 py-4 bg-white hover:bg-zinc-200 text-black rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-white/5 active:scale-95"
          >
            <PlusCircle className="w-5 h-5" />
            NUEVO
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredRamas.map((rama) => (
          <div 
            key={rama.id} 
            className="group bg-zinc-950 border border-zinc-900 rounded-[2.5rem] p-8 hover:border-purple-500/30 transition-all relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-purple-500/10 transition-all" />
            
            <div className="relative z-10 flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center border-2 overflow-hidden ${
                  rama.tipo === 'rama' ? 'bg-blue-500/5 border-blue-500/10' : 'bg-purple-500/5 border-purple-500/10'
                }`}>
                  {rama.url_imagen ? (
                    <img src={rama.url_imagen} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" referrerPolicy="no-referrer" />
                  ) : (
                    <GitBranch className={`w-6 h-6 ${rama.tipo === 'rama' ? 'text-blue-500' : 'text-purple-500'}`} />
                  )}
                </div>
                
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => toggleActive(rama.id, rama.activo)}
                    disabled={loadingId === rama.id}
                    className={`p-3 rounded-xl border transition-all ${
                      rama.activo 
                        ? 'bg-purple-500/10 border-purple-500/20 text-purple-500 hover:bg-purple-600 hover:text-white' 
                        : 'bg-zinc-900 border-zinc-800 text-zinc-600 hover:bg-zinc-800 hover:text-white'
                    }`}
                  >
                    {loadingId === rama.id ? <RefreshCw className="w-4 h-4 animate-spin" /> : (rama.activo ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />)}
                  </button>
                  <button 
                    onClick={() => setEditingRama(rama)}
                    className="p-3 bg-white text-black rounded-xl hover:bg-zinc-200 transition-all active:scale-95 shadow-lg shadow-white/5"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-xl font-black text-white uppercase italic tracking-tighter">{rama.nombre}</h3>
                  <span className={`px-2 py-1 text-[8px] font-black rounded-lg border uppercase tracking-widest ${
                    rama.tipo === 'rama' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' : 'bg-purple-500/10 text-purple-500 border-purple-500/20'
                  }`}>
                    {rama.tipo}
                  </span>
                </div>

                {rama.aldeas ? (
                  <div className="flex items-center gap-2 text-[10px] text-emerald-500 font-black uppercase tracking-widest bg-emerald-500/5 border border-emerald-500/10 px-4 py-2 rounded-xl w-fit">
                    <MapPin className="w-3.5 h-3.5" /> {rama.aldeas.nombre_jap}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-black uppercase tracking-widest bg-zinc-900 border border-zinc-800 px-4 py-2 rounded-xl w-fit">
                    <MapPin className="w-3.5 h-3.5 opacity-50" /> Rama Global
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {filteredRamas.length === 0 && (
          <div className="col-span-full py-24 text-center bg-zinc-950/50 rounded-[3rem] border-2 border-dashed border-zinc-900">
            <p className="text-zinc-700 font-black uppercase italic tracking-[0.3em] text-sm">Sin resultados tácticos</p>
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
