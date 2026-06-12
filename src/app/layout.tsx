import type { Metadata } from "next";
import { Noto_Sans_JP, Shojumaru } from "next/font/google";
import "./globals.css";
import { ToastContainer } from "@/components/ui/Toast";
import { ConfirmContainer } from "@/components/ui/ConfirmDialog";
import { headers } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { ProfileService } from '@/services/supabase/profile.service';
import { redirect } from 'next/navigation';

const notoLines = Noto_Sans_JP({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "700", "900"],
});

const shojumaru = Shojumaru({
  variable: "--font-ninja",
  subsets: ["latin"],
  weight: ["400"],
});

export const metadata: Metadata = {
  title: "NRPG - Naruto RPG",
  description: "Juego de Rol basado en Naruto para la plataforma Hobba",
  referrer: 'no-referrer',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Obtener IP pública del cliente y pathname actual
  const headerList = await headers();
  const ip = headerList.get('x-forwarded-for')?.split(',')[0].trim() || headerList.get('x-real-ip') || '127.0.0.1';
  const pathname = headerList.get('x-pathname') || '';

  // Evitar bucles de redirección en las páginas de bloqueo
  const isBlockedPage = pathname === '/blocked' || pathname === '/banned';
  
  console.log("LAYOUT DEBUG -> pathname:", pathname, "isBlockedPage:", isBlockedPage, "ip:", ip);

  let shouldRedirect = false;

  // Registrar IP de forma asíncrona si hay un usuario logueado
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      ProfileService.updateUserIP(user.id, ip, supabase).catch(err => {
        console.error('Error al registrar IP del usuario:', err);
      });

      if (!isBlockedPage) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('banned_until')
          .eq('id', user.id)
          .single();

        if (profile?.banned_until) {
          const now = new Date();
          const bannedUntil = new Date(profile.banned_until);
          if (bannedUntil > now) {
            shouldRedirect = true;
          }
        }
      }
    }
  } catch (error) {
    console.error('Error de autenticación en RootLayout:', error);
  }

  if (shouldRedirect) {
    redirect('/banned');
  }

  return (
    <html
      lang="es"
      className={`${notoLines.variable} ${shojumaru.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col selection:bg-rojo-sangre selection:text-oro">
        {children}
        <ToastContainer />
        <ConfirmContainer />
      </body>
    </html>
  );
}

