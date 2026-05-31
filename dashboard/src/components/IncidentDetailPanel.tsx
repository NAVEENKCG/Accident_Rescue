"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  MapPin,
  MessageSquare,
  Clock,
  ExternalLink,
} from "lucide-react";
import { AlertEntry } from "@/lib/simulatedData";
import { cn } from "@/lib/cn";

interface Props {
  alert: AlertEntry | null;
  onClose: () => void;
}

const severityConfig = {
  success: {
    icon: CheckCircle2,
    color: "var(--success)",
    label: "Success",
    bg: "bg-[var(--success)]/10",
    border: "border-[var(--success)]/30",
  },
  warning: {
    icon: AlertTriangle,
    color: "var(--warning)",
    label: "Warning",
    bg: "bg-[var(--warning)]/10",
    border: "border-[var(--warning)]/30",
  },
  danger: {
    icon: XCircle,
    color: "var(--danger)",
    label: "Critical",
    bg: "bg-[var(--danger)]/10",
    border: "border-[var(--danger)]/30",
  },
};

export function IncidentDetailPanel({ alert, onClose }: Props) {
  const cfg = alert ? severityConfig[alert.severity] : null;
  const Icon = cfg?.icon ?? AlertTriangle;

  const mapsUrl = alert?.coordinates
    ? (() => {
        const match = alert.coordinates.match(
          /([\d.]+)°N,\s*([\d.]+)°E/
        );
        if (match)
          return `https://www.google.com/maps?q=${match[1]},${match[2]}`;
        return null;
      })()
    : null;

  // SMS preview (matches Arduino firmware format)
  const smsPreview = alert?.smsStatus === "Sent" && mapsUrl
    ? `ACCIDENT ALERT! Location: ${mapsUrl}`
    : null;

  return (
    <AnimatePresence>
      {alert && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          />

          {/* Side panel */}
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 38 }}
            className="fixed right-0 top-0 h-full w-full max-w-md z-50 flex flex-col"
            style={{
              background: "rgba(13,21,38,0.97)",
              borderLeft: `1px solid ${cfg?.color}30`,
              backdropFilter: "blur(40px)",
            }}
            role="complementary"
            aria-label="Incident detail panel"
          >
            {/* Header */}
            <div
              className="flex items-center gap-3 px-5 py-4 border-b"
              style={{ borderColor: `${cfg?.color}20` }}
            >
              <div
                className={cn("w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0", cfg?.bg)}
              >
                <Icon className="w-4 h-4" style={{ color: cfg?.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-display font-bold text-white text-sm truncate">
                  {alert.type}
                </p>
                <p className="text-xs text-white/40">{cfg?.label} Event</p>
              </div>
              <button
                onClick={onClose}
                aria-label="Close panel"
                className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/[0.07] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Message */}
              <div
                className={cn("p-4 rounded-2xl border", cfg?.bg, cfg?.border)}
              >
                <p className="text-sm text-white/90 leading-relaxed">{alert.message}</p>
              </div>

              {/* Details grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="glass-card p-4">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Clock className="w-3.5 h-3.5 text-white/30" />
                    <span className="text-xs text-white/40 uppercase tracking-wider">Timestamp</span>
                  </div>
                  <p className="text-sm text-white font-mono">{alert.timestamp}</p>
                </div>

                <div className="glass-card p-4">
                  <div className="flex items-center gap-1.5 mb-2">
                    <MessageSquare className="w-3.5 h-3.5 text-white/30" />
                    <span className="text-xs text-white/40 uppercase tracking-wider">SMS Status</span>
                  </div>
                  <p
                    className="text-sm font-bold"
                    style={{
                      color:
                        alert.smsStatus === "Sent"
                          ? "var(--success)"
                          : "rgba(255,255,255,0.3)",
                    }}
                  >
                    {alert.smsStatus}
                  </p>
                </div>

                <div className="glass-card p-4">
                  <div className="flex items-center gap-1.5 mb-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-white/30" />
                    <span className="text-xs text-white/40 uppercase tracking-wider">Dispatch</span>
                  </div>
                  <p
                    className="text-sm font-bold"
                    style={{
                      color:
                        alert.cancelStatus === "Dispatched"
                          ? "var(--danger)"
                          : alert.cancelStatus === "Cancelled"
                          ? "var(--warning)"
                          : "rgba(255,255,255,0.3)",
                    }}
                  >
                    {alert.cancelStatus}
                  </p>
                </div>

                <div className="glass-card p-4">
                  <div className="flex items-center gap-1.5 mb-2">
                    <MapPin className="w-3.5 h-3.5 text-white/30" />
                    <span className="text-xs text-white/40 uppercase tracking-wider">Event ID</span>
                  </div>
                  <p className="text-xs font-mono text-white/50 truncate">{alert.id}</p>
                </div>
              </div>

              {/* Location */}
              <div className="glass-card p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[var(--accent)]" />
                    <span className="text-xs text-white/40 uppercase tracking-wider">Coordinates</span>
                  </div>
                  {mapsUrl && (
                    <a
                      href={mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-[var(--accent)] hover:underline"
                    >
                      Open Map <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
                <p className="font-mono text-sm text-white/80">{alert.coordinates}</p>
              </div>

              {/* SMS Preview */}
              {smsPreview && (
                <div className="glass-card p-4">
                  <p className="text-xs text-white/40 uppercase tracking-wider mb-2">
                    SMS Sent to Emergency Contacts
                  </p>
                  <div className="rounded-xl bg-[var(--success)]/[0.05] border border-[var(--success)]/15 px-3 py-3">
                    <p className="text-xs font-mono text-white/70 leading-relaxed break-all">
                      {smsPreview}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
