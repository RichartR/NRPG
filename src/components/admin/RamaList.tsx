'use client';

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Edit2, Save, X, Eye, EyeOff, GitBranch, MapPin } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function RamaList({ initialRamas, aldeas }: { initialRamas: any[], aldeas: any[] }) {
  const [ramas, setRamas] = useState(initialRamas);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  const startEditing = (rama: any) => {
    setEditingId(rama.id);
    setEditForm({ ...rama });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditForm(null);
  };

  const handleSave = async () => {
    if (!editForm) return;
    setLoading(true);

    const { error } = await supabase
      .from('ramas_clanes')
      .update({
        nombre: editForm.nombre,
        nombre_en_español: editForm.nombre_en_español,
        tipo: editForm.tipo,
        descripcion: editForm.descripcion,
        url_icono: editForm.url_icono,
        aldea_id: editForm.tipo === 'rama' ? null : editForm.aldea_id,
        activo: editForm.activo
      })
      .eq('id', editForm.id);

    if (!error) {
      // Recargar datos para ver la relación actualizada
      const { data: updatedRama } = await supabase
        .from('ramas_clanes')
        .select('*, aldeas(id, nombre_jap, abreviatura)')
        .eq('id', editForm.id)
        .single();
        
      setRamas(ramas.map(r => r.id === editForm.id ? updatedRama : r));
      setEditingId(null);
      setEditForm(null);
      router.refresh();
    }
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      {ramas.map((rama) => (
        <div 
          key={rama.id} 
          className={`bg-zinc-900/50 border rounded-3xl p-6 transition-all ${
            editingId === rama.id ? 'border-amber-500 ring-1 ring-amber-500/20' : 'border-zinc-800'
          } ${!rama.activo && editingId !== rama.id ? 'opacity-50' : ''}`}
        >
          {editingId === rama.id ? (
            /* MODO EDICIÓN */
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-1.5">Nombre Original</label>
                  <input 
                    type="text" 
                    value={editForm.nombre} 
                    onChange={(e) => setEditForm({...editForm, nombre: e.target.value})}
                    className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-2.5 text-white focus:border-amber-500 outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-1.5">Tipo</label>
                  <select 
                    value={editForm.tipo} 
                    onChange={(e) => setEditForm({...editForm, tipo: e.target.value})}
                    className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-2.5 text-white focus:border-amber-500 outline-none transition-colors appearance-none"
                  >
                    <option value="rama">Rama (Global)</option>
                    <option value="clan">Clan (Aldea)</option>
                  </select>
                </div>
                {editForm.tipo === 'clan' && (
                  <div>
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-1.5">Aldea Vinculada</label>
                    <select 
                      value={editForm.aldea_id || ''} 
                      onChange={(e) => setEditForm({...editForm, aldea_id: e.target.value ? parseInt(e.target.value) : null})}
                      className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-2.5 text-white focus:border-amber-500 outline-none transition-colors appearance-none"
                    >
                      <option value="">Seleccionar Aldea...</option>
                      {aldeas.map(a => (
                        <option key={a.id} value={a.id}>{a.abreviatura || a.nombre_jap}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div>
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-1.5">Nombre en Español</label>
                <input 
                  type="text" 
                  value={editForm.nombre_en_español} 
                  onChange={(e) => setEditForm({...editForm, nombre_en_español: e.target.value})}
                  className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-2.5 text-white focus:border-amber-500 outline-none transition-colors"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-1.5">Descripción</label>
                <textarea 
                  value={editForm.descripcion} 
                  onChange={(e) => setEditForm({...editForm, descripcion: e.target.value})}
                  rows={2}
                  className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-2.5 text-white focus:border-amber-500 outline-none transition-colors resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800/50">
                <button 
                  onClick={cancelEditing}
                  className="px-6 py-2 rounded-xl text-zinc-500 hover:text-white transition-colors text-xs font-black uppercase tracking-widest"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleSave}
                  disabled={loading}
                  className="px-8 py-2 bg-amber-500 text-black rounded-xl font-black text-xs uppercase tracking-widest hover:bg-amber-400 transition-colors flex items-center gap-2"
                >
                  {loading ? 'Guardando...' : <><Save className="w-4 h-4" /> Guardar Cambios</>}
                </button>
              </div>
            </div>
          ) : (
            /* MODO VISTA */
            <div className="flex items-center justify-between gap-6">
              <div className="flex items-center gap-6">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border ${
                  rama.tipo === 'rama' ? 'bg-blue-500/10 border-blue-500/20' : 'bg-amber-500/10 border-amber-500/20'
                }`}>
                  <GitBranch className={`w-6 h-6 ${rama.tipo === 'rama' ? 'text-blue-500' : 'text-amber-500'}`} />
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-xl font-bold text-white uppercase tracking-tight">{rama.nombre}</h3>
                    <span className={`px-2 py-0.5 text-[9px] font-black rounded border uppercase tracking-widest ${
                      rama.tipo === 'rama' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                    }`}>
                      {rama.tipo}
                    </span>
                    {rama.aldeas && (
                      <span className="flex items-center gap-1 text-[10px] text-zinc-500 font-bold bg-zinc-800 px-2 py-0.5 rounded">
                        <MapPin className="w-3 h-3" /> {rama.aldeas.abreviatura}
                      </span>
                    )}
                  </div>
                  <p className="text-zinc-500 text-xs italic line-clamp-1">{rama.descripcion}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-zinc-600">
                <button 
                  onClick={() => startEditing(rama)}
                  className="p-3 bg-zinc-800 border border-zinc-700 text-white rounded-xl hover:bg-zinc-700 transition-all"
                >
                  <Edit2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
