"use client";

import { motion } from "framer-motion";
import {
  Cpu,
  Radio,
  MapPin,
  Zap,
  Volume2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ExternalLink,
  Activity,
} from "lucide-react";
import { useTelemetry } from "@/context/TelemetryContext";
import { staggerContainer, fadeInUp, SPRING_SMOOTH } from "@/lib/animations";
import { cn } from "@/lib/cn";

// ── Metric Card ───────────────────────────────────────────────────────────────
function MetricCard({
  label,
  value,
  unit,
  highlight,
}: {
  label: string;
  value: string | number;
  unit?: string;
  highlight?: boolean;
}) {
  return (
    <motion.div
      variants={fadeInUp}
      whileHover={{ y: -6, transition: SPRING_SMOOTH }}
      whileTap={{ scale: 0.96 }}
      className="glass-card p-5 flex flex-col gap-2"
    >
      <span className="text-xs text-white/50 font-medium tracking-wider uppercase">
        {label}
      </span>
      <div className="flex items-baseline gap-1 mt-1">
        <span
          className={cn(
            "text-3xl font-display font-bold tracking-tight",
            highlight ? "text-[var(--danger)]" : "text-white"
          )}
        >
          {value}
        </span>
        {unit && <span className="text-sm text-white/40">{unit}</span>}
      </div>
    </motion.div>
  );
}

// ── Module Status Badge ────────────────────────────────────────────────────────
const badgeColors: Record<string, string> = {
  Fixed:    "bg-[var(--accent)]/15 text-[var(--accent)] border-[var(--accent)]/30",
  Online:   "bg-[var(--success)]/15 text-[var(--success)] border-[var(--success)]/30",
  Active:   "bg-[var(--success)]/15 text-[var(--success)] border-[var(--success)]/30",
  Standby:  "bg-white/[0.06] text-white/50 border-white/10",
};

function getVoltageBadge(v: string) {
  const val = parseFloat(v);
  if (val >= 4.8) return "bg-[var(--success)]/15 text-[var(--success)] border-[var(--success)]/30";
  if (val >= 4.5) return "bg-[var(--warning)]/15 text-[var(--warning)] border-[var(--warning)]/30";
  return "bg-[var(--danger)]/15 text-[var(--danger)] border-[var(--danger)]/30";
}

// ── Alert Row ─────────────────────────────────────────────────────────────────
function AlertRow({
  severity,
  message,
  timestamp,
}: {
  severity: "success" | "warning" | "danger";
  message: string;
  timestamp: string;
}) {
  const Icon =
    severity === "success"
      ? CheckCircle2
      : severity === "warning"
      ? AlertTriangle
      : XCircle;
  const iconClass =
    severity === "success"
      ? "text-[var(--success)] bg-[var(--success)]/10"
      : severity === "warning"
      ? "text-[var(--warning)] bg-[var(--warning)]/10"
      : "text-[var(--danger)] bg-[var(--danger)]/10";

  return (
    <div className="flex gap-4 py-4 border-b border-white/[0.06] last:border-0 last:pb-0">
      <div
        className={cn("w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5", iconClass)}
      >
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white leading-snug">{message}</p>
        <p className="text-xs text-white/40 mt-1">{timestamp}</p>
      </div>
    </div>
  );
}

// ── Overview Page ─────────────────────────────────────────────────────────────
export default function OverviewPage() {
  const { accel, impactEvents, gps, alerts, modules } = useTelemetry();

  const recentAlerts = alerts.slice(0, 3);

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl">
      {/* Page heading */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="mb-6"
      >
        <p className="text-xs font-semibold tracking-widest text-[var(--accent)]/70 uppercase mb-1">
          Dashboard
        </p>
        <h1 className="text-2xl md:text-3xl font-display font-bold tracking-tight text-white">
          System Overview
        </h1>
      </motion.div>

      {/* ── Metric Cards ── */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6"
      >
        <MetricCard label="Accel X" value={accel.x.toFixed(2)} unit="g" />
        <MetricCard label="Accel Y" value={accel.y.toFixed(2)} unit="g" />
        <MetricCard label="Accel Z" value={accel.z.toFixed(2)} unit="g" />
        <MetricCard
          label="Impact Events"
          value={impactEvents}
          highlight={impactEvents > 0}
        />
      </motion.div>

      {/* ── Middle Row: Module Status + GPS Location ── */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6"
      >
        {/* Module Status */}
        <motion.div variants={fadeInUp} className="glass-card p-6">
          <div className="flex items-center gap-2 mb-5">
            <Cpu className="w-4 h-4 text-[var(--accent)]" />
            <h2 className="font-display font-bold text-base text-white">Module Status</h2>
          </div>

          <div className="space-y-3">
            {/* GPS */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-white/70">
                <Radio className="w-3.5 h-3.5 text-white/40" />
                GPS NEO-6M
              </div>
              <span className={cn("text-xs font-semibold px-2.5 py-0.5 rounded-full border", badgeColors[modules.gps] ?? badgeColors.Standby)}>
                {modules.gps}
              </span>
            </div>
            {/* GSM */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-white/70">
                <Activity className="w-3.5 h-3.5 text-white/40" />
                GSM Module
              </div>
              <span className={cn("text-xs font-semibold px-2.5 py-0.5 rounded-full border", badgeColors[modules.gsm] ?? badgeColors.Standby)}>
                {modules.gsm}
              </span>
            </div>
            {/* MPU */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-white/70">
                <Cpu className="w-3.5 h-3.5 text-white/40" />
                MPU6050
              </div>
              <span className={cn("text-xs font-semibold px-2.5 py-0.5 rounded-full border", badgeColors[modules.mpu] ?? badgeColors.Standby)}>
                {modules.mpu}
              </span>
            </div>
            {/* LM2596 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-white/70">
                <Zap className="w-3.5 h-3.5 text-white/40" />
                LM2596 (5V)
              </div>
              <span className={cn("text-xs font-semibold px-2.5 py-0.5 rounded-full border", getVoltageBadge(modules.power))}>
                {modules.power}
              </span>
            </div>
            {/* Buzzer */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-white/70">
                <Volume2 className="w-3.5 h-3.5 text-white/40" />
                Buzzer
              </div>
              <span className={cn("text-xs font-semibold px-2.5 py-0.5 rounded-full border", badgeColors[modules.buzzer] ?? badgeColors.Standby)}>
                {modules.buzzer}
              </span>
            </div>
          </div>
        </motion.div>

        {/* GPS Location */}
        <motion.div variants={fadeInUp} className="glass-card p-6 flex flex-col">
          <div className="flex items-center gap-2 mb-5">
            <MapPin className="w-4 h-4 text-[var(--accent)]" />
            <h2 className="font-display font-bold text-base text-white">Last Known Location</h2>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/[0.12] py-8 px-4 mb-4 text-center">
            <MapPin className="w-8 h-8 text-white/20 mb-3" />
            <p className="text-base font-mono text-white/80">
              {gps.lat.toFixed(4)}° N, {gps.lng.toFixed(4)}° E
            </p>
            <p className="text-sm text-white/40 mt-1">Tamil Nadu, India</p>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-white/40">Updated 2s ago</span>
            <a
              href={`https://www.google.com/maps?q=${gps.lat},${gps.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs font-semibold text-[var(--accent)] hover:underline"
            >
              Open in Maps
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </motion.div>
      </motion.div>

      {/* ── Recent Alerts ── */}
      <motion.div
        variants={fadeInUp}
        initial="hidden"
        animate="show"
        className="glass-card p-6"
      >
        <h2 className="font-display font-bold text-base text-white mb-4">Recent Alerts</h2>
        <div>
          {recentAlerts.map((alert) => (
            <AlertRow
              key={alert.id}
              severity={alert.severity}
              message={alert.message}
              timestamp={alert.timestamp}
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
}
