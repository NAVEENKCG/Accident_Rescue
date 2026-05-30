"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  ScrollText,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowUpDown,
} from "lucide-react";
import { useTelemetry } from "@/context/TelemetryContext";
import { AlertEntry } from "@/lib/simulatedData";
import { staggerContainer, fadeInUp } from "@/lib/animations";
import { cn } from "@/lib/cn";

type SortKey = "timestamp" | "severity" | "type";
type SortDir = "asc" | "desc";

const SEVERITY_ORDER = { danger: 0, warning: 1, success: 2 };

function severityBadge(severity: AlertEntry["severity"]) {
  const styles = {
    success: "bg-[var(--success)]/10 border-[var(--success)]/25 text-[var(--success)]",
    warning: "bg-[var(--warning)]/10 border-[var(--warning)]/25 text-[var(--warning)]",
    danger:  "bg-[var(--danger)]/10 border-[var(--danger)]/25 text-[var(--danger)]",
  };
  const icons = {
    success: <CheckCircle2 className="w-3 h-3" />,
    warning: <AlertTriangle className="w-3 h-3" />,
    danger:  <XCircle className="w-3 h-3" />,
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border",
        styles[severity]
      )}
    >
      {icons[severity]}
      {severity.charAt(0).toUpperCase() + severity.slice(1)}
    </span>
  );
}

export default function IncidentLogPage() {
  const { alerts } = useTelemetry();
  const [sortKey, setSortKey] = useState<SortKey>("timestamp");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const sorted = [...alerts].sort((a, b) => {
    let cmp = 0;
    if (sortKey === "severity") {
      cmp = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
    } else if (sortKey === "type") {
      cmp = a.type.localeCompare(b.type);
    } else {
      cmp = a.timestamp.localeCompare(b.timestamp);
    }
    return sortDir === "asc" ? cmp : -cmp;
  });

  function SortButton({ label, k }: { label: string; k: SortKey }) {
    return (
      <button
        onClick={() => toggleSort(k)}
        className={cn(
          "flex items-center gap-1 text-xs font-semibold uppercase tracking-wider transition-colors",
          sortKey === k ? "text-[var(--accent)]" : "text-white/30 hover:text-white/60"
        )}
      >
        {label}
        <ArrowUpDown className="w-3 h-3" />
      </button>
    );
  }

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
          History
        </p>
        <h1 className="text-2xl md:text-3xl font-display font-bold tracking-tight text-white">
          Incident Log
        </h1>
      </motion.div>

      {/* Summary stats */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="grid grid-cols-3 gap-3 mb-6"
      >
        {[
          {
            label: "Total Events",
            value: alerts.length,
            color: "text-white",
          },
          {
            label: "Alerts Sent",
            value: alerts.filter((a) => a.smsStatus === "Sent").length,
            color: "text-[var(--danger)]",
          },
          {
            label: "Auto-Cancelled",
            value: alerts.filter((a) => a.cancelStatus === "Cancelled").length,
            color: "text-[var(--warning)]",
          },
        ].map(({ label, value, color }) => (
          <motion.div key={label} variants={fadeInUp} className="glass-card p-4 text-center">
            <p className={cn("text-2xl font-display font-bold", color)}>{value}</p>
            <p className="text-xs text-white/40 mt-1">{label}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* Table */}
      <motion.div
        variants={fadeInUp}
        initial="hidden"
        animate="show"
        className="glass-card overflow-hidden"
      >
        <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.06]">
          <ScrollText className="w-4 h-4 text-[var(--accent)]" />
          <h2 className="font-display font-bold text-base text-white">All Incidents</h2>
          <span className="ml-auto text-xs text-white/30">{sorted.length} records</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="text-left px-4 py-3">
                  <SortButton label="Severity" k="severity" />
                </th>
                <th className="text-left px-4 py-3">
                  <SortButton label="Event" k="type" />
                </th>
                <th className="text-left px-4 py-3 hidden md:table-cell">
                  <SortButton label="Timestamp" k="timestamp" />
                </th>
                <th className="text-left px-4 py-3 hidden lg:table-cell text-xs font-semibold text-white/30 uppercase tracking-wider">
                  Coordinates
                </th>
                <th className="text-left px-4 py-3 hidden md:table-cell text-xs font-semibold text-white/30 uppercase tracking-wider">
                  SMS
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-white/30 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((alert, i) => (
                <motion.tr
                  key={alert.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.02, 0.3) }}
                  className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors"
                >
                  <td className="px-4 py-3">{severityBadge(alert.severity)}</td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-white text-xs">{alert.type}</p>
                      <p className="text-xs text-white/35 mt-0.5 max-w-xs truncate">
                        {alert.message}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-white/40 text-xs font-mono hidden md:table-cell">
                    {alert.timestamp}
                  </td>
                  <td className="px-4 py-3 text-white/40 text-xs font-mono hidden lg:table-cell">
                    {alert.coordinates}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span
                      className={cn(
                        "text-xs font-semibold",
                        alert.smsStatus === "Sent"
                          ? "text-[var(--success)]"
                          : "text-white/25"
                      )}
                    >
                      {alert.smsStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "text-xs font-semibold",
                        alert.cancelStatus === "Dispatched"
                          ? "text-[var(--danger)]"
                          : alert.cancelStatus === "Cancelled"
                          ? "text-white/40"
                          : "text-white/25"
                      )}
                    >
                      {alert.cancelStatus}
                    </span>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
