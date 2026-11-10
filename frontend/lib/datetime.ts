const pad = (value: number) => String(value).padStart(2, "0");

/** ISO timestamp from the API -> value for <input type="datetime-local"> in the browser's local time. */
export function toDatetimeLocal(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * <input type="datetime-local"> value (local time, no zone) -> ISO string with the zone ("Z"), or null when empty.
 * Sending the bare local value would make the server read it as UTC and shift the exam by the UTC offset.
 */
export function fromDatetimeLocal(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/** Local datetime-local value `minutes` after the given datetime-local value (or after now when it is empty). */
export function addMinutesLocal(value: string, minutes: number): string {
  const base = value ? new Date(value) : new Date();
  return toDatetimeLocal(new Date(base.getTime() + minutes * 60_000).toISOString());
}
