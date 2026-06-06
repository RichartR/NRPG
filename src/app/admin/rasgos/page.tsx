import { createClient } from '@/utils/supabase/server';
import { Shield } from 'lucide-react';
import Link from 'next/link';
import RasgosList from '@/components/admin/RasgosList';
import { Rasgo } from '@/domain/types';

export const revalidate = 0;

export default async function AdminRasgosPage() {
  const supabase = await createClient();
  
  // Fetch all rasgos and active characters
  const [{ data: rasgosData, error: rasgosError }, { data: charsData }] = await Promise.all([
    supabase
      .from('info_rasgos')
      .select('*')
      .order('id', { ascending: true }),
    supabase
      .from('reg_characters')
      .select('id, nombre_ninja')
      .eq('activo', true)
      .order('nombre_ninja')
  ]);

  if (rasgosError) {
    console.error('Error fetching traits:', rasgosError);
  }

  const rasgos: Rasgo[] = (rasgosData || []) as any;
  const characters = charsData || [];

  return (
    <div className="max-w-[1750px]">
      <header className="mb-6 ninja-card-oro p-8 xl:p-10">
        <Link href="/admin" className="flex items-center gap-3 text-oro/40 hover:text-oro transition-all mb-8 text-caption font-black uppercase tracking-[0.3em] group">
          <div className="w-1.5 h-1.5 bg-oro/20 group-hover:bg-oro rotate-45 transition-colors" />
          VOLVER AL PANEL CENTRAL
        </Link>

        <div className="flex items-center gap-6">
          <div className="w-12 h-12 bg-oro/[0.03] border border-oro/10 flex items-center justify-center">
            <Shield className="w-6 h-6 text-oro" />
          </div>
          <div>
            <h1 className="ninja-title text-4xl xl:text-5xl italic">ADMINISTRACIÓN DE RASGOS</h1>
            <p className="text-oro/40 text-caption xl:text-xs font-black uppercase tracking-[0.4em] mt-2">
              CATÁLOGO DE RASGOS FÍSICOS, PSICOLÓGICOS Y DE HABILIDAD DEL SHINOBI
            </p>
          </div>
        </div>
      </header>

      <RasgosList initialRasgos={rasgos} characters={characters} />
    </div>
  );
}
