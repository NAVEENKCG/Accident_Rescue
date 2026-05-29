import type { Metadata } from "next";
import { Syne, Outfit } from "next/font/google";
import "./globals.css";

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  preload: true,
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
  preload: true,
});

export const metadata: Metadata = {
  title: "Accident Rescue System",
  description: "Real-time vehicle impact detection and rescue dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${outfit.variable} ${syne.variable} antialiased min-h-screen bg-[var(--bg-base)] text-white`}>
        {/* Navbar placeholder */}
        <nav className="fixed top-4 left-0 right-0 max-w-2xl mx-auto z-40 glass-nav rounded-full px-8 py-4 flex items-center justify-between transition-all duration-300">
          <span className="font-display font-bold tracking-widest text-sm uppercase text-white">Rescue.OS</span>
          <div className="flex gap-6 text-sm opacity-60">
            <span className="hover:opacity-100 cursor-pointer">Overview</span>
            <span className="hover:opacity-100 cursor-pointer">Sensors</span>
            <span className="hover:opacity-100 cursor-pointer">Alerts</span>
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}
