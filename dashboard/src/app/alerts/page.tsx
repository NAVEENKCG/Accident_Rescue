"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, AlertTriangle, XCircle, Bell, MessageSquare, X } from "lucide-react";
import { useTelemetry } from "@/context/TelemetryContext";
import { AlertEntry } from "@/lib/simulatedData";
import { staggerContainer, fadeInUp } from "@/lib/animations";
import { cn } from "@/lib/cn";

type FilterType = "all" | "sent" | "cancelled" | "warning";

const FILTERS: { key: FilterType; label: string }[] = [
  { key: "all", label: "All" },
  { key: "sent", label: "Sent" },
  { key: "cancelled", label: "Cancelled" },
  { key: "warning", label: "Warning" },
];

function severityIcon(severity: AlertEntry["severity"]) {
  if (severity === "success")
    return <CheckCircle2 className="w-4 h-4 text-[var(--success)]" />;
  if (severity === "warning")
    return <AlertTriangle className="w-4 h-4 text-[var(--warning)]" />;
  return <XCircle className="w-4 h-4 text-[var(--danger)]" />;
}

function smsBadge(status: AlertEntry["smsStatus"]) {
  if (status === "Sent")
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-[var(--success)]/10 border border-[var(--success)]/25 text-[var(--success)]">
        <MessageSquare className="w-3 h-3" /> Sent
      </span>
    );
  if (status === "Pending")
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-[var(--warning)]/10 border border-[var(--warning)]/25 text-[var(--warning)]">
        Pending
      </span>
    );
  return (
    <span className="px-2 py-0.5 rounded-full text-xs text-white/30 bg-white/[0.04]">N/A</span>
  );
}

function cancelBadge(status: AlertEntry["cancelStatus"]) {
  if (status === "Dispatched")
    return (
      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-[var(--danger)]/10 border border-[var(--danger)]/25 text-[var(--danger)]">
        Dispatched
      </span>
    );
  if (status === "Cancelled")
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-white/[0.06] border border-white/[0.12] text-white/50">
        <X className="w-3 h-3" /> Cancelled
      </span>
    );
  return (
    <span className="px-2 py-0.5 rounded-full text-xs text-white/30 bg-white/[0.04]">N/A</span>
  );
}

export default function AlertsPage() {
  const { alerts } = useTelemetry();
  const [filter, setFilter] = useState<FilterType>("all");

  const filtered = alerts.filter((a) => {
    if (filter === "all") return true;
    if (filter === "sent") return a.smsStatus === "Sent";
    if (filter === "cancelled") return a.cancelStatus === "Cancelled";
    if (filter === "warning") return a.severity === "warning";
    return true;
  });

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
          GSM Module
        </p>
        <h1 className="text-2xl md:text-3xl font-display font-bold tracking-tight text-white">
          Alerts
        </h1>
      </motion.div>

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="flex flex-col gap-4"
      >
        {/* Filter Tabs */}
        <motion.div variants={fadeInUp} className="flex gap-2 flex-wrap">
          {FILTERS.map(({ key, label }) => (
            <button
              key={key}
              id={`filter-${key}`}
              onClick={() => setFilter(key)}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200",
                filter === key
                  ? "bg-[var(--accent)]/20 border border-[var(--accent)]/40 text-[var(--accent)]"
                  : "bg-white/[0.04] border border-white/[0.08] text-white/50 hover:text-white/80 hover:bg-white/[0.07]"
              )}
            >
              {label}
              <span className="ml-1.5 text-xs opacity-60">
                {key === "all"
                  ? alerts.length
                  : key === "sent"
                  ? alerts.filter((a) => a.smsStatus === "Sent").length
                  : key === "cancelled"
                  ? alerts.filter((a) => a.cancelStatus === "Cancelled").length
                  : alerts.filter((a) => a.severity === "warning").length}
              </span>
            </button>
          ))}
        </motion.div>

        {/* Table */}
        <motion.div variants={fadeInUp} className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-white/30 uppercase tracking-wider w-10">
                    Sev.
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-white/30 uppercase tracking-wider">
                    Event Type
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-white/30 uppercase tracking-wider hidden md:table-cell">
                    Timestamp
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-white/30 uppercase tracking-wider hidden lg:table-cell">
                    Coordinates
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-white/30 uppercase tracking-wider">
                    SMS
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-white/30 uppercase tracking-wider">
                    Dispatch
                  </th>
                </tr>
              </thead>
              <AnimatePresence mode="popLayout">
                <tbody>
                  {filtered.map((alert, i) => (
                    <motion.tr
                      key={alert.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      transition={{ delay: i * 0.03 }}
                      className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-4 py-3">{severityIcon(alert.severity)}</td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-white">{alert.type}</p>
                          <p className="text-xs text-white/40 mt-0.5 line-clamp-1">
                            {alert.message}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-white/50 text-xs hidden md:table-cell font-mono">
                        {alert.timestamp}
                      </td>
                      <td className="px-4 py-3 text-white/50 text-xs hidden lg:table-cell font-mono">
                        {alert.coordinates}
                      </td>
                      <td className="px-4 py-3">{smsBadge(alert.smsStatus)}</td>
                      <td className="px-4 py-3">{cancelBadge(alert.cancelStatus)}</td>
                    </motion.tr>
                  ))}

                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center">
                        <Bell className="w-8 h-8 text-white/20 mx-auto mb-2" />
                        <p className="text-sm text-white/40">No alerts match this filter</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </AnimatePresence>
            </table>
          </div>
        </motion.div>

        {/* Count footer */}
        <motion.p variants={fadeInUp} className="text-xs text-white/30 text-right">
          Showing {filtered.length} of {alerts.length} alert{alerts.length !== 1 ? "s" : ""}
        </motion.p>
      </motion.div>
    </div>
  );
}
