"use client";


import { tr } from "../lib/i18n";
import { useState, type ReactNode } from "react";
import { api, ApiError } from "../lib/api-client";
import { formatDateTime } from "../lib/session-phase";
import { useToast } from "../lib/toast";
import type { ExamSession } from "../lib/types";
import { ConfirmDialog } from "./ConfirmDialog";

interface SwitchProps {
  checked: boolean;
  disabled?: boolean;
  onClick: () => void;
  label?: string;
}

/** On/off switch (role="switch"); it only reports the click, the caller decides what happens. */
export function ToggleSwitch({ checked, disabled, onClick, label }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      title={label}
      disabled={disabled}
      className={checked ? "toggleSwitch on" : "toggleSwitch"}
      onClick={onClick}
    >
      <i />
    </button>
  );
}

/**
 * Turning a session on/off, with the confirmation that spells out what it means for students.
 * `dialog` must be rendered by the caller; `requestToggle` opens it.
 */
export function useSessionSwitch(onChanged: () => void | Promise<void>): {
  requestToggle: (session: Pick<ExamSession, "id" | "title" | "is_enabled" | "start_at" | "end_at">) => void;
  isBusy: (id: number) => boolean;
  dialog: ReactNode;
} {
  const { showToast } = useToast();
  const [target, setTarget] = useState<Pick<ExamSession, "id" | "title" | "is_enabled" | "start_at" | "end_at"> | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  async function confirm() {
    if (!target) return;
    setBusyId(target.id);
    try {
      await api.post(`/exam-sessions/${target.id}/${target.is_enabled ? "close" : "publish"}`);
      showToast(target.is_enabled ? tr("Đã tắt kỳ thi \"{0}\".", target.title) : tr("Đã bật kỳ thi \"{0}\".", target.title));
      setTarget(null);
      await onChanged();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : tr("Không thể thực hiện thao tác."), "error");
      setTarget(null);
    } finally {
      setBusyId(null);
    }
  }

  const turningOff = target?.is_enabled === true;
  const description = !target
    ? undefined
    : turningOff
      ? tr("Tắt \"{0}\"? Thí sinh sẽ không thể bắt đầu hoặc vào lại bài thi cho đến khi bạn bật lại.", target.title)
      : target.start_at || target.end_at
        ? tr("Bật \"{0}\"? Thí sinh được gán chỉ vào thi được trong khoảng {1} → {2}.{3}", target.title, formatDateTime(target.start_at), target.end_at ? formatDateTime(target.end_at) : "không giới hạn", target.end_at ? "" : " Kỳ thi chưa có ngày kết thúc nên thí sinh có thể vào thi bất cứ lúc nào sau giờ bắt đầu.")
        : tr("Bật \"{0}\"? Kỳ thi chưa đặt ngày bắt đầu/kết thúc nên thí sinh được gán có thể vào thi ngay và bất cứ lúc nào.", target.title);

  return {
    requestToggle: setTarget,
    isBusy: (id) => busyId === id,
    dialog: (
      <ConfirmDialog
        open={target !== null}
        title={turningOff ? tr("Tắt kỳ thi?") : tr("Bật kỳ thi?")}
        description={description}
        confirmLabel={turningOff ? tr("Tắt kỳ thi") : tr("Bật kỳ thi")}
        danger={turningOff}
        loading={busyId !== null}
        onCancel={() => setTarget(null)}
        onConfirm={confirm}
      />
    )
  };
}
