'use client';

import { useState, useMemo } from 'react';
import { Search, PlusCircle, Edit2, Eye, EyeOff, Trash2, Dumbbell, GitBranch, Layers } from 'lucide-react';
import { Entrenamiento, RamaClan, SubEspecialidad } from '@/domain/types';
import { AdminService } from '@/services/supabase/admin.service';
import { useToastStore } from '@/components/ui/Toast';
import { useConfirmStore } from '@/components/ui/ConfirmDialog';
import { useRouter } from 'next/navigation';
import EntrenamientoEditForm from './EntrenamientoEditForm';

interface Props {
  initialEntrenamientos: Entrenamiento[];
  ramas: RamaClan[];
  subEspecialidades: SubEspecialidad[];
}

export default function EntrenamientoList({ initialEntrenamientos, ramas, subEspecialidades }: Props) {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'active' | 'inactive'>('active');
  const [editingEnt, setEditingEnt] = useState<Entrenamiento | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [loadingId, setLoadingId] = useState<number | null>(null);

  const addToast = useToastStore(state => state.addToast);
  const router = useRouter();
  const { confirm: confirmAction } = useConfirmStore();

  const filteredData = useMemo(() => {
    return initialEntrenamientos.filter(ent => {
      const matchesTab = activeTab === 'active' ? ent.activo : !ent.activo;
      const matchesSearch = 
        ent.nombre_esp.toLowerCase().includes(search.toLowerCase()) || 
        ent.nombre_jp.toLowerCase().includes(search.toLowerCase());
      return matchesTab && matchesSearch;
    });
  }, [initialEntrenamientos, activeTab, search]);

  const toggleActive = async (ent: Entrenamiento) => {
    setLoadingId(ent.id);
    try {
      await AdminService.saveEntrenamiento({ ...ent, activo: !ent.activo });
      addToast(`Entrenamiento ${!ent.activo ? 'activado' : 'archivado'}`, 'success');
      router.refresh();
    } catch (error: any) {
      addToast(error.message, 'error');
    } finally {
      setLoadingId(null);
    }
  };

  const handleDelete = async (id: number) => {
    const ok = await confirmAction({
      title: 'Eliminar Entrenamiento',
      message: '¿Estás seguro de eliminar este entrenamiento?',
      variant: 'danger',
      requireValidation: true
    });
    if (!ok) return;
    try {
      await AdminService.deleteEntrenamiento(id);
      addToast('Entrenamiento eliminado', 'success');
      router.refresh();
    } catch (error: any) {
      addToast(error.message, 'error');
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-center bg-zinc-900/30 p-8 rounded-[2.5rem] border border-zinc-800/50 backdrop-blur-md">
        <div className="flex gap-3 p-1.5 bg-black border border-zinc-800 rounded-[1.5rem]">
          {['active', 'inactive'].map((tab) => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all ${
                activeTab === tab 
                ? 'bg-amber-500 text-amber-950 shadow-xl shadow-amber-900/20' 
                : 'text-zinc-500 hover:text-white'
              }`}
            >
              {tab === 'active' ? 'Activos' : 'Archivados'}
            </button>
          ))}
        </div>

        <div className="flex w-full md:w-auto gap-4">
          <div className="relative flex-1 md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
            <input 
              type="text" 
              placeholder="BUSCAR ENTRENAMIENTO..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-black border border-zinc-800 rounded-2xl py-4 pl-12 pr-6 text-xs font-bold text-white focus:border-amber-500 outline-none transition-all placeholder:text-zinc-700"
            />
          </div>
          
          <button 
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-3 px-8 py-4 bg-white hover:bg-amber-500 text-black rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-white/5 active:scale-95"
          >
            <PlusCircle className="w-5 h-5" />
            NUEVO
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredData.map((ent) => {
          const rama = ramas.find(r => r.id === ent.id_ramaclan);
          const sub = subEspecialidades.find(s => s.id === ent.id_subespecialidad);
          
          return (
            <div 
              key={ent.id} 
              className="group bg-zinc-950 border border-zinc-900 rounded-[2.5rem] p-8 hover:border-amber-500/30 transition-all relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-amber-500/10 transition-all" />
              
              <div className="relative z-10 flex flex-col gap-6">
                <div className="flex items-center justify-between">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-amber-500/5 border-2 border-amber-500/10">
                    <Dumbbell className="w-6 h-6 text-amber-500" />
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => toggleActive(ent)}
                      disabled={loadingId === ent.id}
                      className={`p-3 rounded-xl border transition-all ${
                        ent.activo 
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500 hover:bg-emerald-600 hover:text-white' 
                          : 'bg-zinc-900 border-zinc-800 text-zinc-600 hover:bg-zinc-800 hover:text-white'
                      }`}
                    >
                      {ent.activo ? <Eye size={16} /> : <EyeOff size={16} />}
                    </button>
                    <button 
                      onClick={() => setEditingEnt(ent)}
                      className="p-3 bg-white text-black rounded-xl hover:bg-amber-500 transition-all active:scale-95"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={() => handleDelete(ent.id)}
                      className="p-3 bg-zinc-900 text-zinc-500 rounded-xl hover:bg-red-500/20 hover:text-red-500 transition-all active:scale-95"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="text-xl font-black text-white uppercase italic tracking-tighter mb-1">{ent.nombre_esp}</h3>
                    <p className="text-zinc-600 font-bold text-[10px] uppercase tracking-widest">{ent.nombre_jp}</p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {rama && (
                      <div className="flex items-center gap-2 text-[8px] font-black uppercase tracking-widest bg-zinc-900 text-zinc-400 border border-zinc-800 px-3 py-1.5 rounded-lg">
                        <GitBranch size={10} className="text-blue-500" /> {rama.nombre}
                      </div>
                    )}
                    {sub && (
                      <div className="flex items-center gap-2 text-[8px] font-black uppercase tracking-widest bg-zinc-900 text-zinc-400 border border-zinc-800 px-3 py-1.5 rounded-lg">
                        <Layers size={10} className="text-purple-500" /> {sub.nombre}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {filteredData.length === 0 && (
          <div className="col-span-full py-24 text-center bg-zinc-950/50 rounded-[3rem] border-2 border-dashed border-zinc-900">
            <p className="text-zinc-700 font-black uppercase italic tracking-[0.3em] text-sm">Sin entrenamientos registrados</p>
          </div>
        )}
      </div>

      {(editingEnt || isAdding) && (
        <EntrenamientoEditForm 
          entrenamiento={editingEnt}
          ramas={ramas}
          subEspecialidades={subEspecialidades}
          onCancel={() => {
            setEditingEnt(null);
            setIsAdding(false);
          }}
        />
      )}
    </div>
  );
}
