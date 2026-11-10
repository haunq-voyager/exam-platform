import { formatDateTime } from "./format-date";
import { tr } from "./i18n";
import type { ExamSession } from "./types";

export interface SessionPhase {
  label: string;
  /** Matches the `badge` colour classes. */
  tone: "blue" | "amber" | "green" | "red";
}

/** One readable state for teachers, combining the on/off switch with the start/end window. */
export function sessionPhase(session: Pick<ExamSession, "status" | "effective_status" | "is_enabled">): SessionPhase {
  if (!session.is_enabled) {
    return session.status === "draft" ? { label: tr("Chưa bật"), tone: "blue" } : { label: tr("Đã tắt"), tone: "red" };
  }
  if (session.effective_status === "scheduled") return { label: tr("Đã bật · chờ đến giờ"), tone: "amber" };
  if (session.effective_status === "closed") return { label: tr("Đã kết thúc"), tone: "red" };
  return { label: tr("Đang diễn ra"), tone: "green" };
}

export { formatDateTime };

/** "20:00 08/11/2026 → 22:00 08/11/2026", or a hint when there is no schedule. */
export function scheduleText(session: Pick<ExamSession, "start_at" | "end_at">): string {
  if (!session.start_at && !session.end_at) return tr("Chưa đặt lịch");
  return `${formatDateTime(session.start_at)} → ${session.end_at ? formatDateTime(session.end_at) : tr("không giới hạn")}`;
}
