import { createClient } from '@/utils/supabase/server';
import { MasterServerService } from '@/services/supabase/master.server.service';
import Breadcrumbs from '@/components/ui/Breadcrumbs';
import NinjaCard from '@/components/ui/NinjaCard';

export default async function BienvenidaPage() {
  const supabase = await createClient();
  const docs = await MasterServerService.getDocumentosByCategoria(supabase, 'bienvenida');

  return (
    <div className="min-h-screen p-4 sm:p-8 xl:p-12 flex flex-col">
      <header className="w-full max-w-[1750px] mx-auto flex flex-col md:flex-row justify-between items-center gap-10 mb-10 ninja-card-oro p-8 xl:p-10 z-50">
        <Breadcrumbs 
          items={[
            { label: 'Inicio', href: '/' },
            { label: 'Bienvenida' }
          ]} 
        />
        <div className="flex items-center gap-4">
          <img 
            src="/assets/ui/logo.png" 
            alt="Logo" 
            className="h-10 xl:h-14 w-auto object-contain"
          />
        </div>
      </header>

      <main className="w-full max-w-[1750px] mx-auto flex-1">
        <div className="mb-20 ninja-card-oro p-8 sm:p-12 xl:p-16">
          <div className="flex items-center gap-6 mb-6">
            <h1 className="ninja-title text-3xl sm:text-5xl xl:text-8xl uppercase tracking-[0.3em]">BIENVENIDA</h1>
          </div>
          <p className="text-gris-texto text-base sm:text-lg xl:text-2xl max-w-4xl leading-relaxed">Selecciona una secci├│n para obtener m├ís informaci├│n sobre el mundo ninja y las reglas fundamentales.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10 xl:gap-16">
          {docs.map((doc) => (
            <NinjaCard
              key={doc.id}
              href={`/docs/${doc.clave}`}
              title={doc.titulo}
              titleClassName="text-2xl sm:text-3xl md:text-4xl"
              category="BIENVENIDA"
              imageUrl={doc.url_imagen}
              description={doc.descripcion}
              actionText="Consultar Gu├¡a"
            />
          ))}
        </div>
      </main>
    </div>
  );
}
