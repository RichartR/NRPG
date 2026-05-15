import Link from 'next/link';
import { ArrowLeft, Zap } from 'lucide-react';
import { createClient } from '@/utils/supabase/server';
import DynamicIcon from '@/components/ui/DynamicIcon';
import { MasterServerService } from '@/services/supabase/master.server.service';

export default async function SistemasPage() {
  const supabase = await createClient();

  const docs = await MasterServerService.getDocumentosSistemas(supabase);

  const theme = { 
    color: "from-yellow-500/20 to-yellow-500/5", 
    borderColor: "group-hover:border-yellow-500/50", 
    iconColor: "text-yellow-500" 
  };

  return (
    <div className="min-h-screen p-4 sm:p-8 xl:p-12 flex flex-col">
      <header className="w-full max-w-[1750px] mx-auto flex justify-between items-center mb-10 ninja-card-oro p-8 xl:p-10 z-50">
        <Link href="/" className="flex items-center gap-4 text-oro hover:brightness-125 transition-all group font-black uppercase tracking-widest text-sm xl:text-lg">
          <div className="w-2 xl:w-3 h-2 xl:h-3 bg-rojo-sangre rotate-45 group-hover:bg-oro transition-colors" />
          Volver al Dashboard
        </Link>
        <div className="flex items-center gap-4">
          <img src="https://game.gtimg.cn/images/hyrz/web2026/content-news-head.png" className="w-4 xl:w-6 h-auto" alt="icon" />
          <h1 className="text-xl xl:text-2xl font-black text-oro uppercase tracking-[0.3em]">
            Sistemas de NRPG
          </h1>
        </div>
      </header>

      <main className="w-full max-w-[1750px] mx-auto flex-1">
        <div className="mb-10 ninja-card-oro p-12 xl:p-16">
          <div className="flex items-center gap-6 mb-6">
            {/* <img src="https://game.gtimg.cn/images/hyrz/web2026/content-news-head.png" className="w-5 xl:w-8 h-auto" alt="icon" /> */}
            <h1 className="ninja-title text-5xl xl:text-8xl">SISTEMAS</h1>
          </div>
          <p className="text-gris-texto text-lg xl:text-2xl max-w-4xl leading-relaxed">Consulta las mecánicas detalladas, tablas de escalado y reglas de combate fundamentales para el desarrollo del rol.</p>
        </div>


        {docs.length === 0 && (
          <div className="text-center py-32 ninja-card-oro opacity-50">
            <p className="text-oro/40 font-black uppercase tracking-[0.3em] text-xl">No hay sistemas registrados todavía.</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10 xl:gap-16">
          {docs.map((doc) => (
            <Link 
              key={doc.id} 
              href={`/docs/${doc.clave}`}
              className="group relative p-10 xl:p-14 ninja-card-oro hover-ninja flex flex-col justify-between"
            >
              <div className="relative z-10">
                <div className="flex items-center gap-4 mb-8">
                  {/* <div className="w-3 h-3 bg-rojo-sangre rotate-45" /> */}
                  <h2 className="text-2xl xl:text-4xl font-black text-oro uppercase tracking-widest leading-tight">{doc.titulo}</h2>
                </div>
                
                <p className="text-gris-texto/80 text-base xl:text-xl leading-relaxed mb-10">{doc.descripcion}</p>
                
                <div className="flex items-center gap-4 text-oro font-black uppercase tracking-[0.2em] text-xs xl:text-base group-hover:brightness-125 transition-all">
                  <span>Ver manual técnico</span>
                  <div className="w-1.5 h-1.5 bg-oro rotate-45 group-hover:translate-x-2 transition-transform" />
                </div>
              </div>

              {/* Imagen de fondo sutil */}
              {doc.url_imagen && (
                <div className="absolute inset-0 z-0 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity pointer-events-none">
                  <img 
                    src={doc.url_imagen} 
                    alt="" 
                    className="w-full h-full object-cover grayscale"
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}
            </Link>
          ))}
        </div>
      </main>
    </div>

  );
}
