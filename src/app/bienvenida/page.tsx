import Link from 'next/link';
import { ArrowLeft, BookOpen } from 'lucide-react';
import { createClient } from '@/utils/supabase/server';
import { MasterServerService } from '@/services/supabase/master.server.service';

export default async function BienvenidaPage() {
  const supabase = await createClient();

  const docs = await MasterServerService.getDocumentosByCategoria(supabase, 'bienvenida');

  return (
    <div className="min-h-screen p-4 sm:p-8 xl:p-12 flex flex-col">
      <header className="w-full max-w-[1750px] mx-auto flex flex-col md:flex-row justify-between items-center gap-10 mb-10 ninja-card-oro p-8 xl:p-10 z-50">
        <Link href="/" className="flex items-center gap-4 text-oro hover:brightness-125 transition-all group font-black uppercase tracking-widest text-sm xl:text-lg">
          <div className="w-2 xl:w-3 h-2 xl:h-3 bg-rojo-sangre rotate-45 group-hover:bg-oro transition-colors" />
          Volver al Dashboard
        </Link>
        <div className="flex items-center gap-4">
          <img 
            src="/assets/ui/logo.png" 
            alt="Logo" 
            className="h-10 xl:h-14 w-auto object-contain"
          />
        </div>
      </header>

      <main className="w-full max-w-[1750px] mx-auto flex-1">
        <div className="mb-20 ninja-card-oro p-12 xl:p-16">
          <div className="flex items-center gap-6 mb-6">
            <h1 className="ninja-title text-5xl xl:text-8xl uppercase tracking-[0.3em]">BIENVENIDA</h1>
          </div>
          <p className="text-gris-texto text-lg xl:text-2xl max-w-4xl leading-relaxed">Selecciona una sección para obtener más información sobre el mundo ninja y las reglas fundamentales.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10 xl:gap-16">
          {docs.map((doc) => (
            <Link 
              key={doc.id} 
              href={`/docs/${doc.clave}`}
              className="group relative overflow-hidden ninja-card-oro p-10 xl:p-16 hover-ninja flex flex-col justify-between min-h-[400px]"
            >
              {/* Imagen de fondo opcional del documento */}
              {doc.url_imagen && (
                <div className="absolute inset-0 z-0 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none">
                  <img 
                    src={doc.url_imagen} 
                    alt="" 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent" />
                </div>
              )}

              <div className="relative z-10">
                <div className="flex items-center gap-4 mb-8">
                  <h3 className="text-3xl xl:text-5xl font-black text-oro uppercase tracking-widest">{doc.titulo}</h3>
                </div>
                <p className="text-gris-texto/80 text-lg xl:text-2xl leading-relaxed max-w-sm mb-12">
                  {doc.descripcion}
                </p>
              </div>
              
              <div className="flex items-center gap-4 text-oro font-black uppercase tracking-[0.2em] text-xs xl:text-base group-hover:brightness-125 transition-all relative z-10">
                <span>Consultar Guía</span>
                <div className="w-1.5 h-1.5 bg-oro rotate-45 group-hover:translate-x-2 transition-transform" />
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
