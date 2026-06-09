import Breadcrumbs from '@/components/ui/Breadcrumbs';
import NinjaCard from '@/components/ui/NinjaCard';

export default function DocumentosPage() {
  return (
    <div className="min-h-screen p-4 sm:p-8 xl:p-12 flex flex-col">
      {/* Header id├⌐ntico a Registros */}
      <header className="w-full max-w-[1750px] mx-auto flex flex-col md:flex-row justify-between items-center gap-10 mb-10 ninja-card-oro p-8 xl:p-10 z-50">
        <Breadcrumbs
          items={[
            { label: 'Inicio', href: '/' },
            { label: 'Biblioteca' }
          ]}
        />
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-oro/[0.03] border border-oro/10 flex items-center justify-center">
            <img src="/assets/icons/shuriken.png" className="w-4 xl:w-6 h-auto" alt="icon" />
          </div>
          <h1 className="text-xl xl:text-2xl font-black text-oro uppercase tracking-[0.3em]">
            Biblioteca <span className="text-oro/40">Mundial</span>
          </h1>
        </div>
      </header>

      <main className="w-full max-w-[1750px] mx-auto flex-1">
        {/* Hero Section id├⌐ntico a Registros */}
        <div className="mb-10 ninja-card-oro p-8 sm:p-12 xl:p-16">
          <div className="flex items-center gap-6 mb-6">
            <h1 className="ninja-title text-3xl sm:text-5xl xl:text-7xl uppercase leading-none">Biblioteca Ninja</h1>
          </div>
          <p className="text-gris-texto text-base sm:text-lg xl:text-2xl leading-relaxed">
            Toda la sabiduría del Mundo Ninja concentrada en un solo lugar. Geografía, clanes y las artes de combate.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 xl:gap-16 max-w-[1750px]">
          {/* Tarjeta Aldeas */}
          <NinjaCard
            href="/aldeas"
            title="ALDEAS"
            titleClassName="text-3xl sm:text-3xl md:text-4xl"
            category="BIBLIOTECA"
            imageUrl="https://game.gtimg.cn/images/hyrz/web2026/match.jpg"
            description="Descubre los secretos de aldeas y organizaciones: su historia, clanes fundadores y geografía sagrada."
            actionText="Ver Aldeas"
          />

          {/* Tarjeta Ramas */}
          <NinjaCard
            href="/ramas"
            title="RAMAS"
            titleClassName="text-3xl sm:text-3xl md:text-4xl"
            category="ESPECIALIDAD"
            imageUrl="https://game.gtimg.cn/images/hyrz/web2026/ninja.jpg"
            description="Especialidades de combate, el despertar de clanes y el funcionamiento de las artes ninja prohibidas."
            actionText="Ver Ramas"
          />

          {/* Tarjeta Glosario */}
          <NinjaCard
            href="/glosario"
            title="GLOSARIO"
            titleClassName="text-3xl sm:text-3xl md:text-4xl"
            category="GLOSARIO"
            imageUrl="https://game.gtimg.cn/images/hyrz/web2026/content.jpg"
            description="Consulta el glosario con todo el conocimiento del mundo shinobi."
            actionText="Ver Glosario"
          />
        </div>
      </main>
    </div>
  );
}
