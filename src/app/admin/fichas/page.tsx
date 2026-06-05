import { createClient } from '@/utils/supabase/server';
import { ShieldAlert } from 'lucide-react';
import Link from 'next/link';
import FichasArchivadasList from '@/components/admin/FichasArchivadasList';
import { CharacterServerService } from '@/services/supabase/character.server.service';

export default async function AdminFichasArchivadasPage() {
  const supabase = await createClient();

  // Obtener personajes archivados/inactivos a través del servicio del servidor
  const characters = await CharacterServerService.getArchivedCharacters(supabase);

  return (
    <div className="max-w-[1750px]">
      <header className="mb-6 ninja-card-oro p-8 xl:p-10">
        <Link href="/admin" className="flex items-center gap-3 text-oro/40 hover:text-oro transition-all mb-8 text-caption font-black uppercase tracking-[0.3em] group">
          <div className="w-1.5 h-1.5 bg-oro/20 group-hover:bg-oro rotate-45 transition-colors" />
          VOLVER AL PANEL CENTRAL
        </Link>
        
        <div className="flex items-center gap-6">
          <div className="w-12 h-12 bg-oro/[0.03] border border-oro/10 flex items-center justify-center">
            <ShieldAlert className="w-6 h-6 text-oro" />
          </div>
          <div>
            <h1 className="ninja-title text-4xl xl:text-5xl italic">EXPEDIENTES ARCHIVADOS</h1>
            <p className="text-oro/40 text-caption xl:text-xs font-black uppercase tracking-[0.4em] mt-2">RECUPERACIÓN Y ELIMINACIÓN DE SHINOBIS INACTIVOS</p>
          </div>
        </div>
      </header>

      <div className="w-full">
        <FichasArchivadasList initialCharacters={characters} />
      </div>
    </div>
  );
}
