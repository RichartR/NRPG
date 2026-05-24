import { createClient } from '@/utils/supabase/server';
import { Sword } from 'lucide-react';
import Link from 'next/link';
import CombateList from '@/components/admin/CombateList';
import { MasterServerService } from '@/services/supabase/master.server.service';

export default async function AdminCombatePage() {
  const supabase = await createClient();

  const [docs, ramas, subEspecialidades] = await Promise.all([
    MasterServerService.getAdminDocumentosCombate(supabase),
    MasterServerService.getAdminRamasActivas(supabase),
    MasterServerService.getAdminSubEspecialidadesActivas(supabase)
  ]);

  return (
    <div className="max-w-[1750px]">
      <header className="mb-6 ninja-card-oro p-8 xl:p-10">
        <Link href="/admin" className="flex items-center gap-3 text-oro/40 hover:text-oro transition-all mb-8 text-[10px] font-black uppercase tracking-[0.3em] group">
          <div className="w-1.5 h-1.5 bg-oro/20 group-hover:bg-oro rotate-45 transition-colors" />
          VOLVER AL PANEL CENTRAL
        </Link>

        <div className="flex items-center gap-6">
          <div className="w-12 h-12 bg-rojo-sangre/[0.03] border border-rojo-sangre/10 flex items-center justify-center">
            <Sword className="w-6 h-6 text-rojo-sangre" />
          </div>
          <div>
            <h1 className="ninja-title text-4xl xl:text-5xl italic">BIBLIOTECA DE COMBATE</h1>
            <p className="text-oro/40 text-[10px] xl:text-xs font-black uppercase tracking-[0.4em] mt-2">GESTIÓN DE TÉCNICAS, HABILIDADES Y ARTE NINJA</p>
          </div>
        </div>
      </header>

      <CombateList
        initialDocs={docs}
        ramas={ramas}
        subEspecialidades={subEspecialidades}
      />
    </div>
  );
}
