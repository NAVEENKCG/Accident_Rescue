"use client";

import { useState, useEffect } from "react";
import { MobileNav } from "./Sidebar";

export function Topbar() {
  const [time, setTime] = useState("");

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
      {/* Mobile nav trigger + brand on mobile */}
      <div className="flex items-center gap-3">
        <MobileNav />
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/40 font-mono hidden sm:block">Vehicle ID:</span>
          <span className="text-sm font-display font-bold tracking-wider text-white">
            TN-09-AB-1234
          </span>
        </div>
      </div>

      {/* Right: time + status pill */}
      <div className="flex items-center gap-3">
        <span className="text-xs font-mono text-white/40 hidden sm:block">{time}</span>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--success)]/10 border border-[var(--success)]/25">
          {/* Animated pulse dot */}
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-[var(--success)] opacity-75 animate-ping" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--success)]" />
          </span>
          <span className="text-xs font-semibold text-[var(--success)] tracking-wide">
            System Active
          </span>
        </div>
      </div>
    </header>
  );
}
