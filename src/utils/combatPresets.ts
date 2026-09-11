import { Character, CombatPresetItem, CombatPresetOption } from '@/domain/types';

/**
 * Genera el texto formateado para copiar al portapapeles a partir de los datos de un preset.
 */
export function generatePresetCopyText(
  preset: Partial<CombatPresetOption>,
  nombreItem: string
): string {
  const chText = preset.coste_ch !== undefined && preset.coste_ch !== null
    ? ` [${preset.coste_ch} CH]`
    : '';
  
  const roleoLine = preset.roleo
    ? `*${nombreItem}${chText}* ${preset.roleo}`
    : `*${nombreItem}${chText}*`;

  const effectParts: string[] = [];

  if (preset.tipo_accion) {
    effectParts.push(preset.tipo_accion);
  }
  if (preset.alcance) {
    effectParts.push(preset.alcance);
  }
  if (preset.dano !== undefined && preset.dano !== null && String(preset.dano).trim() !== '') {
    const val = String(preset.dano).trim();
    effectParts.push(val.startsWith('-') ? val : `-${val}`);
  }
  if (preset.dano_xa !== undefined && preset.dano_xa !== null && String(preset.dano_xa).trim() !== '') {
    effectParts.push(`Daño xA: ${preset.dano_xa}`);
  }
  if (preset.cd_rondas !== undefined && preset.cd_rondas !== null && Number(preset.cd_rondas) > 0) {
    effectParts.push(`CD: ${preset.cd_rondas}R`);
  }
  if (preset.sellos) {
    effectParts.push(`Sellos: ${preset.sellos}`);
  }
  if (preset.efectos && preset.efectos.trim() !== '') {
    effectParts.push(preset.efectos.trim());
  }

  const efectosLine = effectParts.length > 0 ? `/ ${effectParts.join(' / ')}` : '';

  if (efectosLine) {
    return `${roleoLine}\n${efectosLine}`;
  }
  return roleoLine;
}

/**
 * Sincroniza los presets guardados con todas las técnicas, objetos y habilidades pasivas
 * actuales del personaje sin sobreescribir ni eliminar los presets configurados previamente.
 */
export function syncCombatPresets(character: Character): CombatPresetItem[] {
  const existing: CombatPresetItem[] = Array.isArray(character.combat_presets)
    ? [...character.combat_presets]
    : [];

  const synced: CombatPresetItem[] = [];
  const processedKeys = new Set<string>();

  // Helper para verificar y agregar o reutilizar
  const ensureItem = (
    id: number,
    tipo: 'tecnica' | 'objeto' | 'pasiva',
    nombre: string,
    subtipo?: string,
    defaultData?: Partial<CombatPresetOption>
  ) => {
    const key = `${tipo}-${id}`;
    if (processedKeys.has(key)) return;
    processedKeys.add(key);

    const found = existing.find(item => item.id === id && item.tipo === tipo);
    if (found) {
      // Si ya existe, mantener sus datos y asegurar que tenga al menos un preset
      synced.push({
        ...found,
        nombre: found.nombre || nombre,
        subtipo: found.subtipo || subtipo,
        presets: (found.presets && found.presets.length > 0)
          ? found.presets
          : [
              {
                id: 'preset-1',
                nombre_preset: 'Estándar',
                roleo: '',
                coste_ch: defaultData?.coste_ch ?? 0,
                cd_rondas: defaultData?.cd_rondas ?? 1,
                texto_copiar: generatePresetCopyText({ ...defaultData, nombre_preset: 'Estándar' }, nombre)
              }
            ]
      });
    } else {
      // Si es nuevo, inicializar con preset por defecto
      const defaultPreset: CombatPresetOption = {
        id: `preset-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        nombre_preset: 'Estándar',
        roleo: defaultData?.roleo || '',
        dano: defaultData?.dano || '',
        dano_xa: defaultData?.dano_xa || '',
        coste_ch: defaultData?.coste_ch ?? 0,
        cd_rondas: defaultData?.cd_rondas ?? 1,
        alcance: defaultData?.alcance || '',
        tipo_accion: defaultData?.tipo_accion || '',
        sellos: defaultData?.sellos || 'No',
        efectos: defaultData?.efectos || '',
        texto_copiar: generatePresetCopyText(
          {
            ...defaultData,
            nombre_preset: 'Estándar'
          },
          nombre
        )
      };

      synced.push({
        id,
        tipo,
        nombre,
        subtipo,
        presets: [defaultPreset]
      });
    }
  };

  // 1. Procesar Técnicas Aprendidas
  (character.personajes_tecnicas || []).forEach(pt => {
    const info = pt.info_glosario;
    const rawInfo = info as any;
    const name = info?.nombre_jp || info?.nombre_es || `Técnica #${pt.tecnica_id}`;
    const isPassive = rawInfo?.tipo?.toLowerCase().includes('pasiv') ||
                      info?.info_glosario_categorias?.nombre?.toLowerCase().includes('pasiv');

    const tipo: 'tecnica' | 'pasiva' = isPassive ? 'pasiva' : 'tecnica';
    const subtipo = info?.info_glosario_subcategorias?.nombre || rawInfo?.tipo || undefined;

    ensureItem(pt.tecnica_id, tipo, name, subtipo, {
      coste_ch: rawInfo?.coste_ch || 0,
      cd_rondas: 1,
      alcance: rawInfo?.alcance || '',
      tipo_accion: rawInfo?.tipo || '',
      sellos: rawInfo?.sellos ? 'Sí' : 'No',
      efectos: info?.descripcion || ''
    });
  });

  // 2. Procesar Objetos del Inventario
  (character.personajes_inventario || []).forEach(pi => {
    const info = pi.info_glosario;
    const name = info?.nombre_es || info?.nombre_jp || `Objeto #${pi.item_id}`;
    const subtipo = info?.info_glosario_subcategorias?.nombre || info?.info_glosario_categorias?.nombre || 'Objeto';

    ensureItem(pi.item_id, 'objeto', name, subtipo, {
      coste_ch: 0,
      cd_rondas: 0,
      tipo_accion: 'Suplementario',
      efectos: info?.descripcion || ''
    });
  });

  // 3. Procesar Habilidades Pasivas Adicionales (Rasgos y Sentidos)
  (character.personajes_rasgos || []).forEach(pr => {
    const info = pr.info_rasgos;
    if (!info) return;
    ensureItem(info.id, 'pasiva', info.nombre, 'Rasgo', {
      coste_ch: 0,
      cd_rondas: 0,
      tipo_accion: 'Pasiva',
      efectos: info.categoria || ''
    });
  });

  (character.personajes_sentidos || []).forEach(ps => {
    const info = ps.info_sentidos;
    if (!info) return;
    ensureItem(info.id, 'pasiva', info.nombre, 'Sentido', {
      coste_ch: 0,
      cd_rondas: 0,
      tipo_accion: 'Pasiva',
      efectos: ''
    });
  });

  // 4. Mantener cualquier elemento extra que el usuario ya tuviera en existing
  existing.forEach(item => {
    const key = `${item.tipo}-${item.id}`;
    if (!processedKeys.has(key)) {
      processedKeys.add(key);
      synced.push(item);
    }
  });

  return synced;
}
