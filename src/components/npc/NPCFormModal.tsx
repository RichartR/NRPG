'use client';

import { useState } from 'react';
import { InfoNPC } from '@/domain/types';
import { X, Save, User, Loader2 } from 'lucide-react';
import { useToastStore } from '@/components/ui/Toast';

interface NPCFormModalProps {
  initialData?: InfoNPC | null;
  aldeaId?: number | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function NPCFormModal({
  initialData,
  aldeaId = null,
  onClose,
  onSaved,
}: NPCFormModalProps) {
  const isEditing = !!initialData?.id;
  const addToast = useToastStore((state) => state.addToast);

  const [name, setName] = useState(initialData?.name || '');
  const [title, setTitle] = useState(initialData?.title || '');
  const [age, setAge] = useState(initialData?.age || '');
  const [clan, setClan] = useState(initialData?.clan || '');
  const [imgUrl, setImgUrl] = useState(initialData?.img_url || '');
  const [ability, setAbility] = useState(initialData?.ability || '');
  const [history, setHistory] = useState(initialData?.history || '');
  const [psychic, setPsychic] = useState(initialData?.psychic || '');
  const [psicologic, setPsicologic] = useState(initialData?.psicologic || '');

  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      addToast('El nombre del NPC es obligatorio', 'error');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        title: title.trim() || null,
        age: age.trim() || null,
        clan: clan.trim() || null,
        img_url: imgUrl.trim() || null,
        ability: ability.trim() || null,
        history: history.trim() || null,
        psychic: psychic.trim() || null,
        psicologic: psicologic.trim() || null,
        aldea_id: initialData ? initialData.aldea_id : aldeaId,
      };

      const url = isEditing ? `/api/npc/${initialData.id}` : '/api/npc';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || 'Error al guardar el NPC');
      }

      addToast(isEditing ? 'NPC actualizado correctamente' : 'NPC creado exitosamente', 'success');
      onSaved();
      onClose();
    } catch (err: any) {
      console.error(err);
      addToast(err.message || 'Error al procesar la solicitud', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/85 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Form Container */}
      <div
        className="bg-neutral-950 border border-oro/30 w-full max-w-3xl max-h-[85vh] shadow-[0_0_80px_rgba(0,0,0,0.9)] animate-in zoom-in-95 my-auto overflow-hidden relative flex flex-col z-10 rounded-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <header className="bg-black/40 p-6 flex items-center justify-between border-b border-oro/10 relative z-10 flex-shrink-0">
          <h2 className="ninja-title text-2xl sm:text-3xl italic text-oro">
            {isEditing ? 'EDITAR PERSONAJE NPC' : 'NUEVO PERSONAJE NPC'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-oro/40 hover:text-naranja-naruto transition-colors p-1 cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
        </header>

        {/* Scrollable Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 relative z-10 custom-scrollbar">

          {/* Fila 1: Nombre y Título */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-caption font-black text-oro/60 uppercase tracking-widest mb-2">
                NOMBRE DEL NPC <span className="text-naranja-naruto">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Jiraiya, Kakashi Hatake..."
                required
                className="ninja-input w-full py-3 text-sm"
              />
            </div>

            <div>
              <label className="block text-caption font-black text-oro/60 uppercase tracking-widest mb-2">
                TÍTULO / CARGO / APODO
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej. El Sabio de los Sapos, Copia Ninja..."
                className="ninja-input w-full py-3 text-sm"
              />
            </div>
          </div>

          {/* Fila 2: Clan, Edad, URL Imagen */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-caption font-black text-oro/60 uppercase tracking-widest mb-2">
                CLAN / ORIGEN
              </label>
              <input
                type="text"
                value={clan}
                onChange={(e) => setClan(e.target.value)}
                placeholder="Ej. Uchiha, Hyūga..."
                className="ninja-input w-full py-3 text-sm"
              />
            </div>

            <div>
              <label className="block text-caption font-black text-oro/60 uppercase tracking-widest mb-2">
                EDAD
              </label>
              <input
                type="text"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="Ej. 25 años, Desconocida..."
                className="ninja-input w-full py-3 text-sm"
              />
            </div>

            <div>
              <label className="block text-caption font-black text-oro/60 uppercase tracking-widest mb-2">
                URL DE LA IMAGEN
              </label>
              <input
                type="text"
                value={imgUrl}
                onChange={(e) => setImgUrl(e.target.value)}
                placeholder="https://i.imgur.com/..."
                className="ninja-input w-full py-3 text-sm"
              />
            </div>
          </div>

          {/* Preview de la imagen si se proporciona */}
          {imgUrl.trim() && (
            <div className="flex items-center gap-4 p-3 bg-black/40 border border-oro/10 ninja-clip-xs">
              <div className="w-14 h-14 bg-black border border-oro/20 overflow-hidden shrink-0 flex items-center justify-center ninja-clip-xs">
                <img src={imgUrl} alt="Preview" className="w-full h-full object-cover" onError={(e) => { (e.target as any).style.display = 'none'; }} />
              </div>
              <span className="text-xs text-oro/40 font-mono truncate">Vista previa de avatar</span>
            </div>
          )}

          {/* Habilidades */}
          <div>
            <label className="block text-caption font-black text-oro/60 uppercase tracking-widest mb-2">
              HABILIDADES Y DESTREZAS (ABILITY)
            </label>
            <textarea
              rows={3}
              value={ability}
              onChange={(e) => setAbility(e.target.value)}
              placeholder="Escribe aquí las habilidades sobresalientes, ninjutsu, taijutsu o características del NPC..."
              className="ninja-input w-full py-3 text-sm resize-none"
            />
          </div>

          {/* Historia */}
          <div>
            <label className="block text-caption font-black text-oro/60 uppercase tracking-widest mb-2">
              BIOGRAFÍA E HISTORIA (HISTORY)
            </label>
            <textarea
              rows={4}
              value={history}
              onChange={(e) => setHistory(e.target.value)}
              placeholder="Resumen histórico, pasado, eventos relevantes..."
              className="ninja-input w-full py-3 text-sm resize-none"
            />
          </div>

          {/* Aspecto Físico (Psychic) */}
          <div>
            <label className="block text-caption font-black text-oro/60 uppercase tracking-widest mb-2">
              ASPECTO FÍSICO Y APARIENCIA (PSYCHIC)
            </label>
            <textarea
              rows={3}
              value={psychic}
              onChange={(e) => setPsychic(e.target.value)}
              placeholder="Descripción del aspecto físico, ropas, cicatrices, altura..."
              className="ninja-input w-full py-3 text-sm resize-none"
            />
          </div>

          {/* Aspecto Psicológico (Psicologic) */}
          <div>
            <label className="block text-caption font-black text-oro/60 uppercase tracking-widest mb-2">
              ASPECTO PSICOLÓGICO Y PERSONALIDAD (PSICOLOGIC)
            </label>
            <textarea
              rows={3}
              value={psicologic}
              onChange={(e) => setPsicologic(e.target.value)}
              placeholder="Rasgos de carácter, temperamento, ideales..."
              className="ninja-input w-full py-3 text-sm resize-none"
            />
          </div>

          {/* Acciones */}
          <div className="flex gap-4 pt-4 border-t border-oro/10">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3.5 bg-black/40 text-oro/60 border border-oro/20 hover:text-oro transition-all font-black text-xs uppercase tracking-widest cursor-pointer"
              style={{ clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)' }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 ninja-btn-oro text-xs font-black uppercase tracking-widest disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Guardando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" /> {isEditing ? 'Guardar Cambios' : 'Crear NPC'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
