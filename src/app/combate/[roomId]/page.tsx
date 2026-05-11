import CombatRoom from '@/components/combat/CombatRoom';

export default async function Page({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params;

  return <CombatRoom roomId={roomId} />;
}
