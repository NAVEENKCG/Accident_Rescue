"use client";

import { motion, AnimatePresence } from "framer-motion";
import { AlertOctagon, X } from "lucide-react";
import { useTelemetry } from "@/context/TelemetryContext";

const RADIUS = 52;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function WarningCountdown() {
  const { warning, cancelWarning } = useTelemetry();

  const progress = warning.active
    ? warning.secondsLeft / warning.totalSeconds
    : 1;

  const strokeDashoffset = CIRCUMFERENCE * (1 - progress);
  const isDanger = warning.severity === "danger";
  const color = isDanger ? "var(--danger)" : "var(--warning)";

  return (
    <AnimatePresence>
      {warning.active && (
        <motion.div
          initial={{ opacity: 0, scale: 0.85, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.85, y: -10 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="glass-card p-6 flex flex-col sm:flex-row items-center gap-6"
          style={{
            borderColor: `${color}40`,
            boxShadow: `inset 0 1px 0 rgba(255,255,255,0.10), 0 0 0 1px ${color}20`,
          }}
        >
          {/* Circular countdown ring */}
          <div className="relative flex-shrink-0 w-32 h-32">
            {/* Pulsing background ring */}
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{ background: `${color}10` }}
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
            />

            <svg className="w-32 h-32 -rotate-90" viewBox="0 0 120 120">
              {/* Track ring */}
              <circle
                cx="60" cy="60" r={RADIUS}
                fill="none"
                strokeWidth="6"
                stroke="rgba(255,255,255,0.06)"
              />
              {/* Progress ring */}
              <motion.circle
                cx="60" cy="60" r={RADIUS}
                fill="none"
                strokeWidth="6"
                stroke={color}
                strokeLinecap="round"
                strokeDasharray={CIRCUMFERENCE}
                animate={{ strokeDashoffset }}
                transition={{ duration: 0.9, ease: "linear" }}
                style={{ filter: `drop-shadow(0 0 6px ${color}60)` }}
              />
            </svg>

            {/* Centre text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span
                className="text-3xl font-display font-bold tabular-nums"
                style={{ color }}
              >
                {warning.secondsLeft}
              </span>
              <span className="text-xs text-white/40 mt-0.5">sec</span>
            </div>
          </div>

          {/* Info + cancel button */}
          <div className="flex-1 text-center sm:text-left">
            <div className="flex items-center gap-2 mb-2 justify-center sm:justify-start">
              <AlertOctagon className="w-4 h-4" style={{ color }} />
              <span
                className="text-sm font-bold tracking-wide uppercase"
                style={{ color }}
              >
                {isDanger ? "⚠ Impact Detected!" : "⚡ Minor Impact"}
              </span>
            </div>

            <p className="text-white/80 text-sm leading-relaxed mb-1">
              G-Force <span className="font-mono font-bold" style={{ color }}>
                {warning.magnitude.toFixed(2)}g
              </span> detected.{" "}
              {isDanger
                ? "Emergency contacts will be notified when the countdown ends."
                : "Alert will be dispatched if not cancelled in time."}
            </p>
            <p className="text-xs text-white/40 mb-4">
              Press cancel within <strong className="text-white/60">{warning.secondsLeft}s</strong> to stop the alert.
            </p>

            <motion.button
              id="cancel-alert-btn"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.96 }}
              onClick={cancelWarning}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm border transition-colors"
              style={{
                background: `${color}15`,
                borderColor: `${color}40`,
                color,
              }}
            >
              <X className="w-4 h-4" />
              Cancel Alert
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
