'use client';

import {
  User, Briefcase, Zap, Save,
  Sword, Swords, ScrollText, GitBranch, UserCircle, X, Heart, Trash2, Edit3,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  Coins,
  Search,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import Breadcrumbs from '@/components/ui/Breadcrumbs';
import { CharacterService } from '@/services/supabase/character.service';
import { ProfileService } from '@/services/supabase/profile.service';
import { MasterService } from '@/services/supabase/master.service';
import { SectionCard } from '@/components/ui/SectionCard';
import { DataField, SelectField, SearchableSelect, NinjaSelect, FormEditContext } from '@/components/ui/Fields';
import { Character, CharacterStats, Glosario, PersonajeItem, PersonajeTecnica, Registro, Rasgo } from '@/domain/types';
import { useToastStore } from '@/components/ui/Toast';
import { useConfirmStore } from '@/components/ui/ConfirmDialog';
import RegistroCard from '@/components/registros/RegistroCard';
import MissionTable from '@/components/registros/MissionTable';
import { PaginationPageInput } from '@/components/ui/PaginationPageInput';
import { PaginationContainer } from '@/components/ui/PaginationContainer';
import ActionTable from '@/components/registros/ActionTable';
import CombatTable from '@/components/registros/CombatTable';
import MissionForm from '@/components/registros/MissionForm';
import CombatForm from '@/components/registros/CombatForm';
import { CharacterRadarChart } from './CharacterRadarChart';
import { useState, useMemo, useEffect, Fragment } from 'react';
import { resolveAldeaIcono } from '@/utils/aldea-icon';
import { createClient } from '@/utils/supabase/client';
import { searchAny } from '@/lib/utils/search';

interface CharacterSheetViewProps {
  character: Character;
  originalCharacter?: Character | null;
  masters: any; // Masters still contains mixed data, but we'll tipify its usage
  glosarioFiltrado: Glosario[];
  isEditing: boolean;
  canEdit: boolean;
  activeTab: string;
  saving: boolean;
  isAdmin?: boolean;
  isNew?: boolean;
  onUpdateField: (field: keyof Character, value: any) => void;
  onUpdateStat: (stat: keyof CharacterStats, value: number) => void;
  onSave: (section?: 'apariencia' | 'historia') => void | Promise<void>;
  onCancel: () => void;
  onDelete?: (force?: boolean) => void | Promise<void>;
  onRestore?: () => void | Promise<void>;
  onSetActiveTab: (tab: string) => void;
  onBack: () => void;
  onRefresh?: () => void;
  setIsEditing?: (val: boolean) => void;
  freeResetPeriod?: boolean;
  onResetCharacter?: () => Promise<void>;
}

export function CharacterSheetView({
  character,
  originalCharacter,
  masters,
  glosarioFiltrado,
  isEditing,
  canEdit,
  activeTab,
  saving,
  isNew = false,
  isAdmin = false,
  onUpdateField,
  onUpdateStat,
  onSave,
  onCancel,
  onDelete,
  onRestore,
  onSetActiveTab,
  onBack,
  onRefresh,
  setIsEditing,
  freeResetPeriod = false,
  onResetCharacter
}: CharacterSheetViewProps) {
  const addToast = useToastStore(state => state.addToast);
  const { confirm: confirmAction } = useConfirmStore();

  const handleResetClick = async () => {
    if (!onResetCharacter) return;

    const message = freeResetPeriod
      ? '¿ESTÁS SEGURO? Estás en periodo de RESETEO GRATUITO. Empezarás desde 0 pero mantendrás el 100% de tus recursos (Experiencia, Ryous, PA y Monedas de Evento). Los clanes, técnicas, entrenamientos y aldea se resetearán.'
      : '¿ESTÁS SEGURO? El reseteo tiene un COSTE DEL 25% DE LOS RECURSOS. Perderás el 25% de tu Experiencia, Ryous, PA y Monedas de Evento. Los clanes, técnicas, entrenamientos y aldea se resetearán. Esta acción es irreversible.';

    const ok = await confirmAction({
      title: 'Reiniciar Personaje',
      message,
      variant: 'danger',
      confirmLabel: 'Reiniciar Personaje',
      requireValidation: true,
      validationWord: 'Reiniciar'
    });

    if (ok) {
      await onResetCharacter();
    }
  };
  const [mounted, setMounted] = useState(false);
  const [eventCoinName, setEventCoinName] = useState('Monedas de Evento');

  const [rasgosList, setRasgosList] = useState<Rasgo[]>([]);
  const [activeTeam, setActiveTeam] = useState<any>(null);
  const [inventorySearch, setInventorySearch] = useState('');
  const [equipmentSearch, setEquipmentSearch] = useState('');
  const [techniqueSearch, setTechniqueSearch] = useState('');
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setMounted(true);
    const supabase = createClient();

    const fetchEventCoinName = async () => {
      try {
        const val = await MasterService.getSystemConfig('moneda_evento_nombre');
        if (val) setEventCoinName(val);
      } catch (err) {
        console.error("Error fetching event coin name in CharacterSheetView:", err);
      }
    };
    const fetchRasgos = async () => {
      try {
        const data = await CharacterService.getRasgos();
        setRasgosList(data);
      } catch (err) {
        console.error("Error fetching rasgos in CharacterSheetView:", err);
      }
    };
    const fetchActiveTeam = async () => {
      if (!character?.id) return;
      try {
        const { data, error } = await supabase
          .from('reg_equipos_ninja')
          .select(`
            id,
            nombre_equipo,
            fecha_creacion,
            lider:lider_id(nombre_ninja),
            integrante_1:integrante_1_id(nombre_ninja),
            integrante_2:integrante_2_id(nombre_ninja),
            integrante_3:integrante_3_id(nombre_ninja)
          `)
          .eq('activo', true)
          .or(`lider_id.eq.${character.id},integrante_1_id.eq.${character.id},integrante_2_id.eq.${character.id},integrante_3_id.eq.${character.id}`)
          .maybeSingle();

        if (error) throw error;
        setActiveTeam(data || null);
      } catch (err) {
        console.error("Error fetching active team in CharacterSheetView:", err);
      }
    };

    fetchEventCoinName();
    fetchRasgos();
    fetchActiveTeam();
  }, [character?.id]);

  // Synchronize auto-assigned traits based on character's branches, clans, and rank
  useEffect(() => {
    if (!rasgosList || rasgosList.length === 0 || !masters.ramas || !character) return;

    // 1. Calculate active clan/rama traits
    const activeRamaIds = (character.personajes_ramas || []).map((pr: any) => pr.rama_id).filter(Boolean);
    const autoTraits: Rasgo[] = [];
    activeRamaIds.forEach(id => {
      const rama = masters.ramas.find((r: any) => r.id === id);
      if (rama && rama.rasgo_id) {
        const rasgo = rasgosList.find(r => r.id === rama.rasgo_id);
        if (rasgo) autoTraits.push(rasgo);
      }
    });

    // 2. Filter autoTraits based on character rank limits
    const rankOrder = masters.rankOrder || { "D": 1, "C": 2, "B": 3, "A": 4, "S": 5 };
    const charRankVal = rankOrder[character.rango] || 1;

    const validAutoTraits = autoTraits.filter(t => {
      const reqRankVal = rankOrder[t.rango] || 1;
      return charRankVal >= reqRankVal;
    });

    // 3. Find authorized special traits
    const authorizedSpecialTraits = rasgosList.filter(r => r.especial && r.personajes?.includes(character.id));

    // 4. Make sure all validAutoTraits and authorizedSpecialTraits are present in character.personajes_rasgos
    const currentRasgos = character.personajes_rasgos || [];
    let updatedRasgos = [...currentRasgos];
    let hasChanges = false;

    // Add missing auto-assigned traits
    validAutoTraits.forEach(at => {
      if (!updatedRasgos.some(ur => Number(ur.rasgo_id) === Number(at.id))) {
        updatedRasgos.push({
          personaje_id: character.id,
          rasgo_id: at.id,
          info_rasgos: at
        });
        hasChanges = true;
      }
    });

    // Add missing authorized special traits
    authorizedSpecialTraits.forEach(st => {
      if (!updatedRasgos.some(ur => Number(ur.rasgo_id) === Number(st.id))) {
        updatedRasgos.push({
          personaje_id: character.id,
          rasgo_id: st.id,
          info_rasgos: st
        });
        hasChanges = true;
      }
    });

    // Remove auto-assigned traits that are no longer valid (e.g. branch removed or rank too low)
    const allAutoTraitIds = masters.ramas.map((r: any) => r.rasgo_id).filter(Boolean);

    updatedRasgos = updatedRasgos.filter(ur => {
      const isAutoInSystem = allAutoTraitIds.includes(ur.rasgo_id);
      if (isAutoInSystem) {
        const isValid = validAutoTraits.some(at => Number(at.id) === Number(ur.rasgo_id));
        if (!isValid) {
          hasChanges = true;
          return false;
        }
      }

      // Automatically remove special traits if the character is no longer authorized
      const isSpecialInDb = ur.info_rasgos?.especial;
      if (isSpecialInDb) {
        const isStillAuthorized = authorizedSpecialTraits.some(st => Number(st.id) === Number(ur.rasgo_id));
        if (!isStillAuthorized) {
          hasChanges = true;
          return false;
        }
      }

      return true;
    });

    if (hasChanges) {
      onUpdateField('personajes_rasgos', updatedRasgos);
    }
  }, [character?.personajes_ramas, character?.rango, rasgosList, masters.ramas]);

  const [occupancy, setOccupancy] = useState<{
    countByAldea: Record<number, number>;
    countByClan: Record<number, number>;
    cuposMaximosAldea: number;
    cuposMaximosOrganizacion: number;
  }>({
    countByAldea: {},
    countByClan: {},
    cuposMaximosAldea: 10,
    cuposMaximosOrganizacion: 10
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    fetch('/api/characters/occupancy')
      .then(res => res.json())
      .then(data => {
        if (data && !data.error) {
          setOccupancy(data);
        }
      })
      .catch(err => console.error("Error fetching occupancy in CharacterSheetView:", err));
  }, [isEditing, isNew]);

  // ESTRUCTURA DE ALINEACIÓN AUTOMÁTICA DE ELEMENTOS DE NINJUTSU CON LOS DEL CLAN
  useEffect(() => {
    if (!character?.personajes_ramas || !masters.ramaElementos || !masters.elementos || !masters.subEspecialidades) return;

    let hasChanges = false;
    const newRamas = character.personajes_ramas.map((pr: any) => {
      const clanInfo = pr ? (pr.info_ramas_clanes || (masters.ramas || []).find((r: any) => r.id === Number(pr.rama_id))) : null;
      const isClanElemental = clanInfo?.config_iniciales?.clan_elemental === true;
      const clanEleccion = character.eleccion_tecnicas_clan;

      const hasNinjutsu = Number(pr.rama_id) === 4 && pr.sub_especialidad_id;
      const hasClanNinjutsu = isClanElemental && clanEleccion && Number(clanEleccion.rama_id) === 4 && clanEleccion.sub_especialidad_id;

      if (hasNinjutsu || hasClanNinjutsu) {
        let subEspecialidadId = pr.sub_especialidad_id;
        if (Number(pr.rama_id) === 4 && clanEleccion && Number(clanEleccion.rama_id) === 4 && clanEleccion.sub_especialidad_id) {
          const mainSub = masters.subEspecialidades.find((s: any) => s.id === pr.sub_especialidad_id);
          const clanSub = masters.subEspecialidades.find((s: any) => s.id === clanEleccion.sub_especialidad_id);
          const getVal = (slug: string) => slug === 'ninjutsu-iii' ? 3 : slug === 'ninjutsu-ii' ? 2 : slug === 'ninjutsu-i' ? 1 : 0;
          if (clanSub && getVal(clanSub.slug || '') > getVal(mainSub?.slug || '')) {
            subEspecialidadId = clanEleccion.sub_especialidad_id;
          }
        } else if (!hasNinjutsu && hasClanNinjutsu) {
          subEspecialidadId = clanEleccion?.sub_especialidad_id;
        }

        const subEsp = masters.subEspecialidades.find((s: any) => s.id === subEspecialidadId);
        if (!subEsp) return pr;

        const isNinI = subEsp.slug === 'ninjutsu-i';
        const isNinII = subEsp.slug === 'ninjutsu-ii';
        const isNinIII = subEsp.slug === 'ninjutsu-iii';

        const S = isNinI ? 1 : isNinII ? 2 : isNinIII ? 3 : 0;
        if (S === 0) return pr;

        // Calcular elementos fijos de la otra rama/clan o de este clan si es elemental
        const otherSlot = Number(pr.slot) === 1 ? 2 : 1;
        const otherPr = character.personajes_ramas?.find((r: any) => Number(r.slot) === otherSlot);
        let poolFijoBasico: any[] = [];
        if (masters.ramaElementos) {
          poolFijoBasico = masters.ramaElementos
            .filter((re: any) =>
              re.tipo === 'fijo' &&
              re.info_elementos?.tipo === 'basico' &&
              (
                // Elemento fijo de la rama de este slot (ej: si es clan elemental)
                re.rama_id === Number(pr.rama_id) ||
                // Elemento fijo de la otra rama
                (otherPr && re.rama_id === Number(otherPr.rama_id)) ||
                // Elemento fijo por elección de clan
                (clanEleccion && re.rama_id === Number(clanEleccion.rama_id))
              )
            )
            .map((re: any) => re.info_elementos)
            .filter(Boolean);
        }

        const N = poolFijoBasico.length;

        let expectedPrincipal = pr.elemento_principal_id || null;
        let expectedSecundario = pr.elemento_secundario_id || null;
        let expectedTerciario = pr.elemento_terciario_id || null;

        if (S === 1) {
          if (N === 1) {
            const fixedId = poolFijoBasico[0]?.id || null;
            if (expectedPrincipal !== fixedId) {
              expectedPrincipal = fixedId;
              hasChanges = true;
            }
          } else if (N > 1) {
            const poolIds = poolFijoBasico.map((el: any) => el.id);
            if (!expectedPrincipal || !poolIds.includes(expectedPrincipal)) {
              expectedPrincipal = poolIds[0];
              hasChanges = true;
            }
          }
          expectedSecundario = null;
          expectedTerciario = null;
        } else if (S === 2) {
          expectedTerciario = null;
          if (N === 1) {
            // Si solo tiene 1 fijo, se pone sí o sí como principal
            const fixedId = poolFijoBasico[0]?.id || null;
            if (expectedPrincipal !== fixedId) {
              expectedPrincipal = fixedId;
              hasChanges = true;
            }
            if (expectedSecundario === expectedPrincipal && expectedSecundario !== null) {
              expectedSecundario = null;
              hasChanges = true;
            }
          } else if (N === 2) {
            // Si tiene 2 fijos, ambos deben ser elegidos pero el orden entre ellos es libre
            const fixed1 = poolFijoBasico[0]?.id || null;
            const fixed2 = poolFijoBasico[1]?.id || null;
            if (expectedPrincipal !== fixed1 && expectedPrincipal !== fixed2) {
              expectedPrincipal = fixed1;
              expectedSecundario = fixed2;
              hasChanges = true;
            } else {
              const otherFixed = expectedPrincipal === fixed1 ? fixed2 : fixed1;
              if (expectedSecundario !== otherFixed) {
                expectedSecundario = otherFixed;
                hasChanges = true;
              }
            }
          } else if (N > 2) {
            const poolIds = poolFijoBasico.map((el: any) => el.id);
            const pInPool = expectedPrincipal && poolIds.includes(expectedPrincipal);
            const sInPool = expectedSecundario && poolIds.includes(expectedSecundario);
            const areDistinct = expectedPrincipal !== expectedSecundario;
            if (pInPool && sInPool && areDistinct) {
              // Keep
            } else {
              expectedPrincipal = poolIds[0];
              expectedSecundario = poolIds[1];
              hasChanges = true;
            }
          }
        } else if (S === 3) {
          if (N === 1) {
            // Si solo tiene 1 fijo, se pone sí o sí como principal
            const fixedId = poolFijoBasico[0]?.id || null;
            if (expectedPrincipal !== fixedId) {
              expectedPrincipal = fixedId;
              hasChanges = true;
            }
            if (expectedSecundario === expectedPrincipal && expectedSecundario !== null) {
              expectedSecundario = null;
              hasChanges = true;
            }
            if (expectedTerciario === expectedPrincipal || expectedTerciario === expectedSecundario) {
              expectedTerciario = null;
              hasChanges = true;
            }
          } else if (N === 2) {
            // Caso de Nin III con 2 fijos: los fijos pueden elegirse en Principal o Secundario (orden libre entre ellos)
            const fixed1 = poolFijoBasico[0]?.id || null;
            const fixed2 = poolFijoBasico[1]?.id || null;
            if (expectedPrincipal !== fixed1 && expectedPrincipal !== fixed2) {
              expectedPrincipal = fixed1;
              expectedSecundario = fixed2;
              hasChanges = true;
            } else {
              const otherFixed = expectedPrincipal === fixed1 ? fixed2 : fixed1;
              if (expectedSecundario !== otherFixed) {
                expectedSecundario = otherFixed;
                hasChanges = true;
              }
            }

            // El tercero es libre
            if (expectedTerciario === fixed1 || expectedTerciario === fixed2) {
              expectedTerciario = null;
              hasChanges = true;
            }
          } else if (N >= 3) {
            const poolIds = poolFijoBasico.map((el: any) => el.id);
            const pInPool = expectedPrincipal && poolIds.includes(expectedPrincipal);
            const sInPool = expectedSecundario && poolIds.includes(expectedSecundario);
            const tInPool = expectedTerciario && poolIds.includes(expectedTerciario);
            const areDistinct = expectedPrincipal !== expectedSecundario && expectedPrincipal !== expectedTerciario && expectedSecundario !== expectedTerciario;
            if (pInPool && sInPool && tInPool && areDistinct) {
              // Keep
            } else {
              expectedPrincipal = poolIds[0];
              expectedSecundario = poolIds[1];
              expectedTerciario = poolIds[2];
              hasChanges = true;
            }
          }
        }

        if (
          pr.elemento_principal_id !== expectedPrincipal ||
          pr.elemento_secundario_id !== expectedSecundario ||
          pr.elemento_terciario_id !== expectedTerciario
        ) {
          return {
            ...pr,
            elemento_principal_id: expectedPrincipal,
            elemento_secundario_id: expectedSecundario,
            elemento_terciario_id: expectedTerciario
          };
        }
      }
      return pr;
    });

    if (hasChanges) {
      onUpdateField('personajes_ramas', newRamas);
    }
  }, [
    character?.personajes_ramas,
    masters.ramaElementos,
    masters.elementos,
    masters.subEspecialidades
  ]);

  const { fixedSentidos, poolSelectables, isSelectableAvailable } = useMemo(() => {
    if (!character?.personajes_ramas || !masters.ramaSentidos || !masters.sentidos) {
      return { fixedSentidos: [], poolSelectables: [], isSelectableAvailable: false };
    }

    const charRamas = character.personajes_ramas || [];
    const activeRamaIds = charRamas.map((pr: any) => Number(pr.rama_id)).filter(Boolean);
    const activeSubIds = charRamas.map((pr: any) => Number(pr.sub_especialidad_id)).filter(Boolean);

    const fijosSet = new Set<number>();
    masters.ramaSentidos
      .filter((rs: any) =>
        rs.tipo === 'fijo' &&
        (
          (rs.rama_id && activeRamaIds.includes(Number(rs.rama_id))) ||
          (rs.sub_especialidad_id && activeSubIds.includes(Number(rs.sub_especialidad_id)))
        )
      )
      .forEach((rs: any) => {
        if (rs.sentido_id) fijosSet.add(Number(rs.sentido_id));
      });

    const selectablesSet = new Set<number>();
    masters.ramaSentidos
      .filter((rs: any) =>
        rs.tipo === 'seleccionable' &&
        (
          (rs.rama_id && activeRamaIds.includes(Number(rs.rama_id))) ||
          (rs.sub_especialidad_id && activeSubIds.includes(Number(rs.sub_especialidad_id)))
        )
      )
      .forEach((rs: any) => {
        if (rs.sentido_id) selectablesSet.add(Number(rs.sentido_id));
      });

    const fixed = Array.from(fijosSet).map(id => masters.sentidos.find((s: any) => s.id === id)).filter(Boolean);
    const pool = Array.from(selectablesSet).map(id => masters.sentidos.find((s: any) => s.id === id)).filter(Boolean);

    return {
      fixedSentidos: fixed,
      poolSelectables: pool,
      isSelectableAvailable: pool.length > 0 && fixed.length === 0
    };
  }, [character?.personajes_ramas, masters.ramaSentidos, masters.sentidos]);

  // ESTRUCTURA DE ALINEACIÓN AUTOMÁTICA DE SENTIDOS AVANZADOS
  const sentidosSignature = JSON.stringify(character?.personajes_sentidos?.map(s => [s.sentido_id, s.origen]) || []);
  useEffect(() => {
    if (!character?.personajes_ramas || !masters.ramaSentidos || !masters.sentidos) return;

    const charRamas = character.personajes_ramas || [];
    const activeRamaIds = charRamas.map((pr: any) => Number(pr.rama_id)).filter(Boolean);
    const activeSubIds = charRamas.map((pr: any) => Number(pr.sub_especialidad_id)).filter(Boolean);

    // 1. Obtener sentidos fijos
    const fijosSet = new Set<number>();
    masters.ramaSentidos
      .filter((rs: any) =>
        rs.tipo === 'fijo' &&
        (
          (rs.rama_id && activeRamaIds.includes(Number(rs.rama_id))) ||
          (rs.sub_especialidad_id && activeSubIds.includes(Number(rs.sub_especialidad_id)))
        )
      )
      .forEach((rs: any) => {
        if (rs.sentido_id) fijosSet.add(Number(rs.sentido_id));
      });

    const fixedSentidosIds = Array.from(fijosSet);

    // 2. Obtener pool de sentidos seleccionables
    const selectablesSet = new Set<number>();
    masters.ramaSentidos
      .filter((rs: any) =>
        rs.tipo === 'seleccionable' &&
        (
          (rs.rama_id && activeRamaIds.includes(Number(rs.rama_id))) ||
          (rs.sub_especialidad_id && activeSubIds.includes(Number(rs.sub_especialidad_id)))
        )
      )
      .forEach((rs: any) => {
        if (rs.sentido_id) selectablesSet.add(Number(rs.sentido_id));
      });

    const poolSelectablesIds = Array.from(selectablesSet);

    const currentSentidos = character.personajes_sentidos || [];
    let updatedSentidos = [...currentSentidos];
    let hasChanges = false;

    if (fixedSentidosIds.length > 0) {
      // Si tiene fijos, SOLO puede tener los fijos.
      const currentFixedIds = currentSentidos.filter((cs: any) => cs.origen === 'fijo').map((cs: any) => Number(cs.sentido_id));
      const currentSelectableIds = currentSentidos.filter((cs: any) => cs.origen === 'seleccionable').map((cs: any) => Number(cs.sentido_id));

      const needsFixedUpdate = fixedSentidosIds.some(id => !currentFixedIds.includes(id)) || currentFixedIds.some(id => !fixedSentidosIds.includes(id));
      const hasSelectables = currentSelectableIds.length > 0;

      if (needsFixedUpdate || hasSelectables) {
        updatedSentidos = fixedSentidosIds.map(id => ({
          personaje_id: character.id,
          sentido_id: id,
          origen: 'fijo',
          info_sentidos: masters.sentidos.find((s: any) => s.id === id)
        }));
        hasChanges = true;
      }
    } else if (poolSelectablesIds.length > 0) {
      // Si no tiene fijos pero tiene seleccionables:
      const currentFixedIds = currentSentidos.filter((cs: any) => cs.origen === 'fijo');
      const selectables = currentSentidos.filter((cs: any) => cs.origen === 'seleccionable');

      // Validar que el sentido seleccionado pertenezca al pool actual
      const validSelectables = selectables.filter((cs: any) => poolSelectablesIds.includes(Number(cs.sentido_id)));

      if (currentFixedIds.length > 0 || selectables.length !== validSelectables.length || validSelectables.length > 1) {
        if (validSelectables.length > 0) {
          updatedSentidos = [validSelectables[0]];
        } else {
          updatedSentidos = [];
        }
        hasChanges = true;
      }
    } else {
      // No tiene fijos ni seleccionables
      if (currentSentidos.length > 0) {
        updatedSentidos = [];
        hasChanges = true;
      }
    }

    if (hasChanges) {
      onUpdateField('personajes_sentidos', updatedSentidos);
    }
  }, [
    character?.personajes_ramas,
    masters.ramaSentidos,
    masters.sentidos,
    sentidosSignature
  ]);

  const aldeaOptions = useMemo(() => {
    return (masters.aldeas || []).map((a: any) => {
      const activeCount = occupancy.countByAldea[a.id] || 0;
      const isOrganizacion = a.categoria_id === 2;
      const limit = isOrganizacion ? occupancy.cuposMaximosOrganizacion : occupancy.cuposMaximosAldea;

      const isOriginalAldea = !isNew && originalCharacter?.aldea_id === a.id;
      const isFull = activeCount >= limit;
      const shouldDisable = isFull && !isOriginalAldea;

      const label = `${a.nombre_completo}\n(${activeCount}/${limit} cupos)${shouldDisable ? ' - LLENO' : ''}`;
      return {
        label,
        value: a.id,
        disabled: shouldDisable
      };
    });
  }, [masters.aldeas, occupancy, originalCharacter, isNew]);

  const getClanOptions = (slot: number) => {
    const filteredRamas = (masters.ramas || []).filter((r: any) => !r.aldea_id || Number(r.aldea_id) === Number(character.aldea_id));
    const otherSlot = slot === 1 ? 2 : 1;
    const otherPr = character.personajes_ramas?.find((r: any) => Number(r.slot) === otherSlot);
    const otherRama = otherPr ? (masters.ramas || []).find((r: any) => r.id === Number(otherPr.rama_id)) : null;
    const otherIsClan = otherRama?.tipo === 'clan';

    return filteredRamas.map((r: any) => {
      const isClan = r.tipo === 'clan';
      if (!isClan) {
        return {
          label: r.nombre,
          value: r.id,
          disabled: false
        };
      }

      const activeCount = occupancy.countByClan[r.id] || 0;
      const C = occupancy.cuposMaximosAldea;
      const limit = (r.es_especial ? 2 : 4) + Math.floor((C - 10) / 5);

      const isOriginalClan = !isNew && originalCharacter?.personajes_ramas?.some((pr: any) => pr.rama_id === r.id);
      const isFull = activeCount >= limit;
      const shouldDisable = (isFull && !isOriginalClan) || otherIsClan;

      const tagEspecial = r.es_especial ? ' [Especial]' : '';
      let label = `${r.nombre}${tagEspecial}\n(${activeCount}/${limit} cupos)${isFull && !isOriginalClan ? ' - LLENO' : ''}`;
      if (otherIsClan) {
        label = `${r.nombre}${tagEspecial} - LÍMITE DE 1 CLAN`;
      }

      return {
        label,
        value: r.id,
        disabled: shouldDisable
      };
    });
  };

  // Cálculos Memoizados para evitar trabajo redundante en cada render
  const { allRegistros, totalExp, totalRyous, missionCounts, totalPuntosCombate } = useMemo(() => {
    const allRegistrosMap = new Map<number, Registro>();
    [
      ...(character.registros_autor || []),
      ...(character.registros_participante?.map((p: any) => p.registro).filter(Boolean) || [])
    ].forEach((r: Registro) => allRegistrosMap.set(r.id, r));

    const allRegs = Array.from(allRegistrosMap.values()).sort((a, b) =>
      new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
    );
    const missions = allRegs.filter(r => r.tipo === 'mision');

    // Filtrar solo los registros que han sido formalmente aceptados para este personaje
    const acceptedRegs = allRegs.filter(r => {
      const p = r.participantes?.find(part => Number(part.personaje_id) === Number(character.id));
      return p?.estado === 'aceptado';
    });

    const totalExpSpent = acceptedRegs.reduce((sum, r) => sum + (r.data?.gasto_xp || 0), 0);
    const totalRyousSpent = acceptedRegs.reduce((sum, r) => sum + (r.data?.gasto_ryous || 0), 0);
    const totalPASpent = acceptedRegs.reduce((sum, r) => sum + (r.data?.gasto_pc || 0), 0);

    // Calcular recursos no guardados (en edición) para mantener estables los totales
    const addedItems = (character.personajes_inventario || [])
      .filter(ci => !ci.info_glosario?.inicial)
      .filter(ci => !(originalCharacter?.personajes_inventario || []).some(oi => Number(oi.item_id) === Number(ci.item_id)));
    const addedTecs = (character.personajes_tecnicas || [])
      .filter(ct => !ct.info_glosario?.inicial)
      .filter(ct => !(originalCharacter?.personajes_tecnicas || []).some(ot => Number(ot.tecnica_id) === Number(ct.tecnica_id)));

    const unsavedExpSpent =
      addedItems.reduce((sum, i) => sum + (i.info_glosario?.coste_exp || 0), 0) +
      addedTecs.reduce((sum, t) => sum + (t.info_glosario?.coste_exp || 0), 0);

    const unsavedRyousSpent =
      addedItems.reduce((sum, i) => sum + (i.info_glosario?.coste_ryous || 0), 0) +
      addedTecs.reduce((sum, t) => sum + (t.info_glosario?.coste_ryous || 0), 0);

    const unsavedPASpent =
      addedItems.reduce((sum, i) => sum + (i.info_glosario?.coste_puntos_aprendizaje || 0), 0) +
      addedTecs.reduce((sum, t) => sum + (t.info_glosario?.coste_puntos_aprendizaje || 0), 0);

    return {
      allRegistros: allRegs,
      totalExp: (character.xp || 0) + totalExpSpent + unsavedExpSpent,
      totalRyous: (character.ryous || 0) + totalRyousSpent + unsavedRyousSpent,
      totalPuntosCombate: (character.puntos_aprendizaje || 0) + totalPASpent + unsavedPASpent,
      missionCounts: {
        D: missions.filter(m => m.subtipo === 'D').length,
        C: missions.filter(m => m.subtipo === 'C').length,
        B: missions.filter(m => m.subtipo === 'B').length,
        A: missions.filter(m => m.subtipo === 'A').length,
        S: missions.filter(m => m.subtipo === 'S').length,
      }
    };
  }, [
    character.id,
    character.xp,
    character.ryous,
    character.puntos_aprendizaje,
    character.registros_autor,
    character.registros_participante,
    character.personajes_inventario,
    character.personajes_tecnicas,
    originalCharacter?.personajes_inventario,
    originalCharacter?.personajes_tecnicas
  ]);

  // DERIVACIÓN DE ELEMENTOS TOTALES DEL PERSONAJE
  const derivedElements = useMemo(() => {
    if (!character || !masters.elementos || !masters.ramaElementos) return [];

    // 1. Obtener elementos fijos asociados a las ramas/clanes y sub-especialidades del personaje
    const charRamas = character.personajes_ramas || [];
    const fijosSet = new Set<number>();

    charRamas.forEach((pr: any) => {
      // Por RamaClan
      if (pr.rama_id) {
        masters.ramaElementos
          .filter((re: any) => re.rama_id === pr.rama_id && re.tipo === 'fijo')
          .forEach((re: any) => {
            if (re.elemento_id) fijosSet.add(re.elemento_id);
          });
      }
      // Por SubEspecialidad
      if (pr.sub_especialidad_id) {
        masters.ramaElementos
          .filter((re: any) => re.sub_especialidad_id === pr.sub_especialidad_id && re.tipo === 'fijo')
          .forEach((re: any) => {
            if (re.elemento_id) fijosSet.add(re.elemento_id);
          });
      }
    });

    // Elementos fijos de la elección del clan
    const clanEleccion = character.eleccion_tecnicas_clan;
    if (clanEleccion) {
      if (clanEleccion.rama_id) {
        masters.ramaElementos
          .filter((re: any) => Number(re.rama_id) === Number(clanEleccion.rama_id) && re.tipo === 'fijo')
          .forEach((re: any) => {
            if (re.elemento_id) fijosSet.add(Number(re.elemento_id));
          });
      }
      if (clanEleccion.sub_especialidad_id) {
        masters.ramaElementos
          .filter((re: any) => Number(re.sub_especialidad_id) === Number(clanEleccion.sub_especialidad_id) && re.tipo === 'fijo')
          .forEach((re: any) => {
            if (re.elemento_id) fijosSet.add(Number(re.elemento_id));
          });
      }
    }

    // 2. Elementos seleccionados en el Ninjutsu Elemental (rama_id = 4) o Clan Elemental
    charRamas.forEach((pr: any) => {
      const clanInfo = pr.info_ramas_clanes || (masters.ramas || []).find((r: any) => r.id === Number(pr.rama_id));
      const isClanElemental = clanInfo?.config_iniciales?.clan_elemental === true;
      const isNinjutsu = Number(pr.rama_id) === 4;

      if (isNinjutsu || isClanElemental) {
        if (pr.elemento_principal_id) fijosSet.add(Number(pr.elemento_principal_id));
        if (pr.elemento_secundario_id) fijosSet.add(Number(pr.elemento_secundario_id));
        if (pr.elemento_terciario_id) fijosSet.add(Number(pr.elemento_terciario_id));
      }
    });

    // 3. Mapear a objetos Elemento completos
    return Array.from(fijosSet)
      .map((id) => masters.elementos.find((e: any) => e.id === id))
      .filter(Boolean);
  }, [character, masters.elementos, masters.ramaElementos]);

  const meetsRequirements = (item: Glosario) => {
    if (!character) return true;

    // Block learning basic techniques of a branch if the branch is only had via clan compatibility,
    // UNLESS the technique is one of the initial techniques granted by that compatibility.
    if (item.basica === true && item.rama_clan_id) {
      const techRamaId = Number(item.rama_clan_id);
      const hasDirectly = (character.personajes_ramas || []).some((r: any) => Number(r.rama_id) === techRamaId);
      
      let hasViaClan = false;
      const clanEleccion = character.eleccion_tecnicas_clan;
      if (clanEleccion) {
        if (Number(clanEleccion.rama_id) === techRamaId) {
          hasViaClan = true;
        } else {
          const subEsp = (masters.subEspecialidades || []).find((s: any) => s.id === Number(clanEleccion.sub_especialidad_id));
          if (subEsp && Number(subEsp.rama_id) === techRamaId) {
            hasViaClan = true;
          }
        }
      }

      if (hasViaClan && !hasDirectly) {
        const isGrantedByClan = clanEleccion?.tecnicas_ids?.includes(Number(item.id));
        if (!isGrantedByClan) {
          return false;
        }
      }
    }

    if (!item.requisitos) return true;
    let req = item.requisitos;
    if (typeof req === 'string') {
      try { req = JSON.parse(req); } catch { return true; }
    }

    // Check de elemento_id
    if (req.elemento_id) {
      const elementId = Number(req.elemento_id);
      const characterElementIds = derivedElements.map(e => Number(e.id));
      if (!characterElementIds.includes(elementId)) {
        return false;
      }
    }

    // 1. Rango
    if (req.rango && typeof req.rango === 'string') {
      const rankOrder: Record<string, number> = { 'D': 0, 'C': 1, 'B': 2, 'A': 3, 'S': 4 };
      const charR = (character.rango || 'D').toUpperCase();
      const reqR = req.rango.toUpperCase();

      const charRank = rankOrder[charR] ?? 0;
      const reqRank = rankOrder[reqR] ?? 0;
      if (charRank < reqRank) return false;
    }

    // 2. Stats
    if (req.stats && typeof req.stats === 'object') {
      for (const [stat, value] of Object.entries(req.stats)) {
        const reqValue = Number(value);
        if (isNaN(reqValue) || reqValue <= 0) continue;

        const sKey = stat.toUpperCase();
        // @ts-ignore
        const baseVal = Number(character.stats_base?.[sKey] || 0);
        // @ts-ignore
        const derivVal = Number(character.atributos_derivados?.[sKey] || 0);
        const currentVal = Math.max(baseVal, derivVal);

        if (currentVal < reqValue) return false;
      }
    }

    // 3. Misiones
    if (req.misiones && typeof req.misiones === 'object') {
      const counts = missionCounts || { D: 0, C: 0, B: 0, A: 0, S: 0 };
      for (const [rank, count] of Object.entries(req.misiones)) {
        const reqCount = Number(count);
        if (isNaN(reqCount) || reqCount <= 0) continue;

        const rKey = rank.toUpperCase() as keyof typeof counts;
        const charCount = Number(counts[rKey] || 0);
        if (charCount < reqCount) return false;
      }
    }

    // 4. PA (Puntos de Aprendizaje)
    if (req.combates) {
      const reqCombates = Number(req.combates);
      if (!isNaN(reqCombates) && reqCombates > 0) {
        const charCombates = Number(character.puntos_aprendizaje || 0);
        if (charCombates < reqCombates) return false;
      }
    }

    // 5. Rama/Clan
    if (req.rama_id) {
      const reqRamaId = Number(req.rama_id);
      if (!isNaN(reqRamaId) && reqRamaId > 0) {
        const charRamaIds = (character.personajes_ramas || []).map((r: any) => Number(r.rama_id));

        // Incluir la rama elegida como técnica de clan (y el padre si fue una subcategoría)
        const clanEleccion = character.eleccion_tecnicas_clan;
        if (clanEleccion?.rama_id) charRamaIds.push(Number(clanEleccion.rama_id));
        if (clanEleccion?.sub_especialidad_id) {
          const subEsp = (masters.subEspecialidades || []).find((s: any) => s.id === Number(clanEleccion.sub_especialidad_id));
          if (subEsp?.rama_id) charRamaIds.push(Number(subEsp.rama_id));
        }

        if (!charRamaIds.includes(reqRamaId)) return false;
      }
    }

    // Check de Sub-especialidad/Subcategoría
    const subEspId = item.sub_especialidad_id || (item as any).id_subespecialidad;
    if (subEspId) {
      const reqSubId = Number(subEspId);
      const charSubIds = (character.personajes_ramas || [])
        .map((r: any) => r.sub_especialidad_id)
        .filter(Boolean)
        .map(Number);

      const clanEleccion = character.eleccion_tecnicas_clan;
      if (clanEleccion?.sub_especialidad_id) {
        charSubIds.push(Number(clanEleccion.sub_especialidad_id));
      }

      // Añadir sub-especialidades mapeadas de los elementos derivados
      derivedElements.forEach((el: any) => {
        const sub = (masters.subEspecialidades || []).find((s: any) => {
          const clean = (str: string) => (str || '').toLowerCase().replace(/uu/g, 'u').trim();
          return Number(s.rama_id) === 4 &&
            (clean(s.slug) === clean(el.nombre_jap) ||
              clean(s.nombre) === clean(el.nombre_esp) ||
              clean(s.nombre) === clean(el.nombre_jap));
        });
        if (sub && !charSubIds.includes(sub.id)) {
          charSubIds.push(sub.id);
        }
      });

      if (!charSubIds.includes(reqSubId)) return false;
    }

    // Check de Sub-especialidad/Subcategoría Requerida en requisitos (JSON)
    if (req.sub_especialidad_id) {
      const reqIds = Array.isArray(req.sub_especialidad_id) ? req.sub_especialidad_id : [req.sub_especialidad_id];
      if (reqIds.length > 0) {
        const charSubIds = (character.personajes_ramas || [])
          .map((r: any) => r.sub_especialidad_id)
          .filter(Boolean)
          .map(Number);

        const clanEleccion = character.eleccion_tecnicas_clan;
        if (clanEleccion?.sub_especialidad_id) {
          charSubIds.push(Number(clanEleccion.sub_especialidad_id));
        }

        // Añadir sub-especialidades mapeadas de los elementos derivados
        derivedElements.forEach((el: any) => {
          const sub = (masters.subEspecialidades || []).find((s: any) => {
            const clean = (str: string) => (str || '').toLowerCase().replace(/uu/g, 'u').trim();
            return Number(s.rama_id) === 4 &&
              (clean(s.slug) === clean(el.nombre_jap) ||
                clean(s.nombre) === clean(el.nombre_esp) ||
                clean(s.nombre) === clean(el.nombre_jap));
          });
          if (sub && !charSubIds.includes(sub.id)) {
            charSubIds.push(sub.id);
          }
        });

        if (!reqIds.some((reqId: any) => charSubIds.includes(Number(reqId)))) {
          return false;
        }
      }
    }

    // 6. Exclusividad
    if (req.personaje_id) {
      const pId = req.personaje_id;
      if (Array.isArray(pId)) {
        const normalizedIds = pId.map(id => Number(id)).filter(id => !isNaN(id));
        if (normalizedIds.length > 0 && !normalizedIds.includes(Number(character.id))) {
          return false;
        }
      } else if (typeof pId === 'string') {
        const normalizedIds = pId.split(',').map(id => Number(id.trim())).filter(id => !isNaN(id));
        if (normalizedIds.length > 0 && !normalizedIds.includes(Number(character.id))) {
          return false;
        }
      } else {
        const reqPId = Number(pId);
        if (!isNaN(reqPId) && reqPId > 0) {
          if (Number(character.id) !== reqPId) return false;
        }
      }
    }

    // Restricciones de Rango de Ninjutsu Elemental II y III basado en los slots de los elementos
    const ninjutsuRama = (character.personajes_ramas || []).find((pr: any) => Number(pr.rama_id) === 4);
    let sub = null;
    if (ninjutsuRama && ninjutsuRama.sub_especialidad_id) {
      const mainSub = (masters.subEspecialidades || []).find((s: any) => s.id === ninjutsuRama.sub_especialidad_id);
      const clanEleccion = character.eleccion_tecnicas_clan;
      let clanSub = null;
      if (clanEleccion && Number(clanEleccion.rama_id) === 4 && clanEleccion.sub_especialidad_id) {
        clanSub = (masters.subEspecialidades || []).find((s: any) => s.id === clanEleccion.sub_especialidad_id);
      }
      const getVal = (slug: string) => slug === 'ninjutsu-iii' ? 3 : slug === 'ninjutsu-ii' ? 2 : slug === 'ninjutsu-i' ? 1 : 0;
      if (clanSub && getVal(clanSub.slug || '') > getVal(mainSub?.slug || '')) {
        sub = clanSub;
      } else {
        sub = mainSub;
      }
    }
    if (sub && (sub.slug === 'ninjutsu-ii' || sub.slug === 'ninjutsu-iii')) {
      const reqElementId = item.elemento_id || req.elemento_id;
      if (reqElementId) {
        const elementId = Number(reqElementId);
        const rank = (item.rango || req.rango || 'D').toUpperCase();

        // Elemento secundario: Máximo rango B (bloquear A y S)
        if (ninjutsuRama?.elemento_secundario_id && Number(ninjutsuRama.elemento_secundario_id) === elementId) {
          if (rank === 'A' || rank === 'S') {
            return false;
          }
        }

        // Elemento terciario (solo para Nin III): Máximo rango C (bloquear B, A y S)
        if (sub.slug === 'ninjutsu-iii' && ninjutsuRama?.elemento_terciario_id && Number(ninjutsuRama.elemento_terciario_id) === elementId) {
          if (rank === 'B' || rank === 'A' || rank === 'S') {
            return false;
          }
        }
      }
    }

    return true;
  };

  // AUTO-ALIGN INITIAL TECHNIQUES WHEN BRANCHES/ELEMENTS CHANGE DURING EDIT OR CREATION
  useEffect(() => {
    if (!(isEditing || isNew)) return;
    if (!character || !glosarioFiltrado || !masters.subEspecialidades) return;

    // 1. Encontrar si el personaje tiene Ninjutsu II o III en sus ramas
    const ninjutsuSlot = (character.personajes_ramas || []).find((r: any) => Number(r.rama_id) === 4);
    let isNinIIorIII = false;
    if (ninjutsuSlot?.sub_especialidad_id) {
      const sub = masters.subEspecialidades.find((s: any) => s.id === ninjutsuSlot.sub_especialidad_id);
      if (sub && (sub.slug === 'ninjutsu-ii' || sub.slug === 'ninjutsu-iii')) {
        isNinIIorIII = true;
      }
    }

    // 2. Obtener todas las técnicas iniciales que el personaje cumple requisitos
    const matchingInitialTecs = (glosarioFiltrado || [])
      .filter((t: any) => {
        if (!t.inicial || t.categoria_id === 2) return false;
        if (Number(t.rama_clan_id) === 4 && isNinIIorIII) {
          return false;
        }
        return meetsRequirements(t);
      });

    // 3. Obtener las técnicas actuales
    const currentTecs = character.personajes_tecnicas || [];

    // 4. Ver si necesitamos añadir alguna técnica inicial que cumpla requisitos y no esté ya añadida
    const tecsToAdd = matchingInitialTecs.filter(
      (it: any) => !currentTecs.some((ct: any) => Number(ct.tecnica_id) === Number(it.id))
    );

    // 5. Ver si hay alguna técnica inicial que el personaje ya no cumple requisitos o es de Ninjutsu y ahora tiene Nin II/III
    const tecsToRemove = currentTecs.filter((ct: any) => {
      const t = ct.info_glosario;
      if (!t || !t.inicial || t.categoria_id === 2) return false;
      if (Number(t.rama_clan_id) === 4 && isNinIIorIII) return true;
      return !meetsRequirements(t);
    });

    if (tecsToAdd.length > 0 || tecsToRemove.length > 0) {
      let updatedTecs = [...currentTecs];

      if (tecsToRemove.length > 0) {
        const removeIds = tecsToRemove.map((r: any) => Number(r.tecnica_id));
        updatedTecs = updatedTecs.filter((ct: any) => !removeIds.includes(Number(ct.tecnica_id)));
      }

      if (tecsToAdd.length > 0) {
        updatedTecs = [
          ...updatedTecs,
          ...tecsToAdd.map((it: any) => ({
            personaje_id: Number(character.id || 0),
            tecnica_id: it.id,
            info_glosario: it
          }))
        ];
      }

      onUpdateField('personajes_tecnicas', updatedTecs);
    }
  }, [
    isEditing,
    isNew,
    character.personajes_ramas,
    glosarioFiltrado,
    masters.subEspecialidades,
    JSON.stringify((character.personajes_ramas || []).map((r: any) => ({
      p: r.elemento_principal_id,
      s: r.elemento_secundario_id,
      t: r.elemento_terciario_id
    })))
  ]);

  const { puntosGastados, puntosLibres } = useMemo(() => {
    const pg = Object.values(character.stats_base || {}).reduce((acc: number, val: any) => acc + (Number(val) || 0), 0);
    return {
      puntosGastados: pg,
      puntosLibres: (Number(character.puntos_stats) || 0) - pg
    };
  }, [character.stats_base, character.puntos_stats]);

  const aldeaObj = useMemo(() => masters.aldeas.find((a: any) => a.id == character.aldea_id), [masters.aldeas, character.aldea_id]);
  const iconUrl = useMemo(() => aldeaObj ? resolveAldeaIcono(aldeaObj) : null, [aldeaObj]);

  const meetsTrainingRequirements = (e: any) => {
    if (!character) return false;
    const rankOrder: Record<string, number> = masters.rankOrder || { 'D': 1, 'C': 2, 'B': 3, 'A': 4, 'S': 5 };
    const charR = (character.rango || 'D').toUpperCase();
    const reqR = (e.rango || 'B').toUpperCase();
    const charRank = rankOrder[charR] ?? 0;
    const reqRank = rankOrder[reqR] ?? 0;
    if (charRank < reqRank) return false;
    if (e.requisitos) {
      const { id_subespecialidad, sub_especialidad_id, ...cleanE } = e;
      return meetsRequirements({ ...cleanE, requisitos: e.requisitos } as any);
    }
    return true;
  };

  const canAffordTraining = (e: any) => {
    if (!character) return false;
    const currentExp = character.xp || 0;
    const currentRyous = character.ryous || 0;
    const currentPA = character.puntos_aprendizaje || 0;
    return currentExp >= (e.coste_exp || 0) &&
      currentRyous >= (e.coste_ryous || 0) &&
      currentPA >= (e.coste_puntos_aprendizaje || 0);
  };

  const canAccessTraining = true;

  // Helper to group items / techniques by Aldea/General > Rama/Clan > Subcategory
  const groupItemsByHierarchy = <T extends { info_glosario?: Glosario | null }>(items: T[]) => {
    const structure: Record<string, Record<string, Record<string, T[]>>> = {};

    items.forEach(item => {
      const glosario = item.info_glosario as any;
      if (!glosario) return;

      // 1. Aldea
      let aldeaName = 'General';
      let aldeaId = glosario.aldea_id;
      if (!aldeaId && glosario.rama_clan_id) {
        const rama = (masters.ramas || []).find((r: any) => Number(r.id) === Number(glosario.rama_clan_id));
        if (rama?.aldea_id) {
          aldeaId = rama.aldea_id;
        }
      }
      if (aldeaId) {
        const aldea = (masters.aldeas || []).find((a: any) => Number(a.id) === Number(aldeaId));
        if (aldea) aldeaName = aldea.nombre_completo || aldea.nombre;
      }

      // 2. Rama
      let ramaName = 'General';
      const ramaId = glosario.rama_clan_id || glosario.rama_id;
      if (ramaId) {
        const rama = (masters.ramas || []).find((r: any) => Number(r.id) === Number(ramaId));
        if (rama) {
          ramaName = rama.nombre;
          if (Number(ramaId) === 4 && glosario.elemento_id) {
            const el = (masters.elementos || []).find((e: any) => Number(e.id) === Number(glosario.elemento_id));
            if (el) {
              const elName = el.nombre_jap
                ? `${el.nombre_jap} (${el.nombre_esp})`
                : el.nombre_esp;
              ramaName = `${rama.nombre} — ${elName.toUpperCase()}`;
            }
          } else if (glosario.sub_especialidad_id) {
            const sub = (masters.subEspecialidades || []).find((s: any) => Number(s.id) === Number(glosario.sub_especialidad_id));
            if (sub) {
              ramaName = `${rama.nombre} — ${sub.nombre.toUpperCase()}`;
            }
          }
        }
      }

      // 3. Subcategory
      const subData = glosario.info_glosario_subcategorias;
      const subName = (Array.isArray(subData) ? subData[0]?.nombre : subData?.nombre) || '';

      if (!structure[aldeaName]) structure[aldeaName] = {};
      if (!structure[aldeaName][ramaName]) structure[aldeaName][ramaName] = {};
      if (!structure[aldeaName][ramaName][subName]) structure[aldeaName][ramaName][subName] = [];

      structure[aldeaName][ramaName][subName].push(item);
    });

    // Sort tiers
    const sortedStructure: Record<string, Record<string, Record<string, T[]>>> = {};
    const sortedAldeas = Object.keys(structure).sort((a, b) => {
      if (a === 'General') return -1;
      if (b === 'General') return 1;
      return a.localeCompare(b);
    });

    sortedAldeas.forEach(aldea => {
      sortedStructure[aldea] = {};
      const ramas = structure[aldea];
      const sortedRamas = Object.keys(ramas).sort((a, b) => {
        if (a === 'General') return -1;
        if (b === 'General') return 1;
        return a.localeCompare(b);
      });

      sortedRamas.forEach(rama => {
        sortedStructure[aldea][rama] = {};
        const subs = ramas[rama];
        const sortedSubs = Object.keys(subs).sort((a, b) => {
          if (a === '') return -1;
          if (b === '') return 1;
          return a.localeCompare(b);
        });

        sortedSubs.forEach(sub => {
          sortedStructure[aldea][rama][sub] = subs[sub];
        });
      });
    });

    return sortedStructure;
  };

  const matchesGlosarioSearch = (glosario: any, query: string) => {
    return searchAny(query, [
      glosario?.nombre_es,
      glosario?.nombre_jp,
      glosario?.descripcion
    ]);
  };

  // Memoizar el inventario agrupado (excluyendo objetos equipables/de la subcategoría equipo)
  const groupedInventory = useMemo(() => {
    const list = (character.personajes_inventario || []).filter((pi: PersonajeItem) => {
      const subData = pi.info_glosario?.info_glosario_subcategorias;
      const subSlug = (Array.isArray(subData) ? subData[0]?.slug : subData?.slug) || '';
      const isEquipment = pi.info_glosario?.zona_equipable || subSlug === 'equipo';
      return !isEquipment;
    }).filter((pi: PersonajeItem) => matchesGlosarioSearch(pi.info_glosario, inventorySearch));
    return groupItemsByHierarchy(list);
  }, [character.personajes_inventario, masters.aldeas, masters.ramas, inventorySearch]);

  const hasInventoryItems = useMemo(() => {
    return (character.personajes_inventario || []).some((pi: PersonajeItem) => {
      const subData = pi.info_glosario?.info_glosario_subcategorias;
      const subSlug = (Array.isArray(subData) ? subData[0]?.slug : subData?.slug) || '';
      const isEquipment = pi.info_glosario?.zona_equipable || subSlug === 'equipo';
      return !isEquipment;
    });
  }, [character.personajes_inventario]);

  // Memoizar el equipamiento en propiedad (ordenando los equipados arriba)
  const possessedEquipment = useMemo(() => {
    return (character.personajes_inventario || [])
      .filter((pi: PersonajeItem) => {
        const subData = pi.info_glosario?.info_glosario_subcategorias;
        const subSlug = (Array.isArray(subData) ? subData[0]?.slug : subData?.slug) || '';
        return pi.info_glosario?.zona_equipable || subSlug === 'equipo';
      })
      .filter((pi: PersonajeItem) => matchesGlosarioSearch(pi.info_glosario, equipmentSearch))
      .sort((a, b) => {
        const aEq = a.equipado ? 1 : 0;
        const bEq = b.equipado ? 1 : 0;
        return bEq - aEq;
      });
  }, [character.personajes_inventario, equipmentSearch]);

  const hasPossessedEquipment = useMemo(() => {
    return (character.personajes_inventario || []).some((pi: PersonajeItem) => {
      const subData = pi.info_glosario?.info_glosario_subcategorias;
      const subSlug = (Array.isArray(subData) ? subData[0]?.slug : subData?.slug) || '';
      return pi.info_glosario?.zona_equipable || subSlug === 'equipo';
    });
  }, [character.personajes_inventario]);

  const renderRequisitos = (reqs: any) => {
    if (!reqs) return <span className="text-caption text-oro/30 italic">Sin requisitos</span>;
    if (typeof reqs === 'string') return <span className="text-caption text-oro/60 font-bold uppercase">{reqs}</span>;

    const elements: React.ReactNode[] = [];

    if (reqs.rango) {
      elements.push(<span key="rango" className="text-rojo-sangre font-black">{reqs.rango}</span>);
    }
    if (reqs.rama_id) {
      const rama = (masters.ramas || []).find((r: any) => Number(r.id) === Number(reqs.rama_id));
      const ramaNombre = rama ? rama.nombre.toUpperCase() : 'RAMA/CLAN';
      elements.push(<span key="rama" className="text-oro font-black">{ramaNombre}</span>);
    }
    if (reqs.elemento_id) {
      const elem = (masters.elementos || []).find((e: any) => Number(e.id) === Number(reqs.elemento_id));
      if (elem) {
        elements.push(
          <span key="elemento" className="text-oro font-black">
            ELEMENTO: <span className="text-oro">{elem.nombre_esp.toUpperCase()}</span>
          </span>
        );
      }
    }
    if (reqs.combates) {
      elements.push(
        <span key="combates" className="text-emerald-500 font-black">
          PA: <span className="text-emerald-400">{reqs.combates}</span>
        </span>
      );
    }

    if (reqs.stats && typeof reqs.stats === 'object') {
      Object.entries(reqs.stats).forEach(([stat, val]) => {
        if (val && val !== 0) {
          elements.push(
            <span key={stat} className="text-oro/50 font-black">
              {stat.toUpperCase()}: <span className="text-oro">{String(val)}</span>
            </span>
          );
        }
      });
    }

    if (reqs.misiones && typeof reqs.misiones === 'object') {
      Object.entries(reqs.misiones).forEach(([rangoM, cant]) => {
        if (cant && cant !== 0) {
          elements.push(
            <span key={rangoM} className="text-rojo-sangre font-black">
              M.{rangoM}: <span className="text-oro">{String(cant)}</span>
            </span>
          );
        }
      });
    }

    if (reqs.entrenamiento_id) {
      const ids = Array.isArray(reqs.entrenamiento_id) ? reqs.entrenamiento_id : [reqs.entrenamiento_id];
      if (ids.length > 0) {
        const entNames = ids.map((id: any) => {
          const rawId = Number(id) >= 100000 ? Number(id) - 100000 : Number(id);
          const ent = (masters.entrenamientos || []).find((e: any) => e.id === rawId);
          return ent?.nombre_jp || ent?.nombre_esp || `ID: ${id}`;
        });
        elements.push(
          <span key="entrenamiento" className="text-purple-400 font-black">
            ENTR.: <span className="text-oro">{entNames.join(' o ')}</span>
          </span>
        );
      }
    }

    if (reqs.sub_especialidad_id) {
      const ids = Array.isArray(reqs.sub_especialidad_id) ? reqs.sub_especialidad_id : [reqs.sub_especialidad_id];
      if (ids.length > 0) {
        const subNames = ids.map((id: any) => {
          const sub = (masters.subEspecialidades || []).find((s: any) => s.id === id);
          return sub?.nombre || `ID: ${id}`;
        });
        elements.push(
          <span key="subespecialidad" className="text-indigo-400 font-black">
            SUBCAT.: <span className="text-oro">{subNames.join(' o ')}</span>
          </span>
        );
      }
    }

    Object.entries(reqs).forEach(([key, value]) => {
      if (['rango', 'rama_id', 'elemento_id', 'stats', 'misiones', 'personaje_id', 'combates', 'entrenamiento_id', 'sub_especialidad_id'].includes(key)) return;
      if (value === null || value === undefined || value === 0 || value === false || value === '') return;
      elements.push(
        <span key={key} className="text-oro/50 font-black">
          {key.replace('_', ' ').toUpperCase()}: <span className="text-oro">{String(value)}</span>
        </span>
      );
    });

    if (elements.length === 0) return <span className="text-caption text-oro/30 italic">Sin requisitos</span>;

    return (
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-caption uppercase tracking-tighter leading-tight">
        {elements.map((el, i) => (
          <Fragment key={i}>
            {i > 0 && <span className="text-oro/20">|</span>}
            {el}
          </Fragment>
        ))}
      </div>
    );
  };

  // Memoizar Técnicas agrupadas por subcategoría (categoria_id === 1 o fallbacks)
  const tecnicasGrouped = useMemo(() => {
    const list = (character.personajes_tecnicas || []).filter((pt: PersonajeTecnica) => {
      const catId = pt.info_glosario?.categoria_id;
      return catId === 1 || (catId !== 2 && catId !== 3 && catId !== 4);
    }).filter((pt: PersonajeTecnica) => matchesGlosarioSearch(pt.info_glosario, techniqueSearch));
    return groupItemsByHierarchy(list);
  }, [character.personajes_tecnicas, masters.aldeas, masters.ramas, techniqueSearch]);

  // Memoizar Pasivas agrupadas por subcategoría (categoria_id === 4)
  const pasivasGrouped = useMemo(() => {
    const list = (character.personajes_tecnicas || []).filter((pt: PersonajeTecnica) => {
      return pt.info_glosario?.categoria_id === 4;
    }).filter((pt: PersonajeTecnica) => matchesGlosarioSearch(pt.info_glosario, techniqueSearch));
    return groupItemsByHierarchy(list);
  }, [character.personajes_tecnicas, masters.aldeas, masters.ramas, techniqueSearch]);

  // Memoizar Kuchiyoses agrupadas por subcategoría (categoria_id === 3)
  const kuchiyosesGrouped = useMemo(() => {
    const list = (character.personajes_tecnicas || []).filter((pt: PersonajeTecnica) => {
      return pt.info_glosario?.categoria_id === 3;
    }).filter((pt: PersonajeTecnica) => matchesGlosarioSearch(pt.info_glosario, techniqueSearch));
    return groupItemsByHierarchy(list);
  }, [character.personajes_tecnicas, masters.aldeas, masters.ramas, techniqueSearch]);


  const [editingRegistro, setEditingRegistro] = useState<Registro | null>(null);
  const [registroTab, setRegistroTab] = useState<'mision' | 'accion' | 'combate'>('mision');
  const [tecnicasSubTab, setTecnicasSubTab] = useState<'jutsus' | 'pasivas' | 'kuchiyoses'>('jutsus');
  const [inventarioSubTab, setInventarioSubTab] = useState<'mochila' | 'equipo'>('mochila');
  const [recordPage, setRecordPage] = useState(1);
  const recordsPerPage = 10;
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [editingImageKey, setEditingImageKey] = useState<'character' | 'user' | null>(null);
  const [imageUrlInput, setImageUrlInput] = useState<string>('');

  // Bloquear scroll de fondo al abrir el modal de edición
  useEffect(() => {
    if (editingRegistro || editingImageKey) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [editingRegistro, editingImageKey]);

  // Componentes Helper fuera del render principal para evitar re-montajes
  const ResourceDisplay = ({ character, totalExp, totalRyous, totalPuntosCombate, xpLimitUsage }: { character: Character, totalExp: number, totalRyous: number, totalPuntosCombate: number, xpLimitUsage?: number | null }) => (  // totalPuntosCombate now represents PA
    <div className="flex flex-wrap justify-center items-center gap-4 mb-8">
      <div className="flex items-center gap-3 px-5 py-3 ninja-card-oro group hover-ninja">
        <div className="w-9 h-9 bg-rojo-sangre rotate-45 flex items-center justify-center shadow-[0_0_12px_rgba(103,9,9,0.4)] shrink-0">
          <span className="text-oro font-black -rotate-45 text-base italic">¥</span>
        </div>
        <div>
          <p className="text-[10px] xl:text-xs font-black text-oro/40 uppercase tracking-[0.2em] mb-0.5">RYOUS (DISP. / TOTAL)</p>
          <p className="text-lg xl:text-xl font-black text-oro leading-none">
            {new Intl.NumberFormat('es-ES').format(character.ryous || 0)}
            <span className="text-oro/20 mx-2">/</span>
            <span className="text-oro/60 text-xs xl:text-sm">{new Intl.NumberFormat('es-ES').format(totalRyous)}</span>
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3 px-5 py-3 ninja-card-oro group hover-ninja">
        <div className="w-9 h-9 bg-oro rotate-45 flex items-center justify-center shadow-[0_0_12px_rgba(255,230,159,0.25)] shrink-0">
          <span className="text-rojo-sangre font-black -rotate-45 text-[10px] italic">EXP</span>
        </div>
        <div>
          <p className="text-[10px] xl:text-xs font-black text-oro/40 uppercase tracking-[0.2em] mb-0.5">
            {xpLimitUsage ? 'EXP (DISP. / TOTAL / LÍMITE)' : 'EXPERIENCIA (DISP. / TOTAL)'}
          </p>
          <div className="flex items-center gap-2">
            <p className="text-lg xl:text-xl font-black text-oro leading-none">
              {new Intl.NumberFormat('es-ES').format(character.xp || 0)}
              <span className="text-oro/20 mx-2">/</span>
              <span className="text-oro/60 text-xs xl:text-sm">{new Intl.NumberFormat('es-ES').format(totalExp)}</span>
              {xpLimitUsage && (
                <>
                  <span className="text-oro/20 mx-2">/</span>
                  <span className="text-oro/60 text-xs xl:text-sm font-black text-oro/90">{new Intl.NumberFormat('es-ES').format(xpLimitUsage)}</span>
                </>
              )}
            </p>
            {xpLimitUsage && totalExp >= xpLimitUsage && (
              <span className="px-1.5 py-0.5 text-[9px] font-black uppercase bg-rojo-sangre/20 border border-rojo-sangre/40 text-rojo-sangre tracking-widest ninja-clip-xs animate-pulse">
                LÍMITE
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3 px-5 py-3 ninja-card-oro group hover-ninja">
        <div className="w-9 h-9 bg-emerald-950/80 border border-oro/20 rotate-45 flex items-center justify-center shadow-[0_0_12px_rgba(212,175,55,0.15)] shrink-0">
          <Swords className="w-4 h-4 text-oro -rotate-45" />
        </div>
        <div>
          <p className="text-[10px] xl:text-xs font-black text-oro/40 uppercase tracking-[0.2em] mb-0.5">P. APRENDIZAJE (DISP. / TOTAL)</p>
          <p className="text-lg xl:text-xl font-black text-oro leading-none">
            {character.puntos_aprendizaje || 0}
            <span className="text-oro/20 mx-2">/</span>
            <span className="text-oro/60 text-xs xl:text-sm">{totalPuntosCombate}</span>
          </p>
        </div>
      </div>
      {character.moneda_evento !== undefined && (
        <div className="flex items-center gap-3 px-5 py-3 ninja-card-oro group hover-ninja">
          <div className="w-9 h-9 bg-purple-950/80 border border-oro/20 rotate-45 flex items-center justify-center shadow-[0_0_12px_rgba(212,175,55,0.15)] shrink-0">
            <Coins className="w-4 h-4 text-oro -rotate-45" />
          </div>
          <div>
            <p className="text-[10px] xl:text-xs font-black text-oro/40 uppercase tracking-[0.2em] mb-0.5">
              {eventCoinName.toUpperCase()}
            </p>
            <p className="text-lg xl:text-xl font-black text-oro leading-none">
              {new Intl.NumberFormat('es-ES').format(character.moneda_evento || 0)}
            </p>
          </div>
        </div>
      )}
    </div>
  );

  const MissionCounter = ({ counts }: { counts: Record<string, number> }) => (
    <SectionCard title="HISTORIAL DE MISIONES" icon={ScrollText} color="oro">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-6">
        {Object.entries(counts).map(([rank, count]) => (
          <div key={rank} className="bg-black/40 border border-oro/10 py-4 px-6 text-center group hover-ninja transition-all ninja-clip-sm">
            <p className="text-caption font-black text-oro/40 uppercase tracking-widest mb-1">RANGO {rank}</p>
            <p className="text-3xl xl:text-5xl font-black text-oro italic leading-none">{count}</p>
          </div>
        ))}
      </div>
    </SectionCard>
  );


  return (
    <FormEditContext.Provider value={{ isEditing }}>
      <div className="min-h-screen pt-4 pb-8 px-4 sm:pt-6 sm:pb-12 sm:px-8 xl:pt-10 xl:pb-20 xl:px-20 flex flex-col">
        {character.activo === false && (
          <div className="w-full max-w-[1750px] mx-auto mb-6 ninja-card-oro p-6 border-oro/30 bg-black/80 backdrop-blur-md relative overflow-hidden flex flex-col md:flex-row justify-between items-center gap-6 shadow-[0_0_50px_rgba(212,175,55,0.15)] animate-in fade-in slide-in-from-top-6 duration-500">
            <div className="absolute top-0 left-0 w-2 h-full bg-oro"></div>
            <div className="absolute top-0 right-0 w-96 h-96 bg-oro/5 rounded-full blur-3xl -mr-48 -mt-48 pointer-events-none"></div>

            <div className="flex items-center gap-5 min-w-0 z-10">
              <div className="w-12 h-12 rounded-full bg-oro/10 border border-oro/30 flex items-center justify-center animate-pulse shrink-0">
                <ScrollText className="w-6 h-6 text-oro" />
              </div>
              <div className="min-w-0">
                <h3 className="text-oro font-black uppercase tracking-[0.25em] text-sm xl:text-base italic mb-1 flex items-center gap-3">
                  <span>SHINOBI ARCHIVADO / INACTIVO</span>
                  <span className="px-2 py-0.5 text-caption font-black uppercase bg-rojo-sangre text-oro tracking-widest ninja-clip-xs">
                    {character.eliminado_voluntario ? 'VOLUNTARIO' : 'INACTIVIDAD'}
                  </span>
                </h3>
                <p className="text-oro/60 text-caption xl:text-xs font-bold uppercase tracking-widest leading-relaxed">
                  Este expediente se encuentra fuera de servicio. {character.archived_at && `Archivado el ${new Date(character.archived_at).toLocaleDateString('es-ES')}.`}
                </p>
              </div>
            </div>

            {isAdmin && (
              <div className="flex flex-wrap items-center gap-4 w-full md:w-auto justify-end z-10 shrink-0">
                <button
                  onClick={() => onRestore?.()}
                  disabled={saving}
                  className="px-6 py-3 bg-oro text-rojo-sangre hover:bg-oro/80 text-caption xl:text-xs font-black uppercase tracking-widest transition-all duration-300 shadow-[0_0_20px_rgba(255,230,159,0.3)] disabled:opacity-50"
                >
                  RESTAURAR SHINOBI
                </button>
                <button
                  onClick={() => onDelete?.(true)}
                  disabled={saving}
                  className="px-6 py-3 bg-rojo-sangre/20 border border-rojo-sangre/40 text-rojo-sangre hover:bg-rojo-sangre hover:text-oro text-caption xl:text-xs font-black uppercase tracking-widest transition-all duration-300 disabled:opacity-50"
                >
                  ELIMINAR DEFINITIVAMENTE
                </button>
              </div>
            )}
          </div>
        )}

        <header className="w-full max-w-[1750px] mx-auto mb-6 sm:mb-8 ninja-card-oro p-4 sm:p-6 xl:p-8 z-50">
          <div className="flex flex-col gap-3 w-full">

            {/* Fila 1: Navegación/Breadcrumbs y Botones de Acción */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 border-b border-oro/10 pb-2.5 w-full">
              {/* Breadcrumbs */}
              <div className="w-full sm:w-auto flex-1 min-w-0">
                <Breadcrumbs
                  items={
                    isNew
                      ? [
                        { label: 'Inicio', href: '/' },
                        { label: 'Crear Ficha' }
                      ]
                      : [
                        { label: 'Inicio', href: '/' },
                        { label: 'Mundo Ninja', href: '/mundo-ninja' },
                        ...(character.aldea_id && character.aldeas
                          ? [
                            {
                              label: character.aldeas.abreviatura || character.aldeas.nombre_completo,
                              href: `/mundo-ninja/${character.aldea_id}`
                            }
                          ]
                          : character.aldea_id === null
                            ? [
                              { label: 'Renegados / Ninjas sin Aldea', href: '/mundo-ninja/renegados' }
                            ]
                            : []),
                        { label: character.nombre_ninja }
                      ]
                  }
                />
              </div>

              {/* Botones de Acción (Editar/Guardar/Cancelar/Borrar) */}
              <div className="flex items-center gap-4 sm:gap-6 w-full sm:w-auto justify-end shrink-0">
                {!isNew && canEdit && onDelete && (
                  <button
                    onClick={() => onDelete?.(false)}
                    className="p-3 text-rojo-sangre hover:scale-105 active:scale-95 hover:brightness-125 transition-all"
                    title="Borrar Personaje"
                  >
                    <Trash2 className="w-5 h-5 sm:w-6 sm:h-6" />
                  </button>
                )}

                {!isNew && canEdit && isEditing && onResetCharacter && (
                  <button
                    onClick={handleResetClick}
                    disabled={saving}
                    className="px-5 sm:px-8 py-2.5 text-xs sm:text-sm font-black uppercase tracking-widest transition-all ninja-btn-rojo disabled:opacity-50"
                  >
                    REINICIAR PERSONAJE
                  </button>
                )}

                {(!isNew && canEdit) && (
                  <button
                    onClick={() => isEditing ? onCancel() : setIsEditing?.(true)}
                    className={`px-5 sm:px-8 py-2.5 text-xs sm:text-sm font-black uppercase tracking-widest transition-all ${isEditing ? 'ninja-btn-oro' : 'ninja-btn-ghost'}`}
                  >
                    {isEditing ? 'CANCELAR' : 'EDITAR FICHA'}
                  </button>
                )}
                {(isEditing || isNew) && (
                  <button
                    onClick={() => onSave()}
                    disabled={saving}
                    className={`px-6 sm:px-10 py-2.5 sm:py-3.5 text-xs sm:text-sm font-black uppercase tracking-widest transition-all ${isNew ? 'ninja-btn-oro' : 'ninja-btn-rojo'}`}
                  >
                    {isNew ? 'CREAR' : 'GUARDAR'}
                  </button>
                )}
              </div>
            </div>

            {/* Fila 2: Banner de Identidad del Personaje (Avatar, Nombre y Rango) */}
            <div className="flex flex-col md:flex-row items-center gap-6 md:gap-10 justify-center md:justify-start text-center md:text-left pt-1.5 pb-1 w-full">
              {/* Contenedor del Avatar */}
              <div className="w-24 h-24 sm:w-32 sm:h-32 shrink-0 flex items-center justify-center relative">
                <div className="w-full h-full bg-black/40 overflow-hidden flex items-center justify-center ninja-clip-md shadow-2xl">
                  {character.url_img ? (
                    <img
                      src={character.url_img}
                      className="w-full h-full object-cover object-top"
                      alt="Avatar"
                    />
                  ) : (
                    <User className="w-12 h-12 text-oro/20" />
                  )}
                </div>
              </div>

              {/* Información del Personaje */}
              <div className="min-w-0 flex-1 flex flex-col items-center md:items-start w-full md:w-auto">
                <div className="flex items-center gap-3 mb-2 justify-center md:justify-start">
                  <div className="w-2 h-2 bg-rojo-sangre rotate-45" />
                  <p className="text-oro/40 text-caption xl:text-xs font-black uppercase tracking-[0.5em]">EXPEDIENTE NINJA</p>
                </div>

                <h1
                  className="ninja-title text-2xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl italic leading-tight text-center md:text-left px-2 md:px-0 w-full block"
                  style={{ overflowWrap: 'break-word', wordBreak: 'break-word' }}
                >
                  {character.nombre_ninja || (isNew ? 'NUEVO SHINOBI' : '')}
                </h1>

                <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 sm:gap-6 mt-4">
                  <div className="px-5 py-1.5 sm:px-6 sm:py-2 bg-rojo-sangre text-oro text-caption sm:text-xs xl:text-sm font-black uppercase tracking-[0.3em] shadow-lg">
                    RANGO {character.rango}
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="w-2 h-2 bg-rojo-sangre rotate-45" />
                    <span className="text-oro font-bold text-xs xl:text-base uppercase tracking-widest">{character.rango_jerarquico}</span>
                    {(aldeaObj?.nombre_completo || character.aldeas?.nombre_completo) && (
                      <>
                        <div className="w-2 h-2 bg-rojo-sangre rotate-45" />
                        <span className="text-oro/60 font-bold text-xs xl:text-base uppercase tracking-widest">{aldeaObj?.nombre_completo || character.aldeas?.nombre_completo}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

          </div>
        </header>

        <main className="w-full max-w-[1750px] mx-auto flex-1">
          <div className="flex flex-nowrap gap-4 xl:gap-8 mb-4 sm:mb-4 justify-start sm:justify-center overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
            {['general', 'ninja', 'equipamiento', 'tecnicas', 'onrol', 'registros'].map((tab) => {
              const isActive = activeTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => onSetActiveTab(tab)}
                  className={`px-8 sm:px-12 py-4 text-[11px] xl:text-sm font-black uppercase tracking-widest transition-all duration-300 border ninja-clip-sm shrink-0 relative group ${isActive
                    ? 'bg-oro text-rojo-sangre border-oro shadow-[0_0_30px_rgba(255,230,159,0.5)]'
                    : 'bg-black/60 text-oro/30 border-oro/10 hover:border-oro/60 hover:text-oro hover:bg-black/90'
                    }`}
                >
                  <span>{tab}</span>
                  {!isActive && (
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0.5 bg-oro transition-all duration-300 group-hover:w-[80%]" />
                  )}
                </button>
              );
            })}
          </div>


          {activeTab === 'general' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 animate-fade-in">
              {/* Columna de Retrato */}
              <div className="lg:col-span-4 space-y-8 max-w-sm mx-auto lg:max-w-none w-full">
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-t from-oro/20 to-transparent blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
                  <div
                    onClick={() => {
                      if (isEditing || isNew) {
                        setImageUrlInput(character.url_img || '');
                        setEditingImageKey('character');
                      }
                    }}
                    className={`relative aspect-[3/4] w-full overflow-hidden group flex items-center justify-center bg-black/40 ninja-clip-md ${isEditing || isNew ? 'cursor-pointer' : ''}`}
                  >
                    {character.url_img ? (
                      <img
                        src={character.url_img}
                        className="w-full h-full object-cover object-top hover:scale-110 transition-transform duration-700"
                        alt={character.nombre_ninja}
                      />
                    ) : (
                      <User className="w-24 h-24 text-oro/10 group-hover:text-oro/20 transition-colors" />
                    )}
                    <div className="absolute bottom-0 left-0 right-0 h-[40%] bg-gradient-to-t from-black/95 via-black/50 to-transparent pointer-events-none"></div>

                    {/* Overlay de Edición */}
                    {(isEditing || isNew) && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                        <div className="text-center">
                          <ImageIcon className="w-8 h-8 text-oro mx-auto mb-2" />
                          <p className="text-caption font-black text-oro uppercase tracking-widest">CAMBIAR IMAGEN</p>
                        </div>
                      </div>
                    )}

                    <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between gap-4 z-20">
                      <div className="min-w-0 flex-1">
                        <p
                          className="ninja-title text-lg sm:text-2xl mb-1"
                          style={{ overflowWrap: 'break-word', wordBreak: 'break-word' }}
                        >
                          {character.nombre_ninja}
                        </p>
                        <p className="text-caption font-black text-oro/40 uppercase tracking-[0.3em]">{character.rango_jerarquico}</p>
                      </div>
                      {iconUrl && (
                        <div className="shrink-0 transition-transform duration-300 hover:scale-110">
                          <img
                            src={iconUrl}
                            alt={aldeaObj?.nombre_completo || 'Aldea'}
                            className="w-16 h-16 sm:w-20 sm:h-20 object-contain transition-all duration-300"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Si el usuario tiene url_img propia, mostrarla debajo como miniatura opcional o decorativa */}
                {(Array.isArray(character.profiles) ? character.profiles[0]?.url_img : character.profiles?.url_img) ? (
                  <div
                    onClick={() => {
                      if (isAdmin) {
                        const profileUrl = Array.isArray(character.profiles) ? character.profiles[0]?.url_img : character.profiles?.url_img;
                        setImageUrlInput(profileUrl || '');
                        setEditingImageKey('user');
                      }
                    }}
                    className={`ninja-card-oro p-6 flex items-center gap-6 group transition-all ${isAdmin ? 'cursor-pointer hover:border-oro/40' : ''}`}
                  >
                    <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-oro/10 group-hover:border-oro/30 transition-all">
                      <img
                        src={(Array.isArray(character.profiles) ? character.profiles[0]?.url_img : character.profiles?.url_img) || undefined}
                        className="w-full h-full object-cover"
                        alt="Usuario"
                      />
                      {isAdmin && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Edit3 className="w-4 h-4 text-oro" />
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-caption font-black text-oro/30 uppercase tracking-widest mb-1">Jugador</p>
                      <p className="text-sm font-bold text-oro uppercase">
                        {(Array.isArray(character.profiles) ? character.profiles[0]?.username : character.profiles?.username) || 'NO VINCULADO'}
                      </p>
                      {isAdmin && (
                        <p className="text-[10px] text-oro/40 font-black uppercase tracking-wider mt-0.5">
                          HAGA CLIC PARA CAMBIAR IMAGEN
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  // Si no tiene imagen de jugador, pero es admin, permitir asignarla
                  isAdmin && (
                    <div
                      onClick={() => {
                        setImageUrlInput('');
                        setEditingImageKey('user');
                      }}
                      className="ninja-card-oro p-6 flex items-center justify-center gap-4 group cursor-pointer hover:border-oro/40 transition-all"
                    >
                      <ImageIcon className="w-5 h-5 text-oro/40 group-hover:text-oro transition-colors" />
                      <span className="text-caption font-black text-oro/60 uppercase tracking-widest">ASIGNAR IMAGEN DE JUGADOR</span>
                    </div>
                  )
                )}
              </div>

              <div className="lg:col-span-8 space-y-8">
                <SectionCard title="INFORMACIÓN DEL JUGADOR" icon={User} color="oro">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <DataField
                      label="USUARIO DISCORD"
                      value={
                        Array.isArray(character.profiles)
                          ? character.profiles[0]?.username
                          : character.profiles?.username || (isNew ? 'CARGANDO...' : 'NO VINCULADO')
                      }
                      disabled={true}
                    />
                    <DataField label="NOMBRE EN HOBBA" value={character.hobba_name} disabled={!isEditing && !isNew} onChange={(v) => onUpdateField('hobba_name', v)} />
                    <DataField label="TIEMPO EN EL RPG" value={character.tiempo_rpg} disabled={!isEditing && !isNew} onChange={(v) => onUpdateField('tiempo_rpg', v)} />
                  </div>
                </SectionCard>

                <SectionCard title="PERFIL DEL SHINOBI" icon={UserCircle} color="oro">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <DataField label="NOMBRE NINJA" value={character.nombre_ninja} disabled={!isEditing && !isNew} onChange={(v) => onUpdateField('nombre_ninja', v)} />
                    <SelectField
                      label="ALDEA DE ORIGEN"
                      value={character.aldea_id}
                      options={aldeaOptions}
                      disabled={!isEditing && !isNew}
                      placeholder="SIN ALDEA"
                      onChange={(v) => onUpdateField('aldea_id', v ? Number(v) : null)}
                    />
                    <DataField label="RANGO DE PODER" value={`RANGO ${character.rango}`} disabled={true} />
                    <SelectField
                      label="RANGO JERÁRQUICO"
                      value={character.rango_jerarquico}
                      options={masters.rangosJerarquicos || ["ESTUDIANTE", "GENIN", "CHUNIN", "JONIN"]}
                      disabled={!isEditing && !isNew}
                      onChange={(v) => onUpdateField('rango_jerarquico', v)}
                    />
                    {activeTeam && (
                      <div className="md:col-span-2 space-y-3">
                        <label className="text-caption font-black uppercase tracking-[0.2em] text-oro/60 ml-1">
                          EQUIPO NINJA
                        </label>
                        <div className="bg-black/40 border border-oro/10 p-5 rounded ninja-clip-sm flex flex-col gap-2">
                          <div className="text-sm xl:text-base text-oro font-black uppercase tracking-[0.15em]">
                            {activeTeam.nombre_equipo}
                          </div>
                          <div className="text-xs text-oro/60 flex flex-col sm:flex-row sm:gap-6 gap-2 mt-1">
                            <div>
                              <span className="font-black text-oro/40 uppercase tracking-wider">Líder: </span>
                              <span className="text-oro uppercase font-bold">{activeTeam.lider?.nombre_ninja || 'SIN LÍDER'}</span>
                            </div>
                            <div>
                              <span className="font-black text-oro/40 uppercase tracking-wider">Miembros: </span>
                              <span className="text-oro uppercase font-bold">
                                {(() => {
                                  const miembros = [
                                    activeTeam.integrante_1?.nombre_ninja,
                                    activeTeam.integrante_2?.nombre_ninja,
                                    activeTeam.integrante_3?.nombre_ninja
                                  ].filter(Boolean);
                                  return miembros.length > 1
                                    ? miembros.slice(0, -1).join(', ') + ' y ' + miembros[miembros.length - 1]
                                    : miembros[0] || '';
                                })()}
                              </span>
                            </div>
                            {activeTeam.fecha_creacion && (
                              <div>
                                <span className="font-black text-oro/40 uppercase tracking-wider">Creado: </span>
                                <span className="text-oro uppercase font-bold">
                                  {new Date(activeTeam.fecha_creacion).toLocaleDateString('es-ES')}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </SectionCard>

                <SectionCard title="RAMAS Y ESPECIALIDADES" icon={GitBranch} color="oro">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    {[1, 2].map(slot => {
                      const pr = character.personajes_ramas?.find((r: any) => Number(r.slot) === slot);
                      return (
                        <div key={slot} className="space-y-6 p-8 bg-black/40 border border-oro/10 relative overflow-hidden ninja-clip-md">
                          <div className="absolute top-0 right-0 w-32 h-32 bg-oro/5 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none" />
                          <h4 className="text-caption font-black text-oro/40 uppercase tracking-[0.3em] mb-4">ESPECIALIDAD SLOT {slot}</h4>
                          <div className="space-y-6">
                            <SelectField
                              label="RAMA / CLAN"
                              value={pr?.rama_id}
                              options={getClanOptions(slot)}
                              disabled={!isEditing && !isNew}
                              onChange={(v) => {
                                // Validar repetibilidad: si otra rama existe y no es repetible, no permitir seleccionar la misma
                                const otherSlot = slot === 1 ? 2 : 1;
                                const otherPr = character.personajes_ramas?.find((r: any) => Number(r.slot) === otherSlot);
                                if (otherPr && Number(otherPr.rama_id) === Number(v)) {
                                  const selectedRama = (masters.ramas || []).find((r: any) => r.id === Number(v));
                                  if (selectedRama && !selectedRama.es_repetible) {
                                    addToast(`La rama ${selectedRama.nombre} no se puede equipar en ambos slots.`, 'error');
                                    return;
                                  }
                                }

                                // Quitar técnicas de la elección anterior de clan si existía y estamos editando el slot del clan
                                const currentRama = (masters.ramas || []).find((r: any) => r.id === Number(pr?.rama_id));
                                const isChangingClan = currentRama?.tipo === 'clan';
                                const choice = character.eleccion_tecnicas_clan;
                                let updatedTecs = character.personajes_tecnicas || [];
                                if (isChangingClan && choice) {
                                  const prevTechIds = choice.tecnicas_ids || [];
                                  updatedTecs = updatedTecs.filter(
                                    (pt: any) => !prevTechIds.includes(Number(pt.tecnica_id))
                                  );
                                  onUpdateField('eleccion_tecnicas_clan', null);
                                }

                                const newRamas = [...(character.personajes_ramas?.filter((r: any) => Number(r.slot) !== slot) || []), { slot, rama_id: v ? Number(v) : null, sub_especialidad_id: null, id_entrenamiento: null, elemento_principal_id: null, elemento_secundario_id: null, elemento_terciario_id: null }];
                                onUpdateField('personajes_ramas', newRamas);
                                onUpdateField('personajes_tecnicas', updatedTecs);
                              }}
                            />
                            {masters.subEspecialidades.some((s: any) => s.rama_id === pr?.rama_id) && (
                              <SelectField
                                label="SUB-ESPECIALIDAD"
                                value={pr?.sub_especialidad_id}
                                options={masters.subEspecialidades
                                  .filter((s: any) => {
                                    if (s.rama_id !== pr?.rama_id) return false;
                                    if (Number(pr?.rama_id) === 4) {
                                      if (!s.slug?.startsWith('ninjutsu-')) return false;
                                      const clanEleccion = character.eleccion_tecnicas_clan;
                                      if (clanEleccion && Number(clanEleccion.rama_id) === 4 && clanEleccion.sub_especialidad_id) {
                                        const clanSub = (masters.subEspecialidades || []).find((cs: any) => cs.id === Number(clanEleccion.sub_especialidad_id));
                                        if (clanSub && (clanSub.slug === 'ninjutsu-ii' || clanSub.slug === 'ninjutsu-iii')) {
                                          return s.slug === 'ninjutsu-i';
                                        }
                                      }
                                    }
                                    return true;
                                  })
                                  .map((s: any) => ({ label: s.nombre, value: s.id }))
                                }
                                disabled={!isEditing && !isNew}
                                onChange={(v) => {
                                  // Validar repetibilidad en sub-especialidad
                                  const otherSlot = slot === 1 ? 2 : 1;
                                  const otherPr = character.personajes_ramas?.find((r: any) => Number(r.slot) === otherSlot);
                                  if (otherPr && Number(otherPr.rama_id) === Number(pr?.rama_id) && Number(otherPr.sub_especialidad_id) === Number(v)) {
                                    const selectedSub = (masters.subEspecialidades || []).find((s: any) => s.id === Number(v));
                                    if (selectedSub && !selectedSub.es_repetible) {
                                      addToast(`La sub-especialidad ${selectedSub.nombre} no se puede repetir en ambos slots.`, 'error');
                                      return;
                                    }
                                  }

                                  const newRamas = [...(character.personajes_ramas?.filter((r: any) => Number(r.slot) !== slot) || []), { ...pr, slot, sub_especialidad_id: v ? Number(v) : null, id_entrenamiento: null, elemento_principal_id: null, elemento_secundario_id: null, elemento_terciario_id: null }];
                                  onUpdateField('personajes_ramas', newRamas);
                                }}
                              />
                            )}

                            {/* Selección de Especialización Inicial de Clan */}
                            {(() => {
                              const clanInfo = pr ? (pr.info_ramas_clanes || (masters.ramas || []).find((r: any) => r.id === Number(pr.rama_id))) : null;
                              const clanOptions = clanInfo?.config_iniciales?.opciones || [];
                              if (clanOptions.length === 0) return null;

                              const choice = character.eleccion_tecnicas_clan;
                              const currentValue = choice !== undefined && choice !== null ? choice.option_index : '';

                              const optionLabel = (opt: any) => {
                                const rama = (masters.ramas || []).find((r: any) => r.id === opt.rama_id);
                                const sub = (masters.subEspecialidades || []).find((s: any) => s.id === opt.sub_especialidad_id);
                                if (sub) return `${rama?.nombre ?? '?'} › ${sub.nombre}`;
                                if (rama) return rama.nombre;
                                return 'Opción de clan';
                              };

                              const selectOptions = clanOptions.map((opt: any, idx: number) => ({
                                label: optionLabel(opt),
                                value: idx
                              }));

                              return (
                                <SelectField
                                  label="COMPATIBILIDAD"
                                  value={currentValue}
                                  options={selectOptions}
                                  disabled={!isEditing && !isNew}
                                  onChange={async (v) => {
                                    const idx = v !== '' ? Number(v) : null;
                                    const isClanElemental = clanInfo?.config_iniciales?.clan_elemental === true;

                                    // 1. Quitar las técnicas del clan de la opción anterior del inventario
                                    const prevTechIds = choice?.tecnicas_ids || [];
                                    let updatedTecs = (character.personajes_tecnicas || []).filter(
                                      (pt: any) => !prevTechIds.includes(Number(pt.tecnica_id))
                                    );

                                    // Limpiar elementos de este slot al cambiar de compatibilidad
                                    const updatedRamas = (character.personajes_ramas || []).map((r: any) => {
                                      if (Number(r.slot) === slot) {
                                        return {
                                          ...r,
                                          elemento_principal_id: null,
                                          elemento_secundario_id: null,
                                          elemento_terciario_id: null
                                        };
                                      }
                                      return r;
                                    });
                                    onUpdateField('personajes_ramas', updatedRamas);

                                    if (idx === null) {
                                      onUpdateField('personajes_tecnicas', updatedTecs);
                                      onUpdateField('eleccion_tecnicas_clan', null);
                                    } else {
                                      const opt = clanOptions[idx];

                                      if (isClanElemental) {
                                        // Para clan elemental, las técnicas no se añaden automáticamente. Solo limpiamos las previas.
                                        onUpdateField('personajes_tecnicas', updatedTecs);
                                      } else {
                                        // 2. Añadir las nuevas técnicas de la opción seleccionada buscando localmente o en Supabase (clan normal)
                                        const fetchedTechs = await Promise.all(
                                          opt.tecnicas_ids.map(async (tid: number) => {
                                            let tecData = (glosarioFiltrado || []).find(g => g.id === tid) ||
                                              (masters.glosario || []).find((g: any) => g.id === tid);

                                            if (!tecData) {
                                              try {
                                                const supabase = createClient();
                                                const { data, error } = await supabase
                                                  .from('info_glosario')
                                                  .select('*, info_glosario_categorias(nombre), info_glosario_subcategorias(nombre, slug)')
                                                  .eq('id', tid)
                                                  .single();
                                                if (data && !error) {
                                                  tecData = data;
                                                }
                                              } catch (err) {
                                                console.error("Error fetching technique from supabase:", err);
                                              }
                                            }
                                            return { tecnica_id: tid, info_glosario: tecData };
                                          })
                                        );

                                        onUpdateField('personajes_tecnicas', [...updatedTecs, ...fetchedTechs]);
                                      }

                                      // 3. Guardar la elección
                                      onUpdateField('eleccion_tecnicas_clan', {
                                        option_index: idx,
                                        rama_id: opt.rama_id,
                                        sub_especialidad_id: opt.sub_especialidad_id,
                                        tecnicas_ids: opt.tecnicas_ids
                                      });
                                    }
                                  }}
                                  placeholder="Seleccionar especialización..."
                                />
                              );
                            })()}

                            {/* RENDERIZADO DINÁMICO DE SELECTORES DE ELEMENTOS PARA NINJUTSU ELEMENTAL */}
                            {(() => {
                              const clanInfo = pr ? (pr.info_ramas_clanes || (masters.ramas || []).find((r: any) => r.id === Number(pr.rama_id))) : null;
                              const isClanElemental = clanInfo?.config_iniciales?.clan_elemental === true;
                              const clanEleccion = character.eleccion_tecnicas_clan;

                              const hasNinjutsu = Number(pr?.rama_id) === 4 && pr?.sub_especialidad_id;
                              const hasClanNinjutsu = isClanElemental && clanEleccion && Number(clanEleccion.rama_id) === 4 && clanEleccion.sub_especialidad_id;

                              if (!hasNinjutsu && !hasClanNinjutsu) return null;

                              const subEspecialidadId = hasNinjutsu ? pr.sub_especialidad_id : clanEleccion?.sub_especialidad_id;
                              const subEsp = masters.subEspecialidades.find((s: any) => s.id === subEspecialidadId);
                              if (!subEsp) return null;

                              const isNinI = subEsp.slug === 'ninjutsu-i';
                              const isNinII = subEsp.slug === 'ninjutsu-ii';
                              const isNinIII = subEsp.slug === 'ninjutsu-iii';

                              if (!isNinI && !isNinII && !isNinIII) return null;

                              // Calcular pool condicionado: elementos fijos básicos
                              const otherSlot = slot === 1 ? 2 : 1;
                              const otherPr = character.personajes_ramas?.find((r: any) => Number(r.slot) === otherSlot);

                              let poolFijoBasico: any[] = [];
                              if (masters.ramaElementos) {
                                poolFijoBasico = masters.ramaElementos
                                  .filter((re: any) =>
                                    re.tipo === 'fijo' &&
                                    re.info_elementos?.tipo === 'basico' &&
                                    (
                                      re.rama_id === Number(pr?.rama_id) ||
                                      (otherPr && re.rama_id === Number(otherPr.rama_id)) ||
                                      (clanEleccion && re.rama_id === Number(clanEleccion.rama_id))
                                    )
                                  )
                                  .map((re: any) => re.info_elementos)
                                  .filter(Boolean);
                              }

                              const N = poolFijoBasico.length;
                              const todosBasicos = (masters.elementos || []).filter((e: any) => e.tipo === 'basico');

                              // Opciones para selectors
                              const getOptionsForSelector = (selectorSlot: number, currentVal: number | null, otherVals: (number | null)[]) => {
                                const isRestricted = (N >= 2 && selectorSlot <= 2) || (N === 1 && selectorSlot === 1);
                                const baseList = isRestricted ? poolFijoBasico : todosBasicos;
                                return baseList.map((e: any) => {
                                  const isSelectedElsewhere = otherVals.includes(e.id);
                                  return {
                                    label: e.nombre_jap
                                      ? `${e.nombre_jap.toUpperCase()} (${e.nombre_esp.toUpperCase()})`
                                      : e.nombre_esp.toUpperCase(),
                                    value: e.id,
                                    disabled: isSelectedElsewhere && e.id !== currentVal && !(N >= 2 && selectorSlot <= 2)
                                  };
                                });
                              };

                              const S = isNinI ? 1 : isNinII ? 2 : isNinIII ? 3 : 0;

                              return (
                                <div className="space-y-4 p-4 bg-oro/5 border border-oro/10 ninja-clip-sm animate-in fade-in duration-300">
                                  <h5 className="text-caption font-black text-oro uppercase tracking-[0.2em] mb-2">Elementos de Ninjutsu Elemental</h5>

                                  {/* Selector Principal (Para Ninjutsu I, II y III) */}
                                  <SelectField
                                    label="ELEMENTO PRINCIPAL"
                                    value={pr?.elemento_principal_id ?? null}
                                    options={getOptionsForSelector(1, pr?.elemento_principal_id ?? null, [pr?.elemento_secundario_id ?? null, pr?.elemento_terciario_id ?? null])}
                                    disabled={!isEditing && !isNew || N === 1}
                                    onChange={(v) => {
                                      const newRamas = [...(character.personajes_ramas?.filter((r: any) => Number(r.slot) !== slot) || []), { ...pr, elemento_principal_id: v ? Number(v) : null }];
                                      onUpdateField('personajes_ramas', newRamas);
                                    }}
                                  />

                                  {/* Selector Secundario (Para Ninjutsu II y III) */}
                                  {(isNinII || isNinIII) && (
                                    <SelectField
                                      label="ELEMENTO SECUNDARIO"
                                      value={pr?.elemento_secundario_id ?? null}
                                      options={getOptionsForSelector(2, pr?.elemento_secundario_id ?? null, [pr?.elemento_principal_id ?? null, pr?.elemento_terciario_id ?? null])}
                                      disabled={!isEditing && !isNew}
                                      onChange={(v) => {
                                        const newRamas = [...(character.personajes_ramas?.filter((r: any) => Number(r.slot) !== slot) || []), { ...pr, elemento_secundario_id: v ? Number(v) : null }];
                                        onUpdateField('personajes_ramas', newRamas);
                                      }}
                                    />
                                  )}

                                  {/* Selector Terciario (Para Ninjutsu III) */}
                                  {isNinIII && (() => {
                                    const optionsLibres = getOptionsForSelector(3, pr?.elemento_terciario_id ?? null, [pr?.elemento_principal_id ?? null, pr?.elemento_secundario_id ?? null]);

                                    return (
                                      <SelectField
                                        label="ELEMENTO TERCIARIO"
                                        value={pr?.elemento_terciario_id ?? null}
                                        options={optionsLibres}
                                        disabled={!isEditing && !isNew}
                                        onChange={(v) => {
                                          const newRamas = [...(character.personajes_ramas?.filter((r: any) => Number(r.slot) !== slot) || []), { ...pr, elemento_terciario_id: v ? Number(v) : null }];
                                          onUpdateField('personajes_ramas', newRamas);
                                        }}
                                      />
                                    );
                                  })()}
                                </div>
                              );
                            })()}

                            {canAccessTraining && (() => {
                              if (!pr) return null;

                              const eligibleTrainings = (masters.entrenamientos || [])
                                .filter((e: any) => {
                                  if (Number(e.id_ramaclan) !== Number(pr.rama_id)) return false;

                                  // Lógica especial para Ninjutsu Elemental (rama_id = 4)
                                  if (Number(pr.rama_id) === 4) {
                                    if (!pr.elemento_principal_id) {
                                      // Si no se ha seleccionado el primer elemento, solo mostrar entrenamientos genéricos de Ninjutsu
                                      return !e.id_subespecialidad && meetsTrainingRequirements(e);
                                    }

                                    // Obtener el elemento principal
                                    const mainElement = (masters.elementos || []).find((el: any) => Number(el.id) === Number(pr.elemento_principal_id));

                                    // Buscar la sub-especialidad de elemento que coincida
                                    const elementSub = mainElement
                                      ? (masters.subEspecialidades || []).find((s: any) =>
                                        Number(s.rama_id) === 4 &&
                                        (s.slug?.toLowerCase() === mainElement.nombre_jap?.toLowerCase() ||
                                          s.nombre?.toLowerCase() === mainElement.nombre_esp?.toLowerCase() ||
                                          s.nombre?.toLowerCase() === mainElement.nombre_jap?.toLowerCase())
                                      )
                                      : null;

                                    if (!elementSub) {
                                      return !e.id_subespecialidad && meetsTrainingRequirements(e);
                                    }

                                    // Permitir entrenamientos del elemento principal o entrenamientos genéricos de Ninjutsu
                                    return (Number(e.id_subespecialidad) === Number(elementSub.id) || !e.id_subespecialidad) && meetsTrainingRequirements(e);
                                  }

                                  // Lógica por defecto para otras especialidades
                                  return (!pr.sub_especialidad_id ? !e.id_subespecialidad : (Number(e.id_subespecialidad) === Number(pr.sub_especialidad_id) || !e.id_subespecialidad)) && meetsTrainingRequirements(e);
                                });

                              const rankOrderMap: Record<string, number> = masters.rankOrder || { 'D': 1, 'C': 2, 'B': 3, 'A': 4, 'S': 5 };
                              const ranks = Array.from(new Set(eligibleTrainings.map((e: any) => (e.rango || 'B').toUpperCase())))
                                .sort((a, b) => (rankOrderMap[a as string] || 0) - (rankOrderMap[b as string] || 0)) as string[];

                              if (ranks.length === 0) return null;

                              return (
                                <div className="space-y-4">
                                  {ranks.map((rank: string) => {
                                    const rankOptions = eligibleTrainings
                                      .filter((e: any) => (e.rango || 'B').toUpperCase() === rank)
                                      .map((e: any) => {
                                        const costText = canAffordTraining(e) && (e.coste_exp > 0 || e.coste_ryous > 0 || e.coste_puntos_aprendizaje > 0)
                                          ? ` (${e.coste_exp} EXP / ${e.coste_ryous} Ryous / ${e.coste_puntos_aprendizaje} PA)`
                                          : '';
                                        return { label: `${e.nombre_esp}${costText}`, value: e.id };
                                      });

                                    const selectedTraining = character.personajes_entrenamientos?.find((pe: any) =>
                                      Number(pe.rama_id) === Number(pr.rama_id) &&
                                      eligibleTrainings.some((et: any) => et.id === Number(pe.entrenamiento_id) && (et.rango || 'B').toUpperCase() === rank)
                                    );

                                    return (
                                      <SelectField
                                        key={rank}
                                        label={`ENTRENAMIENTO RANGO ${rank}`}
                                        value={selectedTraining?.entrenamiento_id ?? null}
                                        options={rankOptions}
                                        disabled={!isEditing && !isNew}
                                        onChange={(v) => {
                                          const otherEntrenamientos = character.personajes_entrenamientos?.filter((pe: any) => {
                                            if (Number(pe.rama_id) !== Number(pr.rama_id)) return true;
                                            const et = (masters.entrenamientos || []).find((x: any) => x.id === Number(pe.entrenamiento_id));
                                            return et && (et.rango || 'B').toUpperCase() !== rank;
                                          }) || [];

                                          let deltaExp = 0;
                                          let deltaRyous = 0;
                                          let deltaPA = 0;

                                          // Refund old selected training if it was newly added (not in original character)
                                          if (selectedTraining) {
                                            const oldTrainingObj = (masters.entrenamientos || []).find((x: any) => x.id === Number(selectedTraining.entrenamiento_id));
                                            const isOldNew = !originalCharacter?.personajes_entrenamientos?.some(
                                              (oe: any) => Number(oe.entrenamiento_id) === Number(selectedTraining.entrenamiento_id)
                                            );
                                            if (isOldNew && oldTrainingObj) {
                                              deltaExp += oldTrainingObj.coste_exp || 0;
                                              deltaRyous += oldTrainingObj.coste_ryous || 0;
                                              deltaPA += oldTrainingObj.coste_puntos_aprendizaje || 0;
                                            }
                                          }

                                          const newEntrenamientos = [...otherEntrenamientos];
                                          if (v) {
                                            const newTrainingObj = (masters.entrenamientos || []).find((x: any) => x.id === Number(v));
                                            const isNewNew = !originalCharacter?.personajes_entrenamientos?.some(
                                              (oe: any) => Number(oe.entrenamiento_id) === Number(v)
                                            );

                                            if (isNewNew && newTrainingObj) {
                                              const tempExp = (character.xp || 0) + deltaExp;
                                              const tempRyous = (character.ryous || 0) + deltaRyous;
                                              const tempPA = (character.puntos_aprendizaje || 0) + deltaPA;

                                              const costExp = newTrainingObj.coste_exp || 0;
                                              const costRyous = newTrainingObj.coste_ryous || 0;
                                              const costPA = newTrainingObj.coste_puntos_aprendizaje || 0;

                                              if (tempExp < costExp || tempRyous < costRyous || tempPA < costPA) {
                                                addToast(`RECURSOS INSUFICIENTES. REQUIERES ${costExp} EXP, ${costRyous} RYOUS Y ${costPA} PA.`, "error");
                                                return;
                                              }

                                              deltaExp -= costExp;
                                              deltaRyous -= costRyous;
                                              deltaPA -= costPA;
                                            }

                                            newEntrenamientos.push({
                                              personaje_id: character.id,
                                              rama_id: pr.rama_id,
                                              entrenamiento_id: Number(v)
                                            });
                                          }

                                          onUpdateField('personajes_entrenamientos', newEntrenamientos);
                                          onUpdateField('xp', (character.xp || 0) + deltaExp);
                                          onUpdateField('ryous', (character.ryous || 0) + deltaRyous);
                                          onUpdateField('puntos_aprendizaje', (character.puntos_aprendizaje || 0) + deltaPA);
                                        }}
                                      />
                                    );
                                  })}
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </SectionCard>

                {/* BLOQUE GRÁFICO DE ELEMENTOS DEL PERSONAJE */}
                <SectionCard title="AFINIDADES ELEMENTALES" color="oro">
                  {derivedElements.length === 0 ? (
                    <div className="py-12 text-center rounded-[4px] border border-oro/10 bg-black/20 text-xs font-black text-oro/30 uppercase tracking-[0.25em]">
                      Este shinobi no posee afinidades elementales
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-6">
                      {derivedElements.map((elem: any) => (
                        <div
                          key={elem.id}
                          className="flex flex-col items-center justify-center p-6 bg-black/40 border border-oro/10 hover:border-oro/30 transition-all group relative overflow-hidden ninja-clip-sm"
                        >
                          <div className="absolute top-0 right-0 w-16 h-16 bg-oro/5 rounded-full blur-xl pointer-events-none" />
                          <div className="w-24 h-24 rounded-none flex items-center justify-center group-hover:scale-110 group-hover:border-oro/50 transition-all duration-500  relative mb-2">
                            {elem.url_icono ? (
                              <img src={elem.url_icono} alt={elem.nombre_esp} className="w-20 h-20 object-contain" />
                            ) : (
                              <span className="text-4xl font-bold text-oro/40 group-hover:text-oro transition-colors">{elem.nombre_jap?.[0] || elem.nombre_esp?.[0]}</span>
                            )}
                          </div>
                          {elem.nombre_jap && (
                            <span className="text-caption font-black text-oro uppercase tracking-widest text-center leading-none">
                              {elem.nombre_jap}
                            </span>
                          )}
                          <span className="text-caption font-black text-oro/50 uppercase tracking-tighter text-center mt-1">
                            {elem.nombre_esp}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </SectionCard>


              </div>
            </div>
          )}

          {activeTab === 'ninja' && (
            <div className="animate-fade-in">
              <SectionCard
                title="ATRIBUTOS Y ESTADÍSTICAS"
                icon={Heart}
                color="oro"
                headerAction={
                  <div className="flex flex-col items-end gap-2">
                    <div className="flex flex-col items-end">
                      <span className="text-caption font-black text-oro/40 uppercase tracking-[0.3em] mb-1">Puntos Disponibles</span>
                      <span className="text-3xl xl:text-5xl font-black text-oro italic">
                        {puntosLibres}
                        <span className="text-oro/20 text-sm xl:text-lg ml-2">/ {character.puntos_stats}</span>
                      </span>
                    </div>
                    {!isEditing && !isNew && (
                      <Link
                        href="/registros/tiendas/1"
                        className="ninja-btn-oro py-3.5 px-6 text-xs xl:text-sm font-black uppercase tracking-widest text-center w-full min-w-[130px] shrink-0"
                        style={{ clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)' }}
                      >
                        Tienda EXP
                      </Link>
                    )}
                  </div>
                }
              >
                {/* Gráfico en Radar Dinámico */}
                <div className="flex justify-center items-center w-full mb-2 border-b border-oro/5 pb-2 -mt-6">
                  <CharacterRadarChart
                    stats={character.stats_base}
                    maxVal={10}
                  />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 xl:gap-10">
                  {/* Estadísticas Base */}
                  <div className="lg:col-span-5 space-y-10">
                    <div className="flex items-center gap-4 mb-8">
                      <div className="w-1.5 h-1.5 bg-rojo-sangre rotate-45" />
                      <h3 className="text-xs xl:text-sm font-black text-oro/60 uppercase tracking-[0.4em]">Estadísticas Base</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {['NIN', 'GEN', 'TAI', 'SM', 'FUE', 'AGI', 'EST', 'INT'].map((s) => {
                        const val = character.stats_base[s as keyof CharacterStats] || 0;
                        const max = masters.rangoRules?.[character.rango]?.stat_max || 10;
                        return (
                          <div key={s} className="bg-black/40 border border-oro/10 py-3 px-5 flex justify-between items-center relative group hover:border-oro/40 transition-all overflow-hidden" style={{ clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 0px)' }}>
                            <div className="absolute top-0 right-0 w-12 h-12 bg-oro/5 rotate-45 -mr-6 -mt-6 pointer-events-none" />
                            <div className="flex flex-col items-start relative z-10">
                              <span className="text-xs font-black text-oro/60 uppercase tracking-[0.2em]">{s}</span>
                              <span className="text-caption font-black text-oro/20 mt-0.5 uppercase tracking-wider whitespace-nowrap">LÍMITE: {max}</span>
                            </div>
                            <div className="flex items-center gap-1.5 relative z-10">
                              <input
                                type="number"
                                value={val}
                                disabled={!isEditing && !isNew}
                                onChange={(e) => onUpdateStat(s as keyof CharacterStats, parseInt(e.target.value) || 0)}
                                className="bg-transparent text-2xl xl:text-3xl font-black text-oro w-12 text-right outline-none disabled:cursor-default selection:bg-oro/20 leading-none py-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              />
                              {(isEditing || isNew) && (
                                <div className="flex flex-col gap-0 justify-center items-center select-none">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newVal = val + 1;
                                      if (newVal <= max) {
                                        onUpdateStat(s as keyof CharacterStats, newVal);
                                      }
                                    }}
                                    className="text-oro/40 hover:text-oro active:scale-75 transition-all p-0.5"
                                    title="Incrementar"
                                  >
                                    <ChevronUp className="w-3.5 h-3.5 stroke-[3]" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newVal = val - 1;
                                      if (newVal >= 0) {
                                        onUpdateStat(s as keyof CharacterStats, newVal);
                                      }
                                    }}
                                    className="text-oro/40 hover:text-oro active:scale-75 transition-all p-0.5"
                                    title="Decrementar"
                                  >
                                    <ChevronDown className="w-3.5 h-3.5 stroke-[3]" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Atributos Calculados */}
                  <div className="lg:col-span-3 space-y-10 lg:border-l lg:border-oro/5 lg:pl-6 xl:pl-10">
                    <div className="flex items-center gap-4 mb-8">
                      <div className="w-1.5 h-1.5 bg-rojo-sangre rotate-45" />
                      <h3 className="text-xs xl:text-sm font-black text-oro/60 uppercase tracking-[0.4em]">Atributos</h3>
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                      {[
                        { label: 'VIT', val: character.atributos_derivados.VIT, color: 'text-red-600' },
                        { label: 'CH', val: character.atributos_derivados.CH, color: 'text-blue-500' },
                        { label: 'VEL', val: character.atributos_derivados.VEL, color: 'text-oro' },
                        { label: 'VR', val: character.atributos_derivados.VR, color: 'text-oro/60' },
                        { label: 'DET', val: character.atributos_derivados.DET, color: 'text-oro/40' },
                      ].map(attr => (
                        <div key={attr.label} className="bg-black/60 border border-oro/10 p-5 flex justify-between items-center group hover:border-oro/40 transition-all" style={{ clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)' }}>
                          <span className="text-xs font-black text-oro/40 uppercase tracking-[0.2em]">{attr.label}</span>
                          <span className={`text-2xl font-black ${attr.color} italic leading-none`}>
                            {String(attr.val || 0)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Panel de Rasgos */}
                  <div className="lg:col-span-4 space-y-10 lg:border-l lg:border-oro/5 lg:pl-6 xl:pl-10">
                    <div className="flex items-center gap-4 mb-8">
                      <div className="w-1.5 h-1.5 bg-rojo-sangre rotate-45" />
                      <h3 className="text-xs xl:text-sm font-black text-oro/60 uppercase tracking-[0.4em]">Rasgos</h3>
                    </div>

                    <div className="space-y-6">
                      {(() => {
                        const rankOrder = masters.rankOrder || { "D": 1, "C": 2, "B": 3, "A": 4, "S": 5 };
                        const charRankVal = rankOrder[character.rango] || 1;

                        // Find auto-assigned traits from branches/clans
                        const activeRamaIds = (character.personajes_ramas || []).map((pr: any) => pr.rama_id).filter(Boolean);
                        const autoTraits: Rasgo[] = [];
                        if (masters.ramas) {
                          activeRamaIds.forEach((id: number) => {
                            const rama = masters.ramas.find((r: any) => r.id === id);
                            if (rama && rama.rasgo_id) {
                              const rasgo = rasgosList.find(r => r.id === rama.rasgo_id);
                              if (rasgo) autoTraits.push(rasgo);
                            }
                          });
                        }

                        // Helper to find if a slot has a clan/rama trait assigned
                        const getForcedTrait = (category: string, rank: string) => {
                          return autoTraits.find(t => t.categoria === category && t.rango === rank && charRankVal >= (rankOrder[t.rango] || 1));
                        };

                        // Helper to get selected trait for a slot
                        const getSelectedTrait = (category: string, rank: string) => {
                          const pjRasgos = character.personajes_rasgos || [];
                          return pjRasgos.find((r: any) => r.info_rasgos?.categoria === category && r.info_rasgos?.rango === rank)?.info_rasgos;
                        };

                        // Single choice slots
                        const slots = [
                          { label: 'Físico D', category: 'Físico', rank: 'D', available: rasgosList.filter(r => r.categoria === 'Físico' && r.rango === 'D' && (!r.especial || r.personajes?.includes(character.id))) },
                          { label: 'Psicológico D', category: 'Psicológico', rank: 'D', available: rasgosList.filter(r => r.categoria === 'Psicológico' && r.rango === 'D' && (!r.especial || r.personajes?.includes(character.id))) },
                          { label: 'Psicológico C', category: 'Psicológico', rank: 'C', available: rasgosList.filter(r => r.categoria === 'Psicológico' && r.rango === 'C' && (!r.especial || r.personajes?.includes(character.id))), minRank: 'C' },
                          { label: 'Psicológico B', category: 'Psicológico', rank: 'B', available: rasgosList.filter(r => r.categoria === 'Psicológico' && r.rango === 'B' && (!r.especial || r.personajes?.includes(character.id))), minRank: 'B' },
                          { label: 'Habilidad A', category: 'Habilidad', rank: 'A', available: rasgosList.filter(r => r.categoria === 'Habilidad' && r.rango === 'A' && (!r.especial || r.personajes?.includes(character.id))), minRank: 'A' }
                        ];

                        const selectSingle = (category: string, rank: string, rasgoIdStr: string) => {
                          const current = character.personajes_rasgos || [];
                          const newId = rasgoIdStr ? Number(rasgoIdStr) : null;
                          let filtered = current.filter((r: any) => !(r.info_rasgos?.categoria === category && r.info_rasgos?.rango === rank));
                          if (newId) {
                            const selected = rasgosList.find(r => r.id === newId);
                            if (selected) {
                              filtered.push({ personaje_id: character.id, rasgo_id: selected.id, info_rasgos: selected });
                            }
                          }
                          onUpdateField('personajes_rasgos', filtered);
                        };

                        const toggleHabilidad = (rasgo: Rasgo, active: boolean) => {
                          const current = character.personajes_rasgos || [];
                          if (active) {
                            onUpdateField('personajes_rasgos', [...current, { personaje_id: character.id, rasgo_id: rasgo.id, info_rasgos: rasgo }]);
                          } else {
                            onUpdateField('personajes_rasgos', current.filter((r: any) => Number(r.rasgo_id) !== Number(rasgo.id)));
                          }
                        };

                        return (
                          <div className="space-y-4">
                            {slots.map((slot) => {
                              const isUnlocked = !slot.minRank || charRankVal >= (rankOrder[slot.minRank] || 1);
                              if (!isUnlocked) return null;

                              const forced = getForcedTrait(slot.category, slot.rank);
                              const selected = getSelectedTrait(slot.category, slot.rank);

                              return (
                                <div key={slot.label} className="bg-black/30 border border-oro/10 p-4 relative" style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}>
                                  <div className="flex justify-between items-center mb-1">
                                    <span className="text-caption font-black text-oro/60 uppercase tracking-widest">{slot.label}</span>
                                  </div>

                                  {forced ? (
                                    <div className="text-sm font-black text-oro italic uppercase mt-1">
                                      {forced.nombre}
                                    </div>
                                  ) : (isEditing || isNew) ? (
                                    <div className="mt-2">
                                      <NinjaSelect
                                        value={selected?.id || ''}
                                        onChange={(val) => selectSingle(slot.category, slot.rank, val)}
                                        options={slot.available.map(r => ({ label: r.nombre, value: r.id }))}
                                        placeholder="-- SIN RASGO --"
                                        variant="inline"
                                      />
                                    </div>
                                  ) : (
                                    <div className="text-sm font-black text-oro italic uppercase mt-1">
                                      {selected?.nombre || <span className="text-oro/20 text-xs">SIN RASGO</span>}
                                    </div>
                                  )}
                                </div>
                              );
                            })}

                            {/* Habilidad Rango A */}
                            {charRankVal >= (rankOrder['A'] || 4) && (
                              <div className="border-t border-oro/10 pt-4 mt-4 space-y-4">
                                <span className="text-caption font-black text-oro/60 uppercase tracking-widest block">Rasgos de Habilidad (Rango A)</span>

                                {(() => {
                                  // Find Habilidad rasgos
                                  const habRasgos = rasgosList.filter(r => r.categoria === 'Habilidad' && r.rango === 'A' && (!r.especial || r.personajes?.includes(character.id)));
                                  if (habRasgos.length === 0) {
                                    return <p className="text-caption text-oro/20 font-black uppercase tracking-wider">No hay rasgos de habilidad creados</p>;
                                  }

                                  return (
                                    <div className="space-y-2">
                                      {habRasgos.map(r => {
                                        const assocStat = r.stat;
                                        const statVal = assocStat ? (character.stats_base[assocStat as keyof CharacterStats] || 0) : 0;
                                        const isStatUnlocked = statVal >= 6;
                                        const forced = autoTraits.some(at => at.id === r.id);
                                        const checked = forced || (character.personajes_rasgos || []).some((pjR: any) => Number(pjR.rasgo_id) === Number(r.id));
                                        const canToggle = (isEditing || isNew) && !forced && isStatUnlocked;

                                        return (
                                          <div key={r.id} className={`flex items-center justify-between p-3 bg-black/40 border ${checked ? 'border-oro/35' : 'border-oro/5'} transition-all`} style={{ clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)' }}>
                                            <div className="flex flex-col min-w-0">
                                              <span className={`text-xs font-black uppercase tracking-wider ${checked ? 'text-oro' : 'text-oro/40'}`}>{r.nombre}</span>
                                              <span className="text-caption font-black text-oro/30 uppercase tracking-widest mt-0.5">
                                                Requisito: {assocStat} &gt;= 6 (Tienes: {statVal})
                                              </span>
                                            </div>

                                            {forced ? (
                                              <span className="text-caption font-black text-rojo-sangre uppercase tracking-wider bg-rojo-sangre/10 px-2 py-0.5">Automático</span>
                                            ) : (isEditing || isNew) ? (
                                              <label className="flex items-center cursor-pointer">
                                                <input
                                                  type="checkbox"
                                                  disabled={!canToggle}
                                                  checked={checked}
                                                  onChange={(e) => toggleHabilidad(r, e.target.checked)}
                                                  className="hidden"
                                                />
                                                <div className={`w-8 h-4 transition-all relative ${checked ? 'bg-oro/20 border-oro/40' : 'bg-black/40 border-oro/10'} border ${!isStatUnlocked ? 'opacity-30 cursor-not-allowed' : ''}`}>
                                                  <div className={`absolute top-[2px] w-2.5 h-2.5 transition-all ${checked ? 'right-[2px] bg-oro shadow-[0_0_10px_rgba(255,230,159,0.5)]' : 'left-[2px] bg-oro/10'}`} />
                                                </div>
                                              </label>
                                            ) : (
                                              <span className={`text-caption font-black uppercase tracking-widest ${checked ? 'text-oro' : 'text-oro/10'}`}>
                                                {checked ? 'ADQUIRIDO' : 'BLOQUEADO'}
                                              </span>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  );
                                })()}
                              </div>
                            )}

                            {/* Rasgos Especiales */}
                            {(() => {
                              const espRasgos = rasgosList.filter(r => r.especial && r.personajes?.includes(character.id));
                              if (espRasgos.length === 0) return null;

                              return (
                                <div className="border-t border-oro/10 pt-4 mt-4 space-y-4">
                                  <span className="text-caption font-black text-oro/60 uppercase tracking-widest block">Rasgos Especiales</span>
                                  <div className="space-y-2">
                                    {espRasgos.map(r => (
                                      <div
                                        key={r.id}
                                        className="flex items-center justify-between p-3 bg-black/40 border border-oro/20 transition-all"
                                        style={{ clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)' }}
                                      >
                                        <div className="flex flex-col min-w-0">
                                          <span className="text-xs font-black uppercase tracking-wider text-oro">{r.nombre}</span>
                                          <span className="text-[10px] font-black text-oro/30 uppercase tracking-widest mt-0.5">
                                            Rango: {r.rango} | Categoría: {r.categoria}
                                          </span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </SectionCard>
            </div>
          )}
          {activeTab === 'equipamiento' && (
            <div className="space-y-8 animate-fade-in">
              <ResourceDisplay character={character} totalExp={totalExp} totalRyous={totalRyous} totalPuntosCombate={totalPuntosCombate} xpLimitUsage={masters?.xpLimitUsage} />

              {/* Submenu for Inventario */}
              <div className="flex flex-nowrap gap-4 overflow-x-auto pb-2 lg:pb-0 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
                {(['mochila', 'equipo'] as const).map(tab => {
                  const isActive = inventarioSubTab === tab;
                  const label = tab === 'mochila' ? 'INVENTARIO' : 'EQUIPO';

                  return (
                    <button
                      key={tab}
                      onClick={() => setInventarioSubTab(tab)}
                      className={`px-8 sm:px-16 py-4 text-[11px] xl:text-sm font-black uppercase tracking-widest transition-all duration-300 border ninja-clip-sm shrink-0 relative group flex items-center gap-4 ${isActive
                        ? 'bg-oro text-rojo-sangre border-oro shadow-[0_0_30px_rgba(255,230,159,0.5)]'
                        : 'bg-black/60 text-oro/30 border-oro/10 hover:border-oro/60 hover:text-oro hover:bg-black/90'
                        }`}
                    >
                      <span>{label}</span>
                      {!isActive && (
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0.5 bg-oro transition-all duration-300 group-hover:w-[80%]" />
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="relative mb-8">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-oro/40 pointer-events-none" />
                <input
                  value={inventarioSubTab === 'mochila' ? inventorySearch : equipmentSearch}
                  onChange={(e) => {
                    if (inventarioSubTab === 'mochila') {
                      setInventorySearch(e.target.value);
                    } else {
                      setEquipmentSearch(e.target.value);
                    }
                  }}
                  placeholder={
                    inventarioSubTab === 'mochila'
                      ? 'BUSCAR EN MOCHILA...'
                      : 'BUSCAR EQUIPAMIENTO...'
                  }
                  className="w-full bg-black/50 border border-oro/10 py-4 pl-12 pr-12 text-oro font-black uppercase tracking-widest text-xs outline-none focus:border-oro/40 transition-all placeholder:text-oro/20 ninja-clip-sm"
                />
                {((inventarioSubTab === 'mochila' && inventorySearch) || (inventarioSubTab === 'equipo' && equipmentSearch)) && (
                  <button
                    type="button"
                    onClick={() => {
                      if (inventarioSubTab === 'mochila') {
                        setInventorySearch('');
                      } else {
                        setEquipmentSearch('');
                      }
                    }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-oro/30 hover:text-oro transition-colors"
                    title="Limpiar búsqueda"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              {inventarioSubTab === 'mochila' && (
                <SectionCard title="MOCHILA Y PERTENENCIAS" icon={Briefcase} color="oro">

                  {(canEdit || isNew) && (isEditing || isNew) && (
                    <div className="mb-12 pb-8 border-b border-oro/10">
                      <SearchableSelect
                        label="ADQUIRIR NUEVO OBJETO"
                        placeholder="BUSCAR EN EL GLOSARIO DE OBJETOS..."
                        options={(glosarioFiltrado || [])
                          .filter((i: Glosario) => {
                            const subData = i.info_glosario_subcategorias;
                            const subSlug = (Array.isArray(subData) ? subData[0]?.slug : subData?.slug) || '';
                            const isEquipment = i.zona_equipable || subSlug === 'equipo';
                            return i.categoria_id === 2 && !isEquipment && meetsRequirements(i) && !(character.personajes_inventario || []).some((pi: PersonajeItem) => pi.item_id === i.id);
                          })
                          .map((i: any) => {
                            const subData = i.info_glosario_subcategorias;
                            const subName = (Array.isArray(subData) ? subData[0]?.nombre : subData?.nombre) || 'GENERAL';
                            const paEfectivo = i.coste_puntos_aprendizaje || 0;
                            const paCostText = ` / ${paEfectivo} PA`;
                            const nameText = i.nombre_jp ? `${i.nombre_jp} - ${i.nombre_es}` : i.nombre_es;
                            return {
                              label: `${nameText} (${subName}) — ${i.coste_exp} EXP / ${i.coste_ryous} RYOUS${paCostText}`,
                              value: i.id
                            };
                          })
                        }
                        onChange={(v) => {
                          const it = (glosarioFiltrado || []).find((i: any) => i.id === Number(v));
                          const current = character.personajes_inventario || [];

                          if (it && !current.some((i: any) => i.item_id === it.id)) {
                            const costExp = it.coste_exp || 0;
                            const costRyous = it.coste_ryous || 0;
                            const costPA = it.coste_puntos_aprendizaje || 0;
                            const currentExp = character.xp || 0;
                            const currentRyous = character.ryous || 0;
                            const currentPA = character.puntos_aprendizaje || 0;

                            if (currentExp < costExp || currentRyous < costRyous || currentPA < costPA) {
                              addToast(`RECURSOS INSUFICIENTES. REQUIERES ${costExp} EXP, ${costRyous} RYOUS Y ${costPA} PA.`, "error");
                              return;
                            }

                            onUpdateField('personajes_inventario', [...current, { item_id: it.id, info_glosario: it, equipado: false }]);
                            if (costExp > 0) onUpdateField('xp', currentExp - costExp);
                            if (costRyous > 0) onUpdateField('ryous', currentRyous - costRyous);
                            if (costPA > 0) onUpdateField('puntos_aprendizaje', currentPA - costPA);
                          }
                        }}
                      />
                    </div>
                  )}

                  <div className="space-y-16">
                    {Object.keys(groupedInventory).length === 0 ? (
                      <div className="py-12 text-center rounded-[4px] border border-oro/10 bg-black/20 text-xs font-black text-oro/30 uppercase tracking-[0.25em]">
                        {hasInventoryItems && inventorySearch.trim() ? 'No hay objetos que coincidan con la búsqueda' : 'No tienes objetos en la mochila'}
                      </div>
                    ) : (
                      Object.entries(groupedInventory).map(([aldeaName, ramas]: [string, any]) => (
                        <div key={aldeaName} className="space-y-10">
                          <div className="flex items-center gap-6">
                            <h3 className="text-xl xl:text-2xl font-black text-oro uppercase tracking-[0.2em]">{aldeaName}</h3>
                            <div className="flex-1 h-px bg-oro/10" />
                          </div>

                          <div className="space-y-8 pl-4 border-l border-oro/5">
                            {Object.entries(ramas).map(([ramaName, subs]: [string, any]) => (
                              <div key={ramaName} className="space-y-6">
                                <h4 className="text-base xl:text-lg font-black text-oro/70 uppercase tracking-widest flex items-center gap-2">
                                  <div className="w-1.5 h-1.5 bg-oro rotate-45" />
                                  {ramaName}
                                </h4>

                                <div className="space-y-6">
                                  {Object.entries(subs).map(([subName, items]: [string, any]) => (
                                    <div key={subName} className="space-y-4">
                                      {subName !== '' && (
                                        <h5 className="text-caption xl:text-xs font-black text-oro/40 uppercase tracking-[0.4em] ml-2 flex items-center gap-3">
                                          <div className="w-1 h-1 bg-rojo-sangre rotate-45" />
                                          {subName}
                                        </h5>
                                      )}
                                      <div className="ninja-card-oro p-1 overflow-hidden border border-oro/10">
                                        <div className="overflow-x-auto scrollbar-hide">
                                          <table className="w-full text-left border-collapse table-fixed min-w-[600px]">
                                            <thead>
                                              <tr className="border-b border-oro/10 text-oro/70 text-caption xl:text-xs font-black uppercase tracking-[0.3em] bg-black/20">
                                                <th className="py-3 px-5 w-[40%]">Objeto</th>
                                                <th className="py-3 px-5 w-[45%]">Requisitos</th>
                                                <th className="py-3 px-5 w-[15%] text-center">Acciones</th>
                                              </tr>
                                            </thead>
                                            <tbody className="divide-y divide-oro/5 bg-black/40">
                                              {items.map((pi: PersonajeItem, idx: number) => (
                                                <tr key={`${pi.item_id}-${idx}`} className="hover:bg-oro/5 transition-colors group">
                                                  <td className="py-3 px-5">
                                                    <div className="flex flex-col">
                                                      <span className="font-black text-oro uppercase tracking-widest text-sm xl:text-base flex items-center gap-2">
                                                        {pi.info_glosario?.nombre_jp || pi.info_glosario?.nombre_es}
                                                        {pi.info_glosario?.es_tienda_exp && (
                                                          <span className="px-1.5 py-0.5 text-caption font-black uppercase bg-purple-500/20 border border-purple-500/40 text-purple-300 tracking-widest rounded-sm">
                                                            EXP SHOP
                                                          </span>
                                                        )}
                                                        {pi.info_glosario?.zona_equipable && (
                                                          <span className="px-1.5 py-0.5 text-[9px] font-black uppercase bg-oro/10 border border-oro/30 text-oro tracking-widest rounded-sm">
                                                            {pi.info_glosario.zona_equipable}
                                                          </span>
                                                        )}
                                                      </span>
                                                      {pi.info_glosario?.nombre_jp && (
                                                        <span className="text-caption text-oro/30 uppercase font-black tracking-tighter mt-0.5">
                                                          {pi.info_glosario?.nombre_es}
                                                        </span>
                                                      )}
                                                    </div>
                                                  </td>
                                                  <td className="py-3 px-5">
                                                    {renderRequisitos(pi.info_glosario?.requisitos)}
                                                  </td>
                                                  <td className="py-3 px-5 text-center">
                                                    {(isEditing || isNew) && (
                                                      <button
                                                        onClick={() => {
                                                          const isNewlyAdded = !pi.id;
                                                          if (isNewlyAdded) {
                                                            if (pi.info_glosario?.coste_exp) onUpdateField('xp', (character.xp || 0) + pi.info_glosario.coste_exp);
                                                            if (pi.info_glosario?.coste_ryous) onUpdateField('ryous', (character.ryous || 0) + pi.info_glosario.coste_ryous);
                                                            if (pi.info_glosario?.coste_puntos_aprendizaje) onUpdateField('puntos_aprendizaje', (character.puntos_aprendizaje || 0) + pi.info_glosario.coste_puntos_aprendizaje);
                                                          }
                                                          onUpdateField('personajes_inventario', character.personajes_inventario?.filter((i: PersonajeItem) => i.item_id !== pi.item_id));
                                                        }}
                                                        className="p-2 bg-red-600/10 border border-red-600/40 hover:border-error-text hover:bg-red-600/20 text-red-500 hover:text-red-400 transition-all ninja-clip-xs"
                                                        title="Eliminar Objeto"
                                                      >
                                                        <Trash2 className="w-4 h-4" />
                                                      </button>
                                                    )}
                                                  </td>
                                                </tr>
                                              ))}
                                            </tbody>
                                          </table>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )))}
                  </div>


                </SectionCard>
              )}


              {inventarioSubTab === 'equipo' && (
                <SectionCard title="EQUIPO DE COMBATE" color="oro">

                  {(canEdit || isNew) && (isEditing || isNew) && (
                    <div className="mb-8 pb-8 border-b border-oro/10">
                      <SearchableSelect
                        label="ADQUIRIR NUEVO EQUIPAMIENTO"
                        placeholder="BUSCAR EN EL GLOSARIO DE EQUIPO..."
                        options={(glosarioFiltrado || [])
                          .filter((i: Glosario) => {
                            const subData = i.info_glosario_subcategorias;
                            const subSlug = (Array.isArray(subData) ? subData[0]?.slug : subData?.slug) || '';
                            const isEquipment = i.zona_equipable || subSlug === 'equipo';
                            return i.categoria_id === 2 && isEquipment && meetsRequirements(i) && !(character.personajes_inventario || []).some((pi: PersonajeItem) => pi.item_id === i.id);
                          })
                          .map((i: any) => {
                            const subData = i.info_glosario_subcategorias;
                            const subName = (Array.isArray(subData) ? subData[0]?.nombre : subData?.nombre) || 'EQUIPO';
                            const paEfectivo = i.coste_puntos_aprendizaje || 0;
                            const paCostText = ` / ${paEfectivo} PA`;
                            const zoneText = i.zona_equipable ? ` [${i.zona_equipable}]` : '';
                            const nameText = i.nombre_jp ? `${i.nombre_jp} - ${i.nombre_es}` : i.nombre_es;
                            return {
                              label: `${nameText}${zoneText} (${subName}) — ${i.coste_exp} EXP / ${i.coste_ryous} RYOUS${paCostText}`,
                              value: i.id
                            };
                          })
                        }
                        onChange={(v) => {
                          const it = (glosarioFiltrado || []).find((i: any) => i.id === Number(v));
                          const current = character.personajes_inventario || [];

                          if (it && !current.some((i: any) => i.item_id === it.id)) {
                            const costExp = it.coste_exp || 0;
                            const costRyous = it.coste_ryous || 0;
                            const costPA = it.coste_puntos_aprendizaje || 0;
                            const currentExp = character.xp || 0;
                            const currentRyous = character.ryous || 0;
                            const currentPA = character.puntos_aprendizaje || 0;

                            if (currentExp < costExp || currentRyous < costRyous || currentPA < costPA) {
                              addToast(`RECURSOS INSUFICIENTES. REQUIERES ${costExp} EXP, ${costRyous} RYOUS Y ${costPA} PA.`, "error");
                              return;
                            }

                            onUpdateField('personajes_inventario', [...current, { item_id: it.id, info_glosario: it, equipado: false }]);
                            if (costExp > 0) onUpdateField('xp', currentExp - costExp);
                            if (costRyous > 0) onUpdateField('ryous', currentRyous - costRyous);
                            if (costPA > 0) onUpdateField('puntos_aprendizaje', currentPA - costPA);
                          }
                        }}
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {(['Cabeza', 'Cuerpo', 'Especial'] as const).map(zone => {
                      const allEquippedItems = (character.personajes_inventario || []).filter(
                        pi => pi.info_glosario?.zona_equipable === zone && pi.equipado
                      );
                      const nonOccupyingEquipped = allEquippedItems.filter(
                        pi => pi.info_glosario?.ocupa_espacio === false
                      );
                      const occupyingEquipped = allEquippedItems.filter(
                        pi => pi.info_glosario?.ocupa_espacio !== false
                      );

                      // Max slots available for this category = 1 base + number of non-occupying items currently equipped
                      const totalSlots = 1 + nonOccupyingEquipped.length;

                      // Available items from backpack that belong to this zone and are NOT currently equipped
                      const availableToEquip = (character.personajes_inventario || []).filter(
                        pi => pi.info_glosario?.zona_equipable === zone && !pi.equipado
                      );

                      // Match each slot index with equipped items.
                      // Since non-occupying items take their own slots, let's list occupied items first,
                      // then let the user assign item to each slot.
                      // We can build an array representing the current state of each slot.
                      const slots: Array<PersonajeItem | null> = [];
                      for (let i = 0; i < totalSlots; i++) {
                        const equippedAtSlot = allEquippedItems[i] || null;
                        slots.push(equippedAtSlot);
                      }

                      return (
                        <div key={zone} className="space-y-4 bg-black/30 p-5 border border-oro/10 rounded-lg">
                          <h4 className="text-base font-black text-oro uppercase tracking-wider border-b border-oro/15 pb-2 flex justify-between items-center">
                            <span>{zone}</span>
                            <span className="text-[10px] text-oro/40 font-bold uppercase tracking-widest">
                              {nonOccupyingEquipped.length > 0 ? `+${nonOccupyingEquipped.length} Libres` : ''}
                            </span>
                          </h4>

                          <div className="space-y-4">
                            {slots.map((equippedItem, slotIdx) => {
                              return (
                                <div key={slotIdx} className="space-y-2">
                                  <span className="text-[10px] font-black text-oro/40 uppercase tracking-widest block">
                                    Ranura {slotIdx + 1}
                                  </span>

                                  {isEditing || isNew ? (
                                    <div className="flex gap-2">
                                      <NinjaSelect
                                        value={equippedItem ? String(equippedItem.item_id) : ''}
                                        onChange={(val) => {
                                          const prevItemId = equippedItem?.item_id;
                                          const nextItemId = val ? Number(val) : null;

                                          let updatedList = [...(character.personajes_inventario || [])];

                                          // Unequip previous item if any
                                          if (prevItemId) {
                                            updatedList = updatedList.map(item =>
                                              item.item_id === prevItemId ? { ...item, equipado: false } : item
                                            );
                                          }

                                          // Equip next item if any
                                          if (nextItemId) {
                                            updatedList = updatedList.map(item =>
                                              item.item_id === nextItemId ? { ...item, equipado: true } : item
                                            );
                                          }

                                          onUpdateField('personajes_inventario', updatedList);
                                        }}
                                        options={[
                                          ...(equippedItem ? [{ label: equippedItem.info_glosario?.nombre_es || '', value: String(equippedItem.item_id) }] : []),
                                          ...availableToEquip.map(item => ({
                                            label: `${item.info_glosario?.nombre_es || ''}${item.info_glosario?.ocupa_espacio === false ? ' (Sin Hueco)' : ''}`,
                                            value: String(item.item_id)
                                          }))
                                        ]}
                                        placeholder="-- VACÍO --"
                                        variant="inline"
                                      />
                                    </div>
                                  ) : (
                                    <div className="min-h-[42px] flex items-center justify-between px-4 py-2 bg-black/40 border border-oro/5">
                                      {equippedItem ? (
                                        <div className="flex flex-col">
                                          <span className="text-xs font-black text-oro uppercase tracking-wider">
                                            {equippedItem.info_glosario?.nombre_es}
                                          </span>
                                          {equippedItem.info_glosario?.ocupa_espacio === false && (
                                            <span className="text-[9px] font-black text-amber-400 uppercase tracking-widest">
                                              No ocupa espacio
                                            </span>
                                          )}
                                        </div>
                                      ) : (
                                        <span className="text-xs font-black text-oro/20 uppercase tracking-wider">
                                          Vacío
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Baúl de Equipamiento */}
                  <div className="mt-12 space-y-6">
                    <h4 className="text-base xl:text-lg font-black text-oro/70 uppercase tracking-widest flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-oro rotate-45" />
                      Baúl de Equipamiento
                    </h4>

                    {possessedEquipment.length === 0 ? (
                      <div className="py-8 text-center rounded-[4px] border border-oro/10 bg-black/20 text-xs font-black text-oro/30 uppercase tracking-[0.25em]">
                        {hasPossessedEquipment && equipmentSearch.trim() ? 'No hay equipamiento que coincida con la búsqueda' : 'No tienes equipamiento en tu mochila'}
                      </div>
                    ) : (
                      <div className="ninja-card-oro p-1 overflow-hidden border border-oro/10">
                        <div className="overflow-x-auto scrollbar-hide">
                          <table className="w-full text-left border-collapse table-fixed min-w-[600px]">
                            <thead>
                              <tr className="border-b border-oro/10 text-oro/70 text-caption xl:text-xs font-black uppercase tracking-[0.3em] bg-black/20">
                                <th className="py-3 px-5 w-[35%]">Objeto de Equipo</th>
                                <th className="py-3 px-5 w-[20%] text-center">Zona</th>
                                <th className="py-3 px-5 w-[30%]">Estado</th>
                                <th className="py-3 px-5 w-[15%] text-center">Acciones</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-oro/5 bg-black/40">
                              {possessedEquipment.map((pi: PersonajeItem, idx: number) => (
                                <tr key={`${pi.item_id}-${idx}`} className="hover:bg-oro/5 transition-colors group">
                                  <td className="py-3 px-5">
                                    <div className="flex flex-col">
                                      <span className="font-black text-oro uppercase tracking-widest text-sm xl:text-base flex items-center gap-2">
                                        {pi.info_glosario?.nombre_es}
                                        {pi.info_glosario?.ocupa_espacio === false && (
                                          <span className="px-1.5 py-0.5 text-[9px] font-black uppercase bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 tracking-widest rounded-sm">
                                            Sin Hueco
                                          </span>
                                        )}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="py-3 px-5 text-center">
                                    <span className="inline-block px-2.5 py-1 bg-oro/10 border border-oro/20 text-oro text-xs font-black rounded-sm uppercase">
                                      {pi.info_glosario?.zona_equipable || 'General'}
                                    </span>
                                  </td>
                                  <td className="py-3 px-5">
                                    {pi.equipado ? (
                                      <span className="inline-flex items-center gap-1.5 text-xs font-black text-emerald-600 uppercase tracking-widest bg-emerald-500/10 border border-emerald-500/30 px-2 py-1 rounded-sm">
                                        Equipado
                                      </span>
                                    ) : (
                                      <span className="text-xs font-black text-oro/30 uppercase tracking-widest">
                                        En Mochila
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-3 px-5 text-center">
                                    {(isEditing || isNew) && (
                                      <button
                                        onClick={() => {
                                          const isNewlyAdded = !pi.id;
                                          if (isNewlyAdded) {
                                            if (pi.info_glosario?.coste_exp) onUpdateField('xp', (character.xp || 0) + pi.info_glosario.coste_exp);
                                            if (pi.info_glosario?.coste_ryous) onUpdateField('ryous', (character.ryous || 0) + pi.info_glosario.coste_ryous);
                                            if (pi.info_glosario?.coste_puntos_aprendizaje) onUpdateField('puntos_aprendizaje', (character.puntos_aprendizaje || 0) + pi.info_glosario.coste_puntos_aprendizaje);
                                          }
                                          onUpdateField('personajes_inventario', character.personajes_inventario?.filter((i: PersonajeItem) => i.item_id !== pi.item_id));
                                        }}
                                        className="p-2 bg-red-600/10 border border-red-600/40 hover:border-error-text hover:bg-red-600/20 text-red-500 hover:text-red-400 transition-all ninja-clip-xs"
                                        title="Eliminar Objeto"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>


                </SectionCard>
              )}
            </div>
          )}
          {activeTab === 'tecnicas' && (
            <div className="space-y-8 animate-fade-in">
              <ResourceDisplay character={character} totalExp={totalExp} totalRyous={totalRyous} totalPuntosCombate={totalPuntosCombate} xpLimitUsage={masters?.xpLimitUsage} />

              {/* Submenu for Técnicas */}
              <div className="flex flex-nowrap gap-4 overflow-x-auto pb-2 lg:pb-0 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
                {(['jutsus', 'pasivas', 'kuchiyoses'] as const).map(tab => {
                  const isActive = tecnicasSubTab === tab;
                  const label = tab === 'jutsus' ? 'TÉCNICAS' : tab === 'pasivas' ? 'HABILIDADES PASIVAS' : 'KUCHIYOSES';

                  return (
                    <button
                      key={tab}
                      onClick={() => setTecnicasSubTab(tab)}
                      className={`px-8 sm:px-16 py-4 text-[11px] xl:text-sm font-black uppercase tracking-widest transition-all duration-300 border ninja-clip-sm shrink-0 relative group flex items-center gap-4 ${isActive
                        ? 'bg-oro text-rojo-sangre border-oro shadow-[0_0_30px_rgba(255,230,159,0.5)]'
                        : 'bg-black/60 text-oro/30 border-oro/10 hover:border-oro/60 hover:text-oro hover:bg-black/90'
                        }`}
                    >
                      <span>{label}</span>
                      {!isActive && (
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0.5 bg-oro transition-all duration-300 group-hover:w-[80%]" />
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="relative">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-oro/40 pointer-events-none" />
                <input
                  value={techniqueSearch}
                  onChange={(e) => setTechniqueSearch(e.target.value)}
                  placeholder={
                    tecnicasSubTab === 'jutsus'
                      ? 'BUSCAR TÉCNICAS APRENDIDAS...'
                      : tecnicasSubTab === 'pasivas'
                        ? 'BUSCAR HABILIDADES PASIVAS...'
                        : 'BUSCAR KUCHIYOSES...'
                  }
                  className="w-full bg-black/50 border border-oro/10 py-4 pl-12 pr-12 text-oro font-black uppercase tracking-widest text-xs outline-none focus:border-oro/40 transition-all placeholder:text-oro/20 ninja-clip-sm"
                />
                {techniqueSearch && (
                  <button
                    type="button"
                    onClick={() => setTechniqueSearch('')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-oro/30 hover:text-oro transition-colors"
                    title="Limpiar búsqueda"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {tecnicasSubTab === 'jutsus' && (
                <div className="space-y-8">
                  {/* SECCIÓN 1: JUTSUS NINJA */}
                  <SectionCard title="JUTSUS" color="oro">
                    {(canEdit || isNew) && (isEditing || isNew) && (
                      <div className="mb-8 pb-8 border-b border-oro/10">
                        <SearchableSelect
                          label="APRENDER NUEVA TÉCNICA"
                          placeholder="BUSCAR JUTSU EN EL GLOSARIO..."
                          options={(glosarioFiltrado || [])
                            .filter((i: Glosario) => {
                              if (i.categoria_id !== 1) return false;
                              if (!meetsRequirements(i)) return false;
                              const current = character.personajes_tecnicas || [];
                              if (current.some((pt: PersonajeTecnica) => pt.tecnica_id === i.id)) return false;

                              // Validar límites de técnicas básicas de Ninjutsu II y III
                              const ninjutsuRama = (character.personajes_ramas || []).find((pr: any) => Number(pr.rama_id) === 4);
                              let isNinIIorIIIInBranch = false;
                              if (ninjutsuRama && ninjutsuRama.sub_especialidad_id) {
                                const sub = (masters.subEspecialidades || []).find((s: any) => s.id === ninjutsuRama.sub_especialidad_id);
                                if (sub && (sub.slug === 'ninjutsu-ii' || sub.slug === 'ninjutsu-iii')) {
                                  isNinIIorIIIInBranch = true;
                                }
                              }
                              const clanEleccion = character.eleccion_tecnicas_clan;
                              let isNinIIorIIIInClan = false;
                              if (clanEleccion?.sub_especialidad_id && Number(clanEleccion.rama_id) === 4) {
                                const sub = (masters.subEspecialidades || []).find((s: any) => s.id === Number(clanEleccion.sub_especialidad_id));
                                if (sub && (sub.slug === 'ninjutsu-ii' || sub.slug === 'ninjutsu-iii')) {
                                  isNinIIorIIIInClan = true;
                                }
                              }
                              const isNinIIorIII = isNinIIorIIIInBranch || isNinIIorIIIInClan;
                              const isFromClan = !isNinIIorIIIInBranch && isNinIIorIIIInClan;

                              const isNinjutsuOrClanElementalTech = (info: any) => {
                                if (isFromClan) {
                                  const clanIds = (character.personajes_ramas || []).map((r: any) => Number(r.rama_id)).filter((id: number) => id !== 4 && id > 0);
                                  return Number(info.rama_clan_id) === 4 || clanIds.includes(Number(info.rama_clan_id));
                                } else {
                                  return Number(info.rama_clan_id) === 4;
                                }
                              };

                              if (isNinIIorIII && isNinjutsuOrClanElementalTech(i) && i.basica === true) {
                                const basicNinjutsu = current.filter((pt: any) => {
                                  const info = pt.info_glosario;
                                  return info && isNinjutsuOrClanElementalTech(info) && info.basica === true;
                                });

                                const limitTotal = isFromClan ? 6 : 8;
                                const maxD = 3;
                                const maxC = isFromClan ? 2 : 3;
                                const maxB = isFromClan ? 1 : 2;

                                if (basicNinjutsu.length >= limitTotal) return false;

                                const tecRank = (i.rango || 'D').toUpperCase();
                                const rankCount = basicNinjutsu.filter((pt: any) => (pt.info_glosario?.rango || 'D').toUpperCase() === tecRank).length;

                                if (tecRank === 'D' && rankCount >= maxD) return false;
                                if (tecRank === 'C' && rankCount >= maxC) return false;
                                if (tecRank === 'B' && rankCount >= maxB) return false;
                                if (tecRank === 'A' || tecRank === 'S') return false;
                              }

                              return true;
                            })
                            .map((t: any) => {
                              const subData = t.info_glosario_subcategorias;
                              const subName = (Array.isArray(subData) ? subData[0]?.nombre : subData?.nombre) || 'TÉCNICA';
                              const paEfectivoT = t.coste_puntos_aprendizaje || 0;
                              const paCostText = ` / ${paEfectivoT} PA`;
                              const nameText = t.nombre_jp ? `${t.nombre_jp} - ${t.nombre_es}` : t.nombre_es;
                              return {
                                label: `${nameText} (${subName}) — ${t.coste_exp} EXP / ${t.coste_ryous} RYOUS${paCostText}`,
                                value: t.id
                              };
                            })
                          }
                          onChange={(v) => {
                            const tec = (glosarioFiltrado || []).find((t: any) => t.id === Number(v));
                            const current = character.personajes_tecnicas || [];

                            if (tec && !current.some((t: any) => t.tecnica_id === tec.id)) {
                              const ninjutsuRama = (character.personajes_ramas || []).find((pr: any) => Number(pr.rama_id) === 4);
                              let isNinIIorIIIInBranch = false;
                              if (ninjutsuRama && ninjutsuRama.sub_especialidad_id) {
                                const sub = (masters.subEspecialidades || []).find((s: any) => s.id === ninjutsuRama.sub_especialidad_id);
                                if (sub && (sub.slug === 'ninjutsu-ii' || sub.slug === 'ninjutsu-iii')) {
                                  isNinIIorIIIInBranch = true;
                                }
                              }
                              const clanEleccion = character.eleccion_tecnicas_clan;
                              let isNinIIorIIIInClan = false;
                              if (clanEleccion?.sub_especialidad_id && Number(clanEleccion.rama_id) === 4) {
                                const sub = (masters.subEspecialidades || []).find((s: any) => s.id === Number(clanEleccion.sub_especialidad_id));
                                if (sub && (sub.slug === 'ninjutsu-ii' || sub.slug === 'ninjutsu-iii')) {
                                  isNinIIorIIIInClan = true;
                                }
                              }
                              const isNinIIorIII = isNinIIorIIIInBranch || isNinIIorIIIInClan;
                              const isFromClan = !isNinIIorIIIInBranch && isNinIIorIIIInClan;

                              const isNinjutsuOrClanElementalTech = (info: any) => {
                                if (isFromClan) {
                                  const clanIds = (character.personajes_ramas || []).map((r: any) => Number(r.rama_id)).filter((id: number) => id !== 4 && id > 0);
                                  return Number(info.rama_clan_id) === 4 || clanIds.includes(Number(info.rama_clan_id));
                                } else {
                                  return Number(info.rama_clan_id) === 4;
                                }
                              };

                              if (isNinIIorIII && isNinjutsuOrClanElementalTech(tec) && tec.basica === true) {
                                const basicNinjutsu = current.filter((pt: any) => {
                                  const info = pt.info_glosario;
                                  return info && isNinjutsuOrClanElementalTech(info) && info.basica === true;
                                });

                                const limitTotal = isFromClan ? 6 : 8;
                                const maxD = 3;
                                const maxC = isFromClan ? 2 : 3;
                                const maxB = isFromClan ? 1 : 2;

                                if (basicNinjutsu.length >= limitTotal) {
                                  addToast(`LÍMITE ALCANZADO: El límite máximo de técnicas de Ninjutsu Básico es de ${limitTotal}.`, "error");
                                  return;
                                }

                                const tecRank = (tec.rango || 'D').toUpperCase();
                                const rankCount = basicNinjutsu.filter((pt: any) => (pt.info_glosario?.rango || 'D').toUpperCase() === tecRank).length;

                                if (tecRank === 'D' && rankCount >= maxD) {
                                  addToast(`LÍMITE ALCANZADO: Solo se permiten hasta ${maxD} técnicas de Rango D de Ninjutsu Básico.`, "error");
                                  return;
                                }
                                if (tecRank === 'C' && rankCount >= maxC) {
                                  addToast(`LÍMITE ALCANZADO: Solo se permiten hasta ${maxC} técnicas de Rango C de Ninjutsu Básico.`, "error");
                                  return;
                                }
                                if (tecRank === 'B' && rankCount >= maxB) {
                                  addToast(`LÍMITE ALCANZADO: Solo se permiten hasta ${maxB} técnicas de Rango B de Ninjutsu Básico.`, "error");
                                  return;
                                }
                                if (tecRank === 'A' || tecRank === 'S') {
                                  addToast("LÍMITE ALCANZADO: No se permiten técnicas de Rango A o S de Ninjutsu Básico.", "error");
                                  return;
                                }
                              }

                              const costExp = tec.coste_exp || 0;
                              const costRyous = tec.coste_ryous || 0;
                              const costPA = tec.coste_puntos_aprendizaje || 0;
                              const currentExp = character.xp || 0;
                              const currentRyous = character.ryous || 0;
                              const currentPA = character.puntos_aprendizaje || 0;

                              if (currentExp < costExp || currentRyous < costRyous || currentPA < costPA) {
                                addToast(`RECURSOS INSUFICIENTES. REQUIERES ${costExp} EXP, ${costRyous} RYOUS Y ${costPA} PA.`, "error");
                                return;
                              }

                              onUpdateField('personajes_tecnicas', [...current, { tecnica_id: tec.id, info_glosario: tec }]);
                              if (costExp > 0) onUpdateField('xp', currentExp - costExp);
                              if (costRyous > 0) onUpdateField('ryous', currentRyous - costRyous);
                              if (costPA > 0) onUpdateField('puntos_aprendizaje', currentPA - costPA);
                            }
                          }}
                        />
                      </div>
                    )}

                    {Object.keys(tecnicasGrouped).length === 0 ? (
                      <div className="py-12 text-center rounded-[4px] border border-oro/10 bg-black/20 text-xs font-black text-oro/30 uppercase tracking-[0.25em]">
                        {techniqueSearch.trim() ? 'No hay técnicas que coincidan con la búsqueda' : 'No tienes técnicas aprendidas'}
                      </div>
                    ) : (
                      <div className="space-y-12">
                        {Object.entries(tecnicasGrouped).map(([aldeaName, ramas]: [string, any]) => (
                          <div key={aldeaName} className="space-y-8">
                            <div className="flex items-center gap-6">
                              <h3 className="text-xl xl:text-2xl font-black text-oro uppercase tracking-[0.2em]">{aldeaName}</h3>
                              <div className="flex-1 h-px bg-oro/10" />
                            </div>

                            <div className="space-y-8 pl-4 border-l border-oro/5">
                              {Object.entries(ramas).map(([ramaName, subs]: [string, any]) => (
                                <div key={ramaName} className="space-y-6">
                                  <h4 className="text-base xl:text-lg font-black text-oro/70 uppercase tracking-widest flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 bg-oro rotate-45" />
                                    {ramaName}
                                  </h4>

                                  <div className="space-y-6">
                                    {Object.entries(subs).map(([subName, items]: [string, any]) => (
                                      <div key={subName} className="space-y-4">
                                        {subName !== '' && (
                                          <h5 className="text-caption xl:text-xs font-black text-oro/40 uppercase tracking-[0.4em] ml-2 flex items-center gap-3">
                                            <div className="w-1 h-1 bg-rojo-sangre rotate-45" />
                                            {subName}
                                          </h5>
                                        )}
                                        <div className="ninja-card-oro p-1 overflow-hidden border border-oro/10">
                                          <div className="overflow-x-auto scrollbar-hide">
                                            <table className="w-full text-left border-collapse table-fixed min-w-[700px]">
                                              <thead>
                                                <tr className="border-b border-oro/10 text-oro/70 text-caption xl:text-xs font-black uppercase tracking-[0.3em] bg-black/10">
                                                  <th className="py-3 px-5 w-[35%]">Técnica</th>
                                                  <th className="py-3 px-5 w-[15%] text-center">Rango</th>
                                                  <th className="py-3 px-5 w-[35%]">Requisitos</th>
                                                  <th className="py-3 px-5 w-[15%] text-center">Acciones</th>
                                                </tr>
                                              </thead>
                                              <tbody className="divide-y divide-oro/5 bg-black/40">
                                                {items.map((pt: PersonajeTecnica, idx: number) => (
                                                  <tr key={`${pt.tecnica_id}-${idx}`} className="hover:bg-oro/5 transition-colors group">
                                                    <td className="py-3 px-5">
                                                      <div className="flex flex-col">
                                                        <span className="font-black text-oro uppercase tracking-widest text-sm xl:text-base flex items-center gap-2">
                                                          {pt.info_glosario?.nombre_jp || pt.info_glosario?.nombre_es}
                                                          {pt.info_glosario?.es_tienda_exp && (
                                                            <span className="px-1.5 py-0.5 text-caption font-black uppercase bg-purple-500/20 border border-purple-500/40 text-purple-300 tracking-widest rounded-sm">
                                                              EXP SHOP
                                                            </span>
                                                          )}
                                                        </span>
                                                        {pt.info_glosario?.nombre_jp && (
                                                          <span className="text-caption text-oro/30 uppercase font-black tracking-tighter mt-0.5">
                                                            {pt.info_glosario?.nombre_es}
                                                          </span>
                                                        )}
                                                      </div>
                                                    </td>
                                                    <td className="py-3 px-5 text-center">
                                                      <span className="inline-block px-2.5 py-1 bg-oro/5 border border-oro/20 text-oro text-xs font-black rounded-sm">
                                                        {pt.info_glosario?.requisitos?.rango || 'D'}
                                                      </span>
                                                    </td>
                                                    <td className="py-3 px-5">
                                                      {renderRequisitos(pt.info_glosario?.requisitos)}
                                                    </td>
                                                    <td className="py-3 px-5 text-center">
                                                      {(isEditing || isNew) && (
                                                        <button
                                                          onClick={() => {
                                                            const isNewlyAdded = !pt.id;
                                                            if (isNewlyAdded) {
                                                              if (pt.info_glosario?.coste_exp) onUpdateField('xp', (character.xp || 0) + pt.info_glosario.coste_exp);
                                                              if (pt.info_glosario?.coste_ryous) onUpdateField('ryous', (character.ryous || 0) + pt.info_glosario.coste_ryous);
                                                              if (pt.info_glosario?.coste_puntos_aprendizaje) onUpdateField('puntos_aprendizaje', (character.puntos_aprendizaje || 0) + pt.info_glosario.coste_puntos_aprendizaje);
                                                            }
                                                            onUpdateField('personajes_tecnicas', character.personajes_tecnicas?.filter((t: PersonajeTecnica) => t.tecnica_id !== pt.tecnica_id));
                                                          }}
                                                          className="p-2 bg-red-600/10 border border-red-600/40 hover:border-error-text hover:bg-red-600/20 text-red-500 hover:text-red-400 transition-all ninja-clip-xs"
                                                          title="Eliminar Técnica"
                                                        >
                                                          <Trash2 className="w-4 h-4" />
                                                        </button>
                                                      )}
                                                    </td>
                                                  </tr>
                                                ))}
                                              </tbody>
                                            </table>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}


                  </SectionCard>
                </div>
              )}

              {tecnicasSubTab === 'pasivas' && (
                <div className="space-y-8">
                  {/* SECCIÓN 2: HABILIDADES PASIVAS */}
                  <SectionCard title="HABILIDADES PASIVAS" icon={ScrollText} color="oro">
                    {(canEdit || isNew) && (isEditing || isNew) && (
                      <div className="mb-8 pb-8 border-b border-oro/10">
                        <SearchableSelect
                          label="APRENDER NUEVA PASIVA"
                          placeholder="BUSCAR HABILIDAD PASIVA EN EL GLOSARIO..."
                          options={(glosarioFiltrado || [])
                            .filter((i: Glosario) => i.categoria_id === 4 && meetsRequirements(i) && !(character.personajes_tecnicas || []).some((pt: PersonajeTecnica) => pt.tecnica_id === i.id))
                            .map((t: any) => {
                              const subData = t.info_glosario_subcategorias;
                              const subName = (Array.isArray(subData) ? subData[0]?.nombre : subData?.nombre) || 'PASIVA';
                              const pcCostText = ` / ${t.coste_puntos_aprendizaje || 0} PA`;
                              const nameText = t.nombre_jp ? `${t.nombre_jp} - ${t.nombre_es}` : t.nombre_es;
                              return {
                                label: `${nameText} (${subName}) — ${t.coste_exp} EXP / ${t.coste_ryous} RYOUS${pcCostText}`,
                                value: t.id
                              };
                            })
                          }
                          onChange={(v) => {
                            const tec = (glosarioFiltrado || []).find((t: any) => t.id === Number(v));
                            const current = character.personajes_tecnicas || [];

                            if (tec && !current.some((t: any) => t.tecnica_id === tec.id)) {
                              const costExp = tec.coste_exp || 0;
                              const costRyous = tec.coste_ryous || 0;
                              const costPA = tec.coste_puntos_aprendizaje || 0;
                              const currentExp = character.xp || 0;
                              const currentRyous = character.ryous || 0;
                              const currentPA = character.puntos_aprendizaje || 0;

                              if (currentExp < costExp || currentRyous < costRyous || currentPA < costPA) {
                                addToast(`RECURSOS INSUFICIENTES. REQUIERES ${costExp} EXP, ${costRyous} RYOUS Y ${costPA} PA.`, "error");
                                return;
                              }

                              onUpdateField('personajes_tecnicas', [...current, { tecnica_id: tec.id, info_glosario: tec }]);
                              if (costExp > 0) onUpdateField('xp', currentExp - costExp);
                              if (costRyous > 0) onUpdateField('ryous', currentRyous - costRyous);
                              if (costPA > 0) onUpdateField('puntos_aprendizaje', currentPA - costPA);
                            }
                          }}
                        />
                      </div>
                    )}
                    {(fixedSentidos.length > 0 || isSelectableAvailable || (character.personajes_sentidos && character.personajes_sentidos.length > 0)) && (
                      <div className="mb-6 pb-6 border-b border-oro/10 space-y-3">
                        <div className="flex items-center gap-6">
                          <h3 className="text-xl xl:text-2xl font-black text-oro uppercase tracking-[0.2em] flex items-center gap-3">
                            Sentidos Avanzados
                          </h3>
                          <div className="flex-1 h-px bg-oro/10" />
                        </div>
                        <div className="space-y-4 pl-4 border-l border-oro/5">
                          {isEditing || isNew ? (
                            <div className="space-y-4">
                              {fixedSentidos.length > 0 && (
                                <div className="space-y-4">
                                  {fixedSentidos.map((fs: any) => (
                                    <div key={fs.id} className="bg-black/30 border border-oro/15 p-4 flex justify-between items-center ninja-clip-xs">
                                      <div>
                                        <span className="font-black text-oro uppercase tracking-widest text-sm xl:text-base flex items-center gap-2">
                                          Sentido Avanzado: {fs.nombre}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                              {isSelectableAvailable && (
                                <div className="space-y-2">
                                  <SelectField
                                    label="SELECCIONAR SENTIDO"
                                    value={character.personajes_sentidos?.find((s: any) => s.origen === 'seleccionable')?.sentido_id ?? null}
                                    options={poolSelectables.map((ps: any) => ({
                                      label: ps.nombre.toUpperCase(),
                                      value: ps.id
                                    }))}
                                    disabled={!isEditing && !isNew}
                                    onChange={(v) => {
                                      const selectedId = v ? Number(v) : null;
                                      if (selectedId) {
                                        const sentidoObj = poolSelectables.find((ps: any) => ps.id === selectedId);
                                        onUpdateField('personajes_sentidos', [
                                          {
                                            personaje_id: character.id,
                                            sentido_id: selectedId,
                                            origen: 'seleccionable',
                                            info_sentidos: sentidoObj
                                          }
                                        ]);
                                      } else {
                                        onUpdateField('personajes_sentidos', []);
                                      }
                                    }}
                                  />
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {character.personajes_sentidos && character.personajes_sentidos.length > 0 ? (
                                character.personajes_sentidos.map((ps: any, idx: number) => (
                                  <div key={idx} className="bg-black/30 border border-oro/15 p-4 flex justify-between items-center ninja-clip-xs">
                                    <div>
                                      <span className="font-black text-oro uppercase tracking-widest text-sm xl:text-base flex items-center gap-2">
                                        Sentido Avanzado: {ps.info_sentidos?.nombre || ps.nombre || 'Desconocido'}
                                      </span>
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <p className="text-xs text-oro/40 italic">Este shinobi no posee sentidos avanzados</p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    {Object.keys(pasivasGrouped).length === 0 ? (
                      <div className="py-12 text-center rounded-[4px] border border-oro/10 bg-black/20 text-xs font-black text-oro/30 uppercase tracking-[0.25em]">
                        {techniqueSearch.trim() ? 'No hay pasivas que coincidan con la búsqueda' : 'No tienes habilidades pasivas'}
                      </div>
                    ) : (
                      <div className="space-y-12">
                        {Object.entries(pasivasGrouped).map(([aldeaName, ramas]: [string, any]) => (
                          <div key={aldeaName} className="space-y-8">
                            <div className="flex items-center gap-6">
                              <h3 className="text-xl xl:text-2xl font-black text-oro uppercase tracking-[0.2em]">{aldeaName}</h3>
                              <div className="flex-1 h-px bg-oro/10" />
                            </div>

                            <div className="space-y-8 pl-4 border-l border-oro/5">
                              {Object.entries(ramas).map(([ramaName, subs]: [string, any]) => (
                                <div key={ramaName} className="space-y-6">
                                  <h4 className="text-base xl:text-lg font-black text-oro/70 uppercase tracking-widest flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 bg-oro rotate-45" />
                                    {ramaName}
                                  </h4>

                                  <div className="space-y-6">
                                    {Object.entries(subs).map(([subName, items]: [string, any]) => (
                                      <div key={subName} className="space-y-4">
                                        {subName !== '' && (
                                          <h5 className="text-caption xl:text-xs font-black text-oro/40 uppercase tracking-[0.4em] ml-2 flex items-center gap-3">
                                            <div className="w-1 h-1 bg-rojo-sangre rotate-45" />
                                            {subName}
                                          </h5>
                                        )}
                                        <div className="ninja-card-oro p-1 overflow-hidden border border-oro/10">
                                          <div className="overflow-x-auto scrollbar-hide">
                                            <table className="w-full text-left border-collapse table-fixed min-w-[700px]">
                                              <thead>
                                                <tr className="border-b border-oro/10 text-oro/70 text-caption xl:text-xs font-black uppercase tracking-[0.3em] bg-black/10">
                                                  <th className="py-3 px-5 w-[35%]">Habilidad Pasiva</th>
                                                  <th className="py-3 px-5 w-[15%] text-center">Rango</th>
                                                  <th className="py-3 px-5 w-[35%]">Requisitos</th>
                                                  <th className="py-3 px-5 w-[15%] text-center">Acciones</th>
                                                </tr>
                                              </thead>
                                              <tbody className="divide-y divide-oro/5 bg-black/40">
                                                {items.map((pt: PersonajeTecnica, idx: number) => (
                                                  <tr key={`${pt.tecnica_id}-${idx}`} className="hover:bg-oro/5 transition-colors group">
                                                    <td className="py-3 px-5">
                                                      <div className="flex flex-col">
                                                        <span className="font-black text-oro uppercase tracking-widest text-sm xl:text-base flex items-center gap-2">
                                                          {pt.info_glosario?.nombre_jp || pt.info_glosario?.nombre_es}
                                                          {pt.info_glosario?.es_tienda_exp && (
                                                            <span className="px-1.5 py-0.5 text-caption font-black uppercase bg-purple-500/20 border border-purple-500/40 text-purple-300 tracking-widest rounded-sm">
                                                              EXP SHOP
                                                            </span>
                                                          )}
                                                        </span>
                                                        {pt.info_glosario?.nombre_jp && (
                                                          <span className="text-caption text-oro/30 uppercase font-black tracking-tighter mt-0.5">
                                                            {pt.info_glosario?.nombre_es}
                                                          </span>
                                                        )}
                                                      </div>
                                                    </td>
                                                    <td className="py-3 px-5 text-center">
                                                      <span className="inline-block px-2.5 py-1 bg-oro/5 border border-oro/20 text-oro text-xs font-black rounded-sm">
                                                        {pt.info_glosario?.requisitos?.rango || 'D'}
                                                      </span>
                                                    </td>
                                                    <td className="py-3 px-5">
                                                      {renderRequisitos(pt.info_glosario?.requisitos)}
                                                    </td>
                                                    <td className="py-3 px-5 text-center">
                                                      {(isEditing || isNew) && (
                                                        <button
                                                          onClick={() => {
                                                            const isNewlyAdded = !pt.id;
                                                            if (isNewlyAdded) {
                                                              if (pt.info_glosario?.coste_exp) onUpdateField('xp', (character.xp || 0) + pt.info_glosario.coste_exp);
                                                              if (pt.info_glosario?.coste_ryous) onUpdateField('ryous', (character.ryous || 0) + pt.info_glosario.coste_ryous);
                                                              if (pt.info_glosario?.coste_puntos_aprendizaje) onUpdateField('puntos_aprendizaje', (character.puntos_aprendizaje || 0) + pt.info_glosario.coste_puntos_aprendizaje);
                                                            }
                                                            onUpdateField('personajes_tecnicas', character.personajes_tecnicas?.filter((t: PersonajeTecnica) => t.tecnica_id !== pt.tecnica_id));
                                                          }}
                                                          className="p-2 bg-red-600/10 border border-red-600/40 hover:border-error-text hover:bg-red-600/20 text-red-500 hover:text-red-400 transition-all ninja-clip-xs"
                                                          title="Eliminar Pasiva"
                                                        >
                                                          <Trash2 className="w-4 h-4" />
                                                        </button>
                                                      )}
                                                    </td>
                                                  </tr>
                                                ))}
                                              </tbody>
                                            </table>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}


                  </SectionCard>
                </div>
              )}

              {tecnicasSubTab === 'kuchiyoses' && (
                <div className="space-y-8">
                  {/* SECCIÓN 3: INVOCACIONES Y KUCHIYOSES */}
                  <SectionCard title="INVOCACIONES Y KUCHIYOSES" icon={Swords} color="oro">
                    {(canEdit || isNew) && (isEditing || isNew) && (
                      <div className="mb-8 pb-8 border-b border-oro/10">
                        <SearchableSelect
                          label="INVOCAR KUCHIYOSE"
                          placeholder="BUSCAR KUCHIYOSE EN EL GLOSARIO..."
                          options={(glosarioFiltrado || [])
                            .filter((i: Glosario) => i.categoria_id === 3 && meetsRequirements(i) && !(character.personajes_tecnicas || []).some((pt: PersonajeTecnica) => pt.tecnica_id === i.id))
                            .map((t: any) => {
                              const subData = t.info_glosario_subcategorias;
                              const subName = (Array.isArray(subData) ? subData[0]?.nombre : subData?.nombre) || 'KUCHIYOSE';
                              const pcCostText = ` / ${t.coste_puntos_aprendizaje || 0} PA`;
                              const nameText = t.nombre_jp ? `${t.nombre_jp} - ${t.nombre_es}` : t.nombre_es;
                              return {
                                label: `${nameText} (${subName}) — ${t.coste_exp} EXP / ${t.coste_ryous} RYOUS${pcCostText}`,
                                value: t.id
                              };
                            })
                          }
                          onChange={(v) => {
                            const tec = (glosarioFiltrado || []).find((t: any) => t.id === Number(v));
                            const current = character.personajes_tecnicas || [];

                            if (tec && !current.some((t: any) => t.tecnica_id === tec.id)) {
                              const costExp = tec.coste_exp || 0;
                              const costRyous = tec.coste_ryous || 0;
                              const costPA = tec.coste_puntos_aprendizaje || 0;
                              const currentExp = character.xp || 0;
                              const currentRyous = character.ryous || 0;
                              const currentPA = character.puntos_aprendizaje || 0;

                              if (currentExp < costExp || currentRyous < costRyous || currentPA < costPA) {
                                addToast(`REJERCOS INSUFICIENTES. REQUIERES ${costExp} EXP, ${costRyous} RYOUS Y ${costPA} PA.`, "error");
                                return;
                              }

                              onUpdateField('personajes_tecnicas', [...current, { tecnica_id: tec.id, info_glosario: tec }]);
                              if (costExp > 0) onUpdateField('xp', currentExp - costExp);
                              if (costRyous > 0) onUpdateField('ryous', currentRyous - costRyous);
                              if (costPA > 0) onUpdateField('puntos_aprendizaje', currentPA - costPA);
                            }
                          }}
                        />
                      </div>
                    )}
                    {Object.keys(kuchiyosesGrouped).length === 0 ? (
                      <div className="py-12 text-center rounded-[4px] border border-oro/10 bg-black/20 text-xs font-black text-oro/30 uppercase tracking-[0.25em]">
                        {techniqueSearch.trim() ? 'No hay kuchiyoses que coincidan con la búsqueda' : 'No tienes ningún pacto kuchiyose'}
                      </div>
                    ) : (
                      <div className="space-y-12">
                        {Object.entries(kuchiyosesGrouped).map(([aldeaName, ramas]: [string, any]) => (
                          <div key={aldeaName} className="space-y-8">
                            <div className="flex items-center gap-6">
                              <h3 className="text-xl xl:text-2xl font-black text-oro uppercase tracking-[0.2em]">{aldeaName}</h3>
                              <div className="flex-1 h-px bg-oro/10" />
                            </div>

                            <div className="space-y-8 pl-4 border-l border-oro/5">
                              {Object.entries(ramas).map(([ramaName, subs]: [string, any]) => (
                                <div key={ramaName} className="space-y-6">
                                  <h4 className="text-base xl:text-lg font-black text-oro/70 uppercase tracking-widest flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 bg-oro rotate-45" />
                                    {ramaName}
                                  </h4>

                                  <div className="space-y-6">
                                    {Object.entries(subs).map(([subName, items]: [string, any]) => (
                                      <div key={subName} className="space-y-4">
                                        {subName !== '' && (
                                          <h5 className="text-caption xl:text-xs font-black text-oro/40 uppercase tracking-[0.4em] ml-2 flex items-center gap-3">
                                            <div className="w-1 h-1 bg-rojo-sangre rotate-45" />
                                            {subName}
                                          </h5>
                                        )}
                                        <div className="ninja-card-oro p-1 overflow-hidden border border-oro/10">
                                          <div className="overflow-x-auto scrollbar-hide">
                                            <table className="w-full text-left border-collapse table-fixed min-w-[700px]">
                                              <thead>
                                                <tr className="border-b border-oro/10 text-oro/70 text-caption xl:text-xs font-black uppercase tracking-[0.3em] bg-black/10">
                                                  <th className="py-3 px-5 w-[35%]">Invocación / Kuchiyose</th>
                                                  <th className="py-3 px-5 w-[15%] text-center">Rango</th>
                                                  <th className="py-3 px-5 w-[35%]">Requisitos</th>
                                                  <th className="py-3 px-5 w-[15%] text-center">Acciones</th>
                                                </tr>
                                              </thead>
                                              <tbody className="divide-y divide-oro/5 bg-black/40">
                                                {items.map((pt: PersonajeTecnica, idx: number) => (
                                                  <tr key={`${pt.tecnica_id}-${idx}`} className="hover:bg-oro/5 transition-colors group">
                                                    <td className="py-3 px-5">
                                                      <div className="flex flex-col">
                                                        <span className="font-black text-oro uppercase tracking-widest text-sm xl:text-base flex items-center gap-2">
                                                          {pt.info_glosario?.nombre_jp || pt.info_glosario?.nombre_es}
                                                          {pt.info_glosario?.es_tienda_exp && (
                                                            <span className="px-1.5 py-0.5 text-caption font-black uppercase bg-purple-500/20 border border-purple-500/40 text-purple-300 tracking-widest rounded-sm">
                                                              EXP SHOP
                                                            </span>
                                                          )}
                                                        </span>
                                                        {pt.info_glosario?.nombre_jp && (
                                                          <span className="text-caption text-oro/30 uppercase font-black tracking-tighter mt-0.5">
                                                            {pt.info_glosario?.nombre_es}
                                                          </span>
                                                        )}
                                                      </div>
                                                    </td>
                                                    <td className="py-3 px-5 text-center">
                                                      <span className="inline-block px-2.5 py-1 bg-oro/5 border border-oro/20 text-oro text-xs font-black rounded-sm">
                                                        {pt.info_glosario?.requisitos?.rango || 'D'}
                                                      </span>
                                                    </td>
                                                    <td className="py-3 px-5">
                                                      {renderRequisitos(pt.info_glosario?.requisitos)}
                                                    </td>
                                                    <td className="py-3 px-5 text-center">
                                                      {(isEditing || isNew) && (
                                                        <button
                                                          onClick={() => {
                                                            const isNewlyAdded = !pt.id;
                                                            if (isNewlyAdded) {
                                                              if (pt.info_glosario?.coste_exp) onUpdateField('xp', (character.xp || 0) + pt.info_glosario.coste_exp);
                                                              if (pt.info_glosario?.coste_ryous) onUpdateField('ryous', (character.ryous || 0) + pt.info_glosario.coste_ryous);
                                                              if (pt.info_glosario?.coste_puntos_aprendizaje) onUpdateField('puntos_aprendizaje', (character.puntos_aprendizaje || 0) + pt.info_glosario.coste_puntos_aprendizaje);
                                                            }
                                                            onUpdateField('personajes_tecnicas', character.personajes_tecnicas?.filter((t: PersonajeTecnica) => t.tecnica_id !== pt.tecnica_id));
                                                          }}
                                                          className="p-2 bg-red-600/10 border border-red-600/40 hover:border-error-text hover:bg-red-600/20 text-red-500 hover:text-red-400 transition-all ninja-clip-xs"
                                                          title="Eliminar Invocación"
                                                        >
                                                          <Trash2 className="w-4 h-4" />
                                                        </button>
                                                      )}
                                                    </td>
                                                  </tr>
                                                ))}
                                              </tbody>
                                            </table>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}


                  </SectionCard>
                </div>
              )}
            </div>
          )}

          {activeTab === 'onrol' && (
            <div className="space-y-8 animate-fade-in">
              <SectionCard title="DATOS PERSONALES" icon={User} color="oro">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <DataField label="EDAD" value={character.edad} disabled={!isEditing && !isNew} onChange={(v) => onUpdateField('edad', Number(v))} />
                  <SelectField label="SEXO" value={character.sexo} options={['MASCULINO', 'FEMENINO']} disabled={!isEditing && !isNew} onChange={(v) => onUpdateField('sexo', v)} />
                </div>
              </SectionCard>

              <SectionCard title="DESCRIPCIÓN FÍSICA Y APARIENCIA" icon={Sword} color="oro" headerAction={!isNew && canEdit && isEditing && <button onClick={() => onSave('apariencia')} className="px-8 py-3 bg-oro text-rojo-sangre text-caption font-black uppercase tracking-widest active:scale-95 shadow-xl shadow-oro/20" style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}>Guardar Apariencia</button>}>
                <div className="relative">
                  <textarea
                    value={character.apariencia}
                    disabled={!isEditing && !isNew}
                    onChange={(e) => onUpdateField('apariencia', e.target.value)}
                    maxLength={1800}
                    className="w-full h-80 bg-black/40 border border-oro/10 p-10 text-oro/80 italic text-xl xl:text-2xl leading-relaxed outline-none focus:border-oro/40 transition-all disabled:opacity-80 resize-none"
                    placeholder="DESCRIBE LOS RASGOS, VESTIMENTA Y MARCAS DE TU SHINOBI..."
                    style={{ clipPath: 'polygon(20px 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%, 0 20px)' }}
                  />
                  {(isEditing || isNew) && (
                    <div className={`flex justify-end mt-2 text-caption font-black uppercase tracking-widest tabular-nums transition-colors ${(character.apariencia?.length || 0) >= 1800 ? 'text-rojo-sangre' :
                      (character.apariencia?.length || 0) >= 1500 ? 'text-oro/60' : 'text-oro/30'
                      }`}>
                      {character.apariencia?.length || 0} / 1800
                    </div>
                  )}
                </div>
              </SectionCard>
              <SectionCard title="HISTORIA Y CRÓNICA NINJA" icon={ScrollText} color="oro" headerAction={!isNew && canEdit && isEditing && <button onClick={() => onSave('historia')} className="px-8 py-3 bg-oro text-rojo-sangre text-caption font-black uppercase tracking-widest active:scale-95 shadow-xl shadow-oro/20" style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}>Guardar Historiaa</button>}>
                <div className="relative">
                  <textarea
                    value={character.historia}
                    disabled={!isEditing && !isNew}
                    onChange={(e) => onUpdateField('historia', e.target.value)}
                    maxLength={1800}
                    className="w-full h-[600px] bg-black/40 border border-oro/10 p-10 text-oro/80 text-xl xl:text-2xl leading-relaxed outline-none focus:border-oro/40 transition-all disabled:opacity-80 resize-none"
                    placeholder="RELATA LOS ORÍGENES, MOTIVACIONES Y EL CAMINO NINJA DE TU PERSONAJE..."
                    style={{ clipPath: 'polygon(20px 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%, 0 20px)' }}
                  />
                  {(isEditing || isNew) && (
                    <div className={`flex justify-end mt-2 text-caption font-black uppercase tracking-widest tabular-nums transition-colors ${(character.historia?.length || 0) >= 1800 ? 'text-rojo-sangre' :
                      (character.historia?.length || 0) >= 1500 ? 'text-oro/60' : 'text-oro/30'
                      }`}>
                      {character.historia?.length || 0} / 1800
                    </div>
                  )}
                </div>
              </SectionCard>
            </div>
          )}

          {activeTab === 'registros' && (
            <div className="space-y-8 animate-fade-in">
              <ResourceDisplay character={character} totalExp={totalExp} totalRyous={totalRyous} totalPuntosCombate={totalPuntosCombate} xpLimitUsage={masters?.xpLimitUsage} />
              <MissionCounter counts={missionCounts} />

              {/* Header Row: Subtabs Buttons & Filters */}
              <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-6 mb-8">

                {/* Left Side: Subtabs Buttons (exactly styled like the main sheet tabs menu) */}
                <div className="flex flex-nowrap gap-4 overflow-x-auto pb-2 lg:pb-0 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
                  {(['mision', 'accion', 'combate'] as const).map(tab => {
                    const Icon = tab === 'mision' ? ScrollText : tab === 'combate' ? Swords : Zap;
                    const isActive = registroTab === tab;

                    return (
                      <button
                        key={tab}
                        onClick={() => {
                          setRegistroTab(tab);
                          setRecordPage(1);
                        }}
                        className={`px-8 sm:px-16 py-4 text-[11px] xl:text-sm font-black uppercase tracking-widest transition-all duration-300 border ninja-clip-sm shrink-0 relative group flex items-center gap-4 ${isActive
                          ? 'bg-oro text-rojo-sangre border-oro shadow-[0_0_30px_rgba(255,230,159,0.5)]'
                          : 'bg-black/60 text-oro/30 border-oro/10 hover:border-oro/60 hover:text-oro hover:bg-black/90'
                          }`}
                      >
                        <span>{tab === 'mision' ? 'MISIONES' : tab === 'combate' ? 'COMBATES' : 'ACCIONES'}</span>
                        {!isActive && (
                          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0.5 bg-oro transition-all duration-300 group-hover:w-[80%]" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Right Side: Sleek Date Filters */}
                <div
                  className="flex flex-wrap items-center gap-4 sm:gap-6 py-2.5 px-6 bg-black/40 border border-oro/10 relative overflow-hidden"
                  style={{ clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)' }}
                >
                  {/* Decorative golden details matching theme */}
                  <div className="absolute top-0 right-0 w-8 h-8 bg-oro/5 rotate-45 -mr-4 -mt-4 pointer-events-none" />

                  <div className="flex items-center gap-3">
                    <span className="text-caption font-black text-oro/40 uppercase tracking-[0.2em]">DESDE</span>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => {
                        setStartDate(e.target.value);
                        setRecordPage(1);
                      }}
                      className="py-1.5 px-3 text-xs bg-black/40 border border-oro/15 focus:border-oro/30 focus:bg-black/60 outline-none text-oro font-black transition-all ninja-clip-xs"
                      style={{ colorScheme: 'dark' }}
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-caption font-black text-oro/40 uppercase tracking-[0.2em]">HASTA</span>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => {
                        setEndDate(e.target.value);
                        setRecordPage(1);
                      }}
                      className="py-1.5 px-3 text-xs bg-black/40 border border-oro/15 focus:border-oro/30 focus:bg-black/60 outline-none text-oro font-black transition-all ninja-clip-xs"
                      style={{ colorScheme: 'dark' }}
                    />
                  </div>
                  {(startDate || endDate) && (
                    <button
                      onClick={() => {
                        setStartDate('');
                        setEndDate('');
                        setRecordPage(1);
                      }}
                      className="text-caption font-black text-rojo-sangre uppercase tracking-[0.2em] hover:brightness-125 transition-all border-b border-rojo-sangre/30 pb-0.5"
                    >
                      LIMPIAR FILTROS
                    </button>
                  )}
                </div>

              </div>

              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                {(() => {
                  const records = allRegistros.filter(r => {
                    if (registroTab === 'mision') return r.tipo === 'mision';
                    if (registroTab === 'combate') return r.tipo === 'combate';
                    return r.tipo === 'accion' || r.tipo === 'compra';
                  });

                  // Filter by date if applicable
                  const filteredRecords = records.filter((r: any) => {
                    const date = r.registros?.fecha || r.fecha;
                    if (!date) return true;
                    const d = new Date(date).getTime();
                    if (startDate && d < new Date(startDate).getTime()) return false;
                    if (endDate && d > new Date(endDate).getTime()) return false;
                    return true;
                  });

                  // Paginate
                  const totalPages = Math.ceil(filteredRecords.length / recordsPerPage);
                  const currentRecords = filteredRecords.slice((recordPage - 1) * recordsPerPage, recordPage * recordsPerPage);

                  if (currentRecords.length === 0) {
                    return (
                      <div className="py-32 text-center ninja-card-oro">
                        <p className="text-oro/20 font-black uppercase tracking-[0.4em] text-xl">Sin registros en esta categoría</p>
                      </div>
                    );
                  }

                  if (registroTab === 'mision') {
                    const misionesList = currentRecords.map((r: any) => r.registros || r);
                    return (
                      <div className="space-y-12">
                        <MissionTable
                          misiones={misionesList}
                          onRefresh={onRefresh}
                          onEdit={(reg) => setEditingRegistro(reg)}
                          isAdmin={isAdmin}
                          subjectId={character.id}
                        />

                        {totalPages > 1 && (
                          <PaginationContainer className="mt-10" maxWidthClass="max-w-xs">
                            <button
                              onClick={() => setRecordPage(prev => Math.max(1, prev - 1))}
                              disabled={recordPage === 1}
                              className="p-3 ninja-btn-oro"
                            >
                              <ChevronLeft className="w-5 h-5" />
                            </button>
                            <div className="flex items-center gap-1.5 min-w-[80px] justify-center">
                              <PaginationPageInput
                                currentPage={recordPage}
                                totalPages={totalPages}
                                onChangePage={setRecordPage}
                              />
                              <span className="text-oro/40 font-black uppercase tracking-[0.2em] text-xs">
                                / {totalPages}
                              </span>
                            </div>
                            <button
                              onClick={() => setRecordPage(prev => Math.min(totalPages, prev + 1))}
                              disabled={recordPage === totalPages}
                              className="p-3 ninja-btn-oro"
                            >
                              <ChevronRight className="w-5 h-5" />
                            </button>
                          </PaginationContainer>
                        )}
                      </div>
                    );
                  }

                  if (registroTab === 'accion') {
                    const accionesList = currentRecords.map((r: any) => r.registros || r);
                    return (
                      <div className="space-y-12">
                        <ActionTable
                          acciones={accionesList}
                          onRefresh={onRefresh}
                          onEdit={(reg) => setEditingRegistro(reg)}
                          isAdmin={isAdmin}
                          subjectId={character.id}
                        />

                        {totalPages > 1 && (
                          <PaginationContainer className="mt-10" maxWidthClass="max-w-xs">
                            <button
                              onClick={() => setRecordPage(prev => Math.max(1, prev - 1))}
                              disabled={recordPage === 1}
                              className="p-3 ninja-btn-oro"
                            >
                              <ChevronLeft className="w-5 h-5" />
                            </button>
                            <div className="flex items-center gap-1.5 min-w-[80px] justify-center">
                              <PaginationPageInput
                                currentPage={recordPage}
                                totalPages={totalPages}
                                onChangePage={setRecordPage}
                              />
                              <span className="text-oro/40 font-black uppercase tracking-[0.2em] text-xs">
                                / {totalPages}
                              </span>
                            </div>
                            <button
                              onClick={() => setRecordPage(prev => Math.min(totalPages, prev + 1))}
                              disabled={recordPage === totalPages}
                              className="p-3 ninja-btn-oro"
                            >
                              <ChevronRight className="w-5 h-5" />
                            </button>
                          </PaginationContainer>
                        )}
                      </div>
                    );
                  }

                  if (registroTab === 'combate') {
                    const combatesList = currentRecords.map((r: any) => r.registros || r);
                    return (
                      <div className="space-y-12">
                        <CombatTable
                          combates={combatesList}
                          onRefresh={onRefresh}
                          onEdit={(reg) => setEditingRegistro(reg)}
                          isAdmin={isAdmin}
                          subjectId={character.id}
                        />

                        {totalPages > 1 && (
                          <PaginationContainer className="mt-10" maxWidthClass="max-w-xs">
                            <button
                              onClick={() => setRecordPage(prev => Math.max(1, prev - 1))}
                              disabled={recordPage === 1}
                              className="p-3 ninja-btn-oro"
                            >
                              <ChevronLeft className="w-5 h-5" />
                            </button>
                            <div className="flex items-center gap-1.5 min-w-[80px] justify-center">
                              <PaginationPageInput
                                currentPage={recordPage}
                                totalPages={totalPages}
                                onChangePage={setRecordPage}
                              />
                              <span className="text-oro/40 font-black uppercase tracking-[0.2em] text-xs">
                                / {totalPages}
                              </span>
                            </div>
                            <button
                              onClick={() => setRecordPage(prev => Math.min(totalPages, prev + 1))}
                              disabled={recordPage === totalPages}
                              className="p-3 ninja-btn-oro"
                            >
                              <ChevronRight className="w-5 h-5" />
                            </button>
                          </PaginationContainer>
                        )}
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-12">
                      <div className="grid grid-cols-1 gap-8 xl:gap-12">
                        {currentRecords.map((r: any) => (
                          <RegistroCard
                            key={r.id}
                            registro={r.registros || r}
                            onRefresh={onRefresh}
                            onEdit={(reg) => setEditingRegistro(reg)}
                            isAdmin={isAdmin}
                            subjectId={character.id}
                          />
                        ))}
                      </div>

                      {totalPages > 1 && (
                        <PaginationContainer className="mt-10" maxWidthClass="max-w-xs">
                          <button
                            onClick={() => setRecordPage(prev => Math.max(1, prev - 1))}
                            disabled={recordPage === 1}
                            className="p-3 ninja-btn-oro"
                          >
                            <ChevronLeft className="w-5 h-5" />
                          </button>
                          <div className="flex items-center gap-1.5 min-w-[80px] justify-center">
                            <PaginationPageInput
                              currentPage={recordPage}
                              totalPages={totalPages}
                              onChangePage={setRecordPage}
                            />
                            <span className="text-oro/40 font-black uppercase tracking-[0.2em] text-xs">
                              / {totalPages}
                            </span>
                          </div>
                          <button
                            onClick={() => setRecordPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={recordPage === totalPages}
                            className="p-3 ninja-btn-oro"
                          >
                            <ChevronRight className="w-5 h-5" />
                          </button>
                        </PaginationContainer>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
          {editingRegistro && mounted && createPortal(
            <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md overflow-y-auto p-4 sm:p-6 md:p-8 flex justify-center items-start sm:items-center animate-in fade-in duration-300">
              <div className="w-full max-w-4xl my-auto">
                {editingRegistro.tipo === 'combate' ? (
                  <CombatForm
                    initialData={editingRegistro}
                    onCreated={() => { setEditingRegistro(null); onRefresh ? onRefresh() : window.location.reload(); }}
                  />
                ) : (
                  <MissionForm
                    initialData={editingRegistro}
                    onCreated={() => { setEditingRegistro(null); onRefresh ? onRefresh() : window.location.reload(); }}
                    initialType={editingRegistro.tipo as any}
                  />
                )}
              </div>
            </div>,
            document.body
          )}
          {editingImageKey && mounted && createPortal(
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
              <div className="w-full max-w-lg ninja-card-oro p-8 space-y-6 relative overflow-hidden" style={{ clipPath: 'polygon(20px 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%, 0 20px)' }}>
                {/* Decoración de fondo */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-oro/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

                <div className="flex items-center justify-between relative z-10">
                  <h3 className="text-xl font-black text-oro uppercase tracking-[0.3em] flex items-center gap-4 italic">
                    <ImageIcon className="w-6 h-6" />
                    {editingImageKey === 'character' ? 'Apariencia del Ninja' : 'Imagen de Jugador'}
                  </h3>
                  <button
                    onClick={() => setEditingImageKey(null)}
                    className="text-oro/40 hover:text-oro transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="space-y-4 relative z-10">
                  <p className="text-oro/60 text-xs font-bold uppercase tracking-widest leading-relaxed">
                    {editingImageKey === 'character'
                      ? 'Introduce la URL de la imagen para este personaje. Se recomienda una relación de aspecto 3:4.'
                      : 'Introduce la URL de la imagen de perfil del jugador.'}
                  </p>
                  <div className="group relative">
                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-oro/20 group-focus-within:text-oro transition-colors">
                      <ImageIcon className="w-5 h-5" />
                    </div>
                    <input
                      type="text"
                      value={imageUrlInput}
                      onChange={(e) => setImageUrlInput(e.target.value)}
                      placeholder="https://ejemplo.com/imagen.jpg"
                      className="w-full bg-black/60 border border-oro/20 text-oro p-4 pl-12 text-sm focus:outline-none focus:border-oro transition-all selection:bg-oro/20"
                    />
                  </div>
                </div>

                <div className="flex gap-4 pt-4 relative z-10">
                  <button
                    onClick={() => setEditingImageKey(null)}
                    className="flex-1 px-6 py-4 bg-black/40 border border-oro/10 text-oro/60 text-xs font-black uppercase tracking-widest hover:bg-black/60 hover:text-oro transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={async () => {
                      const finalVal = imageUrlInput.trim() || null;
                      if (isEditing || isNew) {
                        if (editingImageKey === 'character') {
                          onUpdateField('url_img', finalVal);
                        } else {
                          const currentProfile = Array.isArray(character.profiles) ? character.profiles[0] : character.profiles;
                          const updatedProfile = { ...currentProfile, url_img: finalVal };
                          onUpdateField('profiles', Array.isArray(character.profiles) ? [updatedProfile] : updatedProfile);
                        }
                        setEditingImageKey(null);
                      } else {
                        try {
                          if (editingImageKey === 'character') {
                            await CharacterService.updateCharacter(character.id, { url_img: finalVal });
                          } else {
                            const userId = Array.isArray(character.profiles) ? character.profiles[0]?.id : character.profiles?.id;
                            const finalUserId = userId || character.user_id;
                            if (finalUserId) {
                              await ProfileService.updateProfile(finalUserId, { url_img: finalVal });
                            } else {
                              throw new Error("No user ID associated with the profile.");
                            }
                          }

                          addToast("Imagen actualizada correctamente.", "success");

                          if (onRefresh) {
                            onRefresh();
                          } else {
                            window.location.reload();
                          }
                        } catch (err) {
                          console.error("Error al actualizar la imagen:", err);
                          addToast("Hubo un error al guardar la imagen.", "error");
                        } finally {
                          setEditingImageKey(null);
                        }
                      }
                    }}
                    className="flex-1 px-6 py-4 ninja-btn-oro text-xs font-black uppercase tracking-widest flex items-center justify-center gap-3"
                  >
                    <Save className="w-4 h-4" />
                    <span>Aplicar</span>
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )}
        </main>
      </div>
      {showScrollTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-8 right-8 w-12 h-12 bg-black/80 border border-oro/20 text-oro flex items-center justify-center hover:bg-oro hover:text-rojo-sangre transition-all z-[100] ninja-clip-sm shadow-2xl active:scale-90"
          title="Volver Arriba"
        >
          <ChevronUp className="w-5 h-5" />
        </button>
      )}
    </FormEditContext.Provider>
  );
}

