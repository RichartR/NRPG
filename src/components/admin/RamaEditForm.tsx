'use client';

import { useState } from 'react';
import { Save, X, GitBranch, Type, AlignLeft, MapPin, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { AdminService } from '@/services/supabase/admin.service';
import { useToastStore } from '@/components/ui/Toast';
import { DataField, SelectField, SearchableSelect } from '@/components/ui/Fields';
import { RamaClan, Aldea } from '@/domain/types';

interface RamaEditFormProps {
  rama?: RamaClan;
  aldeas: Aldea[];
  onCancel: () => void;
}

export default function RamaEditForm({ rama, aldeas, onCancel }: RamaEditFormProps) {
  const isCreate = !rama;
  const [formData, setFormData] = useState<Partial<RamaClan>>(() => {
    if (rama) {
      return {
        ...rama,
        es_especial: rama.es_especial ?? false
      };
    }
    return {
      nombre: '',
      slug: '',
      descripcion: '',
      tipo: 'rama',
      aldea_id: undefined,
      activo: true,
      es_especial: false,
      url_imagen: ''
    };
  });
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const addToast = useToastStore(state => state.addToast);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        ...formData,
        slug: formData.slug || formData.nombre?.toLowerCase().replace(/\s+/g, '-')
      };

      await AdminService.saveRamaClan(payload);
      addToast(`${formData.tipo === 'rama' ? 'Rama' : 'Clan'} ${isCreate ? 'creada' : 'actualizada'} con éxito`, 'success');
      router.refresh();
      onCancel();
    } catch (error: any) {
      addToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: keyof RamaClan, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-950 border border-zinc-800 w-full max-w-3xl rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
        <header className="bg-zinc-900/50 p-8 flex justify-between items-center border-b border-zinc-800">
          <div>
            <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter flex items-center gap-3">
              <GitBranch className="w-6 h-6 text-purple-500" />
              {isCreate ? 'Crear Nuevo Registro' : 'Editar Registro'}
            </h2>
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mt-1">Configuración de especialidades ninja</p>
          </div>
          
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-3 cursor-pointer group bg-zinc-900 px-4 py-2 rounded-full border border-zinc-800">
              <span className={`text-[10px] font-black uppercase tracking-widest transition-colors ${formData.activo ? 'text-emerald-500' : 'text-zinc-500'}`}>
                {formData.activo ? 'ACTIVA' : 'INACTIVA'}
              </span>
              <input 
                type="checkbox" 
                checked={formData.activo} 
                onChange={(e) => updateField('activo', e.target.checked)}
                className="hidden"
              />
              <div className={`w-10 h-5 rounded-full transition-all relative ${formData.activo ? 'bg-emerald-500/20 border-emerald-500/50' : 'bg-zinc-800 border-zinc-700'} border`}>
                <div className={`absolute top-1 w-2.5 h-2.5 rounded-full transition-all ${formData.activo ? 'right-1 bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'left-1 bg-zinc-500'}`} />
              </div>
            </label>
            <button onClick={onCancel} className="p-2 hover:bg-white/5 rounded-xl transition-all">
              <X className="w-6 h-6 text-zinc-500" />
            </button>
          </div>
        </header>

        <form onSubmit={handleSave} className="p-10 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <DataField 
              label="Nombre" 
              value={formData.nombre} 
              onChange={(v) => {
                updateField('nombre', v);
                if (!formData.slug) updateField('slug', v.toLowerCase().trim().replace(/\s+/g, '-'));
              }} 
              placeholder="Ej: Clan Uchiha"
            />
            <DataField 
              label="Slug (URL)" 
              value={formData.slug} 
              onChange={(v) => updateField('slug', v.toLowerCase().replace(/\s+/g, '-'))} 
              placeholder="clan-uchiha"
            />
            <SearchableSelect 
              label="Aldea Asociada" 
              value={formData.aldea_id} 
              options={aldeas.map(a => ({ label: a.nombre_completo, value: a.id }))} 
              onChange={(v) => updateField('aldea_id', v ? Number(v) : null)}
              placeholder="Cualquier Aldea / Ronin"
            />
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600 ml-1">Tipo de Registro</label>
              <div className="flex bg-zinc-900 p-1 rounded-2xl border border-zinc-800 h-[58px]">
                <button 
                  type="button"
                  onClick={() => {
                    updateField('tipo', 'rama');
                    updateField('es_especial', false);
                  }}
                  className={`flex-1 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${formData.tipo === 'rama' ? 'bg-white text-black shadow-lg' : 'text-zinc-500 hover:text-white'}`}
                >
                  Rama
                </button>
                <button 
                  type="button"
                  onClick={() => updateField('tipo', 'clan')}
                  className={`flex-1 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${formData.tipo === 'clan' ? 'bg-white text-black shadow-lg' : 'text-zinc-500 hover:text-white'}`}
                >
                  Clan
                </button>
              </div>
            </div>
            {formData.tipo === 'clan' && (
              <div className="space-y-2 md:col-span-2 animate-in fade-in slide-in-from-top-2 duration-200">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600 ml-1">Estatus del Clan</label>
                <div className="flex bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800 justify-between items-center h-[58px]">
                  <span className="text-[11px] font-black uppercase tracking-widest text-zinc-400">
                    Clan Especial (Límites reducidos)
                  </span>
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <span className={`text-[10px] font-black uppercase tracking-widest transition-colors ${formData.es_especial ? 'text-purple-500' : 'text-zinc-500'}`}>
                      {formData.es_especial ? 'SÍ' : 'NO'}
                    </span>
                    <input 
                      type="checkbox" 
                      checked={formData.es_especial} 
                      onChange={(e) => updateField('es_especial', e.target.checked)}
                      className="hidden"
                    />
                    <div className={`w-10 h-5 rounded-full transition-all relative ${formData.es_especial ? 'bg-purple-500/20 border-purple-500/50' : 'bg-zinc-800 border-zinc-700'} border`}>
                      <div className={`absolute top-1 w-2.5 h-2.5 rounded-full transition-all ${formData.es_especial ? 'right-1 bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]' : 'left-1 bg-zinc-500'}`} />
                    </div>
                  </label>
                </div>
              </div>
            )}
            <div className="md:col-span-2">
              <DataField 
                label="URL Imagen" 
                value={formData.url_imagen} 
                onChange={(v) => updateField('url_imagen', v)} 
                placeholder="https://ejemplo.com/imagen.jpg"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600 ml-1 flex items-center gap-2">
              <AlignLeft className="w-4 h-4" /> Descripción / Lore
            </label>
            <textarea 
              rows={4}
              value={formData.descripcion || ''} 
              onChange={(e) => updateField('descripcion', e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-white font-bold outline-none focus:border-purple-500 transition-all placeholder:text-zinc-700"
              placeholder="Describe las habilidades únicas o historia..."
            />
          </div>

          <div className="flex justify-end gap-6 pt-6 border-t border-zinc-900">
            <button 
              type="button" 
              onClick={onCancel}
              className="px-8 py-4 text-xs font-black uppercase tracking-widest text-zinc-500 hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              disabled={loading}
              className="bg-purple-600 hover:bg-purple-500 text-white px-10 py-4 rounded-full font-black text-xs uppercase tracking-widest flex items-center gap-3 transition-all shadow-xl shadow-purple-900/20 active:scale-95 disabled:opacity-50"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Guardar {formData.tipo === 'rama' ? 'Rama' : 'Clan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
