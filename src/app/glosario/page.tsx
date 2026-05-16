import { createClient } from '@/utils/supabase/server';
import { MasterServerService } from '@/services/supabase/master.server.service';
import GlosarioView from '../../components/glosario/GlosarioView';
import Link from 'next/link';
import { Swords } from 'lucide-react';

export default async function GlosarioPage() {
  const supabase = await createClient();
  
  // Fetch data in parallel
  const [categorias, subcategorias, glosarios, ramas, aldeas, subespecialidades] = await Promise.all([
    MasterServerService.getGlosarioCategorias(supabase),
    MasterServerService.getGlosarioSubcategorias(supabase),
    MasterServerService.getGlosarios(supabase),
    MasterServerService.getRamas(supabase),
    MasterServerService.getAldeasActivas(supabase),
    MasterServerService.getSubEspecialidades(supabase)
  ]);

  return (
    <div className="min-h-screen p-4 sm:p-8 xl:p-12 flex flex-col">
      {/* Header */}
      <header className="w-full max-w-[1750px] mx-auto flex flex-col md:flex-row justify-between items-center gap-10 mb-10 ninja-card-oro p-8 xl:p-10 z-50">
        <Link href="/documentos" className="flex items-center gap-4 text-oro hover:brightness-125 transition-all group font-black uppercase tracking-widest text-sm xl:text-lg">
          <div className="w-2 xl:w-3 h-2 xl:h-3 bg-rojo-sangre rotate-45 group-hover:bg-oro transition-colors" />
          Volver a Biblioteca
        </Link>
        <div className="flex items-center gap-4">
          <Swords className="w-5 xl:w-7 h-auto text-oro" />
          <h1 className="text-xl xl:text-2xl font-black text-oro uppercase tracking-[0.3em]">
            Glosario <span className="text-oro/40">Shinobi</span>
          </h1>
        </div>
      </header>

      <main className="w-full max-w-[1750px] mx-auto flex-1">
        <GlosarioView 
          categorias={categorias} 
          subcategorias={subcategorias} 
          glosarios={glosarios} 
          ramas={ramas}
          aldeas={aldeas}
          subespecialidades={subespecialidades}
        />
      </main>
    </div>
  );
}
