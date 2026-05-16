import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const fileId = searchParams.get('fileId');

  if (!fileId) {
    return new NextResponse('Missing fileId', { status: 400 });
  }

  const googleUrl = `https://docs.google.com/document/d/${fileId}/export?format=pdf`;

  try {
    // Usamos streaming para que el navegador reciba datos mientras Google los genera
    const response = await fetch(googleUrl);

    if (!response.ok) {
      return new NextResponse('Error fetching from Google', { status: response.status });
    }

    // Retornamos el body directamente como un stream
    // Esto es mucho más rápido que esperar al arrayBuffer()
    return new NextResponse(response.body, {
      headers: {
        'Content-Type': 'application/pdf',
        // Cache en el cliente por 1 hora, y permite servir versión antigua mientras valida
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
        'Content-Disposition': 'inline; filename="document.pdf"',
      },
    });
  } catch (error) {
    console.error('PDF Proxy Error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
