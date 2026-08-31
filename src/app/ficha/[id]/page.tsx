import FichaClientView from './FichaClientView';

export const revalidate = 86400;
export function generateStaticParams() {
  return [];
}

export default async function FichaPublicPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <FichaClientView id={id} />;
}
