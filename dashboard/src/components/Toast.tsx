"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, AlertCircle, X } from "lucide-react";
import { useTelemetry } from "@/context/TelemetryContext";

export function Toast() {
  const { latestToast, dismissToast } = useTelemetry();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-dismiss after 6 seconds
  useEffect(() => {
    if (latestToast) {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => dismissToast(), 6000);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [latestToast, dismissToast]);

  const isDanger = latestToast?.severity === "danger";
  const borderColor = isDanger ? "var(--danger)" : "var(--warning)";
  const Icon = isDanger ? AlertCircle : AlertTriangle;
  const iconColor = isDanger ? "text-[var(--danger)]" : "text-[var(--warning)]";

  return (
    <div
      className="fixed bottom-6 right-6 z-50 max-w-sm w-full pointer-events-none"
      aria-live="assertive"
    >
      <AnimatePresence mode="wait">
        {latestToast && (
          <motion.div
            key={latestToast.id}
            initial={{ opacity: 0, x: 80, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 80, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 35 }}
            className="pointer-events-auto relative flex items-start gap-4 rounded-2xl px-4 py-4 backdrop-blur-2xl"
            style={{
              background: "rgba(13, 21, 38, 0.92)",
              border: `1px solid ${borderColor}40`,
              borderLeft: `3px solid ${borderColor}`,
              boxShadow: `inset 0 1px 0 rgba(255,255,255,0.08), 0 8px 32px rgba(0,0,0,0.4)`,
            }}
          >
            <Icon className={`${iconColor} w-5 h-5 mt-0.5 flex-shrink-0`} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white mb-0.5">
                {isDanger ? "⚠ Impact Alert Dispatched" : "Minor Impact Detected"}
              </p>
              <p className="text-xs text-white/60 leading-relaxed">{latestToast.message}</p>
            </div>
            <button
              onClick={dismissToast}
              aria-label="Dismiss toast"
              className="text-white/30 hover:text-white/70 transition-colors flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
