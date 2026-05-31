"use client";

import { useMemo } from "react";

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  /** If provided, shows danger color when latest value exceeds this */
  threshold?: number;
}

export function Sparkline({
  data,
  width = 80,
  height = 28,
  color = "#06b6d4",
  threshold,
}: SparklineProps) {
  const points = useMemo(() => {
    if (data.length < 2) return "";
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const step = width / (data.length - 1);

    return data
      .map((v, i) => {
        const x = i * step;
        const y = height - ((v - min) / range) * (height - 4) - 2;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  }, [data, width, height]);

  const latest = data[data.length - 1] ?? 0;
  const isAlert = threshold !== undefined && Math.abs(latest) > threshold;
  const strokeColor = isAlert ? "#ef4444" : color;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden="true"
      className="overflow-visible"
    >
      {/* Faint fill area */}
      {points && (
        <polyline
          points={`0,${height} ${points} ${width},${height}`}
          fill={`${strokeColor}15`}
          stroke="none"
        />
      )}
      {/* Line */}
      {points && (
        <polyline
          points={points}
          fill="none"
          stroke={strokeColor}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ filter: `drop-shadow(0 0 3px ${strokeColor}60)` }}
        />
      )}
      {/* Latest value dot */}
      {data.length > 0 && (() => {
        const min = Math.min(...data);
        const max = Math.max(...data);
        const range = max - min || 1;
        const step = width / (data.length - 1);
        const x = (data.length - 1) * step;
        const y = height - ((latest - min) / range) * (height - 4) - 2;
        return (
          <circle
            cx={x}
            cy={y}
            r={2.5}
            fill={strokeColor}
            style={{ filter: `drop-shadow(0 0 4px ${strokeColor})` }}
          />
        );
      })()}
    </svg>
  );
}
