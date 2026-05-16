import type { Metadata } from "next";
import { Noto_Sans_JP, Shojumaru } from "next/font/google";
import "./globals.css";
import { ToastContainer } from "@/components/ui/Toast";
import { ConfirmContainer } from "@/components/ui/ConfirmDialog";
import GlobalLoading from "@/components/layout/GlobalLoading";

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
  title: "NRPG - Naruto RPG Engine",
  description: "Sistema de rol basado en Naruto Mobile",
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
      className={`${notoLines.variable} ${shojumaru.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col selection:bg-rojo-sangre selection:text-oro">
        <GlobalLoading />
        {children}
        <ToastContainer />
        <ConfirmContainer />
      </body>
    </html>
  );
}

