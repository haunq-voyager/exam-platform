"use client";


import { tr } from "../lib/i18n";
import { SCORING_METHOD_LABEL } from "../lib/status-labels";
import type { ScoringMethod } from "../lib/types";

export interface ExamSessionSettings {
  max_attempts: number;
  scoring_method: ScoringMethod;
  proctoring_enabled: boolean;
  max_violations: number;
}

export const DEFAULT_EXAM_SESSION_SETTINGS: ExamSessionSettings = {
  max_attempts: 1,
  scoring_method: "highest",
  proctoring_enabled: true,
  max_violations: 3
};

interface Props {
  value: ExamSessionSettings;
  onChange: (value: ExamSessionSettings) => void;
}

export function ExamSessionSettingsFields({ value, onChange }: Props) {
  function patch(partial: Partial<ExamSessionSettings>) {
    onChange({ ...value, ...partial });
  }

  return (
    <>
      <div className="controlRow" style={{ marginTop: 14, flexWrap: "wrap", alignItems: "flex-start" }}>
        <label className="field settingNarrow">
          <span>{tr("Số lần được thi")}</span>
          <input
            type="number"
            min={1}
            max={20}
            value={value.max_attempts}
            onChange={(event) => patch({ max_attempts: Math.max(1, Number(event.target.value) || 1) })}
          />
        </label>
        <label className="field settingWide">
          <span>{tr("Cách tính điểm")}</span>
          <select
            value={value.scoring_method}
            onChange={(event) => patch({ scoring_method: event.target.value as ScoringMethod })}
            disabled={value.max_attempts <= 1}
          >
            {Object.entries(SCORING_METHOD_LABEL).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14, fontSize: 13, fontWeight: 700 }}>
        <input type="checkbox" checked={value.proctoring_enabled} onChange={(event) => patch({ proctoring_enabled: event.target.checked })} />
        <span>{tr("Bật giám sát gian lận (camera + rời tab)")}</span>
      </label>

      {value.proctoring_enabled ? (
        <label className="field" style={{ marginTop: 14 }}>
          <span>{tr("Số lần vi phạm được cảnh báo trước khi hủy bài")}</span>
          <input
            type="number"
            min={0}
            max={20}
            value={value.max_violations}
            onChange={(event) => patch({ max_violations: Math.max(0, Number(event.target.value) || 0) })}
          />
          <small style={{ color: "var(--muted)", marginTop: 6 }}>
            {value.max_violations === 0
              ? tr("0: vi phạm lần đầu tiên sẽ thông báo, tự động nộp bài, chấm 0 điểm và đánh dấu gian lận.")
              : tr("Thí sinh được cảnh báo {0} lần; vi phạm lần thứ {1} sẽ bị nộp bài, chấm 0 điểm. Chỉ cần vi phạm 1 lần là bài đã bị đánh dấu.", value.max_violations, value.max_violations + 1)}
          </small>
        </label>
      ) : null}
    </>
  );
}
