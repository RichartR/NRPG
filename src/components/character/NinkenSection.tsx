'use client';

import { useState } from 'react';
import { Sparkles, Edit3, Image as ImageIcon, Check } from 'lucide-react';
import { SectionCard } from '@/components/ui/SectionCard';
import { DataField, SelectField } from '@/components/ui/Fields';
import { Character, AcompananteInfo, PersonajeAcompanante } from '@/domain/types';

interface NinkenSectionProps {
  character: Character;
  companionsList: AcompananteInfo[];
  isEditing: boolean;
  isNew: boolean;
  onUpdateField: (field: keyof Character, value: any) => void;
  addToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

export default function NinkenSection({
  character,
  companionsList,
  isEditing,
  isNew,
  onUpdateField,
  addToast
}: NinkenSectionProps) {
  // 1. Filter Inuzuka companion templates (rama_clan_id = 30)
  const inuzukaTemplates = companionsList.filter(c => Number(c.rama_clan_id) === 30 && c.activo);

  // 2. Determine slot count by rank
  const rankOrder: Record<string, number> = { "D": 1, "C": 2, "B": 3, "A": 4, "S": 5 };
  const charRankVal = rankOrder[character.rango] || 1;
  const maxSlots = charRankVal <= 2 ? 1 : charRankVal === 3 ? 2 : 3;

  const companionOptions = inuzukaTemplates.map(t => ({
    label: t.nombre_jap,
    value: String(t.id)
  }));

  const updateNinken = (slotKey: string, field: 'acompanante_id' | 'nombre_personalizado' | 'url_image_personalizada', value: any) => {
    const list = character.personajes_acompanantes || [];
    let existing = list.find((a: any) => a.origen === slotKey);

    let updated = list.filter((a: any) => a.origen !== slotKey);

    if (existing) {
      existing = {
        ...existing,
        [field]: value
      };
      // If changing companion template id, also update info_acompanantes ref
      if (field === 'acompanante_id') {
        const templateObj = companionsList.find(c => Number(c.id) === Number(value));
        existing.info_acompanantes = templateObj;
      }
      updated.push(existing);
    } else {
      // Create new companion instance
      const templateObj = field === 'acompanante_id' ? companionsList.find(c => Number(c.id) === Number(value)) : undefined;
      const newCompanion: PersonajeAcompanante = {
        personaje_id: character.id,
        acompanante_id: field === 'acompanante_id' ? Number(value) : 0,
        nombre_personalizado: field === 'nombre_personalizado' ? value : null,
        url_image_personalizada: field === 'url_image_personalizada' ? value : null,
        origen: slotKey,
        info_acompanantes: templateObj
      };
      updated.push(newCompanion);
    }

    onUpdateField('personajes_acompanantes', updated);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <SectionCard title="NINKEN (PERROS NINJA)" icon={Sparkles} color="oro">

        {inuzukaTemplates.length === 0 ? (
          <div className="py-12 text-center rounded-[4px] border border-oro/10 bg-black/20 text-xs font-black text-oro/30 uppercase tracking-[0.25em]">
            No hay plantillas de Ninken configuradas en el sistema por el Administrador.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 pt-4">
            {Array.from({ length: maxSlots }).map((_, idx) => {
              const slotKey = `slot_${idx + 1}`;
              const companion = (character.personajes_acompanantes || []).find((a: any) => a.origen === slotKey);

              const templateOptions = inuzukaTemplates.map(t => ({
                label: `${t.nombre_jap} (${t.nombre_esp})`,
                value: String(t.id)
              }));

              const template = inuzukaTemplates.find(t => Number(t.id) === Number(companion?.acompanante_id));
              const displayImage = companion?.url_image_personalizada || companion?.info_acompanantes?.url_default || template?.url_default || '/assets/images/ninken_slot1.webp';
              const displayName = companion?.nombre_personalizado
                ? `${companion.nombre_personalizado} (${template?.nombre_jap || 'Ninken'})`
                : (template?.nombre_jap || `Ninken #${idx + 1}`);

              return (
                <div
                  key={slotKey}
                  className="w-full max-w-[290px] mx-auto flex flex-col items-center group/kakejiku origin-top"
                >

                  {/* Varilla Superior de Madera */}
                  <div className="w-full h-2.5 bg-[#a4795a] rounded-sm shadow-md border-b border-black/40 z-20 relative flex items-center justify-between">
                    {/* Rodillos (Punteras) Sobresalientes de Oro */}
                    <div className="absolute -left-1 w-1 h-3.5 bg-oro rounded-l-full shadow-md border-y border-l border-amber-800/20 shadow-[inset_1px_0_1px_rgba(255,255,255,0.4)]" />
                    <div className="absolute -right-1 w-1 h-3.5 bg-oro rounded-r-full shadow-md border-y border-r border-amber-800/20 shadow-[inset_-1px_0_1px_rgba(255,255,255,0.4)]" />
                  </div>

                  {/* Cuerpo del Pergamino */}
                  <div
                    className="w-full bg-[#e6dfcc] border-x-[6px] border-amber-900/60 shadow-xl flex flex-col relative overflow-hidden transition-all duration-700 ease-out origin-top group-hover/kakejiku:shadow-[0_15px_30px_rgba(45,34,20,0.15)]"
                  >

                    {/* Cabecera del Pergamino */}
                    <div className="px-4 py-2 bg-[#d2c9b4] border-b border-amber-950/20 flex justify-between items-center z-10">
                      <span className="text-[9px] font-black text-amber-950/70 uppercase tracking-[0.25em] flex items-center gap-1.5">
                        <span className="inline-block w-1.5 h-1.5 bg-amber-950/40 rotate-45" />
                        {idx === 0 ? 'D/C-Rank' : idx === 1 ? 'B-Rank' : 'A/S-Rank'}
                      </span>
                      <span className="text-[10px] text-naranja-naruto font-black font-mono">
                        {idx === 0 ? '丙・丁' : idx === 1 ? '乙' : '甲'}
                      </span>
                    </div>

                    {/* Retrato del Ninken */}
                    <div className="aspect-[3/4] w-[92%] mx-auto my-4 relative overflow-hidden border border-amber-950/30 bg-black/80 ninja-clip-sm group-hover/kakejiku:border-oro/40 transition-colors duration-500">
                      {companion?.acompanante_id ? (
                        <>
                          <img
                            src={displayImage}
                            alt={displayName}
                            className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover/kakejiku:scale-105"
                          />
                          {/* Overlay Oscuro */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/30 opacity-70" />

                          {/* Etiqueta de Papel Envejecido Superpuesta (Tanzaku) */}
                          <div className="absolute bottom-3 left-3 bg-[#f2ebd9] text-[#2d2214] border border-amber-900/30 px-2.5 py-1.5 shadow-md ninja-clip-xs max-w-[85%]">
                            <span className="text-xs font-black uppercase tracking-wider block font-serif truncate">
                              {companion.nombre_personalizado || template?.nombre_jap || 'Ninken'}
                            </span>
                            {companion.nombre_personalizado && (
                              <span className="text-[10px] font-black text-amber-900/90 uppercase tracking-widest block font-mono mt-0.5">
                                {template?.nombre_jap || 'Ninken'}
                              </span>
                            )}
                          </div>
                        </>
                      ) : (
                        /* Estado Sellado */
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center bg-black/95">
                          <div className="relative w-14 h-14 flex items-center justify-center mb-2 opacity-45 group-hover/kakejiku:opacity-85 transition-opacity">
                            <div className="absolute inset-0 border border-dashed border-oro/40 rounded-full animate-[spin_30s_linear_infinite]" />
                            <span className="text-oro/50 text-sm font-mono font-bold">封</span>
                          </div>
                          <span className="text-[9px] font-black text-oro/40 uppercase tracking-[0.2em] block">SIN VÍNCULO</span>
                          <span className="text-[8px] text-oro/20 mt-0.5 tracking-wider block uppercase">
                            {idx === 1 ? 'Rango B' : idx === 2 ? 'Rango A/S' : ''}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Controles de Formulario (en modo edición) */}
                    {(isEditing || isNew) && (
                      <div className="px-4 pb-4 space-y-3 border-t border-amber-950/20 pt-3 bg-black/90 text-left">
                        <SelectField
                          label="Seleccionar Tipo"
                          value={companion?.acompanante_id ? String(companion.acompanante_id) : ''}
                          options={companionOptions}
                          disabled={!isEditing && !isNew}
                          placeholder="-- SELECCIONAR TIPO --"
                          onChange={(v) => updateNinken(slotKey, 'acompanante_id', v ? Number(v) : 0)}
                        />

                        {companion?.acompanante_id ? (
                          <>
                            <DataField
                              label="Nombre Personalizado"
                              value={companion.nombre_personalizado || ''}
                              disabled={!isEditing && !isNew}
                              placeholder="Ej: Akamaru"
                              onChange={(v) => updateNinken(slotKey, 'nombre_personalizado', v)}
                            />
                            <DataField
                              label="URL de Imagen Personalizada (Recomendado: 3:4 o 300x400 px)"
                              value={companion.url_image_personalizada || ''}
                              disabled={!isEditing && !isNew}
                              placeholder="https://ejemplo.com/mi-ninken.png"
                              onChange={(v) => updateNinken(slotKey, 'url_image_personalizada', v)}
                            />
                          </>
                        ) : (
                          <div className="py-4 text-center text-xs text-oro/20 font-black uppercase tracking-wider">
                            Selecciona un tipo de acompañante para personalizar
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Varilla Inferior de Madera con Rodillos de Oro */}
                  <div className="w-full h-3 bg-[#a4795a] shadow-lg z-20 relative flex items-center justify-between">
                    {/* Rodillos (Punteras) Sobresalientes de Oro */}
                    <div className="absolute -left-1.5 w-1.5 h-4.5 bg-oro rounded-l-full shadow-md border-y border-l border-amber-800/20 shadow-[inset_1px_0_1px_rgba(255,255,255,0.4)]" />
                    <div className="absolute -right-1.5 w-1.5 h-4.5 bg-oro rounded-r-full shadow-md border-y border-r border-amber-800/20 shadow-[inset_-1px_0_1px_rgba(255,255,255,0.4)]" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
