
import type { Metadata } from "next";
import { Inter, Pacifico } from "next/font/google";
import "./globals.css";

const pacifico = Pacifico({
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-pacifico',
})

const inter = Inter({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ShowAI - Real Estate Assistant",
  description: "AI-powered follow-up generator for real estate agents",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.className} suppressHydrationWarning={true}>
      <body
        className={`${pacifico.variable} antialiased bg-gray-900 text-white min-h-screen`}
      >
        {children}
      </body>
    </html>
  );
}
