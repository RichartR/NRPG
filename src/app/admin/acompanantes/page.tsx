import { createClient } from '@/utils/supabase/server';
import { Sparkles } from 'lucide-react';
import Link from 'next/link';
import AcompanantesList from '@/components/admin/AcompanantesList';
import { AcompananteInfo, RamaClan } from '@/domain/types';

export const revalidate = 0;

export default async function AdminAcompanantesPage() {
  const supabase = await createClient();

  // Fetch companions and branches/clans
  const [
    { data: acompanantesData, error: acompanantesError },
    { data: ramasData, error: ramasError }
  ] = await Promise.all([
    supabase
      .from('info_acompanantes')
      .select('*, info_ramas_clanes:rama_clan_id(*)')
      .order('id', { ascending: true }),
    supabase
      .from('info_ramas_clanes')
      .select('*')
      .eq('activo', true)
      .order('nombre', { ascending: true })
  ]);

  if (acompanantesError) {
    console.error('Error fetching companions:', acompanantesError);
  }
  if (ramasError) {
    console.error('Error fetching branches/clans:', ramasError);
  }

  const acompanantes: AcompananteInfo[] = (acompanantesData || []) as any;
  const ramasClanes: RamaClan[] = (ramasData || []) as any;

  return (
    <div className="max-w-[1750px]">
      <header className="mb-6 ninja-card-oro p-8 xl:p-10">
        <Link href="/admin" className="flex items-center gap-3 text-oro/40 hover:text-oro transition-all mb-8 text-caption font-black uppercase tracking-[0.3em] group">
          <div className="w-1.5 h-1.5 bg-oro/20 group-hover:bg-oro rotate-45 transition-colors" />
          VOLVER AL PANEL CENTRAL
        </Link>

        <div className="flex items-center gap-6">
          <div className="w-12 h-12 bg-oro/[0.03] border border-oro/10 flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-oro" />
          </div>
          <div>
            <h1 className="ninja-title text-4xl xl:text-5xl italic">ADMINISTRACIÓN DE ACOMPAÑANTES</h1>
            <p className="text-oro/40 text-caption xl:text-xs font-black uppercase tracking-[0.4em] mt-2">
              CONFIGURAR Y ASOCIAR COMPAÑEROS/NINKEN A CLANES Y RAMAS
            </p>
          </div>
        </div>
      </header>

      <AcompanantesList initialAcompanantes={acompanantes} ramasClanes={ramasClanes} />
    </div>
  );
}
