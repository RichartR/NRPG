'use client';

import { create } from 'zustand';
import { createClient } from '@/utils/supabase/client';
import { Character, CharacterStats } from '@/domain/types';
import { StatsLogic } from '@/domain/character/logic';
import { useMasterStore } from '@/store/useMasterStore';

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
    const supabase = createClient();
    const masters = useMasterStore.getState();
    
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error("No hay usuario autenticado");
      
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('active_char_id')
        .eq('id', user.id)
        .single();
        
      if (profileError) throw profileError;
      if (!profile?.active_char_id) {
        set({ activeCharacter: null, loading: false });
        return;
      }

      // Ensure masters are loaded
      if (!masters.initialized) {
        await masters.initialize();
      }

      const { data: charData, error: charError } = await supabase
        .from('characters')
        .select('*')
        .eq('id', profile.active_char_id)
        .single();

      if (charError) throw charError;

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
