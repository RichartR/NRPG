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

    if (!response.body) {
      return new NextResponse('Empty PDF response', { status: 502 });
    }

    // Stream the upstream response instead of buffering the whole PDF in Function
    // memory. Vercel caches the result, so repeated reads no longer reach origin.
    const headers = new Headers({
      'Content-Type': response.headers.get('content-type') || 'application/pdf',
      'Content-Disposition': 'inline; filename="document.pdf"',
      'Cache-Control': 'public, max-age=3600',
      'Vercel-CDN-Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
    });

    const contentLength = response.headers.get('content-length');
    const etag = response.headers.get('etag');
    const lastModified = response.headers.get('last-modified');
    if (contentLength) headers.set('Content-Length', contentLength);
    if (etag) headers.set('ETag', etag);
    if (lastModified) headers.set('Last-Modified', lastModified);

    return new NextResponse(response.body, {
      headers: {
        ...Object.fromEntries(headers.entries()),
      },
    });
  } catch (error) {
    console.error('PDF Proxy Error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
