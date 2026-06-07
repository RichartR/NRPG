import { createClient } from '@/utils/supabase/server';
import { MasterServerService } from '@/services/supabase/master.server.service';
import Breadcrumbs from '@/components/ui/Breadcrumbs';
import NinjaCard from '@/components/ui/NinjaCard';

export default async function RamasPage() {
  const supabase = await createClient();
  const ramas = await MasterServerService.getRamasGlobales(supabase);

  return (
    <div className="min-h-screen p-4 sm:p-8 xl:p-12 flex flex-col">
      <header className="w-full max-w-[1750px] mx-auto flex flex-col md:flex-row justify-between items-center gap-10 mb-10 ninja-card-oro p-8 xl:p-10 z-50">
        <Breadcrumbs
          items={[
            { label: 'Inicio', href: '/' },
            { label: 'Biblioteca', href: '/documentos' },
            { label: 'Ramas' }
          ]}
        />
        <div className="flex items-center gap-4">
          <img src="/assets/icons/shuriken.png" className="w-4 xl:w-6 h-auto" alt="icon" />
          <h1 className="text-xl xl:text-2xl font-black text-oro uppercase tracking-[0.3em]">
            Ramas <span className="text-oro/40">Ninja</span>
          </h1>
        </div>
      </header>

      <main className="w-full max-w-[1750px] mx-auto flex-1">
        <div className="mb-10 ninja-card-oro p-8 sm:p-12 xl:p-16">
          <div className="flex items-center gap-6 mb-6">
            <h1 className="ninja-title text-3xl sm:text-5xl xl:text-7xl uppercase leading-none">Ramas de Combate</h1>
          </div>
          <p className="text-gris-texto text-base sm:text-lg xl:text-2xl leading-relaxed">
            Las disciplines fundamentales que definen el camino de cada shinobi. Especialidades, artes secretas y clanes milenarios.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10 xl:gap-16">
          {ramas?.map((rama) => (
            <NinjaCard
              key={rama.id}
              href={`/ramas/${rama.slug}`}
              title={rama.nombre}
              titleClassName="text-2xl sm:text-3xl md:text-4xl"
              category={rama.tipo === 'clan' ? 'CLAN' : rama.tipo === 'rama' ? 'RAMA' : 'ESPECIALIDAD'}
              imageUrl={rama.url_imagen}
              description={rama.descripcion}
              actionText="Ver Rama"
            />
          ))}
        </div>
      </main>
    </div>
  );
}
