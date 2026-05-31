"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Settings, Save, CheckCircle2, MessageSquare, Phone, MessageCircle, VolumeX } from "lucide-react";
import { useTelemetry } from "@/context/TelemetryContext";
import { staggerContainer, fadeInUp } from "@/lib/animations";
import { cn } from "@/lib/cn";

// ── Toggle Switch ─────────────────────────────────────────────────────────────
function Toggle({
  id,
  checked,
  onChange,
  label,
  description,
  icon: Icon,
}: {
  id: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description: string;
  icon: React.ElementType;
}) {
  return (
    <div className="flex items-center gap-4 py-4 border-b border-white/[0.06] last:border-0">
      <div className="w-9 h-9 rounded-xl bg-[var(--accent)]/10 flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-[var(--accent)]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white">{label}</p>
        <p className="text-xs text-white/40 mt-0.5">{description}</p>
      </div>
      <button
        id={id}
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative w-11 h-6 rounded-full transition-colors duration-300 flex-shrink-0",
          checked ? "bg-[var(--accent)]" : "bg-white/[0.12]"
        )}
      >
        <motion.div
          className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm"
          animate={{ left: checked ? "calc(100% - 1.375rem)" : "2px" }}
          transition={{ type: "spring", stiffness: 500, damping: 35 }}
        />
      </button>
    </div>
  );
}

// ── Settings Page ──────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const { settings, updateSettings } = useTelemetry();

  const [threshold, setThreshold] = useState(settings.threshold);
  const [warnDuration, setWarnDuration] = useState(settings.warnDuration);
  const [smsAlerts, setSmsAlerts] = useState(settings.smsAlerts);
  const [voiceAlerts, setVoiceAlerts] = useState(settings.voiceAlerts);
  const [whatsappAlerts, setWhatsappAlerts] = useState(settings.whatsappAlerts);
  const [muteSound, setMuteSound] = useState(settings.muteSound);
  const [saved, setSaved] = useState(false);

  // Sync if settings change externally
  useEffect(() => {
    setThreshold(settings.threshold);
    setWarnDuration(settings.warnDuration);
    setSmsAlerts(settings.smsAlerts);
    setVoiceAlerts(settings.voiceAlerts);
    setWhatsappAlerts(settings.whatsappAlerts);
    setMuteSound(settings.muteSound);
  }, [settings]);

  const handleSave = () => {
    updateSettings({
      threshold,
      warnDuration,
      smsAlerts,
      voiceAlerts,
      whatsappAlerts,
      muteSound,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-3xl">
      {/* Heading */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="mb-6"
      >
        <p className="text-xs font-semibold tracking-widest text-[var(--accent)]/70 uppercase mb-1">
          Configuration
        </p>
        <h1 className="text-2xl md:text-3xl font-display font-bold tracking-tight text-white">
          Settings
        </h1>
      </motion.div>

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="flex flex-col gap-4"
      >
        {/* ── Detection Settings ── */}
        <motion.section variants={fadeInUp} className="glass-card p-6">
          <div className="flex items-center gap-2 mb-5">
            <Settings className="w-4 h-4 text-[var(--accent)]" />
            <h2 className="font-display font-bold text-base text-white">Detection Settings</h2>
          </div>

          {/* Impact Threshold */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="impact-threshold" className="text-sm font-medium text-white">
                Impact Threshold
              </label>
              <span className="text-sm font-bold font-mono text-[var(--danger)]">
                {threshold.toFixed(1)}g
              </span>
            </div>
            <input
              id="impact-threshold"
              type="range"
              min="0.5"
              max="5"
              step="0.1"
              value={threshold}
              onChange={(e) => setThreshold(parseFloat(e.target.value))}
              className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-[var(--danger)] bg-white/10"
            />
            <div className="flex justify-between text-xs text-white/25 mt-1">
              <span>0.5g (sensitive)</span>
              <span>5g (impact only)</span>
            </div>
            <p className="text-xs text-white/40 mt-2">
              G-force above this value triggers the warning countdown.
            </p>
          </div>

          {/* Warning Duration */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="warn-duration" className="text-sm font-medium text-white">
                Warning Duration
              </label>
              <span className="text-sm font-bold font-mono text-[var(--warning)]">
                {warnDuration}s
              </span>
            </div>
            <input
              id="warn-duration"
              type="range"
              min="10"
              max="60"
              step="5"
              value={warnDuration}
              onChange={(e) => setWarnDuration(parseInt(e.target.value))}
              className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-[var(--warning)] bg-white/10"
            />
            <div className="flex justify-between text-xs text-white/25 mt-1">
              <span>10s</span>
              <span>60s</span>
            </div>
            <p className="text-xs text-white/40 mt-2">
              Time window to cancel the alert before emergency contacts are notified.
            </p>
          </div>
        </motion.section>

        {/* ── Alert Channels ── */}
        <motion.section variants={fadeInUp} className="glass-card p-6">
          <h2 className="font-display font-bold text-base text-white mb-1">Alert Channels</h2>
          <p className="text-xs text-white/40 mb-4">
            Choose how emergency contacts are notified when an alert is dispatched.
          </p>

          <Toggle
            id="toggle-sms"
            checked={smsAlerts}
            onChange={setSmsAlerts}
            label="SMS Alerts"
            description="Send text message to all registered contacts"
            icon={MessageSquare}
          />
          <Toggle
            id="toggle-voice"
            checked={voiceAlerts}
            onChange={setVoiceAlerts}
            label="Voice Call Alerts"
            description="Automated voice call to primary contact"
            icon={Phone}
          />
          <Toggle
            id="toggle-whatsapp"
            checked={whatsappAlerts}
            onChange={setWhatsappAlerts}
            label="WhatsApp Alerts"
            description="Send WhatsApp message with GPS link"
            icon={MessageCircle}
          />
          <Toggle
            id="toggle-mute"
            checked={muteSound}
            onChange={setMuteSound}
            label="Mute Sound Alerts"
            description="Disable Web Audio beep on impact detection"
            icon={VolumeX}
          />
        </motion.section>

        {/* ── Save ── */}
        <motion.div variants={fadeInUp} className="flex items-center justify-between">
          <AnimatePresence>
            {saved && (
              <motion.div
                key="saved-toast"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="flex items-center gap-2 text-sm text-[var(--success)] font-semibold"
              >
                <CheckCircle2 className="w-4 h-4" />
                Settings saved successfully
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button
            id="save-settings-btn"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            onClick={handleSave}
            className="ml-auto flex items-center gap-2 px-6 py-3 rounded-xl bg-[var(--accent)]/20 border border-[var(--accent)]/40 text-[var(--accent)] font-semibold text-sm hover:bg-[var(--accent)]/30 transition-colors"
          >
            <Save className="w-4 h-4" />
            Save Settings
          </motion.button>
        </motion.div>
      </motion.div>
    </div>
  );
}
