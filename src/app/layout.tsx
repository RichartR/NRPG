import type { Metadata } from "next";
import { Noto_Sans_JP, Oswald } from "next/font/google";
import "./globals.css";
import { ToastContainer } from "@/components/ui/Toast";
import { ConfirmContainer } from "@/components/ui/ConfirmDialog";
import SessionGuard from '@/components/auth/SessionGuard';

const notoLines = Noto_Sans_JP({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "700", "900"],
});

const oswald = Oswald({
  variable: "--font-ninja",
  subsets: ["latin"],
  weight: ["600", "700"],
});

export const metadata: Metadata = {
  title: "NRPG - Naruto RPG",
  description: "Juego de Rol basado en Naruto para la plataforma Hobba",
  referrer: 'no-referrer',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${notoLines.variable} ${oswald.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col selection:bg-naranja-naruto selection:text-black">
        <SessionGuard />
        {children}
        <ToastContainer />
        <ConfirmContainer />
      </body>
    </html>
  );
}

