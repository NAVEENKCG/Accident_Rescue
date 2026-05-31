"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  type ChartOptions,
} from "chart.js";
import { Line } from "react-chartjs-2";
import annotationPlugin from "chartjs-plugin-annotation";
import { Activity, Gauge } from "lucide-react";
import { useTelemetry } from "@/context/TelemetryContext";
import { fadeInUp, staggerContainer, SPRING_SMOOTH } from "@/lib/animations";
import { cn } from "@/lib/cn";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  annotationPlugin
);

// ── Magnitude Gauge ───────────────────────────────────────────────────────────
function MagnitudeGauge({ value, threshold }: { value: number; threshold: number }) {
  const pct = Math.min((value / 5) * 100, 100);
  const isAlert = value > threshold;

  return (
    <div className="glass-card p-6 flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Gauge className="w-4 h-4 text-[var(--accent)]" />
        <h2 className="font-display font-bold text-base text-white">Live G-Force Magnitude</h2>
      </div>

      <div className="flex items-end gap-4">
        <span
          className={cn(
            "text-5xl font-display font-bold tracking-tight transition-colors duration-300",
            isAlert ? "text-[var(--danger)]" : "text-white"
          )}
        >
          {value.toFixed(3)}
        </span>
        <span className="text-xl text-white/40 mb-1">g</span>
      </div>

      {/* Bar */}
      <div className="relative h-3 bg-white/[0.06] rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full transition-colors duration-300"
          style={{
            background: isAlert
              ? "var(--danger)"
              : "linear-gradient(90deg, var(--accent), #3b82f6)",
          }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.3 }}
        />
        {/* Threshold marker */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-[var(--danger)]/60"
          style={{ left: `${(threshold / 5) * 100}%` }}
        />
      </div>

      <div className="flex justify-between text-xs text-white/30">
        <span>0g</span>
        <span className="text-[var(--danger)]/60">{threshold}g threshold</span>
        <span>5g</span>
      </div>

      <div
        className={cn(
          "text-xs font-semibold px-3 py-1.5 rounded-full border w-fit",
          isAlert
            ? "bg-[var(--danger)]/10 border-[var(--danger)]/30 text-[var(--danger)]"
            : "bg-[var(--success)]/10 border-[var(--success)]/30 text-[var(--success)]"
        )}
      >
        {isAlert ? "⚠ Impact Threshold Exceeded" : "✓ Normal Range"}
      </div>
    </div>
  );
}

// ── Live Sensors Page ─────────────────────────────────────────────────────────
export default function LiveSensorsPage() {
  const { accelHistory, magnitude, settings } = useTelemetry();
  const [threshold, setThreshold] = useState(settings.threshold);
  const chartRef = useRef<ChartJS<"line"> | null>(null);

  // Sync threshold from settings
  useEffect(() => {
    setThreshold(settings.threshold);
  }, [settings.threshold]);

  const labels = accelHistory.map((e) => e.time);
  const xData = accelHistory.map((e) => e.x);
  const yData = accelHistory.map((e) => e.y);
  const zData = accelHistory.map((e) => e.z);

  // 5-sample rolling average magnitude — mirrors Arduino firmware filter
  const rawMag = accelHistory.map((e) =>
    parseFloat(Math.sqrt(e.x * e.x + e.y * e.y + e.z * e.z).toFixed(3))
  );
  const rollingAvg = rawMag.map((_, i, arr) => {
    const window = arr.slice(Math.max(0, i - 4), i + 1);
    return parseFloat((window.reduce((s, v) => s + v, 0) / window.length).toFixed(3));
  });

  const chartData = {
    labels,
    datasets: [
      {
        label: "Accel X",
        data: xData,
        borderColor: "#06b6d4",
        backgroundColor: "rgba(6,182,212,0.06)",
        borderWidth: 1.5,
        pointRadius: 0,
        fill: false,
        tension: 0.4,
      },
      {
        label: "Accel Y",
        data: yData,
        borderColor: "#f97316",
        backgroundColor: "rgba(249,115,22,0.06)",
        borderWidth: 1.5,
        pointRadius: 0,
        fill: false,
        tension: 0.4,
      },
      {
        label: "Accel Z",
        data: zData,
        borderColor: "#a855f7",
        backgroundColor: "rgba(168,85,247,0.06)",
        borderWidth: 1.5,
        pointRadius: 0,
        fill: false,
        tension: 0.4,
      },
      {
        label: "Rolling Avg |G| (×5)",
        data: rollingAvg,
        borderColor: "rgba(34,197,94,0.8)",
        backgroundColor: "rgba(34,197,94,0.04)",
        borderWidth: 2,
        borderDash: [5, 3],
        pointRadius: 0,
        fill: false,
        tension: 0.3,
      },
    ],
  };

  // chartjs-plugin-annotation extends ChartOptions via module augmentation
  const chartOptions: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 300 },
    interaction: { mode: "index", intersect: false },
    scales: {
      x: {
        ticks: {
          color: "rgba(255,255,255,0.25)",
          font: { size: 10, family: "monospace" },
          maxTicksLimit: 10,
          maxRotation: 0,
        },
        grid: { color: "rgba(255,255,255,0.04)" },
        border: { color: "rgba(255,255,255,0.06)" },
      },
      y: {
        ticks: {
          color: "rgba(255,255,255,0.25)",
          font: { size: 10 },
        },
        grid: { color: "rgba(255,255,255,0.04)" },
        border: { color: "rgba(255,255,255,0.06)" },
      },
    },
    plugins: {
      legend: {
        labels: {
          color: "rgba(255,255,255,0.6)",
          font: { size: 12 },
          usePointStyle: true,
          pointStyleWidth: 8,
        },
      },
      tooltip: {
        backgroundColor: "rgba(13,21,38,0.95)",
        borderColor: "rgba(255,255,255,0.08)",
        borderWidth: 1,
        titleColor: "rgba(255,255,255,0.9)",
        bodyColor: "rgba(255,255,255,0.6)",
        padding: 12,
      },
      annotation: {
        annotations: {
          threshold: {
            type: "line",
            yMin: threshold,
            yMax: threshold,
            borderColor: "rgba(239,68,68,0.7)",
            borderWidth: 1.5,
            borderDash: [6, 3],
            label: {
              display: true,
              content: `Threshold: ${threshold}g`,
              backgroundColor: "rgba(239,68,68,0.15)",
              color: "rgba(239,68,68,0.9)",
              font: { size: 10 },
              position: "end",
            },
          },
        },
      },
    },
  };

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
          MPU6050
        </p>
        <h1 className="text-2xl md:text-3xl font-display font-bold tracking-tight text-white">
          Live Sensors
        </h1>
      </motion.div>

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 lg:grid-cols-3 gap-4"
      >
        {/* Chart (col-span-2) */}
        <motion.div variants={fadeInUp} className="glass-card p-6 lg:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-[var(--accent)]" />
            <h2 className="font-display font-bold text-base">Accelerometer — X / Y / Z</h2>
            <span className="ml-auto text-xs text-white/30 font-mono">60s rolling window</span>
          </div>

          <div className="h-64 md:h-80">
            <Line ref={chartRef} data={chartData} options={chartOptions} />
          </div>

          {/* Threshold slider */}
          <div className="mt-6 pt-4 border-t border-white/[0.06]">
            <div className="flex items-center justify-between mb-2">
              <label
                htmlFor="threshold-slider"
                className="text-sm text-white/60 font-medium"
              >
                Impact Threshold
              </label>
              <span className="text-sm font-bold font-mono text-[var(--danger)]">
                {threshold.toFixed(1)}g
              </span>
            </div>
            <input
              id="threshold-slider"
              type="range"
              min="0.5"
              max="5"
              step="0.1"
              value={threshold}
              onChange={(e) => setThreshold(parseFloat(e.target.value))}
              className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-[var(--danger)] bg-white/10"
            />
            <div className="flex justify-between text-xs text-white/25 mt-1">
              <span>0.5g</span>
              <span>5g</span>
            </div>
          </div>
        </motion.div>

        {/* Gauge */}
        <motion.div variants={fadeInUp}>
          <MagnitudeGauge value={magnitude} threshold={threshold} />
        </motion.div>

        {/* Axis cards */}
        {[
          { label: "Accel X", value: accelHistory[accelHistory.length - 1]?.x ?? 0, color: "#06b6d4" },
          { label: "Accel Y", value: accelHistory[accelHistory.length - 1]?.y ?? 0, color: "#f97316" },
          { label: "Accel Z", value: accelHistory[accelHistory.length - 1]?.z ?? 1, color: "#a855f7" },
        ].map(({ label, value, color }) => (
          <motion.div
            key={label}
            variants={fadeInUp}
            whileHover={{ y: -6, transition: SPRING_SMOOTH }}
            className="glass-card p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-white/50 uppercase tracking-wider">{label}</span>
              <div className="w-2 h-2 rounded-full" style={{ background: color }} />
            </div>
            <span
              className="text-3xl font-display font-bold"
              style={{ color }}
            >
              {value.toFixed(3)}
            </span>
            <span className="text-sm text-white/40 ml-1">g</span>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
