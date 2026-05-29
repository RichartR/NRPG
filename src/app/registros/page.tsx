import Breadcrumbs from '@/components/ui/Breadcrumbs';
import NinjaCard from '@/components/ui/NinjaCard';

export default function RegistrosLandingPage() {
  return (
    <div className="min-h-screen p-4 sm:p-8 xl:p-12 flex flex-col">
      <header className="w-full max-w-[1750px] mx-auto flex flex-col md:flex-row justify-between items-center gap-10 mb-10 ninja-card-oro p-8 xl:p-10 z-50">
        <Breadcrumbs
          items={[
            { label: 'Inicio', href: '/' },
            { label: 'Registros' }
          ]}
        />
        <div className="flex items-center gap-4">
          <img src="/assets/icons/shuriken.png" className="w-4 xl:w-6 h-auto" alt="icon" />
          <h1 className="text-xl xl:text-2xl font-black text-oro uppercase tracking-[0.3em]">
            Registros <span className="text-oro/40">Mundiales</span>
          </h1>
        </div>
      </header>

      <main className="w-full max-w-[1750px] mx-auto flex-1">
        <div className="mb-20 ninja-card-oro p-8 sm:p-12 xl:p-16">
          <div className="flex items-center gap-6 mb-6">
            <h1 className="ninja-title text-3xl sm:text-5xl xl:text-8xl">REGISTROS NINJA</h1>
          </div>
          <p className="text-gris-texto text-base sm:text-lg xl:text-2xl max-w-4xl leading-relaxed">Consulta el historial de misiones, registros de combate y transacciones económicas de todo el mundo ninja.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-10 xl:gap-16">
          {/* Tarjeta Misiones */}
          <NinjaCard
            href="/registros/misiones"
            title="Misiones"
            titleClassName="text-3xl sm:text-4xl md:text-5xl"
            category="REGISTROS"
            imageUrl="/assets/images/misiones.jpg"
            description="Historial de encargos completados, rangos ninja y recompensas obtenidas por la aldea."
            actionText="Explorar Registros"
          />

          {/* Tarjeta Combates */}
          <NinjaCard
            href="/registros/combates"
            title="Combates"
            titleClassName="text-3xl sm:text-4xl md:text-5xl"
            category="REGISTROS"
            imageUrl="/assets/images/combate.png"
            description="Crónicas de enfrentamientos, duelos por el honor y batallas a gran escala."
            actionText="Ver Resultados"
          />

          {/* Tarjeta Narración */}
          <NinjaCard
            href="/registros/narracion"
            title="Narración"
            titleClassName="text-3xl sm:text-4xl md:text-5xl"
            category="REGISTROS"
            imageUrl="/assets/images/narracion.png"
            description="Registros históricos de eventos, crónicas relatadas por narradores y recompensas extraordinarias."
            actionText="Consultar Crónicas"
          />

          {/* Tarjeta Tiendas */}
          <NinjaCard
            href="/registros/tiendas"
            title="Tiendas Ninja"
            titleClassName="text-3xl sm:text-4xl md:text-5xl"
            category="REGISTROS"
            imageUrl="/assets/images/tienda.png"
            description="Registro de tiendas activas, comercio shinobi y adquisición de armamento, técnicas y equipo especial."
            actionText="Visitar Tiendas"
          />
        </div>
      </main>
    </div>
  );
}
