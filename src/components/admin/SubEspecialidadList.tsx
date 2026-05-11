'use client';

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Plus, Trash2, Shield } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function SubEspecialidadList({ initialSubs, ramas }: { initialSubs: any[], ramas: any[] }) {
  const [subs, setSubs] = useState(initialSubs);
  const [newSub, setNewSub] = useState({ nombre: '', nombre_en_español: '', slug: '', rama_id: '', descripcion: '' });
  const [loading, setLoading] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  const handleAdd = async () => {
    if (!newSub.nombre || !newSub.rama_id || !newSub.slug) return;
    setLoading(true);

    const { data, error } = await supabase
      .from('sub_especialidades')
      .insert([newSub])
      .select();

    if (!error && data) {
      setSubs([...subs, data[0]]);
      setNewSub({ nombre: '', nombre_en_español: '', slug: '', rama_id: '', descripcion: '' });
      router.refresh();
    }
    setLoading(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Borrar esta sub-categoría?')) return;
    const { error } = await supabase.from('sub_especialidades').delete().eq('id', id);
    if (!error) {
      setSubs(subs.filter(s => s.id !== id));
      router.refresh();
    }
  };

  return (
    <div className="mt-20">
      <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-8 flex items-center gap-3">
        <Shield className="w-6 h-6 text-blue-500" />
        Configurar Sub-Categorías
      </h2>

      <div className="bg-zinc-900/30 border border-zinc-800 rounded-[2rem] p-8 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
          <input 
            placeholder="Nombre (Ej: Bujutsu)" 
            value={newSub.nombre} 
            onChange={e => setNewSub({...newSub, nombre: e.target.value})}
            className="bg-black border border-zinc-800 rounded-xl px-4 py-2 text-white text-sm outline-none focus:border-blue-500"
          />
          <input 
            placeholder="En Español (Ej: Arte de la Guerra)" 
            value={newSub.nombre_en_español} 
            onChange={e => setNewSub({...newSub, nombre_en_español: e.target.value})}
            className="bg-black border border-zinc-800 rounded-xl px-4 py-2 text-white text-sm outline-none focus:border-blue-500"
          />
          <input 
            placeholder="Slug (ej: bujutsu)" 
            value={newSub.slug} 
            onChange={e => setNewSub({...newSub, slug: e.target.value})}
            className="bg-black border border-zinc-800 rounded-xl px-4 py-2 text-white text-sm outline-none focus:border-blue-500"
          />
          <select 
            value={newSub.rama_id} 
            onChange={e => setNewSub({...newSub, rama_id: e.target.value})}
            className="bg-black border border-zinc-800 rounded-xl px-4 py-2 text-white text-sm outline-none focus:border-blue-500"
          >
            <option value="">Rama Padre...</option>
            {ramas.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
          </select>
          <button 
            onClick={handleAdd}
            disabled={loading}
            className="bg-blue-500 text-black font-black uppercase text-[10px] tracking-widest rounded-xl hover:bg-blue-400 transition-all flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" /> Crear
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {subs.map(sub => (
          <div key={sub.id} className="flex items-center justify-between p-4 bg-zinc-900 border border-zinc-800 rounded-2xl group">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-white font-bold text-sm uppercase tracking-tight">{sub.nombre}</p>
                {sub.nombre_en_español && (
                  <p className="text-zinc-500 text-xs italic">({sub.nombre_en_español})</p>
                )}
              </div>
              <p className="text-zinc-600 text-[10px] uppercase tracking-widest font-black">
                {ramas.find(r => r.id === sub.rama_id)?.nombre}
              </p>
            </div>
            <button onClick={() => handleDelete(sub.id)} className="p-2 text-zinc-600 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
