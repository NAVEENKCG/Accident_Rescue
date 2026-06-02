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
  Gauge,
  Compass,
  RotateCcw,
  Satellite,
  BatteryMedium,
  ArrowUpDown,
} from "lucide-react";
import { useTelemetry } from "@/context/TelemetryContext";
import { staggerContainer, fadeInUp, SPRING_SMOOTH } from "@/lib/animations";
import { Sparkline } from "@/components/Sparkline";
import { WarningCountdown } from "@/components/WarningCountdown";
import { cn } from "@/lib/cn";

// ── Metric Card with Sparkline ────────────────────────────────────────────────
function MetricCard({
  label,
  value,
  unit,
  highlight,
  highlightWarning,
  sparkData,
  sparkColor,
  threshold,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  unit?: string;
  highlight?: boolean;
  highlightWarning?: boolean;
  sparkData?: number[];
  sparkColor?: string;
  threshold?: number;
  icon?: React.ElementType;
}) {
  return (
    <motion.div
      variants={fadeInUp}
      whileHover={{ y: -6, transition: SPRING_SMOOTH }}
      whileTap={{ scale: 0.96 }}
      className="glass-card p-5 flex flex-col gap-2"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-1.5">
          {Icon && <Icon className="w-3.5 h-3.5 text-white/30 flex-shrink-0" />}
          <span className="text-xs text-white/50 font-medium tracking-wider uppercase">
            {label}
          </span>
        </div>
        {sparkData && sparkData.length > 1 && (
          <Sparkline
            data={sparkData}
            color={sparkColor ?? "var(--accent)"}
            threshold={threshold}
          />
        )}
      </div>
      <div className="flex items-baseline gap-1 mt-1">
        <span
          className={cn(
            "text-3xl font-display font-bold tracking-tight",
            highlight
              ? "text-[var(--danger)]"
              : highlightWarning
              ? "text-[var(--warning)]"
              : "text-white"
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
  Fixed:     "bg-[var(--accent)]/15 text-[var(--accent)] border-[var(--accent)]/30",
  Searching: "bg-[var(--warning)]/15 text-[var(--warning)] border-[var(--warning)]/30",
  Online:    "bg-[var(--success)]/15 text-[var(--success)] border-[var(--success)]/30",
  Active:    "bg-[var(--success)]/15 text-[var(--success)] border-[var(--success)]/30",
  Standby:   "bg-white/[0.06] text-white/50 border-white/10",
};

function getVoltageBadge(v: string) {
  const val = parseFloat(v);
  if (val >= 12.0) return "bg-[var(--success)]/15 text-[var(--success)] border-[var(--success)]/30";
  if (val >= 11.5) return "bg-[var(--warning)]/15 text-[var(--warning)] border-[var(--warning)]/30";
  return "bg-[var(--danger)]/15 text-[var(--danger)] border-[var(--danger)]/30";
}

function getBatteryColor(v: number) {
  if (v >= 12.0) return "var(--success)";
  if (v >= 11.5) return "var(--warning)";
  return "var(--danger)";
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
    severity === "success" ? CheckCircle2 : severity === "warning" ? AlertTriangle : XCircle;
  const iconClass =
    severity === "success"
      ? "text-[var(--success)] bg-[var(--success)]/10"
      : severity === "warning"
      ? "text-[var(--warning)] bg-[var(--warning)]/10"
      : "text-[var(--danger)] bg-[var(--danger)]/10";

  return (
    <div className="flex gap-4 py-4 border-b border-white/[0.06] last:border-0 last:pb-0">
      <div className={cn("w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5", iconClass)}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white leading-snug">{message}</p>
        <p className="text-xs text-white/40 mt-1">{timestamp}</p>
      </div>
    </div>
  );
}

// ── Tilt Angle Gauge ──────────────────────────────────────────────────────────
function TiltGauge({ label, value }: { label: string; value: number }) {
  const pct = Math.min(Math.abs(value) / 45, 1);
  const isNeg = value < 0;
  const color = pct > 0.7 ? "var(--danger)" : pct > 0.4 ? "var(--warning)" : "var(--accent)";

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-xs text-white/50">
        <span className="uppercase tracking-wider font-medium">{label}</span>
        <span className="font-mono font-semibold" style={{ color }}>
          {value > 0 ? "+" : ""}{value.toFixed(1)}°
        </span>
      </div>
      {/* Centered bar: left = negative, right = positive */}
      <div className="relative h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
        {/* Center marker */}
        <div className="absolute inset-y-0 left-1/2 w-px bg-white/20" />
        {/* Fill */}
        <motion.div
          className="absolute inset-y-0 rounded-full"
          style={{ background: color }}
          animate={{
            left:  isNeg ? `${50 - pct * 50}%` : "50%",
            width: `${pct * 50}%`,
          }}
          transition={{ duration: 0.4 }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-white/20">
        <span>-45°</span>
        <span>0°</span>
        <span>+45°</span>
      </div>
    </div>
  );
}

// ── Overview Page ─────────────────────────────────────────────────────────────
export default function OverviewPage() {
  const {
    accel, magnitude, avgMagnitude, jerk,
    impactEvents, gps, alerts, modules,
    accelHistory, settings,
    tilt, gpsQuality, batteryVoltage, uptime,
    connectionStatus,
  } = useTelemetry();

  const recentAlerts = alerts.slice(0, 3);

  // Extract last 15 data points for sparklines
  const last15      = accelHistory.slice(-15);
  const xHistory    = last15.map((e) => e.x);
  const yHistory    = last15.map((e) => e.y);
  const zHistory    = last15.map((e) => e.z);
  const magHistory  = last15.map((e) => Math.sqrt(e.x * e.x + e.y * e.y + e.z * e.z));

  // Battery % from 12V system (11.5V = 0%, 12.8V = 100%)
  const battPct = Math.max(0, Math.min(100, ((batteryVoltage - 11.5) / 1.3) * 100));
  const battColor = getBatteryColor(batteryVoltage);

  // Format uptime
  const uptimeH = Math.floor(uptime / 3600);
  const uptimeM = Math.floor((uptime % 3600) / 60);
  const uptimeS = uptime % 60;
  const uptimeStr = uptimeH > 0
    ? `${uptimeH}h ${uptimeM}m`
    : uptimeM > 0
    ? `${uptimeM}m ${uptimeS}s`
    : `${uptimeS}s`;

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl">
      {/* Page heading */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="mb-6 flex items-start justify-between flex-wrap gap-3"
      >
        <div>
          <p className="text-xs font-semibold tracking-widest text-[var(--accent)]/70 uppercase mb-1">
            Dashboard
          </p>
          <h1 className="text-2xl md:text-3xl font-display font-bold tracking-tight text-white">
            System Overview
          </h1>
        </div>

        {/* Uptime badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white/50">
          <Activity className="w-3.5 h-3.5" />
          <span className="text-xs font-mono">
            {connectionStatus === "simulated" ? "SIM" : "HW"} · Uptime {uptimeStr}
          </span>
        </div>
      </motion.div>

      {/* ── Warning Countdown (shown only during impact warning) ── */}
      <div className="mb-5">
        <WarningCountdown />
      </div>

      {/* ── Row 1: Core Accel + Impact ── */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-4"
      >
        <MetricCard
          label="Accel X"
          value={accel.x.toFixed(2)}
          unit="g"
          icon={ArrowUpDown}
          sparkData={xHistory}
          sparkColor="#06b6d4"
          threshold={settings.threshold}
        />
        <MetricCard
          label="Accel Y"
          value={accel.y.toFixed(2)}
          unit="g"
          icon={ArrowUpDown}
          sparkData={yHistory}
          sparkColor="#f97316"
          threshold={settings.threshold}
        />
        <MetricCard
          label="Accel Z"
          value={accel.z.toFixed(2)}
          unit="g"
          icon={ArrowUpDown}
          sparkData={zHistory}
          sparkColor="#a855f7"
          threshold={settings.threshold}
        />
        {/* G-Force Magnitude card */}
        <MetricCard
          label="G-Force Mag"
          value={magnitude.toFixed(3)}
          unit="g"
          icon={Gauge}
          highlight={magnitude > settings.threshold}
          sparkData={magHistory}
          sparkColor={magnitude > settings.threshold ? "#ef4444" : "#22c55e"}
          threshold={settings.threshold}
        />
        <MetricCard
          label="Impact Events"
          value={impactEvents}
          icon={AlertTriangle}
          highlight={impactEvents > 0}
        />
      </motion.div>

      {/* ── Row 2: Jerk + Tilt + Battery + GPS Quality ── */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6"
      >
        {/* Jerk */}
        <MetricCard
          label="Jerk"
          value={Math.abs(jerk).toFixed(1)}
          unit="g/s"
          icon={Activity}
          highlight={Math.abs(jerk) > settings.jerkThreshold}
          highlightWarning={Math.abs(jerk) > settings.jerkThreshold * 0.6 && Math.abs(jerk) <= settings.jerkThreshold}
        />

        {/* Pitch */}
        <MetricCard
          label="Pitch"
          value={tilt.pitch > 0 ? `+${tilt.pitch.toFixed(1)}` : tilt.pitch.toFixed(1)}
          unit="°"
          icon={RotateCcw}
          highlightWarning={Math.abs(tilt.pitch) > 25}
          highlight={Math.abs(tilt.pitch) > 35}
        />

        {/* Roll */}
        <MetricCard
          label="Roll"
          value={tilt.roll > 0 ? `+${tilt.roll.toFixed(1)}` : tilt.roll.toFixed(1)}
          unit="°"
          icon={Compass}
          highlightWarning={Math.abs(tilt.roll) > 25}
          highlight={Math.abs(tilt.roll) > 35}
        />

        {/* Battery */}
        <MetricCard
          label="Battery"
          value={batteryVoltage.toFixed(1)}
          unit="V"
          icon={BatteryMedium}
          highlight={batteryVoltage < 11.5}
          highlightWarning={batteryVoltage >= 11.5 && batteryVoltage < 12.0}
        />
      </motion.div>

      {/* ── Tilt Angle Gauges ── */}
      <motion.div
        variants={fadeInUp}
        initial="hidden"
        animate="show"
        className="glass-card p-5 mb-6"
      >
        <div className="flex items-center gap-2 mb-4">
          <Compass className="w-3.5 h-3.5 text-[var(--accent)]" />
          <span className="text-xs text-white/50 uppercase tracking-wider font-medium">
            Vehicle Tilt Orientation
          </span>
          <span className="ml-auto text-[10px] text-white/25">Complementary Filter</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <TiltGauge label="Pitch (Forward/Back)" value={tilt.pitch} />
          <TiltGauge label="Roll (Left/Right)" value={tilt.roll} />
        </div>
      </motion.div>

      {/* ── Live Magnitude Gauge Strip ── */}
      <motion.div
        variants={fadeInUp}
        initial="hidden"
        animate="show"
        className="glass-card p-4 mb-6"
      >
        <div className="flex items-center gap-3 mb-2">
          <Gauge className="w-3.5 h-3.5 text-[var(--accent)]" />
          <span className="text-xs text-white/50 uppercase tracking-wider">Live G-Force Magnitude</span>
          <span
            className="ml-auto text-sm font-bold font-mono"
            style={{ color: magnitude > settings.threshold ? "var(--danger)" : "var(--success)" }}
          >
            {magnitude.toFixed(3)}g
          </span>
          <span className="text-xs text-white/30">threshold: {settings.threshold}g</span>
        </div>
        <div className="relative h-2 bg-white/[0.06] rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{
              background: magnitude > settings.threshold
                ? "var(--danger)"
                : "linear-gradient(90deg, var(--accent), #3b82f6)",
            }}
            animate={{ width: `${Math.min((magnitude / 5) * 100, 100)}%` }}
            transition={{ duration: 0.4 }}
          />
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-[var(--danger)]/50"
            style={{ left: `${(settings.threshold / 5) * 100}%` }}
          />
        </div>

        {/* Avg magnitude sub-bar */}
        <div className="flex items-center gap-3 mt-3">
          <span className="text-[10px] text-white/30 uppercase tracking-wider w-20">Avg (5-pt)</span>
          <div className="flex-1 relative h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-[var(--accent)]/50"
              animate={{ width: `${Math.min((avgMagnitude / 5) * 100, 100)}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
          <span className="text-[10px] font-mono text-white/40">{avgMagnitude.toFixed(3)}g</span>
        </div>
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
            {[
              { icon: Radio,    label: "GPS NEO-6M", key: "gps"  as const },
              { icon: Activity, label: "GSM Module", key: "gsm"  as const },
              { icon: Cpu,      label: "MPU6050",    key: "mpu"  as const },
            ].map(({ icon: Icon, label, key }) => (
              <div key={key} className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-white/70">
                  <Icon className="w-3.5 h-3.5 text-white/40" />
                  {label}
                </div>
                <span className={cn("text-xs font-semibold px-2.5 py-0.5 rounded-full border", badgeColors[modules[key]] ?? badgeColors.Standby)}>
                  {modules[key]}
                </span>
              </div>
            ))}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-white/70">
                <Zap className="w-3.5 h-3.5 text-white/40" />
                12V Battery
              </div>
              <span className={cn("text-xs font-semibold px-2.5 py-0.5 rounded-full border", getVoltageBadge(modules.power))}>
                {modules.power}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-white/70">
                <Volume2 className="w-3.5 h-3.5 text-white/40" />
                Buzzer
              </div>
              <span className={cn("text-xs font-semibold px-2.5 py-0.5 rounded-full border", badgeColors[modules.buzzer] ?? badgeColors.Standby)}>
                {modules.buzzer}
              </span>
            </div>

            {/* GPS Quality row */}
            <div className="pt-3 mt-1 border-t border-white/[0.06]">
              <div className="flex items-center gap-2 text-xs text-white/40 mb-2">
                <Satellite className="w-3 h-3" />
                <span className="uppercase tracking-wider font-medium">GPS Quality</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] text-white/30 uppercase tracking-wider">Satellites</span>
                  <span className={cn(
                    "text-lg font-display font-bold",
                    gpsQuality.satellites >= 6 ? "text-[var(--success)]"
                      : gpsQuality.satellites >= 4 ? "text-[var(--warning)]"
                      : "text-[var(--danger)]"
                  )}>
                    {gpsQuality.satellites}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] text-white/30 uppercase tracking-wider">HDOP</span>
                  <span className={cn(
                    "text-lg font-display font-bold",
                    gpsQuality.hdop <= 1.5 ? "text-[var(--success)]"
                      : gpsQuality.hdop <= 2.5 ? "text-[var(--warning)]"
                      : "text-[var(--danger)]"
                  )}>
                    {gpsQuality.hdop.toFixed(1)}
                  </span>
                </div>
              </div>
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
              Open in Maps <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </motion.div>
      </motion.div>

      {/* ── Battery Status Strip ── */}
      <motion.div
        variants={fadeInUp}
        initial="hidden"
        animate="show"
        className="glass-card p-4 mb-6"
      >
        <div className="flex items-center gap-3 mb-2">
          <BatteryMedium className="w-3.5 h-3.5" style={{ color: battColor }} />
          <span className="text-xs text-white/50 uppercase tracking-wider">12V Battery Health</span>
          <span className="ml-auto text-sm font-bold font-mono" style={{ color: battColor }}>
            {batteryVoltage.toFixed(2)}V
          </span>
          <span className="text-xs text-white/30">{battPct.toFixed(0)}%</span>
        </div>
        <div className="relative h-2 bg-white/[0.06] rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ background: battColor }}
            animate={{ width: `${battPct}%` }}
            transition={{ duration: 0.6 }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-white/20 mt-1">
          <span>11.5V (low)</span>
          <span>12.0V</span>
          <span>12.8V (full)</span>
        </div>
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
