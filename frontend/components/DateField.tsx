"use client";


import { tr } from "../lib/i18n";
import { useEffect, useRef, useState } from "react";
import { CalendarDays } from "lucide-react";

interface Props {
  label: string;
  /** `YYYY-MM-DD`, or "" when empty. */
  value: string;
  onChange: (value: string) => void;
  max?: string;
}

const pad = (value: number) => String(value).padStart(2, "0");

/** `2000-03-09` → `09/03/2000` */
function toDisplay(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : "";
}

/** `09/03/2000` → `2000-03-09`, or null when it is not a real date. */
function fromDisplay(text: string): string | null {
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text.trim());
  if (!match) return null;
  const [day, month, year] = match.slice(1).map(Number);
  const date = new Date(year, month - 1, day);
  const real = date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
  return real ? `${year}-${pad(month)}-${pad(day)}` : null;
}

/** A date typed as dd/MM/yyyy whatever the browser's language is; the calendar button opens the native picker. */
export function DateField({ label, value, onChange, max }: Props) {
  const [text, setText] = useState(toDisplay(value));
  const [error, setError] = useState<string | null>(null);
  const pickerRef = useRef<HTMLInputElement>(null);

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

  return (
    <label className="dateTimeField" style={{ maxWidth: "none" }}>
      <span>{label}</span>
      <span className="dateTimeControl">
        <input
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder={tr("dd/mm/yyyy")}
          value={text}
          onChange={(event) => handleText(event.target.value)}
          onBlur={() => {
            if (text.trim() !== "" && fromDisplay(text) === null) setError(tr("Nhập theo dạng ngày/tháng/năm, ví dụ 09/03/2003."));
          }}
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
          type="date"
          tabIndex={-1}
          aria-hidden="true"
          max={max}
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
