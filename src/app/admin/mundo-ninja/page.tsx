import { createClient } from '@/utils/supabase/server';
import { MasterServerService } from '@/services/supabase/master.server.service';
import { MapPin, ChevronLeft, Globe, UserPlus, Users } from 'lucide-react';
import Link from 'next/link';

export default async function MundoNinjaSelectionPage() {
  const supabase = await createClient();
  
  // 1. Obtener aldeas activas y conteos
  const aldeas = await MasterServerService.getAldeasActivas(supabase);
  const countsMap = await MasterServerService.getCharacterCountsByAldea(supabase, aldeas.map(a => a.id));

  const getCount = (id: number | null) => {
    return id ? (countsMap[id] || 0) : (countsMap['renegados'] || 0);
  };

  return (
    <div className="min-h-screen bg-black pt-24 pb-20 px-4">
      <div className="max-w-6xl mx-auto">
        <header className="mb-16">
          <Link href="/admin" className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors mb-4 text-xs font-black uppercase tracking-widest group">
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Volver al panel
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-5xl md:text-6xl font-black text-white tracking-tighter uppercase italic flex items-center gap-4">
                <Globe className="w-12 h-12 text-emerald-500" />
                MUNDO NINJA
              </h1>
              <p className="text-zinc-500 text-sm font-medium mt-2 uppercase tracking-widest">Selecciona una nación para gestionar sus shinobis.</p>
            </div>
            <Link 
              href="/admin/crear-ficha" 
              className="hidden md:flex items-center gap-2 px-6 py-3 bg-white text-black rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-500 transition-all shadow-lg shadow-white/5"
            >
              <UserPlus className="w-4 h-4" /> Registrar Ninja
            </Link>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {aldeas?.map((aldea) => (
            <Link 
              key={aldea.id}
              href={`/admin/mundo-ninja/${aldea.id}`}
              className="group relative bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-8 hover:border-emerald-500/50 transition-all overflow-hidden"
            >
              {/* Decoración de fondo */}
              {aldea.url_imagen && (
                <div className="absolute inset-0 opacity-5 group-hover:opacity-10 transition-opacity">
                  <img src={aldea.url_imagen} alt="" className="w-full h-full object-cover scale-110 group-hover:scale-100 transition-transform duration-700" />
                </div>
              )}

              <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 rounded-3xl bg-zinc-800 border border-zinc-700 p-4 flex items-center justify-center shrink-0 shadow-xl group-hover:scale-110 transition-transform">
                    {aldea.url_icono ? (
                      <img src={aldea.url_icono} alt="" className="w-full h-full object-contain" />
                    ) : (
                      <MapPin className="w-8 h-8 text-zinc-600" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-3xl font-black text-white uppercase tracking-tight italic group-hover:text-emerald-500 transition-colors">{aldea.nombre_jap}</h3>
                      <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 text-[10px] font-black rounded border border-emerald-500/20 uppercase tracking-widest">{aldea.abreviatura}</span>
                    </div>
                    <p className="text-zinc-500 text-sm font-bold uppercase tracking-widest">{aldea.nombre_español}</p>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1">
                  <span className="text-3xl font-black text-white/20 group-hover:text-emerald-500/40 transition-colors leading-none">{getCount(aldea.id)}</span>
                  <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Shinobis</span>
                </div>
              </div>
            </Link>
          ))}

          {/* Sin Aldea / Renegados */}
          <Link 
            href="/admin/mundo-ninja/renegados"
            className="group relative bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-8 hover:border-red-500/50 transition-all overflow-hidden md:col-span-2"
          >
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="w-20 h-20 rounded-3xl bg-red-500/5 border border-red-500/10 p-4 flex items-center justify-center shrink-0 shadow-xl group-hover:scale-110 transition-transform">
                  <Users className="w-10 h-10 text-red-500/40 group-hover:text-red-500 transition-colors" />
                </div>
                <div>
                  <h3 className="text-3xl font-black text-white uppercase tracking-tight italic group-hover:text-red-500 transition-colors">SIN ALDEA / RENEGADOS</h3>
                  <p className="text-zinc-500 text-sm font-bold uppercase tracking-widest">Shinobis sin afiliación o exiliados.</p>
                </div>
              </div>

              <div className="flex flex-col items-end gap-1">
                <span className="text-3xl font-black text-white/20 group-hover:text-red-500/40 transition-colors leading-none">{getCount(null)}</span>
                <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Shinobis</span>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
