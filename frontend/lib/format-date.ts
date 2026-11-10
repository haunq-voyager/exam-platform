/** Date and time display used across the app, the same in both languages: "HH:mm dd/MM/yyyy" (24-hour, browser time zone). */

type DateInput = string | number | Date | null | undefined;

const pad = (value: number) => String(value).padStart(2, "0");

function toDate(value: DateInput): Date | null {
  if (value === null || value === undefined || value === "") return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** dd/MM/yyyy */
export function formatDate(value: DateInput): string {
  const date = toDate(value);
  return date ? `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}` : "—";
}

/** HH:mm */
export function formatTime(value: DateInput): string {
  const date = toDate(value);
  return date ? `${pad(date.getHours())}:${pad(date.getMinutes())}` : "—";
}

/** HH:mm:ss, for logs and "saved at" hints where seconds matter. */
export function formatTimeWithSeconds(value: DateInput): string {
  const date = toDate(value);
  return date ? `${formatTime(date)}:${pad(date.getSeconds())}` : "—";
}

/** HH:mm dd/MM/yyyy */
export function formatDateTime(value: DateInput): string {
  const date = toDate(value);
  return date ? `${formatTime(date)} ${formatDate(date)}` : "—";
}
