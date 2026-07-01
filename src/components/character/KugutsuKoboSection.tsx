'use client';

import { useState, useEffect } from 'react';
import { Hammer, Lock, HelpCircle, Sparkles, Check, Trash2, Eye } from 'lucide-react';
import { SectionCard } from '@/components/ui/SectionCard';
import { DataField, SelectField } from '@/components/ui/Fields';
import { Character, AcompananteInfo, PersonajeAcompanante, KugutsuComponente, PersonajeKugutsuComponentes } from '@/domain/types';
import { CharacterService } from '@/services/supabase/character.service';

interface KugutsuKoboSectionProps {
  character: Character;
  companionsList: AcompananteInfo[];
  isEditing: boolean;
  isNew: boolean;
  onUpdateField: (field: keyof Character, value: any) => void;
  addToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

export default function KugutsuKoboSection({
  character,
  companionsList,
  isEditing,
  isNew,
  onUpdateField,
  addToast
}: KugutsuKoboSectionProps) {
  const [catalog, setCatalog] = useState<KugutsuComponente[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);

  // 1. Cargar catálogo de componentes
  useEffect(() => {
    CharacterService.getKugutsuComponents()
      .then(data => {
        console.log("Kugutsu components catalog loaded:", data);
        setCatalog(data);
        setLoadingCatalog(false);
      })
      .catch(err => {
        console.error("Error cargando catálogo de marionetas:", err);
        setLoadingCatalog(false);
      });
  }, []);

  console.log("Catalog status:", { catalogLength: catalog.length, loadingCatalog });

  // 2. Buscar plantilla de acompañante "Kugutsu - Marioneta" (slug = 'kugutsu')
  const kugutsuTemplate = companionsList.find(c => c.slug === 'kugutsu');

  // 3. Determinar ranuras máximas según rango del ninja
  const rankOrder: Record<string, number> = { "D": 2, "C": 4, "B": 6, "A": 8, "S": 10 };
  const maxSlots = rankOrder[character.rango] || 2;

  // 4. Filtrar componentes por tipo para los selectores
  const cuerpos = catalog.filter(c => c.tipo === 'cuerpo');
  const extremidades = catalog.filter(c => c.tipo === 'extremidad');
  const accesorios = catalog.filter(c => c.tipo === 'accesorio');

  // Opciones para los selectores
  const cuerpoOptions = cuerpos.map(c => ({ label: `${c.nombre_esp} (${c.nombre_jap})`, value: String(c.id) }));
  const extremidadOptions = extremidades.map(c => ({ label: `${c.nombre_esp} (${c.nombre_jap})`, value: String(c.id) }));
  const accesorioOptions = accesorios.map(c => ({ label: `${c.nombre_esp} (${c.nombre_jap})`, value: String(c.id) }));

  // Invocación/Ensamblado de marioneta
  const toggleMarionette = (slotKey: string) => {
    if (!kugutsuTemplate) {
      addToast("No se encontró la plantilla 'Kugutsu' en la base de datos", "error");
      return;
    }

    const currentCompanions = character.personajes_acompanantes || [];
    const isAssembled = currentCompanions.some((a: any) => a.origen === slotKey);

    let updatedCompanions = [];
    let updatedComponents = character.personajes_kugutsu_componentes || [];

    if (isAssembled) {
      // Desensamblar: eliminar acompañante y su relación de componentes
      updatedCompanions = currentCompanions.filter((a: any) => a.origen !== slotKey);

      const companionObj = currentCompanions.find((a: any) => a.origen === slotKey);
      if (companionObj) {
        updatedComponents = updatedComponents.filter((c: any) =>
          c.origen !== slotKey && c.personaje_acompanante_id !== companionObj.id
        );
      }
      addToast("Marioneta retirada del taller", "info");
    } else {
      // Ensamblar nueva marioneta
      const newCompanion: PersonajeAcompanante = {
        personaje_id: character.id,
        acompanante_id: kugutsuTemplate.id,
        nombre_personalizado: null,
        url_image_personalizada: null,
        origen: slotKey,
        info_acompanantes: kugutsuTemplate
      };
      updatedCompanions = [...currentCompanions, newCompanion];

      const newComp: PersonajeKugutsuComponentes = {
        personaje_acompanante_id: 0, // se resolverá en el backend
        personaje_id: character.id,
        cuerpo_id: null,
        extremidad_id: null,
        accesorio_id: null,
        origen: slotKey
      };
      updatedComponents = [...updatedComponents, newComp];
      addToast("¡Estructura de marioneta ensamblada!", "success");
    }

    onUpdateField('personajes_acompanantes', updatedCompanions);
    onUpdateField('personajes_kugutsu_componentes', updatedComponents);
  };

  // Actualizar nombre e imagen personalizada
  const updateMarionetteMeta = (slotKey: string, field: 'nombre_personalizado' | 'url_image_personalizada', value: string) => {
    const list = character.personajes_acompanantes || [];
    const updated = list.map((a: any) => {
      if (a.origen === slotKey) {
        return { ...a, [field]: value || null };
      }
      return a;
    });
    onUpdateField('personajes_acompanantes', updated);
  };

  // Actualizar componentes seleccionados
  const updateMarionetteComponent = (slotKey: string, componentType: 'cuerpo_id' | 'extremidad_id' | 'accesorio_id', value: number | null) => {
    console.log("updateMarionetteComponent called:", { slotKey, componentType, value });
    const list = character.personajes_kugutsu_componentes || [];
    const companion = (character.personajes_acompanantes || []).find((a: any) => a.origen === slotKey);

    let existing = list.find((c: any) => c.origen === slotKey || (companion?.id && c.personaje_acompanante_id === companion.id));
    let updated = list.filter((c: any) => c !== existing);

    const componentObj = catalog.find(x => x.id === value);
    const joinField = componentType === 'cuerpo_id' ? 'info_cuerpo' : componentType === 'extremidad_id' ? 'info_extremidad' : 'info_accesorio';

    if (existing) {
      existing = {
        ...existing,
        [componentType]: value,
        [joinField]: componentObj || null,
        origen: slotKey
      };
      updated.push(existing);
    } else {
      const newComp: PersonajeKugutsuComponentes = {
        personaje_acompanante_id: companion?.id || 0,
        personaje_id: character.id,
        [componentType]: value,
        [joinField]: componentObj || null,
        origen: slotKey
      };
      updated.push(newComp);
    }

    console.log("Updated personajes_kugutsu_componentes list:", updated);
    onUpdateField('personajes_kugutsu_componentes', updated);
  };

  console.log("Rendering selectors options:", { cuerpoOptions, extremidadOptions, accesorioOptions });

  return (
    <div className="space-y-8 animate-fade-in">
      <SectionCard title="KUGUTSU KOBO (TALLER DE MARIONETAS)" icon={Hammer} color="oro">
        {loadingCatalog ? (
          <div className="py-12 text-center text-xs font-black text-oro/40 uppercase tracking-widest">
            Cargando componentes del Taller...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 pt-4">
            {Array.from({ length: maxSlots }).map((_, idx) => {
              const slotKey = `kugutsu_${idx + 1}`;
              const companion = (character.personajes_acompanantes || []).find((a: any) => a.origen === slotKey);

              // Buscar componentes asociados
              const components = (character.personajes_kugutsu_componentes || []).find((c: any) =>
                c.origen === slotKey || (companion?.id && c.personaje_acompanante_id === companion.id)
              );

              const isAssembled = !!companion;
              const displayImage = companion?.url_image_personalizada || '/assets/images/kugutsu_placeholder.png';
              const displayName = companion?.nombre_personalizado || 'Kugutsu sin Nombre';

              // Validación de Rango para Accesorio
              const isAccessoryLocked = character.rango === 'D';

              return (
                <div
                  key={slotKey}
                  className="w-full max-w-[360px] mx-auto flex flex-col items-center group/kakejiku origin-top"
                >
                  {/* Varilla Superior */}
                  <div className="w-full h-2.5 bg-[#a4795a] rounded-sm shadow-md border-b border-black/40 z-20 relative flex items-center justify-between">
                    <div className="absolute -left-1 w-1 h-3.5 bg-oro rounded-l-full shadow-md border-y border-l border-amber-800/20 shadow-[inset_1px_0_1px_rgba(255,255,255,0.4)]" />
                    <div className="absolute -right-1 w-1 h-3.5 bg-oro rounded-r-full shadow-md border-y border-r border-amber-800/20 shadow-[inset_-1px_0_1px_rgba(255,255,255,0.4)]" />
                  </div>

                  {/* Lienzo del Pergamino */}
                  <div
                    className={`w-full bg-[#e6dfcc] border-x-[6px] border-amber-900/60 shadow-xl flex flex-col relative overflow-hidden transition-all duration-700 ease-out origin-top group-hover/kakejiku:shadow-[0_15px_30px_rgba(45,34,20,0.15)] ${!isAssembled ? 'min-h-[280px]' : ''}`}
                  >
                    {/* Borde Interno */}
                    <div className="absolute inset-1 border border-amber-950/10 pointer-events-none" />

                    {/* Cabecera del Pergamino */}
                    <div className="px-4 py-2 bg-[#d2c9b4] border-b border-amber-950/20 flex justify-between items-center z-10">
                      <span className="text-[9px] font-black text-amber-950/70 uppercase tracking-[0.25em] flex items-center gap-1.5">
                        <span className="inline-block w-1.5 h-1.5 bg-amber-950/40 rotate-45" />
                        Marioneta #{idx + 1}
                      </span>
                    </div>

                    {isAssembled ? (
                      <>
                        {/* Imagen de la Marioneta (Aspecto apaisado 16/10) */}
                        <div className="aspect-[3/2] w-[94%] mx-auto my-4 relative overflow-hidden border border-amber-950/30 bg-black/80 ninja-clip-sm group-hover/kakejiku:border-oro/40 transition-colors duration-500">
                          <img
                            src={displayImage}
                            alt={displayName}
                            className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover/kakejiku:scale-105"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/30 opacity-70" />

                          {/* Etiqueta Tanzaku */}
                          <div className="absolute bottom-2 left-2 bg-[#f2ebd9] text-[#2d2214] border border-amber-900/30 px-2 py-1 shadow-md ninja-clip-xs max-w-[85%]">
                            <span className="text-[11px] font-black uppercase tracking-wider block font-serif truncate">
                              {displayName}
                            </span>
                          </div>
                        </div>

                        {/* Fila Horizontal de Componentes (Círculos) */}
                        <div className="flex justify-center items-center gap-6 py-4 border-t border-amber-950/10 bg-[#dfd6be]/40">

                          {/* Cuerpo */}
                          <div className="group/tooltip relative flex flex-col items-center">
                            <div className="w-16 h-16 rounded-full border-2 border-amber-900/40 bg-black/40 overflow-hidden flex items-center justify-center shadow-inner group-hover/kakejiku:border-amber-900 transition-colors">
                              {components?.info_cuerpo?.url_image ? (
                                <img src={components.info_cuerpo.url_image} alt="Cuerpo" className="w-full h-full object-cover" />
                              ) : (
                                <HelpCircle className="w-6 h-6 text-amber-950/40" />
                              )}
                            </div>
                            <span className="absolute bottom-full mb-2 hidden group-hover/tooltip:block bg-amber-950 text-oro text-[11px] px-2.5 py-1 rounded shadow-lg whitespace-nowrap z-30">
                              Kugutsu Sōtai: {components?.info_cuerpo?.nombre_jap || 'No elegido'}
                            </span>
                          </div>

                          {/* Extremidades */}
                          <div className="group/tooltip relative flex flex-col items-center">
                            <div className="w-16 h-16 rounded-full border-2 border-amber-900/40 bg-black/40 overflow-hidden flex items-center justify-center shadow-inner group-hover/kakejiku:border-amber-900 transition-colors">
                              {components?.info_extremidad?.url_image ? (
                                <img src={components.info_extremidad.url_image} alt="Extremidades" className="w-full h-full object-cover" />
                              ) : (
                                <HelpCircle className="w-6 h-6 text-amber-950/40" />
                              )}
                            </div>
                            <span className="absolute bottom-full mb-2 hidden group-hover/tooltip:block bg-amber-950 text-oro text-[11px] px-2.5 py-1 rounded shadow-lg whitespace-nowrap z-30">
                              Kugutsu Shishi: {components?.info_extremidad?.nombre_jap || 'No elegido'}
                            </span>
                          </div>

                          {/* Accesorio */}
                          <div className="group/tooltip relative flex flex-col items-center">
                            {isAccessoryLocked ? (
                              <div className="w-16 h-16 rounded-full border-2 border-dashed border-neutral-400 bg-neutral-900/30 flex items-center justify-center text-neutral-500 shadow-inner">
                                <Lock className="w-5 h-5 opacity-80" />
                              </div>
                            ) : (
                              <div className="w-16 h-16 rounded-full border-2 border-amber-900/40 bg-black/40 overflow-hidden flex items-center justify-center shadow-inner group-hover/kakejiku:border-amber-900 transition-colors">
                                {components?.info_accesorio?.url_image ? (
                                  <img src={components.info_accesorio.url_image} alt="Accesorio" className="w-full h-full object-cover" />
                                ) : (
                                  <HelpCircle className="w-6 h-6 text-amber-950/40 animate-pulse" />
                                )}
                              </div>
                            )}
                            <span className="absolute bottom-full mb-2 hidden group-hover/tooltip:block bg-amber-950 text-oro text-[11px] px-2.5 py-1 rounded shadow-lg whitespace-nowrap z-30">
                              {isAccessoryLocked ? 'Bloqueado (Rango D)' : `Kakushi Karakuri: ${components?.info_accesorio?.nombre_jap || 'No elegido'}`}
                            </span>
                          </div>

                        </div>

                        {/* Controles de Ensamblado (Edición) */}
                        {(isEditing || isNew) && (
                          <div className="px-4 pb-4 space-y-3 border-t border-amber-950/20 pt-3 bg-black/90 text-left">
                            <DataField
                              label="Nombre de Marioneta"
                              value={companion.nombre_personalizado || ''}
                              placeholder="Ej: Karasu"
                              onChange={(v) => updateMarionetteMeta(slotKey, 'nombre_personalizado', v)}
                            />

                            <DataField
                              label="URL de Imagen (Recomendado: 3:2 o 450x300 px)"
                              value={companion.url_image_personalizada || ''}
                              placeholder="https://ejemplo.com/marioneta.png"
                              onChange={(v) => updateMarionetteMeta(slotKey, 'url_image_personalizada', v)}
                            />

                            <SelectField
                              label="Kugutsu Sōtai (Cuerpo)"
                              value={components?.cuerpo_id ? String(components.cuerpo_id) : ''}
                              options={cuerpoOptions}
                              placeholder="-- SELECCIONAR CUERPO --"
                              onChange={(v) => updateMarionetteComponent(slotKey, 'cuerpo_id', v ? Number(v) : null)}
                            />

                            <SelectField
                              label="Kugutsu Shishi (Extremidades)"
                              value={components?.extremidad_id ? String(components.extremidad_id) : ''}
                              options={extremidadOptions}
                              placeholder="-- SELECCIONAR EXTREMIDADES --"
                              onChange={(v) => updateMarionetteComponent(slotKey, 'extremidad_id', v ? Number(v) : null)}
                            />

                            {!isAccessoryLocked && (
                              <SelectField
                                label="Kakushi Karakuri (Accesorio Oculto)"
                                value={components?.accesorio_id ? String(components.accesorio_id) : ''}
                                options={accesorioOptions}
                                placeholder="-- SELECCIONAR ACCESORIO --"
                                onChange={(v) => updateMarionetteComponent(slotKey, 'accesorio_id', v ? Number(v) : null)}
                              />
                            )}
                          </div>
                        )}
                      </>
                    ) : (
                      /* Estado Vacío / Sin Ensamblar */
                      <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center bg-black/95">
                        <div className="relative w-14 h-14 flex items-center justify-center mb-2 opacity-45 group-hover/kakejiku:opacity-85 transition-opacity">
                          <div className="absolute inset-0 border border-dashed border-oro/40 rounded-full animate-[spin_30s_linear_infinite]" />
                          <span className="text-oro/50 text-sm font-mono font-bold">空</span>
                        </div>
                        <span className="text-[9px] font-black text-oro/40 uppercase tracking-[0.2em] block">SIN MARIONETA</span>

                        {(isEditing || isNew) ? (
                          <button
                            type="button"
                            onClick={() => toggleMarionette(slotKey)}
                            className="mt-4 flex items-center gap-1.5 py-1 px-3 bg-amber-800 hover:bg-amber-700 text-oro text-[9px] font-black uppercase tracking-widest rounded border border-oro/20 transition-all"
                          >
                            <Hammer className="w-3 h-3" />
                            CONSTRUIR MARIONETA
                          </button>
                        ) : (
                          <span className="text-[8px] text-oro/25 mt-0.5 tracking-wider block uppercase">
                            Ranura Disponible
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Varilla Inferior */}
                  <div className="w-full h-3 bg-[#a4795a] shadow-lg z-20 relative flex items-center justify-between">
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
