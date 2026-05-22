'use client';

import { create } from 'zustand';
import { createClient } from '@/utils/supabase/client';
import { Character, CharacterStats } from '@/domain/types';
import { StatsLogic } from '@/domain/character/logic';
import { useMasterStore } from '@/store/useMasterStore';
import { AuthService } from '@/services/supabase/auth.service';
import { ProfileService } from '@/services/supabase/profile.service';
import { CharacterService } from '@/services/supabase/character.service';

interface CharacterState {
  activeCharacter: Character | null;
  loading: boolean;
  error: string | null;
  fetchActiveCharacter: () => Promise<void>;
}

export const useCharacterStore = create<CharacterState>((set) => ({
  activeCharacter: null,
  loading: false,
  error: null,

  fetchActiveCharacter: async () => {
    set({ loading: true, error: null });
    const masters = useMasterStore.getState();
    
    try {
      const { data: { user } } = await AuthService.getUser();
      if (!user) {
        set({ activeCharacter: null, loading: false });
        return;
      }
      
      const activeCharId = await ProfileService.getActiveCharacterId(user.id);
      if (!activeCharId) {
        set({ activeCharacter: null, loading: false });
        return;
      }

      // Ensure masters are loaded
      if (!masters.initialized) {
        await masters.initialize();
      }

      const charData = await CharacterService.getCharacterById(activeCharId);

      if (!charData || (charData.activo === false && charData.eliminado_voluntario === true)) {
        try {
          await ProfileService.updateProfile(user.id, { active_char_id: null });
        } catch (e) {
          console.error("Error clearing active_char_id on voluntarily deleted character:", e);
        }
        set({ activeCharacter: null, loading: false });
        return;
      }

      // Calcular derivados usando la lógica centralizada de dominio y los datos del store
      const rules = useMasterStore.getState();
      const bases = rules.rangoRules?.[charData.rango];
      const derivados = bases && rules.escaladoRules ? StatsLogic.calculateDerivedStats(
        charData.stats_base as CharacterStats,
        bases,
        rules.escaladoRules
      ) : charData.atributos_derivados;

      set({ 
        activeCharacter: {
          ...charData,
          atributos_derivados: derivados
        } as Character, 
        loading: false 
      });
    } catch (err: any) {
      console.error("Error in useCharacterStore:", err);
      set({ error: err.message, loading: false });
    }
  }
}));
