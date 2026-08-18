import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Nav from "@/components/Nav";
import { AuthProvider } from "@/components/AuthProvider";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Planowanie podróży po Polsce",
  description: "Aplikacja do planowania podróży po Polsce",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pl"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      // Blokujący skrypt niżej dopisuje klasę .dark do <html> jeszcze
      // przed hydratacją Reacta (patrz THEME_INIT_SCRIPT) — bez tego
      // atrybutu React zgłaszałby ostrzeżenie o niezgodności z tym, co
      // wyrenderował serwer, mimo że to celowe i oczekiwane.
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        <AuthProvider>
          <Nav />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
