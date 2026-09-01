'use client';

import { InfoNPC } from '@/domain/types';
import { X, User, Edit, Trash2 } from 'lucide-react';

interface NPCModalProps {
  npc: InfoNPC;
  onClose: () => void;
  canManage?: boolean;
  onEdit?: (npc: InfoNPC) => void;
  onDelete?: (npc: InfoNPC) => void;
}

export default function NPCModal({
  npc,
  onClose,
  canManage = false,
  onEdit,
  onDelete,
}: NPCModalProps) {
  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/85 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div
        className="bg-neutral-950 border border-oro/30 w-full max-w-4xl max-h-[85vh] shadow-[0_0_80px_rgba(0,0,0,0.9)] animate-in zoom-in-95 my-auto overflow-hidden relative flex flex-col z-10 rounded-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <header className="bg-black/40 p-6 flex items-center justify-between border-b border-oro/10 relative z-10 flex-shrink-0">
          <span className="text-caption font-black text-oro/60 uppercase tracking-[0.3em]">
            FICHA DE PERSONAJE NPC
          </span>
          <button
            type="button"
            onClick={onClose}
            className="text-oro/40 hover:text-naranja-naruto transition-colors p-1 cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 relative z-10 custom-scrollbar">
          {/* Action controls for admins/mods/narradores */}
          {canManage && (
            <div className="flex items-center gap-3 pb-4 border-b border-oro/10">
              {onEdit && (
                <button
                  onClick={() => {
                    onClose();
                    onEdit(npc);
                  }}
                  className="flex items-center gap-2 px-4 py-2 border border-oro/30 bg-oro/10 hover:bg-oro text-oro hover:text-black text-caption font-black uppercase tracking-widest transition-all ninja-clip-xs cursor-pointer"
                >
                  <Edit className="w-4 h-4" /> Editar NPC
                </button>
              )}
              {onDelete && (
                <button
                  onClick={() => {
                    onDelete(npc);
                  }}
                  className="flex items-center gap-2 px-4 py-2 border border-red-500/30 bg-red-950/30 hover:bg-red-600 text-red-300 hover:text-white text-caption font-black uppercase tracking-widest transition-all ninja-clip-xs cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" /> Eliminar NPC
                </button>
              )}
            </div>
          )}


          {/* Header section: Image + Details */}
          <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-start mb-8 pb-8 border-b border-oro/10">
            {/* Avatar / Portrait */}
            <div className="w-full md:w-80 lg:w-[350px] h-80 lg:h-[400px] shrink-0 bg-black/60 border border-oro/30 overflow-hidden ninja-clip-md relative flex items-center justify-center shadow-xl">
              {npc.img_url ? (
                <img
                  src={npc.img_url}
                  alt={npc.name}
                  className="w-full h-full object-cover object-top"
                />
              ) : (
                <div className="flex flex-col items-center gap-2 text-oro/20">
                  <User className="w-20 h-20" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Sin Imagen</span>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
            </div>

            {/* Core Info */}
            <div className="flex-1 space-y-4">
              <div>
                {npc.title && (
                  <span className="text-caption font-black text-oro/50 uppercase tracking-[0.3em] block mb-1">
                    {npc.title}
                  </span>
                )}
                <h2 className="ninja-title text-3xl sm:text-5xl text-white leading-tight">
                  {npc.name}
                </h2>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="bg-black/40 border border-oro/10 p-3.5 ninja-clip-xs">
                  <span className="text-[10px] font-black text-oro/30 uppercase tracking-widest block">
                    CLAN / ORIGEN
                  </span>
                  <span className="text-sm font-bold text-oro block mt-0.5 truncate">
                    {npc.clan || 'Desconocido / Ninguno'}
                  </span>
                </div>

                <div className="bg-black/40 border border-oro/10 p-3.5 ninja-clip-xs">
                  <span className="text-[10px] font-black text-oro/30 uppercase tracking-widest block">
                    EDAD
                  </span>
                  <span className="text-sm font-bold text-oro block mt-0.5 truncate">
                    {npc.age || 'Desconocida'}
                  </span>
                </div>
              </div>

              {npc.aldeas && (
                <div className="inline-flex items-center gap-2 bg-oro/5 border border-oro/20 px-3 py-1.5 ninja-clip-xs">
                  <span className="text-[10px] font-black text-oro/60 uppercase tracking-widest">
                    ALDEA: {npc.aldeas.nombre_completo}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Detailed Info Sections */}
          <div className="space-y-6 text-sm">
            {/* Habilidades */}
            {npc.ability && (
              <div className="bg-black/30 border border-oro/10 p-5 space-y-2 ninja-clip-sm">
                <h3 className="text-xs font-black text-oro uppercase tracking-[0.25em]">
                  Habilidades
                </h3>
                <p className="text-oro/80 whitespace-pre-line leading-relaxed text-xs sm:text-sm">
                  {npc.ability}
                </p>
              </div>
            )}

            {/* Historia */}
            {npc.history && (
              <div className="bg-black/30 border border-oro/10 p-5 space-y-2 ninja-clip-sm">
                <h3 className="text-xs font-black text-oro uppercase tracking-[0.25em]">
                  Biografía e Historia
                </h3>
                <p className="text-oro/80 whitespace-pre-line leading-relaxed text-xs sm:text-sm">
                  {npc.history}
                </p>
              </div>
            )}

            {/* Aspecto Físico (Psychic) */}
            {npc.psychic && (
              <div className="bg-black/30 border border-oro/10 p-5 space-y-2 ninja-clip-sm">
                <h3 className="text-xs font-black text-oro uppercase tracking-[0.25em]">
                  Apariencia
                </h3>
                <p className="text-oro/80 whitespace-pre-line leading-relaxed text-xs sm:text-sm">
                  {npc.psychic}
                </p>
              </div>
            )}

            {/* Aspecto Psicológico (Psicologic) */}
            {npc.psicologic && (
              <div className="bg-black/30 border border-oro/10 p-5 space-y-2 ninja-clip-sm">
                <h3 className="text-xs font-black text-oro uppercase tracking-[0.25em]">
                  Personalidad
                </h3>
                <p className="text-oro/80 whitespace-pre-line leading-relaxed text-xs sm:text-sm">
                  {npc.psicologic}
                </p>
              </div>
            )}

            {!npc.ability && !npc.history && !npc.psychic && !npc.psicologic && (
              <div className="py-8 text-center italic text-oro/30 text-xs font-black uppercase tracking-widest">
                Sin información detallada adicional registrada para este NPC.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
