"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useTelemetry } from "@/context/TelemetryContext";

// Fix leaflet icon issue in Next.js
const icon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41],
});

export default function MapComponent() {
  const { gps, pastGps, connectionStatus } = useTelemetry();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[var(--bg-surface)]/50 rounded-2xl animate-pulse">
        <span className="text-white/40 text-sm font-mono tracking-widest uppercase">Initializing Radar...</span>
      </div>
    );
  }

  const positions: [number, number][] = [
    [gps.lat, gps.lng],
    ...pastGps.map((p) => [p.lat, p.lng] as [number, number]),
  ];

  return (
    <div className="w-full h-full relative glass-card overflow-hidden rounded-2xl z-0">
      <div className="absolute top-4 left-4 z-10 pointer-events-none">
        <h3 className="font-display font-bold text-sm tracking-wide text-white drop-shadow-md">GPS Radar</h3>
        <p className="text-xs text-white/80 drop-shadow-md">
          {gps.lat.toFixed(6)}°, {gps.lng.toFixed(6)}°
        </p>
      </div>

      <div className="absolute top-4 right-4 z-10 pointer-events-none">
         <div className="flex items-center gap-2 px-2 py-1 rounded border bg-black/40 border-white/10 backdrop-blur-md">
            <span className="relative flex h-2 w-2">
              <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping ${connectionStatus === "connected" ? "bg-[var(--accent)]" : "bg-[var(--success)]"}`} />
              <span className={`relative inline-flex rounded-full h-2 w-2 ${connectionStatus === "connected" ? "bg-[var(--accent)]" : "bg-[var(--success)]"}`} />
            </span>
            <span className="text-[10px] font-mono text-white/70 uppercase">Tracking</span>
         </div>
      </div>

      <MapContainer
        center={[gps.lat, gps.lng]}
        zoom={16}
        scrollWheelZoom={false}
        className="w-full h-full !bg-[#0D1526]"
        zoomControl={false}
      >
        {/* Dark mode tiles from CartoDB */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        
        <Polyline positions={positions} color="#06b6d4" weight={3} opacity={0.6} dashArray="5, 10" />
        
        <Marker position={[gps.lat, gps.lng]} icon={icon}>
          <Popup className="custom-popup">
            <div className="font-mono text-xs">
              <strong>Vehicle TN-09-AB-1234</strong><br/>
              Lat: {gps.lat.toFixed(6)}<br/>
              Lng: {gps.lng.toFixed(6)}
            </div>
          </Popup>
        </Marker>
      </MapContainer>
      
      {/* Target reticle overlay to make it look like a radar */}
      <div className="absolute inset-0 pointer-events-none border-[1px] border-white/5 rounded-2xl">
         <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-white/10" />
         <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-white/10" />
         <div className="absolute top-1/2 left-1/2 w-32 h-32 -mt-16 -ml-16 rounded-full border border-white/10" />
         <div className="absolute top-1/2 left-1/2 w-64 h-64 -mt-32 -ml-32 rounded-full border border-white/5" />
      </div>
    </div>
  );
}
