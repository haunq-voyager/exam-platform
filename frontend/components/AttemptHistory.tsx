"use client";


import { formatDateTime } from "../lib/format-date";
import { tr } from "../lib/i18n";
import Link from "@/components/RoleLink";
import { PlayCircle, ShieldAlert, Star } from "lucide-react";
import { ATTEMPT_STATUS_LABEL, statusLabel } from "../lib/status-labels";
import type { ExamAttempt, ScoringMethod } from "../lib/types";

interface Props {
  attempts: ExamAttempt[];
  /** Highlights the attempt currently being viewed. */
  activeId?: number;
  audience: "student" | "staff";
  /** Used to mark which attempt(s) are counted towards the final score. */
  scoringMethod?: ScoringMethod;
  /** Slim table (attempt, score, flags) for narrow side columns. */
  compact?: boolean;
}

/** Ids of the graded attempts that decide the final score under the given scoring method. */
function countedAttemptIds(attempts: ExamAttempt[], method?: ScoringMethod): Set<number> {
  const graded = attempts.filter((attempt) => attempt.status === "graded").sort((a, b) => a.attempt_number - b.attempt_number);
  if (!method || graded.length === 0) return new Set();
  if (method === "average") return new Set(graded.map((attempt) => attempt.id));
  if (method === "first") return new Set([graded[0].id]);
  if (method === "last") return new Set([graded[graded.length - 1].id]);
  const best = graded.reduce((top, attempt) => (Number(attempt.score) > Number(top.score) ? attempt : top), graded[0]);
  return new Set([best.id]);
}

function formatStarted(value: string): string {
  return formatDateTime(value);
}

/** All attempts of one student in one exam session, as a small table (oldest first). */
export function AttemptHistory({ attempts, activeId, audience, scoringMethod, compact = false }: Props) {
  const ordered = [...attempts].sort((a, b) => a.attempt_number - b.attempt_number);
  const counted = countedAttemptIds(ordered, scoringMethod);
  const hrefFor = (attempt: ExamAttempt) =>
    audience === "staff" ? `/dashboard/attempts/${attempt.id}` : attempt.status === "in_progress" ? `/exam/${attempt.id}` : `/dashboard/results/${attempt.id}`;

  if (ordered.length === 0) {
    return <p className="reviewEmpty">{tr("Chưa có lần thi nào.")}</p>;
  }

  const scoreOf = (attempt: ExamAttempt) =>
    attempt.status === "in_progress" ? (
      <>
        <PlayCircle size={14} aria-hidden="true" /> {tr("Đang làm")}
      </>
    ) : attempt.score !== null ? (
      `${attempt.score}/${attempt.total_points}`
    ) : (
      "—"
    );

  if (compact) {
    return (
      <div className="historyList">
        <table className="table miniTable" aria-label={tr("Các lần thi")}>
          <thead>
            <tr>
              <th scope="col">{tr("Lần")}</th>
              <th scope="col" className="num">
                {tr("Điểm")}
              </th>
              <th scope="col">
                <span className="srOnly">{tr("Ghi chú")}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {ordered.map((attempt) => (
              <tr key={attempt.id} className={attempt.id === activeId ? "activeRow" : undefined} aria-current={attempt.id === activeId ? "true" : undefined}>
                <td>
                  <Link href={hrefFor(attempt)}>
                    <strong>{tr("Lần")} {attempt.attempt_number}</strong>
                  </Link>
                </td>
                <td className="num">{scoreOf(attempt)}</td>
                <td>
                  {counted.has(attempt.id) ? <Star size={13} color="#15803d" aria-label={tr("Được tính điểm")} /> : null}
                  {attempt.is_cancelled ? <ShieldAlert size={13} color="#b91c1c" aria-label={tr("Bị hủy")} /> : attempt.is_flagged ? <ShieldAlert size={13} color="#b45309" aria-label={tr("Bị đánh dấu")} /> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="tableWrap">
      <table className="table miniTable" aria-label={tr("Lịch sử các lần thi")}>
        <thead>
          <tr>
            <th scope="col">{tr("Lần thi")}</th>
            <th scope="col">{tr("Bắt đầu")}</th>
            <th scope="col" className="num">
              {tr("Điểm")}
            </th>
            <th scope="col">{tr("Trạng thái")}</th>
            <th scope="col" className="num">
              <span className="srOnly">{tr("Xem")}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {ordered.map((attempt) => (
            <tr key={attempt.id} className={attempt.id === activeId ? "activeRow" : undefined} aria-current={attempt.id === activeId ? "true" : undefined}>
              <td>
                <strong>{tr("Lần")} {attempt.attempt_number}</strong>
                {counted.has(attempt.id) ? (
                  <span className="badge green" style={{ marginInlineStart: 8 }} title={tr("Lần thi này được dùng để tính điểm cuối cùng")}>
                    <Star size={12} aria-hidden="true" /> {tr("Được tính")}
                  </span>
                ) : null}
              </td>
              <td>{formatStarted(attempt.started_at)}</td>
              <td className="num">{scoreOf(attempt)}</td>
              <td>
                {attempt.is_cancelled ? (
                  <span className="badge red">
                    <ShieldAlert size={12} aria-hidden="true" /> {tr("Bị hủy (gian lận)")}
                  </span>
                ) : (
                  <span className="badge blue">{statusLabel(ATTEMPT_STATUS_LABEL, attempt.status)}</span>
                )}
                {attempt.is_flagged && !attempt.is_cancelled ? (
                  <span className="badge amber" style={{ marginInlineStart: 6 }}>
                    <ShieldAlert size={12} aria-hidden="true" /> {attempt.violation_count} {tr("vi phạm")}
                  </span>
                ) : null}
              </td>
              <td className="num">
                <Link className="approveButton" href={hrefFor(attempt)}>
                  {attempt.status === "in_progress" ? tr("Tiếp tục") : "Xem"}
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
