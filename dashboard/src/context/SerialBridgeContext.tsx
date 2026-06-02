"use client";

/**
 * SerialBridgeContext
 * ───────────────────
 * Provides a Web Serial API bridge between a physical Arduino
 * and the TelemetryContext. When the user clicks "Connect Device",
 * this context opens a serial port at 115200 baud, reads newline-
 * delimited JSON frames, and pipes them into TelemetryContext via
 * `injectArduinoFrame()`.
 *
 * Falls back gracefully when the browser doesn't support Web Serial
 * (Firefox, Safari) or when no device is connected.
 *
 * ⚠️  Web Serial API requires:
 *   • Chromium-based browser (Chrome 89+, Edge 89+)
 *   • Served over HTTPS or localhost
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
} from "react";
import { useTelemetry, ArduinoDataFrame } from "./TelemetryContext";

// ── Minimal Web Serial API type stubs ────────────────────────
// (avoids needing @types/w3c-web-serial which may not be installed)
interface SerialPortInfo { usbVendorId?: number; usbProductId?: number; }
interface WebSerialPort {
  readable: ReadableStream<Uint8Array> | null;
  open(options: { baudRate: number }): Promise<void>;
  close(): Promise<void>;
  getInfo?(): SerialPortInfo;
}
interface WebSerial {
  requestPort(): Promise<WebSerialPort>;
}
type NavigatorWithSerial = Navigator & { serial: WebSerial };

// ── Types ─────────────────────────────────────────────────────
interface SerialBridgeState {
  isSupported: boolean;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  portInfo: string | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
}

// ── Context ───────────────────────────────────────────────────
const SerialBridgeContext = createContext<SerialBridgeState>({
  isSupported: false,
  isConnected: false,
  isConnecting: false,
  error: null,
  portInfo: null,
  connect: async () => {},
  disconnect: async () => {},
});

// ── Baud Rate ─────────────────────────────────────────────────
const BAUD_RATE = 115200;

// ── Provider ──────────────────────────────────────────────────
export function SerialBridgeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const telemetry = useTelemetry();

  const portRef        = useRef<WebSerialPort | null>(null);
  const readerRef      = useRef<ReadableStreamDefaultReader<string> | null>(null);
  const readLoopRef    = useRef<boolean>(false);

  const isSupported = typeof navigator !== "undefined" && "serial" in (navigator as NavigatorWithSerial);

  const [isConnected,  setIsConnected]  = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error,        setError]        = useState<string | null>(null);
  const [portInfo,     setPortInfo]     = useState<string | null>(null);

  // ── Parse a JSON line from the Arduino ───────────────────
  const handleLine = useCallback(
    (line: string) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed[0] !== "{") return;

      try {
        const frame = JSON.parse(trimmed) as { t: string } & Partial<ArduinoDataFrame>;

        if (frame.t === "data") {
          // Inject real telemetry — validate required fields exist
          if (
            typeof frame.ax === "number" &&
            typeof frame.mag === "number" &&
            typeof frame.lat === "number"
          ) {
            telemetry.injectArduinoFrame(frame as ArduinoDataFrame);
          }
        }
        // heartbeat ("hb") and events ("event") are received but
        // no special action needed beyond keeping connection alive
      } catch {
        // Malformed JSON — ignore silently
      }
    },
    [telemetry]
  );

  // ── Read Loop ─────────────────────────────────────────────
  const startReadLoop = useCallback(
    async (port: WebSerialPort) => {
      if (!port.readable) return;

      const decoder     = new TextDecoderStream();
      const inputDone   = port.readable.pipeTo(decoder.writable as unknown as WritableStream<Uint8Array>);
      const inputStream = decoder.readable;

      let lineBuffer = "";
      readerRef.current = inputStream.getReader();
      readLoopRef.current = true;

      try {
        while (readLoopRef.current) {
          const { value, done } = await readerRef.current.read();
          if (done) break;
          if (!value) continue;

          lineBuffer += value;
          const lines = lineBuffer.split("\n");
          lineBuffer = lines.pop() ?? "";   // keep incomplete last chunk

          for (const line of lines) {
            handleLine(line);
          }
        }
      } catch (err) {
        if (readLoopRef.current) {
          // Unexpected disconnect
          setError("Serial connection lost.");
          setIsConnected(false);
          telemetry.setConnectionStatus("disconnected");
        }
      } finally {
        try { readerRef.current?.releaseLock(); } catch { /* ignore */ }
        try { await inputDone; } catch { /* ignore */ }
      }
    },
    [handleLine, telemetry]
  );

  // ── Connect ───────────────────────────────────────────────
  const connect = useCallback(async () => {
    if (!isSupported) {
      setError("Web Serial API not supported in this browser. Use Chrome or Edge.");
      return;
    }
    if (isConnected || isConnecting) return;

    setIsConnecting(true);
    setError(null);

    try {
      // Prompt user to select a serial port
      const port = await (navigator as NavigatorWithSerial).serial.requestPort();

      await port.open({ baudRate: BAUD_RATE });
      portRef.current = port;

      // Try to get port info for display
      const info = port.getInfo?.();
      if (info?.usbVendorId) {
        setPortInfo(`USB ${info.usbVendorId.toString(16).toUpperCase()}:${info.usbProductId?.toString(16).toUpperCase() ?? "????"}`);
      } else {
        setPortInfo("Serial Device");
      }

      setIsConnected(true);
      setIsConnecting(false);
      telemetry.setConnectionStatus("connected");

      // Start non-blocking read loop
      startReadLoop(port);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("No port selected") || msg.includes("cancelled")) {
        setError(null);  // User cancelled — not an error
      } else {
        setError(`Connection failed: ${msg}`);
      }
      setIsConnecting(false);
    }
  }, [isSupported, isConnected, isConnecting, telemetry, startReadLoop]);

  // ── Disconnect ────────────────────────────────────────────
  const disconnect = useCallback(async () => {
    readLoopRef.current = false;

    try { await readerRef.current?.cancel(); } catch { /* ignore */ }

    try {
      if (portRef.current?.readable) {
        await portRef.current.close();
      }
    } catch { /* ignore */ }

    portRef.current   = null;
    readerRef.current = null;

    setIsConnected(false);
    setPortInfo(null);
    setError(null);
    telemetry.setConnectionStatus("simulated");
  }, [telemetry]);

  return (
    <SerialBridgeContext.Provider
      value={{
        isSupported,
        isConnected,
        isConnecting,
        error,
        portInfo,
        connect,
        disconnect,
      }}
    >
      {children}
    </SerialBridgeContext.Provider>
  );
}

export function useSerialBridge() {
  return useContext(SerialBridgeContext);
}
