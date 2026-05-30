"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet default icon path in Next.js (strict-mode safe)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface Props {
  lat: number;
  lng: number;
  pastPositions: { lat: number; lng: number }[];
}

export default function LeafletMap({ lat, lng, pastPositions }: Props) {
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const trailRef = useRef<L.CircleMarker[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialise map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [lat, lng],
      zoom: 13,
      zoomControl: true,
    });

    // Dark tile layer (CartoDB dark)
    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
      {
        attribution: '© <a href="https://carto.com/">CARTO</a>',
        subdomains: "abcd",
        maxZoom: 19,
      }
    ).addTo(map);

    // Custom accent-coloured marker
    const pulseIcon = L.divIcon({
      className: "",
      html: `
        <div style="position:relative;width:24px;height:24px">
          <div style="position:absolute;inset:0;border-radius:50%;background:#06b6d4;opacity:0.25;animation:ping 1.5s ease-out infinite;"></div>
          <div style="position:absolute;inset:4px;border-radius:50%;background:#06b6d4;border:2px solid white;box-shadow:0 0 8px #06b6d4;"></div>
        </div>
        <style>
          @keyframes ping {
            0%   { transform: scale(1); opacity: 0.25; }
            75%  { transform: scale(2.2); opacity: 0; }
            100% { transform: scale(2.2); opacity: 0; }
          }
        </style>
      `,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });

    const marker = L.marker([lat, lng], { icon: pulseIcon })
      .addTo(map)
      .bindPopup(
        `<b>Current Position</b><br>${lat.toFixed(6)}° N, ${lng.toFixed(6)}° E<br><small>${new Date().toLocaleTimeString()}</small>`
      );

    mapRef.current = map;
    markerRef.current = marker;

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update marker and trail on GPS change
  useEffect(() => {
    const map = mapRef.current;
    const marker = markerRef.current;
    if (!map || !marker) return;

    // Move marker
    marker.setLatLng([lat, lng]);
    marker.setPopupContent(
      `<b>Current Position</b><br>${lat.toFixed(6)}° N, ${lng.toFixed(6)}° E<br><small>${new Date().toLocaleTimeString()}</small>`
    );

    // Remove old trail markers
    trailRef.current.forEach((m) => m.remove());
    trailRef.current = [];

    // Draw trail
    pastPositions.forEach((pos, i) => {
      const circle = L.circleMarker([pos.lat, pos.lng], {
        radius: 5 - i * 0.5,
        color: "#06b6d4",
        fillColor: "#06b6d4",
        fillOpacity: 0.7 - i * 0.12,
        weight: 1,
      }).addTo(map);
      trailRef.current.push(circle);
    });

    // Pan to new position smoothly
    map.panTo([lat, lng], { animate: true, duration: 0.8 });
  }, [lat, lng, pastPositions]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      style={{ minHeight: "420px" }}
      aria-label="GPS location map"
    />
  );
}
