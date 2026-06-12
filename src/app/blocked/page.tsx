import { ShieldAlert } from 'lucide-react';

export const metadata = {
  title: 'Acceso Denegado - NRPG',
  description: 'Tu dirección IP se encuentra bloqueada.',
};

export default function BlockedPage() {
  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-4 bg-zinc-950 text-white relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-rojo-sangre/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-[600px] bg-black/60 backdrop-blur-md border border-rojo-sangre/20 p-10 xl:p-14 shadow-2xl relative text-center rounded-lg">
        {/* Red warning border accents */}
        <div className="absolute top-0 left-0 w-8 h-[1px] bg-rojo-sangre" />
        <div className="absolute top-0 left-0 w-[1px] h-8 bg-rojo-sangre" />
        <div className="absolute bottom-0 right-0 w-8 h-[1px] bg-rojo-sangre" />
        <div className="absolute bottom-0 right-0 w-[1px] h-8 bg-rojo-sangre" />

        <div className="flex justify-center mb-8">
          <div className="w-20 h-20 bg-rojo-sangre/10 border border-rojo-sangre/30 flex items-center justify-center rounded-full animate-pulse">
            <ShieldAlert className="w-10 h-10 text-rojo-sangre" />
          </div>
        </div>

        <h1 className="text-3xl font-black uppercase tracking-widest text-rojo-sangre mb-4 font-ninja">
          ACCESO DENEGADO
        </h1>
        
        <p className="text-oro/40 text-xs font-black uppercase tracking-[0.3em] mb-8">
          Restricción de Seguridad
        </p>

        <div className="p-6 border border-rojo-sangre/10 bg-black/40 text-left rounded mb-8 space-y-4">
          <p className="text-gris-texto text-sm leading-relaxed">
            Tu dirección IP pública ha sido identificada y bloqueada por los administradores de la plataforma debido al incumplimiento de las normas de convivencia o la detección de uso indebido de cuentas (clones).
          </p>
          <p className="text-rojo-sangre/80 text-xs font-bold uppercase tracking-wider">
            Esta acción es de carácter permanente y restringe el acceso al RPG.
          </p>
        </div>

        <p className="text-zinc-600 text-xs uppercase tracking-widest leading-relaxed">
          Si crees que esto es un error, por favor ponte en contacto con los moderadores a través de nuestro servidor de Discord oficial.
        </p>
      </div>
    </div>
  );
}
