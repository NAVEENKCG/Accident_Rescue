"use client";

import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { MapPin, Navigation } from "lucide-react";
import { useTelemetry } from "@/context/TelemetryContext";
import { fadeInUp, staggerContainer } from "@/lib/animations";

// Dynamic import — Leaflet cannot run in SSR
const LeafletMap = dynamic(() => import("@/components/LeafletMap"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin" />
        <p className="text-sm text-white/40">Loading map…</p>
      </div>
    </div>
  ),
});

export default function GpsTrackerPage() {
  const { gps, pastGps } = useTelemetry();

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl">
      {/* Heading */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="mb-6"
      >
        <p className="text-xs font-semibold tracking-widest text-[var(--accent)]/70 uppercase mb-1">
          NEO-6M
        </p>
        <h1 className="text-2xl md:text-3xl font-display font-bold tracking-tight text-white">
          GPS Tracker
        </h1>
      </motion.div>

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 lg:grid-cols-3 gap-4"
      >
        {/* Map — col-span-2 */}
        <motion.div
          variants={fadeInUp}
          className="glass-card overflow-hidden lg:col-span-2 h-[420px] md:h-[520px]"
        >
          <LeafletMap lat={gps.lat} lng={gps.lng} pastPositions={pastGps} />
        </motion.div>

        {/* Info panel */}
        <motion.div variants={fadeInUp} className="flex flex-col gap-4">
          {/* Current position */}
          <div className="glass-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Navigation className="w-4 h-4 text-[var(--accent)]" />
              <h2 className="font-display font-bold text-sm text-white">Current Position</h2>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-white/40 mb-1">Latitude</p>
                <p className="text-lg font-mono font-bold text-[var(--accent)]">
                  {gps.lat.toFixed(6)}° N
                </p>
              </div>
              <div>
                <p className="text-xs text-white/40 mb-1">Longitude</p>
                <p className="text-lg font-mono font-bold text-[var(--accent)]">
                  {gps.lng.toFixed(6)}° E
                </p>
              </div>
              <div className="pt-2 border-t border-white/[0.06]">
                <p className="text-xs text-white/40 mb-1">Region</p>
                <p className="text-sm text-white/70">Tamil Nadu, India</p>
              </div>
              <a
                href={`https://www.google.com/maps?q=${gps.lat},${gps.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-xs font-semibold text-[var(--accent)] hover:underline mt-1"
              >
                <MapPin className="w-3.5 h-3.5" />
                Open in Google Maps
              </a>
            </div>
          </div>

          {/* Trail */}
          <div className="glass-card p-5">
            <h2 className="font-display font-bold text-sm text-white mb-3">
              Position Trail
            </h2>
            {pastGps.length === 0 ? (
              <p className="text-xs text-white/40">No trail data yet…</p>
            ) : (
              <div className="space-y-2">
                {pastGps.map((pos, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ opacity: 1 - i * 0.15, background: "var(--accent)" }}
                    />
                    <span className="text-xs font-mono text-white/50">
                      {pos.lat.toFixed(5)}° N, {pos.lng.toFixed(5)}° E
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* GPS Module status */}
          <div className="glass-card p-5">
            <h2 className="font-display font-bold text-sm text-white mb-3">Module Health</h2>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-white/50">Status</span>
                <span className="text-[var(--success)] font-semibold">Fixed</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/50">Satellites</span>
                <span className="text-white/80">8</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/50">Accuracy</span>
                <span className="text-white/80">2.3m CEP</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/50">Update rate</span>
                <span className="text-white/80">2s</span>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
