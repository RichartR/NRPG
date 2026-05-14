'use client';

import { useState } from 'react';
import { X, Save, Box, Star, ScrollText } from 'lucide-react';
import { AdminService } from '@/services/supabase/admin.service';
import { useToastStore } from '@/components/ui/Toast';
import { useRouter } from 'next/navigation';
import { Entrenamiento, RamaClan, SubEspecialidad } from '@/domain/types';
import { SearchableSelect } from '@/components/ui/Fields';

interface Props {
  entrenamiento?: Entrenamiento | null;
  ramas: RamaClan[];
  subEspecialidades: SubEspecialidad[];
  onCancel: () => void;
}

export default function EntrenamientoEditForm({ entrenamiento, ramas, subEspecialidades, onCancel }: Props) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<Entrenamiento>>(
    entrenamiento || {
      nombre_esp: '',
      nombre_jp: '',
      id_ramaclan: 0,
      id_subespecialidad: null,
      activo: true
    }
  );

  const addToast = useToastStore(state => state.addToast);
  const router = useRouter();

  // Filter sub-specialties based on selected Rama/Clan
  const filteredSubs = subEspecialidades.filter(s => s.rama_id === formData.id_ramaclan);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombre_esp || !formData.id_ramaclan) {
      addToast('Nombre y Rama son obligatorios', 'error');
      return;
    }

    setLoading(true);
    try {
      await AdminService.saveEntrenamiento(formData);
      addToast(entrenamiento ? 'Entrenamiento actualizado' : 'Entrenamiento creado', 'success');
      router.refresh();
      onCancel();
    } catch (err: any) {
      addToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onCancel} />
      
      <div className="relative bg-zinc-950 border border-zinc-800 w-full max-w-2xl rounded-[3rem] shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
        <form onSubmit={handleSubmit} className="p-10 space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="text-3xl font-black text-white uppercase tracking-tighter">
              {entrenamiento ? 'Editar Entrenamiento' : 'Nuevo Entrenamiento'}
            </h2>
            <button 
              type="button" 
              onClick={onCancel}
              className="p-3 bg-zinc-900 hover:bg-white hover:text-black rounded-xl transition-all"
            >
              <X size={20} />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-6">
            <div className="bg-zinc-900/50 p-6 rounded-3xl border border-zinc-800 space-y-4">
              <h3 className="flex items-center gap-2 text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                <Box size={14} /> Información General
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600 ml-1">Nombre Español</label>
                  <input 
                    type="text" 
                    value={formData.nombre_esp} 
                    onChange={(e) => setFormData({ ...formData, nombre_esp: e.target.value })}
                    className="w-full bg-black border border-zinc-800 rounded-2xl px-5 py-3.5 text-white font-bold outline-none focus:border-amber-500 transition-all text-sm"
                    placeholder="Ej: Entrenamiento de Control de Chakra"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600 ml-1">Nombre Japonés</label>
                  <input 
                    type="text" 
                    value={formData.nombre_jp} 
                    onChange={(e) => setFormData({ ...formData, nombre_jp: e.target.value })}
                    className="w-full bg-black border border-zinc-800 rounded-2xl px-5 py-3.5 text-white font-bold outline-none focus:border-amber-500 transition-all text-sm"
                    placeholder="Ej: Chakura no Torēningu"
                  />
                </div>
              </div>
            </div>

            <div className="bg-zinc-900/50 p-6 rounded-3xl border border-zinc-800 space-y-4">
              <h3 className="flex items-center gap-2 text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                <Star size={14} /> Vinculación
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SearchableSelect 
                  label="Rama / Clan" 
                  value={formData.id_ramaclan} 
                  options={ramas.map(r => ({ label: r.nombre, value: r.id }))} 
                  onChange={(v) => setFormData({ ...formData, id_ramaclan: Number(v), id_subespecialidad: null })}
                />

                <SearchableSelect 
                  label="Sub-especialidad (Opcional)" 
                  value={formData.id_subespecialidad} 
                  disabled={!formData.id_ramaclan}
                  options={filteredSubs.map(s => ({ label: s.nombre, value: s.id }))} 
                  onChange={(v) => setFormData({ ...formData, id_subespecialidad: v ? Number(v) : null })}
                />
              </div>
            </div>

            <div className="bg-zinc-900/50 p-6 rounded-3xl border border-zinc-800 flex items-center justify-between">
              <div className="space-y-1">
                <h3 className="text-[10px] font-black text-white uppercase tracking-widest">Estado del Entrenamiento</h3>
                <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-tight">Si está inactivo, los jugadores no podrán verlo.</p>
              </div>
              <button 
                type="button"
                onClick={() => setFormData({ ...formData, activo: !formData.activo })}
                className={`px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${
                  formData.activo 
                  ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                  : 'bg-zinc-800 text-zinc-500 border border-zinc-700'
                }`}
              >
                {formData.activo ? 'Activo' : 'Inactivo'}
              </button>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-white hover:bg-amber-500 text-black py-5 rounded-2xl font-black text-sm uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-3 shadow-xl shadow-white/5 disabled:opacity-50"
          >
            <Save size={20} />
            {loading ? 'Guardando...' : 'Finalizar y Guardar'}
          </button>
        </form>
      </div>
    </div>
  );
}
