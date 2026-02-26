import type { Metadata } from "next";
import { IBM_Plex_Sans, IBM_Plex_Serif } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-ibm-plex-sans",
});

const ibmPlexSerif = IBM_Plex_Serif({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-ibm-plex-serif",
});

export const metadata: Metadata = {
  title: "Undercover Clone",
  description: "Web clone of Undercover game",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className="dark">
      <body className={`${ibmPlexSans.variable} ${ibmPlexSerif.variable} font-sans bg-background text-foreground antialiased selection:bg-neutral-200 selection:text-neutral-900 dark:selection:bg-neutral-800 dark:selection:text-neutral-50`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
