"use client";


import { tr } from "../lib/i18n";
import { AlertTriangle } from "lucide-react";
import { addMinutesLocal } from "../lib/datetime";
import { DateTimeField } from "./DateTimeField";

interface Props {
  /** datetime-local values (browser local time). */
  startAt: string;
  endAt: string;
  onChange: (value: { startAt: string; endAt: string }) => void;
}

const END_PRESETS: { label: string; minutes: number }[] = [
  { get label() { return tr("+1 giờ"); }, minutes: 60 },
  { get label() { return tr("+2 giờ"); }, minutes: 120 },
  { get label() { return tr("+1 ngày"); }, minutes: 24 * 60 },
  { get label() { return tr("+1 tuần"); }, minutes: 7 * 24 * 60 }
];

/**
 * Start/end of the window in which students may enter the exam. An attempt can never run past the end date,
 * so a short window is what keeps an exam from dragging on.
 */
export function ScheduleFields({ startAt, endAt, onChange }: Props) {
  const invalid = Boolean(startAt && endAt && new Date(endAt) <= new Date(startAt));

  return (
    <div style={{ marginTop: 14 }}>
      <div className="controlRow" style={{ margin: 0, flexWrap: "wrap", alignItems: "flex-start" }}>
        <DateTimeField label={tr("Bắt đầu")} value={startAt} onChange={(value) => onChange({ startAt: value, endAt })} />
        <DateTimeField label={tr("Kết thúc")} value={endAt} min={startAt || undefined} onChange={(value) => onChange({ startAt, endAt: value })} />
      </div>

      <div className="controlRow" style={{ margin: "8px 0 0", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
        <span className="avatarHint">{tr("Kết thúc sau giờ bắt đầu:")}</span>
        {END_PRESETS.map((preset) => (
          <button
            key={preset.label}
            type="button"
            className="segment"
            onClick={() => onChange({ startAt, endAt: addMinutesLocal(startAt, preset.minutes) })}
          >
            {preset.label}
          </button>
        ))}
        {startAt || endAt ? (
          <button type="button" className="linkButton" onClick={() => onChange({ startAt: "", endAt: "" })}>
            {tr("Xóa lịch")}
          </button>
        ) : null}
      </div>

      {invalid ? (
        <p className="formError" style={{ marginTop: 8 }}>
          {tr("Ngày kết thúc phải sau ngày bắt đầu.")}
        </p>
      ) : !endAt ? (
        <p className="reviewEmpty" style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <AlertTriangle size={14} color="#d97706" />
          {tr("Chưa đặt ngày kết thúc: thí sinh có thể vào thi bất cứ lúc nào sau khi bật. Nên đặt hạn để kỳ thi không kéo dài.")}
        </p>
      ) : (
        <p className="reviewEmpty">{tr("Bài của thí sinh tự kết thúc khi hết thời gian làm bài hoặc khi đến giờ kết thúc kỳ thi, tùy cái nào đến trước.")}</p>
      )}
    </div>
  );
}
