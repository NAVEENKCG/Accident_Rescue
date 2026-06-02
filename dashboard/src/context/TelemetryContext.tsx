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
  randomGpsQuality,
  randomTiltAngles,
  spikeTiltAngles,
  computeJerk,
  randomBatteryVoltage,
  sampleAlerts,
  createEmptyHistory,
  AlertEntry,
  AccelHistoryEntry,
  Contact,
  defaultContacts,
  Settings,
  defaultSettings,
  GpsQuality,
  TiltAngles,
} from "@/lib/simulatedData";

// ── Types ────────────────────────────────────────────────────────────────────
export interface WarningState {
  active: boolean;
  severity: "warning" | "danger";
  magnitude: number;
  secondsLeft: number;
  totalSeconds: number;
}

/** Real-time connection status */
export type ConnectionStatus = "simulated" | "connected" | "disconnected";

interface TelemetryState {
  // ── Core accelerometer ────────────────────────────────────
  accel: { x: number; y: number; z: number };
  magnitude: number;
  avgMagnitude: number;
  jerk: number;
  impactEvents: number;

  // ── Orientation (complementary filter) ───────────────────
  tilt: TiltAngles;

  // ── GPS ──────────────────────────────────────────────────
  gps: { lat: number; lng: number };
  pastGps: { lat: number; lng: number }[];
  gpsQuality: GpsQuality;

  // ── System health ─────────────────────────────────────────
  batteryVoltage: number;
  uptime: number;   // seconds since boot

  // ── Module status ─────────────────────────────────────────
  alerts: AlertEntry[];
  accelHistory: AccelHistoryEntry[];
  modules: {
    gps: string;
    gsm: string;
    mpu: string;
    power: string;
    buzzer: string;
  };

  // ── Warning countdown ─────────────────────────────────────
  warning: WarningState;

  // ── Toast ────────────────────────────────────────────────
  latestToast: { id: string; message: string; severity: "warning" | "danger" } | null;

  // ── Contacts & Settings ───────────────────────────────────
  contacts: Contact[];
  settings: Settings;

  // ── Connection ────────────────────────────────────────────
  connectionStatus: ConnectionStatus;

  // ── Setters ──────────────────────────────────────────────
  updateSettings: (s: Partial<Settings>) => void;
  addContact: (c: Omit<Contact, "id">) => void;
  editContact: (id: string, c: Partial<Contact>) => void;
  deleteContact: (id: string) => void;
  dismissToast: () => void;
  cancelWarning: () => void;
  /** Called by SerialBridgeContext when a real Arduino JSON frame arrives */
  injectArduinoFrame: (frame: ArduinoDataFrame) => void;
  /** Called by SerialBridgeContext to set connection status */
  setConnectionStatus: (s: ConnectionStatus) => void;
}

/** Shape of a parsed Arduino JSON data frame (t:"data") */
export interface ArduinoDataFrame {
  t: "data";
  ax: number; ay: number; az: number;
  mag: number; avg: number; jerk: number;
  gx: number; gy: number;
  pitch: number; roll: number;
  lat: number; lng: number;
  sat: number; hdop: number;
  volt: number;
  impact: boolean;
  roll_det: boolean;
  warn: boolean;
  warnLeft: number;
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
  avgMagnitude: 1.0,
  jerk: 0.0,
  impactEvents: 0,
  tilt: { pitch: 0, roll: 0 },
  gps: { lat: 11.1271, lng: 78.6569 },
  pastGps: [],
  gpsQuality: { satellites: 8, hdop: 1.2 },
  batteryVoltage: 12.2,
  uptime: 0,
  alerts: sampleAlerts,
  accelHistory: createEmptyHistory(60),
  modules: {
    gps: "Fixed",
    gsm: "Online",
    mpu: "Active",
    power: "12.2V",
    buzzer: "Standby",
  },
  warning: defaultWarning,
  latestToast: null,
  contacts: defaultContacts,
  settings: defaultSettings,
  connectionStatus: "simulated",
  updateSettings: noop,
  addContact: noop,
  editContact: noop,
  deleteContact: noop,
  dismissToast: noop,
  cancelWarning: noop,
  injectArduinoFrame: noop,
  setConnectionStatus: noop,
};

const TelemetryContext = createContext<TelemetryState>(defaultState);

// ── Provider ─────────────────────────────────────────────────────────────────
export function TelemetryProvider({ children }: { children: React.ReactNode }) {
  type CoreState = Omit<TelemetryState,
    | "updateSettings" | "addContact" | "editContact" | "deleteContact"
    | "dismissToast" | "cancelWarning" | "injectArduinoFrame" | "setConnectionStatus"
  >;

  const [state, setState] = useState<CoreState>({
    accel:          defaultState.accel,
    magnitude:      defaultState.magnitude,
    avgMagnitude:   defaultState.avgMagnitude,
    jerk:           defaultState.jerk,
    impactEvents:   defaultState.impactEvents,
    tilt:           defaultState.tilt,
    gps:            defaultState.gps,
    pastGps:        defaultState.pastGps,
    gpsQuality:     defaultState.gpsQuality,
    batteryVoltage: defaultState.batteryVoltage,
    uptime:         defaultState.uptime,
    alerts:         defaultState.alerts,
    accelHistory:   defaultState.accelHistory,
    modules:        defaultState.modules,
    warning:        defaultState.warning,
    latestToast:    defaultState.latestToast,
    contacts:       defaultState.contacts,
    settings:       defaultState.settings,
    connectionStatus: defaultState.connectionStatus,
  });

  const tickRef = useRef(0);
  const warningTimerRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const warningActiveRef  = useRef(false);
  const prevMagRef        = useRef(1.0);
  const prevTickTimeRef   = useRef(Date.now());

  // ── Warning Countdown ────────────────────────────────────────────────────
  const startWarningCountdown = useCallback(
    (severity: "warning" | "danger", mag: number, durationSec: number) => {
      if (warningActiveRef.current) return;
      warningActiveRef.current = true;

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

  // ── Inject Real Arduino Frame ────────────────────────────────────────────
  const injectArduinoFrame = useCallback(
    (frame: ArduinoDataFrame) => {
      setState((prev) => {
        const newGps      = { lat: frame.lat, lng: frame.lng };
        const newPastGps  = [prev.gps, ...prev.pastGps].slice(0, 5);
        const now         = new Date();
        const timeLabel   = `${now.getHours().toString().padStart(2, "0")}:${now
          .getMinutes().toString().padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`;

        const newHistory: AccelHistoryEntry[] = [
          ...prev.accelHistory.slice(1),
          { time: timeLabel, x: frame.ax, y: frame.ay, z: frame.az },
        ];

        // Handle warning triggered by real Arduino
        if (frame.warn && !warningActiveRef.current) {
          const severity = frame.mag > 3.5 ? "danger" : "warning";
          setTimeout(() =>
            startWarningCountdown(severity, frame.mag, prev.settings.warnDuration), 0
          );
        }
        if (!frame.warn && warningActiveRef.current && frame.warnLeft <= 0) {
          if (warningTimerRef.current) clearInterval(warningTimerRef.current);
          warningActiveRef.current = false;
        }

        return {
          ...prev,
          accel:          { x: frame.ax, y: frame.ay, z: frame.az },
          magnitude:      frame.mag,
          avgMagnitude:   frame.avg,
          jerk:           frame.jerk,
          tilt:           { pitch: frame.pitch, roll: frame.roll },
          gps:            newGps,
          pastGps:        newPastGps,
          gpsQuality:     { satellites: frame.sat, hdop: frame.hdop },
          batteryVoltage: frame.volt,
          accelHistory:   newHistory,
          modules: {
            ...prev.modules,
            gps:    frame.sat > 0 ? "Fixed" : "Searching",
            power:  `${frame.volt.toFixed(1)}V`,
            buzzer: frame.warn ? "Active" : "Standby",
          },
        };
      });
    },
    [startWarningCountdown]
  );

  const setConnectionStatus = useCallback((s: ConnectionStatus) => {
    setState((prev) => ({ ...prev, connectionStatus: s }));
  }, []);

  // ── Live Simulated Telemetry (every 2s — paused when real device connected)
  useEffect(() => {
    const interval = setInterval(() => {
      // Don't simulate when a real device is connected
      setState((prev) => {
        if (prev.connectionStatus === "connected") return prev;

        tickRef.current += 1;
        const now = Date.now();
        const dtMs = now - prevTickTimeRef.current;
        prevTickTimeRef.current = now;

        const isSpike    = Math.random() < 0.05;
        const newAccel   = isSpike ? spikeAccel()   : randomAccel();
        const newTilt    = isSpike ? spikeTiltAngles() : randomTiltAngles(prev.tilt);
        const mag        = gForceMagnitude(newAccel.x, newAccel.y, newAccel.z);
        const jerk       = computeJerk(prevMagRef.current, mag, dtMs);
        prevMagRef.current = mag;

        // Rolling average of last FILTER_SIZE magnitudes
        const last5 = [...prev.accelHistory.slice(-5), { time: "", x: newAccel.x, y: newAccel.y, z: newAccel.z }];
        const avgMag = parseFloat((last5.reduce((s, e) =>
          s + Math.sqrt(e.x * e.x + e.y * e.y + e.z * e.z), 0) / last5.length).toFixed(3));

        const newGps     = randomGPSDrift(prev.gps.lat, prev.gps.lng);
        const newPastGps = [prev.gps, ...prev.pastGps].slice(0, 5);
        const newQuality = randomGpsQuality(prev.gpsQuality);
        const newBattery = randomBatteryVoltage(prev.batteryVoltage);

        const nowDate  = new Date();
        const timeLabel = `${nowDate.getHours().toString().padStart(2, "0")}:${nowDate
          .getMinutes().toString().padStart(2, "0")}:${nowDate.getSeconds().toString().padStart(2, "0")}`;

        const newHistory: AccelHistoryEntry[] = [
          ...prev.accelHistory.slice(1),
          { time: timeLabel, x: newAccel.x, y: newAccel.y, z: newAccel.z },
        ];

        // Impact detection
        const isImpact = mag > prev.settings.threshold;
        if (isImpact && !warningActiveRef.current) {
          const severity = mag > 3.5 ? "danger" : "warning";
          setTimeout(() =>
            startWarningCountdown(severity, mag, prev.settings.warnDuration), 0
          );
        }

        return {
          ...prev,
          accel:          newAccel,
          magnitude:      mag,
          avgMagnitude:   avgMag,
          jerk,
          tilt:           newTilt,
          gps:            newGps,
          pastGps:        newPastGps,
          gpsQuality:     newQuality,
          batteryVoltage: newBattery,
          uptime:         prev.uptime + 2,
          accelHistory:   newHistory,
          modules: {
            ...prev.modules,
            power: `${newBattery.toFixed(1)}V`,
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
        injectArduinoFrame,
        setConnectionStatus,
      }}
    >
      {children}
    </TelemetryContext.Provider>
  );
}

export function useTelemetry() {
  return useContext(TelemetryContext);
}
