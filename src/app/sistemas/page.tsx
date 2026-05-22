import { createClient } from '@/utils/supabase/server';
import { MasterServerService } from '@/services/supabase/master.server.service';
import Breadcrumbs from '@/components/ui/Breadcrumbs';
import NinjaCard from '@/components/ui/NinjaCard';

export default async function SistemasPage() {
  const supabase = await createClient();
  const docs = await MasterServerService.getDocumentosSistemas(supabase);

  return (
    <div className="min-h-screen p-4 sm:p-8 xl:p-12 flex flex-col">
      <header className="w-full max-w-[1750px] mx-auto flex flex-col md:flex-row justify-between items-center gap-4 mb-10 ninja-card-oro p-6 sm:p-8 xl:p-10 z-50">
        <Breadcrumbs 
          items={[
            { label: 'Inicio', href: '/' },
            { label: 'Sistemas' }
          ]} 
        />
        <div className="flex items-center gap-4">
          <img src="/assets/icons/shuriken.png" className="w-4 xl:w-6 h-auto" alt="icon" />
          <h1 className="text-lg xl:text-2xl font-black text-oro uppercase tracking-[0.3em] pt-1">
            Sistemas de NRPG
          </h1>
        </div>
      </header>

      <main className="w-full max-w-[1750px] mx-auto flex-1">
        <div className="mb-10 ninja-card-oro p-8 sm:p-12 xl:p-16">
          <div className="flex items-center gap-6 mb-6">
            <h1 className="ninja-title text-3xl sm:text-5xl xl:text-8xl">SISTEMAS</h1>
          </div>
          <p className="text-gris-texto text-base sm:text-lg xl:text-2xl max-w-4xl leading-relaxed">Consulta las mecánicas detalladas, tablas de escalado y reglas de combate fundamentales para el desarrollo del rol.</p>
        </div>

        {docs.length === 0 && (
          <div className="text-center py-32 ninja-card-oro opacity-50">
            <p className="text-oro/40 font-black uppercase tracking-[0.3em] text-xl">No hay sistemas registrados todavía.</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10 xl:gap-16">
          {docs.map((doc) => (
            <NinjaCard
              key={doc.id}
              href={`/docs/${doc.clave}`}
              title={doc.titulo}
              titleClassName="text-2xl sm:text-3xl md:text-4xl"
              category="SISTEMA"
              imageUrl={doc.url_imagen}
              description={doc.descripcion}
              actionText="Ver manual técnico"
            />
          ))}
        </div>
      </main>
    </div>
  );
}
