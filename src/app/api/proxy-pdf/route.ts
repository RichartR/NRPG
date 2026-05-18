import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const fileId = searchParams.get('fileId');

  if (!fileId) {
    return new NextResponse('Missing fileId', { status: 400 });
  }

  const googleUrl = `https://docs.google.com/document/d/${fileId}/export?format=pdf`;

  try {
    const response = await fetch(googleUrl);

    if (!response.ok) {
      return new NextResponse('Error fetching from Google', { status: response.status });
    }

    // Esperamos a tener el archivo completo para enviarlo de una sola vez.
    // Esto evita que el navegador intente renderizar progresivamente un archivo incompleto
    // (el cual causaba tirones y lentitud al hacer scroll).
    const arrayBuffer = await response.arrayBuffer();
    const pdfBuffer = Buffer.from(arrayBuffer);

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
        'Content-Disposition': 'inline; filename="document.pdf"',
        'Content-Length': pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('PDF Proxy Error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
