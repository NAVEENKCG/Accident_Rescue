"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import {
  randomAccel,
  spikeAccel,
  gForceMagnitude,
  randomGPSDrift,
  sampleAlerts,
  createEmptyHistory,
  AlertEntry,
  AccelHistoryEntry,
  Contact,
  defaultContacts,
  Settings,
  defaultSettings,
} from "@/lib/simulatedData";

// ── Types ────────────────────────────────────────────────────────────────────
export interface WarningState {
  active: boolean;
  severity: "warning" | "danger";
  magnitude: number;
  secondsLeft: number;
  totalSeconds: number;
}

interface TelemetryState {
  accel: { x: number; y: number; z: number };
  magnitude: number;
  impactEvents: number;
  gps: { lat: number; lng: number };
  pastGps: { lat: number; lng: number }[];
  alerts: AlertEntry[];
  accelHistory: AccelHistoryEntry[];
  modules: {
    gps: string;
    gsm: string;
    mpu: string;
    power: string;
    buzzer: string;
  };
  // Warning countdown state
  warning: WarningState;
  // Toast state
  latestToast: { id: string; message: string; severity: "warning" | "danger" } | null;
  // Contacts
  contacts: Contact[];
  // Settings
  settings: Settings;
  // Setters
  updateSettings: (s: Partial<Settings>) => void;
  addContact: (c: Omit<Contact, "id">) => void;
  editContact: (id: string, c: Partial<Contact>) => void;
  deleteContact: (id: string) => void;
  dismissToast: () => void;
  cancelWarning: () => void;
}

// ── Default State ────────────────────────────────────────────────────────────
const noop = () => {};

const defaultWarning: WarningState = {
  active: false,
  severity: "warning",
  magnitude: 0,
  secondsLeft: 0,
  totalSeconds: 30,
};

const defaultState: TelemetryState = {
  accel: { x: 0.02, y: 0.01, z: 1.0 },
  magnitude: 1.0,
  impactEvents: 0,
  gps: { lat: 11.1271, lng: 78.6569 },
  pastGps: [],
  alerts: sampleAlerts,
  accelHistory: createEmptyHistory(60),
  modules: {
    gps: "Fixed",
    gsm: "Online",
    mpu: "Active",
    power: "4.97V",
    buzzer: "Standby",
  },
  warning: defaultWarning,
  latestToast: null,
  contacts: defaultContacts,
  settings: defaultSettings,
  updateSettings: noop,
  addContact: noop,
  editContact: noop,
  deleteContact: noop,
  dismissToast: noop,
  cancelWarning: noop,
};

const TelemetryContext = createContext<TelemetryState>(defaultState);

// ── Provider ─────────────────────────────────────────────────────────────────
export function TelemetryProvider({ children }: { children: React.ReactNode }) {
  type CoreState = Omit<TelemetryState,
    "updateSettings" | "addContact" | "editContact" | "deleteContact" |
    "dismissToast" | "cancelWarning"
  >;

  const [state, setState] = useState<CoreState>({
    accel: defaultState.accel,
    magnitude: defaultState.magnitude,
    impactEvents: defaultState.impactEvents,
    gps: defaultState.gps,
    pastGps: defaultState.pastGps,
    alerts: defaultState.alerts,
    accelHistory: defaultState.accelHistory,
    modules: defaultState.modules,
    warning: defaultState.warning,
    latestToast: defaultState.latestToast,
    contacts: defaultState.contacts,
    settings: defaultState.settings,
  });

  const tickRef = useRef(0);
  // Track warning countdown separately so we can cancel it
  const warningTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const warningActiveRef = useRef(false);

  // ── Warning Countdown ────────────────────────────────────────────────────
  const startWarningCountdown = useCallback(
    (severity: "warning" | "danger", mag: number, durationSec: number) => {
      if (warningActiveRef.current) return; // Already in warning
      warningActiveRef.current = true;

      // Set initial warning state
      setState((prev) => ({
        ...prev,
        warning: {
          active: true,
          severity,
          magnitude: mag,
          secondsLeft: durationSec,
          totalSeconds: durationSec,
        },
        modules: { ...prev.modules, buzzer: "Active" },
      }));

      let secondsLeft = durationSec;

      warningTimerRef.current = setInterval(() => {
        secondsLeft -= 1;

        if (secondsLeft <= 0) {
          // Warning expired → dispatch alert
          if (warningTimerRef.current) clearInterval(warningTimerRef.current);
          warningActiveRef.current = false;

          setState((prev) => {
            const alertEntry: AlertEntry = {
              id: `impact-${Date.now()}`,
              severity,
              type: severity === "danger" ? "Severe Impact" : "Minor Impact",
              message:
                severity === "danger"
                  ? `G-Force ${mag.toFixed(2)}g — emergency alert dispatched!`
                  : `G-Force ${mag.toFixed(2)}g — warning window expired, alert sent.`,
              timestamp: new Date().toLocaleString("en-IN", {
                hour: "2-digit",
                minute: "2-digit",
                day: "2-digit",
                month: "short",
              }),
              coordinates: `${prev.gps.lat.toFixed(4)}°N, ${prev.gps.lng.toFixed(4)}°E`,
              smsStatus: severity === "danger" ? "Sent" : "N/A",
              cancelStatus: "Dispatched",
            };

            return {
              ...prev,
              warning: defaultWarning,
              impactEvents: prev.impactEvents + 1,
              alerts: [alertEntry, ...prev.alerts].slice(0, 50),
              latestToast: {
                id: alertEntry.id,
                message: alertEntry.message,
                severity,
              },
              modules: { ...prev.modules, buzzer: "Standby" },
            };
          });
        } else {
          setState((prev) => ({
            ...prev,
            warning: { ...prev.warning, secondsLeft },
          }));
        }
      }, 1000);
    },
    []
  );

  const cancelWarning = useCallback(() => {
    if (warningTimerRef.current) clearInterval(warningTimerRef.current);
    warningActiveRef.current = false;

    setState((prev) => {
      if (!prev.warning.active) return prev;

      const cancelEntry: AlertEntry = {
        id: `cancel-${Date.now()}`,
        severity: "warning",
        type: "User Cancel",
        message: `Impact warning (${prev.warning.magnitude.toFixed(2)}g) cancelled by user.`,
        timestamp: new Date().toLocaleString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          day: "2-digit",
          month: "short",
        }),
        coordinates: `${prev.gps.lat.toFixed(4)}°N, ${prev.gps.lng.toFixed(4)}°E`,
        smsStatus: "N/A",
        cancelStatus: "Cancelled",
      };

      return {
        ...prev,
        warning: defaultWarning,
        alerts: [cancelEntry, ...prev.alerts].slice(0, 50),
        modules: { ...prev.modules, buzzer: "Standby" },
      };
    });
  }, []);

  // ── Live Telemetry Interval (every 2s) ──────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      tickRef.current += 1;

      setState((prev) => {
        // 5% chance of a spike
        const isSpike = Math.random() < 0.05;
        const newAccel = isSpike ? spikeAccel() : randomAccel();
        const mag = gForceMagnitude(newAccel.x, newAccel.y, newAccel.z);

        // GPS drift
        const newGps = randomGPSDrift(prev.gps.lat, prev.gps.lng);
        const newPastGps = [prev.gps, ...prev.pastGps].slice(0, 5);

        // Rolling accel history
        const now = new Date();
        const timeLabel = `${now.getHours().toString().padStart(2, "0")}:${now
          .getMinutes()
          .toString()
          .padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`;

        const newHistory: AccelHistoryEntry[] = [
          ...prev.accelHistory.slice(1),
          { time: timeLabel, x: newAccel.x, y: newAccel.y, z: newAccel.z },
        ];

        // Voltage fluctuation
        const voltage = (4.95 + Math.random() * 0.06).toFixed(2);

        // Spike handling — start warning countdown if not already in one
        const isImpact = mag > prev.settings.threshold;
        if (isImpact && !warningActiveRef.current) {
          const severity = mag > 3.5 ? "danger" : "warning";
          setTimeout(() =>
            startWarningCountdown(severity, mag, prev.settings.warnDuration), 0
          );
        }

        return {
          ...prev,
          accel: newAccel,
          magnitude: mag,
          gps: newGps,
          pastGps: newPastGps,
          accelHistory: newHistory,
          modules: {
            ...prev.modules,
            power: `${voltage}V`,
          },
        };
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [startWarningCountdown]);

  // ── Setters ───────────────────────────────────────────────────────────────
  const updateSettings = useCallback((s: Partial<Settings>) => {
    setState((prev) => ({ ...prev, settings: { ...prev.settings, ...s } }));
  }, []);

  const addContact = useCallback((c: Omit<Contact, "id">) => {
    setState((prev) => ({
      ...prev,
      contacts: [...prev.contacts, { ...c, id: `c-${Date.now()}` }],
    }));
  }, []);

  const editContact = useCallback((id: string, c: Partial<Contact>) => {
    setState((prev) => ({
      ...prev,
      contacts: prev.contacts.map((ct) => (ct.id === id ? { ...ct, ...c } : ct)),
    }));
  }, []);

  const deleteContact = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      contacts: prev.contacts.filter((ct) => ct.id !== id),
    }));
  }, []);

  const dismissToast = useCallback(() => {
    setState((prev) => ({ ...prev, latestToast: null }));
  }, []);

  return (
    <TelemetryContext.Provider
      value={{
        ...state,
        updateSettings,
        addContact,
        editContact,
        deleteContact,
        dismissToast,
        cancelWarning,
      }}
    >
      {children}
    </TelemetryContext.Provider>
  );
}

export function useTelemetry() {
  return useContext(TelemetryContext);
}
