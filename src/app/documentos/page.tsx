import Link from 'next/link';
import { Swords } from 'lucide-react';

export default function DocumentosPage() {
  return (
    <div className="min-h-screen p-4 sm:p-8 xl:p-12 flex flex-col">
      {/* Header idéntico a Registros */}
      <header className="w-full max-w-[1750px] mx-auto flex flex-col md:flex-row justify-between items-center gap-10 mb-10 ninja-card-oro p-8 xl:p-10 z-50">
        <Link href="/" className="flex items-center gap-4 text-oro hover:brightness-125 transition-all group font-black uppercase tracking-widest text-sm xl:text-lg">
          <div className="w-2 xl:w-3 h-2 xl:h-3 bg-rojo-sangre rotate-45 group-hover:bg-oro transition-colors" />
          Volver al Dashboard
        </Link>
        <div className="flex items-center gap-4">
          <Swords className="w-5 xl:w-7 h-auto text-oro" />
          <h1 className="text-xl xl:text-2xl font-black text-oro uppercase tracking-[0.3em]">
            Biblioteca <span className="text-oro/40">Mundial</span>
          </h1>
        </div>
      </header>

      <main className="w-full max-w-[1750px] mx-auto flex-1">
        {/* Hero Section idéntico a Registros */}
        <div className="mb-10 ninja-card-oro p-12 xl:p-16">
          <div className="flex items-center gap-6 mb-6">
            <h1 className="ninja-title text-5xl xl:text-8xl uppercase leading-none">Biblioteca Ninja</h1>
          </div>
          <p className="text-gris-texto text-lg xl:text-2xl max-w-4xl leading-relaxed">
            Toda la sabiduría del Mundo Ninja concentrada en un solo lugar. Geografía, clanes y las artes de combate.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 xl:gap-16 max-w-[1750px]">
          {/* Tarjeta Aldeas */}
          <Link href="/aldeas" className="group relative overflow-hidden ninja-card-oro p-10 xl:p-16 hover-ninja flex flex-col justify-between min-h-[400px]">
            <div className="relative z-10">
                <div className="flex flex-col mb-8">
                  <span className="text-xs font-black uppercase tracking-[0.4em] text-oro/40 leading-none mb-2">CATEGORÍA</span>
                  <h2 className="ninja-title text-3xl xl:text-5xl group-hover:text-oro transition-all">ALDEAS</h2>
                </div>
              <p className="text-gris-texto/80 text-lg xl:text-2xl leading-relaxed max-w-sm mb-12">
                Descubre los secretos de aldeas y organizaciones: su historia, clanes fundadores y geografía sagrada.
              </p>
            </div>
            
            <div className="flex items-center gap-4 text-oro font-black uppercase tracking-[0.2em] text-xs xl:text-base group-hover:brightness-125 transition-all relative z-10">
              <span>Explorar Mundo</span>
              <div className="w-1.5 h-1.5 bg-oro rotate-45 group-hover:translate-x-2 transition-transform" />
            </div>
          </Link>

          {/* Tarjeta Ramas */}
          <Link href="/ramas" className="group relative overflow-hidden ninja-card-oro p-10 xl:p-16 hover-ninja flex flex-col justify-between min-h-[400px]">
            <div className="relative z-10">
              <div className="flex flex-col mb-8">
                <span className="text-xs font-black uppercase tracking-[0.4em] text-oro/40 leading-none mb-2">CATEGORÍA</span>
                <h2 className="ninja-title text-3xl xl:text-5xl group-hover:text-oro transition-all">RAMAS</h2>
              </div>
              <p className="text-gris-texto/80 text-lg xl:text-2xl leading-relaxed max-w-sm mb-12">
                Especialidades de combate, el despertar de clanes y el funcionamiento de las artes ninja prohibidas.
              </p>
            </div>
            
            <div className="flex items-center gap-4 text-oro font-black uppercase tracking-[0.2em] text-xs xl:text-base group-hover:brightness-125 transition-all relative z-10">
              <span>Ver Especialidades</span>
              <div className="w-1.5 h-1.5 bg-oro rotate-45 group-hover:translate-x-2 transition-transform" />
            </div>
          </Link>

          {/* Tarjeta Glosario */}
          <Link href="/glosario" className="group relative overflow-hidden ninja-card-oro p-10 xl:p-16 hover-ninja flex flex-col justify-between min-h-[400px]">
            <div className="relative z-10">
                <div className="flex flex-col mb-8">
                  <span className="text-xs font-black uppercase tracking-[0.4em] text-oro/40 leading-none mb-2">CATEGORÍA</span>
                  <h2 className="ninja-title text-3xl xl:text-5xl group-hover:text-oro transition-all">GLOSARIO</h2>
                </div>
              <p className="text-gris-texto/80 text-lg xl:text-2xl leading-relaxed max-w-sm mb-12">
                Consulta el glosario con todo el conocimiento del mundo shinobi.
              </p>
            </div>
            
            <div className="flex items-center gap-4 text-oro font-black uppercase tracking-[0.2em] text-xs xl:text-base group-hover:brightness-125 transition-all relative z-10">
              <span>Consultar Glosario</span>
              <div className="w-1.5 h-1.5 bg-oro rotate-45 group-hover:translate-x-2 transition-transform" />
            </div>
          </Link>
        </div>
      </main>
    </div>
  );
}
