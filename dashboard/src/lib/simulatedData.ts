export function randomAccel(): { x: number; y: number; z: number } {
  return {
    x: parseFloat((Math.random() * 0.1 - 0.05).toFixed(3)),
    y: parseFloat((Math.random() * 0.1 - 0.05).toFixed(3)),
    z: parseFloat((1.0 + Math.random() * 0.1 - 0.05).toFixed(3)),
  };
}

export function spikeAccel(): { x: number; y: number; z: number } {
  const dir = Math.random() > 0.5 ? 1 : -1;
  return {
    x: parseFloat((dir * (2.0 + Math.random() * 1.0)).toFixed(3)),
    y: parseFloat((dir * (1.5 + Math.random() * 0.8)).toFixed(3)),
    z: parseFloat((dir * (2.5 + Math.random() * 1.2)).toFixed(3)),
  };
}

export function gForceMagnitude(x: number, y: number, z: number): number {
  return parseFloat(Math.sqrt(x * x + y * y + z * z).toFixed(3));
}

export function randomGPSDrift(
  baseLat: number,
  baseLng: number
): { lat: number; lng: number } {
  return {
    lat: parseFloat((baseLat + (Math.random() - 0.5) * 0.001).toFixed(6)),
    lng: parseFloat((baseLng + (Math.random() - 0.5) * 0.001).toFixed(6)),
  };
}

// ── Accel History ────────────────────────────────────────────────────────────
export interface AccelHistoryEntry {
  time: string; // HH:MM:SS label
  x: number;
  y: number;
  z: number;
}

export function createEmptyHistory(size = 60): AccelHistoryEntry[] {
  return Array.from({ length: size }, (_, i) => ({
    time: `${60 - i}s`,
    x: 0,
    y: 0,
    z: 1.0,
  })).reverse();
}

// ── Alert Entry ──────────────────────────────────────────────────────────────
export interface AlertEntry {
  id: string;
  severity: "success" | "warning" | "danger";
  type: string;
  message: string;
  timestamp: string;
  coordinates: string;
  smsStatus: "Sent" | "Pending" | "N/A";
  cancelStatus: "Cancelled" | "Dispatched" | "N/A";
}

export const sampleAlerts: AlertEntry[] = [
  {
    id: "a1",
    severity: "success",
    type: "System Boot",
    message: "System booted successfully. All modules initialised.",
    timestamp: "Today, 08:14 AM",
    coordinates: "11.1271°N, 78.6569°E",
    smsStatus: "N/A",
    cancelStatus: "N/A",
  },
  {
    id: "a2",
    severity: "warning",
    type: "Minor Impact",
    message: "Minor impact detected (1.8g). Warning buzzer triggered — cancelled by user within 12s.",
    timestamp: "Yesterday, 06:42 PM",
    coordinates: "11.1275°N, 78.6572°E",
    smsStatus: "N/A",
    cancelStatus: "Cancelled",
  },
  {
    id: "a3",
    severity: "danger",
    type: "Severe Impact",
    message: "Accident alert sent! SMS + call dispatched to +91-98765-XXXXX. GPS link included.",
    timestamp: "3 days ago, 11:08 AM",
    coordinates: "11.1280°N, 78.6580°E",
    smsStatus: "Sent",
    cancelStatus: "Dispatched",
  },
  {
    id: "a4",
    severity: "warning",
    type: "Pothole Spike",
    message: "Sudden spike (2.1g) filtered by rolling average — no alert dispatched.",
    timestamp: "3 days ago, 02:35 PM",
    coordinates: "11.1290°N, 78.6585°E",
    smsStatus: "N/A",
    cancelStatus: "Cancelled",
  },
  {
    id: "a5",
    severity: "danger",
    type: "Rollover Detected",
    message: "Gyroscope roll threshold exceeded (4.2g). Emergency SMS sent to all contacts.",
    timestamp: "4 days ago, 11:02 AM",
    coordinates: "11.1300°N, 78.6590°E",
    smsStatus: "Sent",
    cancelStatus: "Dispatched",
  },
  {
    id: "a6",
    severity: "success",
    type: "GPS Lock",
    message: "GPS module acquired satellite fix. Accuracy: 2.3m CEP.",
    timestamp: "4 days ago, 11:10 AM",
    coordinates: "11.1305°N, 78.6595°E",
    smsStatus: "N/A",
    cancelStatus: "N/A",
  },
  {
    id: "a7",
    severity: "warning",
    type: "User Cancel",
    message: "Impact detected (1.9g) — manually cancelled by driver within 8s.",
    timestamp: "5 days ago, 11:25 AM",
    coordinates: "11.1310°N, 78.6600°E",
    smsStatus: "N/A",
    cancelStatus: "Cancelled",
  },
  {
    id: "a8",
    severity: "danger",
    type: "Multi-Axis Impact",
    message: "Multi-axis impact (3.8g) — voice call and SMS dispatched simultaneously.",
    timestamp: "5 days ago, 11:40 AM",
    coordinates: "11.1315°N, 78.6605°E",
    smsStatus: "Sent",
    cancelStatus: "Dispatched",
  },
];

// ── Emergency Contact ────────────────────────────────────────────────────────
export interface Contact {
  id: string;
  name: string;
  phone: string;
  priority: "Primary" | "Secondary" | "Tertiary";
}

export const defaultContacts: Contact[] = [
  { id: "c1", name: "Naveen Kumar", phone: "+91 98765 43210", priority: "Primary" },
  { id: "c2", name: "Emergency Services", phone: "108", priority: "Secondary" },
  { id: "c3", name: "Family Contact", phone: "+91 87654 32109", priority: "Tertiary" },
];

// ── Settings ─────────────────────────────────────────────────────────────────
export interface Settings {
  threshold: number;       // g-force impact threshold
  warnDuration: number;    // warning countdown in seconds
  smsAlerts: boolean;
  voiceAlerts: boolean;
  whatsappAlerts: boolean;
  muteSound: boolean;      // mute Web Audio alert beep
}

export const defaultSettings: Settings = {
  threshold: 2.5,
  warnDuration: 30,
  smsAlerts: true,
  voiceAlerts: false,
  whatsappAlerts: false,
  muteSound: false,
};
