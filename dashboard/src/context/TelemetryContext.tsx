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
}

// ── Default State ────────────────────────────────────────────────────────────
const noop = () => {};

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
  latestToast: null,
  contacts: defaultContacts,
  settings: defaultSettings,
  updateSettings: noop,
  addContact: noop,
  editContact: noop,
  deleteContact: noop,
  dismissToast: noop,
};

const TelemetryContext = createContext<TelemetryState>(defaultState);

// ── Provider ─────────────────────────────────────────────────────────────────
export function TelemetryProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<Omit<TelemetryState,
    "updateSettings" | "addContact" | "editContact" | "deleteContact" | "dismissToast"
  >>({
    accel: defaultState.accel,
    magnitude: defaultState.magnitude,
    impactEvents: defaultState.impactEvents,
    gps: defaultState.gps,
    pastGps: defaultState.pastGps,
    alerts: defaultState.alerts,
    accelHistory: defaultState.accelHistory,
    modules: defaultState.modules,
    latestToast: defaultState.latestToast,
    contacts: defaultState.contacts,
    settings: defaultState.settings,
  });

  const tickRef = useRef(0);

  // ── Live Telemetry Interval (every 2s) ──────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      tickRef.current += 1;
      const tick = tickRef.current;

      setState((prev) => {
        // 5% chance of a spike
        const isSpike = Math.random() < 0.05;
        const newAccel = isSpike ? spikeAccel() : randomAccel();
        const mag = gForceMagnitude(newAccel.x, newAccel.y, newAccel.z);
        const isImpact = mag > prev.settings.threshold;

        // GPS drift
        const newGps = randomGPSDrift(prev.gps.lat, prev.gps.lng);
        const newPastGps = [prev.gps, ...prev.pastGps].slice(0, 5);

        // Rolling accel history (60 entries)
        const now = new Date();
        const timeLabel = `${now.getHours().toString().padStart(2, "0")}:${now
          .getMinutes()
          .toString()
          .padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`;
        const newHistory: AccelHistoryEntry[] = [
          ...prev.accelHistory.slice(1),
          { time: timeLabel, x: newAccel.x, y: newAccel.y, z: newAccel.z },
        ];

        // Impact alert
        let newAlerts = [...prev.alerts];
        let newToast = prev.latestToast;

        if (isImpact) {
          const alertEntry: AlertEntry = {
            id: `impact-${tick}`,
            severity: mag > 3.5 ? "danger" : "warning",
            type: mag > 3.5 ? "Severe Impact" : "Minor Impact",
            message:
              mag > 3.5
                ? `G-Force spike of ${mag}g — emergency alert dispatched!`
                : `G-Force spike of ${mag}g detected — warning triggered.`,
            timestamp: new Date().toLocaleString("en-IN", {
              hour: "2-digit",
              minute: "2-digit",
              day: "2-digit",
              month: "short",
            }),
            coordinates: `${newGps.lat}°N, ${newGps.lng}°E`,
            smsStatus: mag > 3.5 ? "Sent" : "N/A",
            cancelStatus: mag > 3.5 ? "Dispatched" : "Cancelled",
          };
          newAlerts = [alertEntry, ...prev.alerts].slice(0, 50);
          newToast = {
            id: alertEntry.id,
            message: alertEntry.message,
            severity: alertEntry.severity as "warning" | "danger",
          };
        }

        // Randomise voltage slightly
        const voltage = (4.95 + Math.random() * 0.06).toFixed(2);

        return {
          ...prev,
          accel: newAccel,
          magnitude: mag,
          impactEvents: isImpact ? prev.impactEvents + 1 : prev.impactEvents,
          gps: newGps,
          pastGps: newPastGps,
          alerts: newAlerts,
          accelHistory: newHistory,
          modules: {
            ...prev.modules,
            buzzer: isImpact ? "Active" : "Standby",
            power: `${voltage}V`,
          },
          latestToast: newToast,
        };
      });
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  // ── Setters ───────────────────────────────────────────────────────────────
  const updateSettings = useCallback((s: Partial<Settings>) => {
    setState((prev) => ({ ...prev, settings: { ...prev.settings, ...s } }));
  }, []);

  const addContact = useCallback((c: Omit<Contact, "id">) => {
    setState((prev) => ({
      ...prev,
      contacts: [
        ...prev.contacts,
        { ...c, id: `c-${Date.now()}` },
      ],
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
      }}
    >
      {children}
    </TelemetryContext.Provider>
  );
}

export function useTelemetry() {
  return useContext(TelemetryContext);
}
