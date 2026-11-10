"use client";


import { tr } from "../lib/i18n";
import { useEffect, useRef, useState } from "react";
import { CalendarDays } from "lucide-react";

interface Props {
  label: string;
  /** `YYYY-MM-DDTHH:mm` (the value format of datetime-local), or "" when empty. */
  value: string;
  onChange: (value: string) => void;
  /** Disables dates before this value in the calendar picker. */
  min?: string;
}

const pad = (value: number) => String(value).padStart(2, "0");

/** `2026-11-09T14:00` → `14:00 09/11/2026` */
function toDisplay(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value);
  return match ? `${match[4]}:${match[5]} ${match[3]}/${match[2]}/${match[1]}` : "";
}

/** `14:00 09/11/2026` (or the older `09/11/2026 14:00`) → `2026-11-09T14:00`, or null when it is not a real date and time. */
function fromDisplay(text: string): string | null {
  const trimmed = text.trim();
  const timeFirst = /^(\d{1,2}):(\d{2})\s+(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(trimmed);
  const dateFirst = /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})$/.exec(trimmed);
  const parts = timeFirst ? timeFirst.slice(1).map(Number) : dateFirst ? dateFirst.slice(1).map(Number) : null;
  if (!parts) return null;
  const [hour, minute, day, month, year] = timeFirst ? parts : [parts[3], parts[4], parts[0], parts[1], parts[2]];
  const date = new Date(year, month - 1, day, hour, minute);
  const real = date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day && hour < 24 && minute < 60;
  return real ? `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}` : null;
}

/**
 * Date and time typed as HH:mm dd/MM/yyyy, whatever the browser's language is (a native datetime-local shows
 * mm/dd/yyyy on an English browser). The calendar button still opens the native picker.
 */
export function DateTimeField({ label, value, onChange, min }: Props) {
  const [text, setText] = useState(toDisplay(value));
  const [error, setError] = useState<string | null>(null);
  const pickerRef = useRef<HTMLInputElement>(null);

  // The parent can change the value (presets, "Xóa lịch", loading a saved session).
  useEffect(() => {
    if (fromDisplay(text) !== value && !(value === "" && text.trim() !== "" && fromDisplay(text) === null)) {
      setText(toDisplay(value));
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  function handleText(next: string) {
    setText(next);
    if (next.trim() === "") {
      setError(null);
      onChange("");
      return;
    }
    const parsed = fromDisplay(next);
    if (parsed !== null) {
      setError(null);
      onChange(parsed);
    }
  }

  function handleBlur() {
    if (text.trim() !== "" && fromDisplay(text) === null) {
      setError(tr("Nhập theo dạng giờ:phút ngày/tháng/năm, ví dụ 14:00 09/11/2026."));
    }
  }

  return (
    <label className="dateTimeField">
      <span>{label}</span>
      <span className="dateTimeControl">
        <input
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="hh:mm dd/mm/yyyy"
          value={text}
          onChange={(event) => handleText(event.target.value)}
          onBlur={handleBlur}
          aria-invalid={error ? true : undefined}
        />
        <button
          type="button"
          className="iconButton"
          title={tr("Chọn từ lịch")}
          aria-label={tr("Chọn {0} từ lịch", label.toLowerCase())}
          onClick={(event) => {
            event.preventDefault();
            pickerRef.current?.showPicker?.();
          }}
        >
          <CalendarDays size={16} aria-hidden="true" />
        </button>
        <input
          ref={pickerRef}
          className="dateTimeNative"
          type="datetime-local"
          tabIndex={-1}
          aria-hidden="true"
          min={min}
          value={value}
          onChange={(event) => {
            if (event.target.value) {
              setError(null);
              onChange(event.target.value);
            }
          }}
        />
      </span>
      {error ? <small className="dateTimeError" role="alert">{error}</small> : null}
    </label>
  );
}
