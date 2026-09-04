import { Suspense } from 'react';
import CombatRoom from '@/components/combat/CombatRoom';

export const revalidate = 86400;
export function generateStaticParams() {
  return [];
}

export default async function Page({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params;

  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center text-oro font-black uppercase tracking-widest text-xs">
        Cargando sala de combate...
      </div>
    }>
      <CombatRoom roomId={roomId} />
    </Suspense>
  );
}


