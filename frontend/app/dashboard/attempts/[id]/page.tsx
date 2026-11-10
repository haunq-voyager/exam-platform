"use client";


import { formatDateTime } from "../../../../lib/format-date";
import { tr } from "../../../../lib/i18n";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { BarChart3, Lock, ShieldAlert } from "lucide-react";
import { api, ApiError } from "../../../../lib/api-client";
import { ClientTable } from "../../../../components/ClientTable";
import { FilterSelect } from "../../../../components/TableToolbar";
import { useBreadcrumbLabel } from "../../../../components/Breadcrumbs";
import { AttemptHistory } from "../../../../components/AttemptHistory";
import { AttemptReview } from "../../../../components/AttemptReview";
import { useAuth } from "../../../../lib/auth-context";
import { can } from "../../../../lib/permissions";
import {
  ATTEMPT_STATUS_LABEL,
  PROCTORING_EVENT_LABEL,
  SEVERITY_LABEL,
  statusLabel
} from "../../../../lib/status-labels";
import type { ExamAttempt, ExamAttemptDetail, ProctoringEvent } from "../../../../lib/types";

const SEVERITY_BADGE: Record<string, string> = { low: "blue", medium: "amber", high: "red" };

export default function AttemptDetailPage() {
  const params = useParams<{ id: string }>();
  const attemptId = params.id;
  const { user } = useAuth();
  const [attempt, setAttempt] = useState<ExamAttemptDetail | null>(null);
  const [events, setEvents] = useState<ProctoringEvent[]>([]);
  const [eventsForbidden, setEventsForbidden] = useState(false);
  const [severityFilter, setSeverityFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<ExamAttempt[]>([]);

  useEffect(() => {
    async function load() {
      // No full-page loading state when switching between attempts: the old view stays until the new one arrives.
      setEvents([]);
      setEventsForbidden(false);
      try {
        const attemptResponse = await api.get<{ data: ExamAttemptDetail }>(`/exam-attempts/${attemptId}`);
        setAttempt(attemptResponse.data);

        if (can(user, "proctoring.view")) {
          try {
            const eventsResponse = await api.get<{ data: ProctoringEvent[] }>(`/exam-attempts/${attemptId}/proctoring-events`);
            setEvents(eventsResponse.data);
          } catch (err) {
            if (err instanceof ApiError && err.status === 403) setEventsForbidden(true);
            else throw err;
          }
        } else {
          setEventsForbidden(true);
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [attemptId, user]);

  const sessionId = attempt?.exam_session_id;
  const studentId = attempt?.student_id;
  useEffect(() => {
    if (sessionId === undefined || studentId === undefined) return;
    api
      .get<{ data: ExamAttempt[] }>(`/exam-sessions/${sessionId}/attempts`)
      .then((response) => setHistory(response.data.filter((item) => item.student_id === studentId)))
      .catch(() => setHistory([]));
  }, [sessionId, studentId]);

  useBreadcrumbLabel(attempt ? tr("{0} · lần {1}", attempt.student_name ?? "Thí sinh", attempt.attempt_number) : null);

  if (loading || !attempt) {
    return <div className="emptyState" role="status">{tr("Đang tải…")}</div>;
  }

  return (
    <>
      <header className="reviewHeader">
        <div>
          <p className="eyebrow">{tr("Chi tiết lượt làm bài ·")} {attempt.student_name}</p>
          <h1 id="page-title" tabIndex={-1}>{attempt.exam_title}</h1>
        </div>
        <div className="reviewChips">
          <span className="reviewChip score">
            {tr("Điểm")} {attempt.score ?? "—"} / {attempt.total_points ?? "—"}
          </span>
          <span className="reviewChip">
            {tr("Lần thi")} {attempt.attempt_number}/{attempt.max_attempts}
          </span>
          <span className="reviewChip">{attempt.is_cancelled ? tr("Bị hủy do gian lận") : statusLabel(ATTEMPT_STATUS_LABEL, attempt.status)}</span>
          {attempt.is_flagged ? (
            <span className="reviewChip" style={{ color: "#b91c1c", borderColor: "rgba(220,38,38,.35)", background: "#fef2f2" }}>
              <ShieldAlert size={14} /> {tr("Bị đánh dấu ·")} {attempt.violation_count} {tr("vi phạm")}
            </span>
          ) : null}
        </div>
      </header>

      <AttemptReview
        key={attempt.id}
        attempt={attempt}
        perspective="staff"
        fitOffset={205}
        sidebarTop={
          history.length > 1 || attempt.max_attempts > 1 ? (
            <>
              <p className="sideTitle">
                {tr("Các lần thi (")}{history.length}/{attempt.max_attempts})
              </p>
              <AttemptHistory compact attempts={history} activeId={attempt.id} audience="staff" scoringMethod={attempt.scoring_method} />
            </>
          ) : null
        }
        sidePanel={
        <article className="panel cameraPanel examCameraPanel fitPanel">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">{tr("Camera proctoring")}</p>
              <h2>{tr("Cảnh báo giám sát")}</h2>
            </div>
          </div>

          {eventsForbidden ? (
            <div className="emptyState">
              <Lock size={18} />
              <p style={{ marginTop: 8 }}>{tr("Bạn không có quyền xem lịch sử cảnh báo giám sát.")}</p>
            </div>
          ) : (
            <>
              <div className="riskScore">
                <BarChart3 size={18} />
                <div>
                  <span>{tr("Số sự kiện cảnh báo")}</span>
                  <strong>{events.length}</strong>
                </div>
              </div>

              {events.length === 0 ? (
                <div className="emptyState">{tr("Không có cảnh báo nào được ghi nhận.")}</div>
              ) : (
                <ClientTable
                  rows={events.filter((event) => !severityFilter || event.severity === severityFilter)}
                  rowKey={(event) => event.id}
                  searchText={(event) => statusLabel(PROCTORING_EVENT_LABEL, event.event_type)}
                  searchPlaceholder={tr("Tìm sự kiện...")}
                  label={tr("Cảnh báo giám sát")}
                  sorters={{ time: (event) => event.occurred_at, type: (event) => statusLabel(PROCTORING_EVENT_LABEL, event.event_type), severity: (event) => ({ low: 1, medium: 2, high: 3 })[event.severity as string] ?? 0 }}
                  filtersActive={Boolean(severityFilter)}
                  onResetFilters={() => setSeverityFilter("")}
                  filters={<FilterSelect label={tr("Mức độ")} value={severityFilter} onChange={setSeverityFilter} options={Object.keys(SEVERITY_LABEL).map((key) => ({ value: key, label: SEVERITY_LABEL[key] }))} />}
                  columns={[
                    { key: "time", sortKey: "time", header: tr("Thời gian"), width: "190px", render: (event) => formatDateTime(event.occurred_at) },
                    { key: "type", sortKey: "type", header: tr("Sự kiện"), render: (event) => <strong>{statusLabel(PROCTORING_EVENT_LABEL, event.event_type)}</strong> },
                    {
                      key: "severity",
                      sortKey: "severity",
                      header: tr("Mức độ"),
                      width: "130px",
                      render: (event) => <span className={`badge ${SEVERITY_BADGE[event.severity]}`}>{statusLabel(SEVERITY_LABEL, event.severity)}</span>
                    }
                  ]}
                />
              )}
            </>
          )}
        </article>
        }
      />
    </>
  );
}
