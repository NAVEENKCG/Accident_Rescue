import type { Metadata } from "next";
import { Syne, Outfit } from "next/font/google";
import "./globals.css";
import { TelemetryProvider } from "@/context/TelemetryContext";
import { SerialBridgeProvider } from "@/context/SerialBridgeContext";
import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import { Toast } from "@/components/Toast";

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
  title: "AccidentGuard Dashboard — Vehicle Accident Detection System",
  description:
    "Real-time vehicle impact detection, GPS tracking and emergency alert dashboard powered by MPU6050 + GSM.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${outfit.variable} ${syne.variable} antialiased min-h-screen bg-[var(--bg-base)] text-white`}
      >
        <TelemetryProvider>
          <SerialBridgeProvider>
            {/* Skip to content for accessibility */}
            <a
              href="#main-content"
              className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-[var(--accent)] focus:text-black focus:rounded-lg focus:font-semibold"
            >
              Skip to content
            </a>

            {/* Sidebar */}
            <Sidebar />

            {/* Top bar */}
            <Topbar />

            {/* Page content — offset by sidebar + topbar */}
            <main
              id="main-content"
              className="md:ml-[220px] pt-14 min-h-screen bg-[var(--bg-base)]"
            >
              {children}
            </main>

            {/* Global toast overlay */}
            <Toast />
          </SerialBridgeProvider>
        </TelemetryProvider>
      </body>
    </html>
  );
}
