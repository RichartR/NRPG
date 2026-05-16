export default function Loading() {
  return (
    <div className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center">
      <div className="relative">
        <div className="w-20 h-20 border-4 border-oro/20 border-t-oro rounded-full animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
            <img src="/assets/icons/shuriken.png" className="w-6 h-6 object-contain" alt="Logo" />
        </div>
      </div>
      <p className="mt-8 text-oro font-black uppercase tracking-[0.5em] text-[10px] animate-pulse">
        Cargando...
      </p>
    </div>
  );
}
