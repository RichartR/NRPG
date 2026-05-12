'use client';

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Edit2, Save, X, Eye, EyeOff, Sword, Plus, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function CombateList({ 
  initialDocs, 
  ramas, 
  subEspecialidades 
}: { 
  initialDocs: any[], 
  ramas: any[], 
  subEspecialidades: any[] 
}) {
  const [docs, setDocs] = useState(initialDocs);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<any>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  const startAdding = () => {
    setEditForm({
      titulo: '',
      clave: '',
      descripcion: '',
      url_drive: '',
      rama_id: '',
      sub_especialidad_id: '',
      activo: true
    });
    setIsAdding(true);
  };

  const startEditing = (doc: any) => {
    setEditingId(doc.id);
    setEditForm({ ...doc });
    setIsAdding(false);
  };

  const handleSave = async () => {
    if (!editForm) return;
    setLoading(true);

    const payload = {
      titulo: editForm.titulo,
      clave: editForm.clave,
      descripcion: editForm.descripcion,
      url_drive: editForm.url_drive,
      rama_id: editForm.rama_id || null,
      sub_especialidad_id: editForm.sub_especialidad_id || null,
      activo: editForm.activo
    };

    let error;
    if (isAdding) {
      const { data, error: err } = await supabase
        .from('documentos_combate')
        .insert([payload])
        .select('*, ramas_clanes(id, nombre), sub_especialidades(id, nombre)');
      error = err;
      if (!error && data) setDocs([data[0], ...docs]);
    } else {
      const { error: err } = await supabase
        .from('documentos_combate')
        .update(payload)
        .eq('id', editForm.id);
      error = err;
      if (!error) {
        const { data: updatedDoc } = await supabase
          .from('documentos_combate')
          .select('*, ramas_clanes(id, nombre), sub_especialidades(id, nombre)')
          .eq('id', editForm.id)
          .single();
        setDocs(docs.map(d => d.id === editForm.id ? updatedDoc : d));
      }
    }

    if (!error) {
      setEditingId(null);
      setEditForm(null);
      setIsAdding(false);
      router.refresh();
    }
    setLoading(false);
  };

  const deleteDoc = async (id: number) => {
    if (!confirm('¿Seguro que quieres borrar esta técnica?')) return;
    const { error } = await supabase.from('documentos_combate').delete().eq('id', id);
    if (!error) {
      setDocs(docs.filter(d => d.id !== id));
      router.refresh();
    }
  };

  const subFiltradas = subEspecialidades.filter(s => s.rama_id === parseInt(editForm?.rama_id));

  return (
    <div className="space-y-6">
      <button 
        onClick={startAdding}
        className="w-full py-4 border-2 border-dashed border-zinc-800 rounded-[2rem] text-zinc-500 hover:text-red-500 hover:border-red-500/50 hover:bg-red-500/5 transition-all font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2"
      >
        <Plus className="w-4 h-4" /> Añadir Nueva Técnica / Documento
      </button>

      {(isAdding || editingId) && (
        <div className="bg-zinc-900 border-2 border-red-500/50 rounded-[2.5rem] p-8 shadow-2xl space-y-6 animate-in fade-in slide-in-from-top-4">
          <h3 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-2">
            <Sword className="w-5 h-5 text-red-500" />
            {isAdding ? 'Nueva Técnica' : 'Editando Técnica'}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-1.5">Título</label>
              <input 
                type="text" 
                value={editForm.titulo} 
                onChange={e => {
                  const val = e.target.value;
                  setEditForm({
                    ...editForm, 
                    titulo: val,
                    clave: val.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w-]/g, '')
                  });
                }} 
                className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-2.5 text-white focus:border-red-500 outline-none transition-colors" 
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-1.5">Clave (Slug)</label>
              <input type="text" value={editForm.clave} onChange={e => setEditForm({...editForm, clave: e.target.value})} className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-2.5 text-white focus:border-red-500 outline-none transition-colors" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-1.5">Rama Principal</label>
              <select value={editForm.rama_id || ''} onChange={e => setEditForm({...editForm, rama_id: e.target.value, sub_especialidad_id: ''})} className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-2.5 text-white focus:border-red-500 outline-none transition-colors appearance-none">
                <option value="">Seleccionar Rama...</option>
                {ramas.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-1.5">Sub-Especialidad</label>
              <select value={editForm.sub_especialidad_id || ''} onChange={e => setEditForm({...editForm, sub_especialidad_id: e.target.value})} className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-2.5 text-white focus:border-red-500 outline-none transition-colors appearance-none">
                <option value="">Ninguna / General</option>
                {subFiltradas.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-1.5">URL de Google Drive</label>
            <input type="text" value={editForm.url_drive} onChange={e => setEditForm({...editForm, url_drive: e.target.value})} className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-2.5 text-white focus:border-red-500 outline-none transition-colors" />
          </div>

          <div>
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-1.5">Descripción Corta</label>
            <textarea value={editForm.descripcion} onChange={e => setEditForm({...editForm, descripcion: e.target.value})} rows={2} className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-2.5 text-white focus:border-red-500 outline-none transition-colors resize-none" />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800/50">
            <button onClick={() => {setEditingId(null); setIsAdding(false);}} className="px-6 py-2 text-zinc-500 font-black uppercase text-[10px] tracking-widest">Cancelar</button>
            <button onClick={handleSave} disabled={loading} className="px-8 py-2 bg-red-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-400 transition-colors">{loading ? 'Procesando...' : 'Guardar Técnica'}</button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {docs.map((doc) => (
          <div key={doc.id} className="group flex items-center justify-between p-5 bg-zinc-900/50 border border-zinc-800 rounded-3xl hover:border-zinc-700 transition-all">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center shrink-0 group-hover:bg-red-500/10 transition-colors">
                <Sword className="w-5 h-5 text-zinc-600 group-hover:text-red-500" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-white font-bold uppercase tracking-tight">{doc.titulo}</h4>
                  <span className="text-[9px] font-black bg-zinc-800 px-2 py-0.5 rounded text-zinc-500 uppercase tracking-tighter">
                    {(() => {
                      const rama = Array.isArray(doc.ramas_clanes) ? doc.ramas_clanes[0] : doc.ramas_clanes;
                      const sub = Array.isArray(doc.sub_especialidades) ? doc.sub_especialidades[0] : doc.sub_especialidades;
                      
                      const ramaName = rama?.nombre || 'General';
                      const subName = sub?.nombre;
                      
                      return (
                        <>
                          {ramaName}
                          {subName && <span className="text-zinc-600 mx-1"> {'>'} {subName}</span>}
                        </>
                      );
                    })()}
                  </span>
                </div>
                <p className="text-zinc-500 text-xs line-clamp-1 italic">{doc.descripcion}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => startEditing(doc)} className="p-2 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700 transition-colors"><Edit2 className="w-4 h-4" /></button>
              <button onClick={() => deleteDoc(doc.id)} className="p-2 bg-zinc-800 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-colors"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
