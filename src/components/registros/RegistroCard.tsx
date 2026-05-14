'use client';

import { Registro } from '@/domain/types';
import { Zap, ScrollText, Swords, User, Image as ImageIcon, Link as LinkIcon, Trash2, Edit3, Loader2 } from 'lucide-react';
import { useCharacterStore } from '@/store/useCharacterStore';
import { RegistrosService } from '@/services/supabase/registros.service';
import { useToastStore } from '@/components/ui/Toast';
import { useState } from 'react';

interface RegistroCardProps {
  registro: Registro;
  onRefresh?: () => void;
  onEdit?: (reg: Registro) => void;
  isAdmin?: boolean;
}

export default function RegistroCard({ registro, onRefresh, onEdit, isAdmin }: RegistroCardProps) {
  const { activeCharacter } = useCharacterStore();
  const addToast = useToastStore(state => state.addToast);
  const [loading, setLoading] = useState(false);

  const isOwner = activeCharacter?.id === registro.autor_id;
  const canManage = isOwner || isAdmin;

  const handleDelete = async () => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este registro?')) return;
    
    setLoading(true);
    try {
      await RegistrosService.deleteRegistro(registro.id);
      addToast('Registro eliminado', 'success');
      onRefresh?.();
    } catch (err: any) {
      addToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };
  const getIcon = () => {
    switch (registro.tipo) {
      case 'mision': return ScrollText;
      case 'combate': return Swords;
      default: return Zap;
    }
  };

  const getColorClass = () => {
    switch (registro.tipo) {
      case 'mision': return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
      case 'combate': return 'text-red-500 bg-red-500/10 border-red-500/20';
      default: return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
    }
  };

  const Icon = getIcon();
  const colorClass = getColorClass();

  const participants = registro.participantes?.map(p => p.personaje?.nombre_ninja).join(', ') || registro.autor?.nombre_ninja;

  return (
    <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-2xl p-6 hover:border-zinc-700 transition-all group">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-2 rounded-xl border ${colorClass}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">
            {new Date(registro.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
          </span>
          {canManage && (
            <div className="flex items-center gap-1 ml-4 pl-4 border-l border-zinc-800/50">
              <button 
                onClick={() => onEdit?.(registro)}
                className="p-2 text-zinc-600 hover:text-orange-500 transition-all rounded-lg hover:bg-orange-500/10"
                title="Editar Registro"
              >
                <Edit3 className="w-4 h-4" />
              </button>
              <button 
                onClick={handleDelete}
                disabled={loading}
                className="p-2 text-zinc-600 hover:text-red-500 transition-all rounded-lg hover:bg-red-500/10"
                title="Eliminar Registro"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              </button>
            </div>
          )}
        </div>
      </div>

      <p className="text-sm text-zinc-300 leading-relaxed mb-4">
        {registro.tipo === 'mision' ? (
          <>
            Misión <span className="text-white font-bold">{registro.data.codigo_mision}</span> de rango <span className="text-white font-bold">{registro.subtipo}</span> ha sido completada por <span className="text-white font-bold">{participants}</span>. 
            Obtienen <span className="text-blue-400 font-bold">{registro.data.recompensa_xp} XP</span> y <span className="text-emerald-400 font-bold">{registro.data.recompensa_ryous} Ryous</span>.
          </>
        ) : (
          <>
            <span className="text-white font-bold">{registro.data.titulo}</span> por <span className="text-white font-bold">{participants}</span>.
          </>
        )}
      </p>

      {registro.data.urls_imagenes && registro.data.urls_imagenes.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-4 border-t border-zinc-800/50">
          {registro.data.urls_imagenes.map((url, i) => (
            <a 
              key={i} 
              href={url} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="flex items-center gap-2 px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-white hover:border-zinc-600 transition-all"
            >
              <LinkIcon className="w-3 h-3" /> Prueba {i + 1}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
