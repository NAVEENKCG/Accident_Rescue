import { AlertEntry } from "./simulatedData";

/** Serialise an array of AlertEntry objects into a CSV string */
function toCSV(alerts: AlertEntry[]): string {
  const headers = [
    "ID",
    "Severity",
    "Event Type",
    "Message",
    "Timestamp",
    "Coordinates",
    "SMS Status",
    "Dispatch Status",
  ];

  const escape = (val: string) => `"${val.replace(/"/g, '""')}"`;

  const rows = alerts.map((a) =>
    [
      a.id,
      a.severity,
      a.type,
      a.message,
      a.timestamp,
      a.coordinates,
      a.smsStatus,
      a.cancelStatus,
    ]
      .map(escape)
      .join(",")
  );

  return [headers.map(escape).join(","), ...rows].join("\r\n");
}

/** Trigger a browser CSV download for the given alert entries */
export function downloadAlertsCSV(alerts: AlertEntry[], filename = "incident-log.csv"): void {
  const csv = toCSV(alerts);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
