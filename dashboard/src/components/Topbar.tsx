"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Usb, Loader2, CheckCircle2, Wifi, WifiOff, X } from "lucide-react";
import { MobileNav } from "./Sidebar";
import { useSerialBridge } from "@/context/SerialBridgeContext";
import { useTelemetry } from "@/context/TelemetryContext";
import { cn } from "@/lib/cn";

export function Topbar() {
  const [time, setTime] = useState("");
  const { isSupported, isConnected, isConnecting, error, portInfo, connect, disconnect } =
    useSerialBridge();
  const { connectionStatus } = useTelemetry();

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        })
      );
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 md:left-[220px] z-20 h-14 flex items-center justify-between px-4 md:px-6 bg-[var(--bg-surface)]/80 backdrop-blur-xl border-b border-white/[0.06]">
      {/* Left: Mobile nav trigger + vehicle ID */}
      <div className="flex items-center gap-3">
        <MobileNav />
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/40 font-mono hidden sm:block">Vehicle ID:</span>
          <span className="text-sm font-display font-bold tracking-wider text-white">
            TN-09-AB-1234
          </span>
        </div>
      </div>

      {/* Right: time + connect button + status pill */}
      <div className="flex items-center gap-2 md:gap-3">
        <span className="text-xs font-mono text-white/40 hidden sm:block">{time}</span>

        {/* Web Serial Connect / Disconnect Button */}
        {isSupported && (
          <div className="flex items-center gap-2">
            <AnimatePresence mode="wait">
              {isConnected ? (
                <motion.button
                  key="disconnect"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  onClick={disconnect}
                  aria-label="Disconnect serial device"
                  whileTap={{ scale: 0.96 }}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold
                    bg-[var(--accent)]/10 border border-[var(--accent)]/30 text-[var(--accent)]
                    hover:bg-[var(--accent)]/20 transition-colors focus-visible:ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-[var(--bg-base)]"
                >
                  <Usb className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">
                    {portInfo ?? "Arduino"}
                  </span>
                  <X className="w-3 h-3 opacity-60" />
                </motion.button>
              ) : (
                <motion.button
                  key="connect"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  onClick={connect}
                  disabled={isConnecting}
                  aria-label="Connect serial device"
                  whileTap={{ scale: 0.96 }}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-colors",
                    "focus-visible:ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-[var(--bg-base)]",
                    isConnecting
                      ? "bg-white/[0.05] border border-white/10 text-white/40 cursor-not-allowed"
                      : "bg-white/[0.06] border border-white/15 text-white/70 hover:bg-white/[0.10] hover:text-white"
                  )}
                >
                  {isConnecting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Usb className="w-3.5 h-3.5" />
                  )}
                  <span className="hidden sm:inline">
                    {isConnecting ? "Connecting…" : "Connect Device"}
                  </span>
                </motion.button>
              )}
            </AnimatePresence>

            {/* Error tooltip */}
            <AnimatePresence>
              {error && (
                <motion.span
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="hidden md:block text-xs text-[var(--danger)] max-w-[200px] truncate"
                  title={error}
                >
                  {error}
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* System status pill */}
        <div
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-full border transition-colors",
            connectionStatus === "connected"
              ? "bg-[var(--accent)]/10 border-[var(--accent)]/25"
              : connectionStatus === "disconnected"
              ? "bg-[var(--danger)]/10 border-[var(--danger)]/25"
              : "bg-[var(--success)]/10 border-[var(--success)]/25"
          )}
        >
          {connectionStatus === "connected" ? (
            <>
              <Wifi className="w-3 h-3 text-[var(--accent)]" />
              <span className="text-xs font-semibold text-[var(--accent)] tracking-wide hidden sm:block">
                Live Device
              </span>
            </>
          ) : connectionStatus === "disconnected" ? (
            <>
              <WifiOff className="w-3 h-3 text-[var(--danger)]" />
              <span className="text-xs font-semibold text-[var(--danger)] tracking-wide hidden sm:block">
                Disconnected
              </span>
            </>
          ) : (
            <>
              {/* Animated pulse dot for simulated mode */}
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-[var(--success)] opacity-75 animate-ping" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--success)]" />
              </span>
              <span className="text-xs font-semibold text-[var(--success)] tracking-wide hidden sm:block">
                Simulated
              </span>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
