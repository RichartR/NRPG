import CombatRoom from '@/components/combat/CombatRoom';

export const revalidate = 86400;
export function generateStaticParams() {
  return [];
}

export default async function Page({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params;

  return <CombatRoom roomId={roomId} />;
}
