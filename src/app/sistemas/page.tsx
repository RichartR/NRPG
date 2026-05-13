import Link from 'next/link';
import { ArrowLeft, Zap } from 'lucide-react';
import { createClient } from '@/utils/supabase/server';
import DynamicIcon from '@/components/ui/DynamicIcon';

export default async function SistemasPage() {
  const supabase = await createClient();

  const { data: docs, error } = await supabase
    .from('documentos_sistemas')
    .select('*')
    .eq('categoria', 'sistemas')
    .eq('activo', true)
    .order('titulo', { ascending: true });

  const theme = { 
    color: "from-yellow-500/20 to-yellow-500/5", 
    borderColor: "group-hover:border-yellow-500/50", 
    iconColor: "text-yellow-500" 
  };

  return (
    <div className="min-h-screen bg-zinc-950 p-4 md:p-8">
      <header className="max-w-4xl mx-auto flex justify-between items-center mb-12">
        <Link href="/" className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors group">
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          Volver al Dashboard
        </Link>
        <div className="flex items-center gap-2 text-yellow-500 font-bold uppercase tracking-widest text-xs bg-yellow-500/10 px-4 py-2 rounded-full border border-yellow-500/20">
          <Zap className="w-4 h-4 fill-current" />
          Documentación Técnica
        </div>
      </header>

      <main className="max-w-4xl mx-auto">
        <div className="mb-12">
          <h1 className="text-4xl font-black text-white mb-4 tracking-tighter">Sistemas del Juego</h1>
          <p className="text-zinc-400 text-lg">Consulta las mecánicas detalladas, tablas de escalado y reglas de combate.</p>
        </div>

        {error && <div className="text-red-500 p-4 bg-red-500/10 rounded-xl border border-red-500/20">Error al cargar sistemas.</div>}

        {docs?.length === 0 && (
          <div className="text-center py-20 border-2 border-dashed border-zinc-900 rounded-3xl">
            <p className="text-zinc-600 font-medium">No hay sistemas registrados todavía.</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {docs?.map((doc: any) => (
            <Link 
              key={doc.id} 
              href={`/docs/${doc.clave}`}
              className={`group relative p-8 rounded-3xl bg-gradient-to-br ${theme.color} border border-zinc-800 transition-all hover:scale-[1.02] ${theme.borderColor} backdrop-blur-sm overflow-hidden`}
            >
              {/* Imagen de fondo opcional */}
              {doc.url_imagen && (
                <div className="absolute inset-0 z-0 opacity-10 group-hover:opacity-20 transition-opacity">
                  <img 
                    src={doc.url_imagen} 
                    alt="" 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 to-transparent" />
                </div>
              )}

              <div className="relative z-10">
                <div className="mb-6 bg-zinc-950 w-16 h-16 rounded-2xl flex items-center justify-center border border-zinc-800 group-hover:border-zinc-700 transition-colors">
                  <Zap className={`w-8 h-8 ${theme.iconColor}`} />
                </div>
                <h2 className="text-2xl font-bold text-white mb-3 tracking-tight">{doc.titulo}</h2>
                <p className="text-zinc-400 leading-relaxed">{doc.descripcion}</p>
                
                <div className="mt-8 flex items-center text-sm font-bold text-zinc-500 group-hover:text-white transition-colors">
                  Ver manual técnico 
                  <span className="ml-2 group-hover:translate-x-1 transition-transform">→</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
