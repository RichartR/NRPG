import { createClient } from '@/utils/supabase/server';
import { Hammer } from 'lucide-react';
import Link from 'next/link';
import KugutsuList from '@/components/admin/KugutsuList';
import { KugutsuComponente } from '@/domain/types';

export const revalidate = 0;

export default async function AdminKugutsuPage() {
  const supabase = await createClient();

  // Fetch Kugutsu components
  const { data, error } = await supabase
    .from('info_kugutsu_componentes')
    .select('*')
    .order('id', { ascending: true });

  if (error) {
    console.error('Error fetching kugutsu components:', error);
  }

  const components: KugutsuComponente[] = (data || []) as KugutsuComponente[];

  return (
    <div className="max-w-[1750px]">
      <header className="mb-6 ninja-card-oro p-8 xl:p-10">
        <Link href="/admin" className="flex items-center gap-3 text-oro/40 hover:text-oro transition-all mb-8 text-caption font-black uppercase tracking-[0.3em] group">
          <div className="w-1.5 h-1.5 bg-oro/20 group-hover:bg-oro rotate-45 transition-colors" />
          VOLVER AL PANEL CENTRAL
        </Link>

        <div className="flex items-center gap-6">
          <div className="w-12 h-12 bg-oro/[0.03] border border-oro/10 flex items-center justify-center">
            <Hammer className="w-6 h-6 text-oro" />
          </div>
          <div>
            <h1 className="ninja-title text-4xl xl:text-5xl italic">TALLER DE MARIONETAS: COMPONENTES</h1>
            <p className="text-oro/40 text-caption xl:text-xs font-black uppercase tracking-[0.4em] mt-2">
              CONFIGURAR CUERPOS, EXTREMIDADES Y ACCESORIOS DE KUGUTSU
            </p>
          </div>
        </div>
      </header>

      <KugutsuList initialComponents={components} />
    </div>
  );
}
