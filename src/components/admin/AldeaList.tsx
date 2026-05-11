'use client';

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Edit2, Save, X, Eye, EyeOff, MapPin } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function AldeaList({ initialAldeas }: { initialAldeas: any[] }) {
  const [aldeas, setAldeas] = useState(initialAldeas);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  const startEditing = (aldea: any) => {
    setEditingId(aldea.id);
    setEditForm({ ...aldea });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditForm(null);
  };

  const handleSave = async () => {
    if (!editForm) return;
    setLoading(true);

    const { error } = await supabase
      .from('aldeas')
      .update({
        nombre_jap: editForm.nombre_jap,
        abreviatura: editForm.abreviatura,
        nombre_español: editForm.nombre_español,
        nombre_completo: editForm.nombre_completo,
        descripcion: editForm.descripcion,
        url_icono: editForm.url_icono,
        url_imagen: editForm.url_imagen,
        activo: editForm.activo
      })
      .eq('id', editForm.id);

    if (!error) {
      setAldeas(aldeas.map(a => a.id === editForm.id ? editForm : a));
      setEditingId(null);
      setEditForm(null);
      router.refresh();
    }
    setLoading(false);
  };

  const toggleActive = async (aldea: any) => {
    const newStatus = !aldea.activo;
    const { error } = await supabase
      .from('aldeas')
      .update({ activo: newStatus })
      .eq('id', aldea.id);

    if (!error) {
      setAldeas(aldeas.map(a => a.id === aldea.id ? { ...a, activo: newStatus } : a));
      router.refresh();
    }
  };

  return (
    <div className="space-y-4">
      {aldeas.map((aldea) => (
        <div 
          key={aldea.id} 
          className={`bg-zinc-900/50 border rounded-3xl p-6 transition-all ${
            editingId === aldea.id ? 'border-emerald-500 ring-1 ring-emerald-500/20' : 'border-zinc-800'
          } ${!aldea.activo && editingId !== aldea.id ? 'opacity-50' : ''}`}
        >
          {editingId === aldea.id ? (
            /* MODO EDICIÓN */
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-1.5">Nombre Japonés</label>
                  <input 
                    type="text" 
                    value={editForm.nombre_jap} 
                    onChange={(e) => setEditForm({...editForm, nombre_jap: e.target.value})}
                    className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-2.5 text-white focus:border-emerald-500 outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-1.5">Abreviatura (Konoha...)</label>
                  <input 
                    type="text" 
                    value={editForm.abreviatura} 
                    onChange={(e) => setEditForm({...editForm, abreviatura: e.target.value})}
                    className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-2.5 text-white focus:border-emerald-500 outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-1.5">Nombre Español (Hoja...)</label>
                  <input 
                    type="text" 
                    value={editForm.nombre_español} 
                    onChange={(e) => setEditForm({...editForm, nombre_español: e.target.value})}
                    className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-2.5 text-white focus:border-emerald-500 outline-none transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-1.5">Nombre Completo Oficial</label>
                <input 
                  type="text" 
                  value={editForm.nombre_completo} 
                  onChange={(e) => setEditForm({...editForm, nombre_completo: e.target.value})}
                  className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-2.5 text-white focus:border-emerald-500 outline-none transition-colors"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-1.5">Descripción de la Aldea</label>
                <textarea 
                  value={editForm.descripcion} 
                  onChange={(e) => setEditForm({...editForm, descripcion: e.target.value})}
                  rows={2}
                  className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-2.5 text-white focus:border-emerald-500 outline-none transition-colors resize-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-1.5">URL Icono (Logo)</label>
                  <input 
                    type="text" 
                    value={editForm.url_icono} 
                    onChange={(e) => setEditForm({...editForm, url_icono: e.target.value})}
                    className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-2.5 text-white focus:border-emerald-500 outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-1.5">URL Imagen (Banner)</label>
                  <input 
                    type="text" 
                    value={editForm.url_imagen} 
                    onChange={(e) => setEditForm({...editForm, url_imagen: e.target.value})}
                    className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-2.5 text-white focus:border-emerald-500 outline-none transition-colors"
                  />
                </div>
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
                  className="px-8 py-2 bg-emerald-500 text-black rounded-xl font-black text-xs uppercase tracking-widest hover:bg-emerald-400 transition-colors flex items-center gap-2"
                >
                  {loading ? 'Guardando...' : <><Save className="w-4 h-4" /> Guardar Cambios</>}
                </button>
              </div>
            </div>
          ) : (
            /* MODO VISTA */
            <div className="flex items-center justify-between gap-6">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 rounded-2xl bg-zinc-800 border border-zinc-700 p-3 flex items-center justify-center shrink-0">
                  {aldea.url_icono ? (
                    <img src={aldea.url_icono} alt="" className="w-full h-full object-contain" />
                  ) : (
                    <MapPin className="w-6 h-6 text-zinc-600" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-xl font-bold text-white uppercase tracking-tight">{aldea.nombre_jap}</h3>
                    <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 text-[10px] font-black rounded border border-emerald-500/20">{aldea.abreviatura}</span>
                  </div>
                  <p className="text-zinc-500 text-sm italic">{aldea.nombre_completo}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button 
                  onClick={() => toggleActive(aldea)}
                  className={`p-3 rounded-xl border transition-all ${
                    aldea.activo 
                      ? 'border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/10' 
                      : 'border-zinc-800 text-zinc-600 hover:border-zinc-700'
                  }`}
                  title={aldea.activo ? 'Desactivar aldea' : 'Activar aldea'}
                >
                  {aldea.activo ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                </button>
                <button 
                  onClick={() => startEditing(aldea)}
                  className="p-3 bg-zinc-800 border border-zinc-700 text-white rounded-xl hover:bg-zinc-700 transition-all"
                  title="Editar aldea"
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
