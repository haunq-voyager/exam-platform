"use client";


import { formatDateTime } from "../../../lib/format-date";
import { tr } from "../../../lib/i18n";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "@/components/RoleLink";
import { Ban, Eye, RefreshCw } from "lucide-react";
import { api, ApiError } from "../../../lib/api-client";
import { DataTable } from "../../../components/DataTable";
import { PageHeader } from "../../../components/PageHeader";
import { FilterSelect, TableToolbar } from "../../../components/TableToolbar";
import { useAuth } from "../../../lib/auth-context";
import { can } from "../../../lib/permissions";
import { scheduleText, sessionPhase } from "../../../lib/session-phase";
import { PROCTORING_EVENT_LABEL, statusLabel } from "../../../lib/status-labels";
import { useClientTable } from "../../../lib/use-client-table";
import { useToast } from "../../../lib/toast";
import type { ExamSession, MonitorStudent, SessionMonitor } from "../../../lib/types";

const MONITOR_SORTERS = {
  student: (student: MonitorStudent) => student.student_name,
  state: (student: MonitorStudent) => student.state,
  progress: (student: MonitorStudent) => student.current_attempt?.answered ?? (student.last_score === null ? null : Number(student.last_score)),
  left: (student: MonitorStudent) => student.current_attempt?.ends_at,
  violations: (student: MonitorStudent) => student.violation_count,
  event: (student: MonitorStudent) => student.last_event_at
};

const SESSION_SORTERS = {
  title: (session: ExamSession) => session.title,
  phase: (session: ExamSession) => session.effective_status,
  schedule: (session: ExamSession) => session.start_at,
  size: (session: ExamSession) => session.assigned_student_count ?? 0
};

const STATE_LABEL: Record<MonitorStudent["state"], { label: string; tone: string }> = {
  not_started: { get label() { return tr("Chưa vào thi"); }, tone: "blue" },
  in_progress: { get label() { return tr("Đang làm bài"); }, tone: "green" },
  finished: { get label() { return tr("Đã nộp"); }, tone: "amber" }
};

function remaining(endsAt: string): string {
  const seconds = Math.max(0, Math.floor((new Date(endsAt).getTime() - Date.now()) / 1000));
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

/** Live table of the students of one session. */
function MonitorView({ sessionId, onBack }: { sessionId: number; onBack: () => void }) {
  const { showToast } = useToast();
  const [monitor, setMonitor] = useState<SessionMonitor | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState("");
  const [, setTick] = useState(0);
  const [cancelTarget, setCancelTarget] = useState<MonitorStudent | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await api.get<{ data: SessionMonitor }>(`/exam-sessions/${sessionId}/monitor`);
      setMonitor(response.data);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : tr("Không thể tải màn hình coi thi."));
    }
  }, [sessionId]);

  // Live view: refresh every 10 s, countdowns every second.
  useEffect(() => {
    load();
    const refresh = window.setInterval(load, 10_000);
    const clock = window.setInterval(() => setTick((value) => value + 1), 1000);
    return () => {
      window.clearInterval(refresh);
      window.clearInterval(clock);
    };
  }, [load]);

  const byState = useMemo(() => (monitor?.students ?? []).filter((student) => !state || student.state === state), [monitor, state]);
  const matches = useCallback((student: MonitorStudent, query: string) => `${student.student_name ?? ""} ${student.student_email ?? ""}`.toLowerCase().includes(query), []);
  const table = useClientTable(byState, { matches, initialPageSize: 15, sorters: MONITOR_SORTERS });
  const hasFilters = Boolean(table.query.trim() || state);
  const clear = () => {
    table.reset();
    setState("");
  };

  async function cancelAttempt() {
    if (!cancelTarget?.current_attempt) return;
    setBusy(true);
    try {
      await api.post(`/exam-attempts/${cancelTarget.current_attempt.id}/proctor-cancel`, { note });
      showToast(tr("Đã hủy bài của {0}.", cancelTarget.student_name));
      setCancelTarget(null);
      setNote("");
      await load();
    } catch (err) {
      showToast(err instanceof ApiError ? (err.errors?.note?.[0] ?? err.message) : tr("Không thể hủy bài."), "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow={tr("Coi thi")}
        title={monitor?.session.title ?? tr("Đang tải…")}
        actions={
          <>
            <button className="approveButton" onClick={onBack}>
              {tr("Các kỳ thi tôi coi")}
            </button>
            <button className="iconButton" onClick={load} title={tr("Làm mới")} aria-label={tr("Làm mới")}>
              <RefreshCw size={16} aria-hidden="true" />
            </button>
          </>
        }
      />

      {error ? <div className="formError" role="alert" style={{ marginBottom: 12 }}>{error}</div> : null}

      {monitor ? (
        <div className="reviewChips" style={{ marginBottom: 12 }}>
          <span className="reviewChip score">{tr("Đang làm bài:")} {monitor.totals.in_progress}</span>
          <span className="reviewChip">{tr("Chưa vào thi:")} {monitor.totals.not_started}</span>
          <span className="reviewChip">{tr("Đã nộp:")} {monitor.totals.finished}</span>
          <span className="reviewChip" style={monitor.totals.flagged ? { color: "#b91c1c", background: "#fef2f2" } : undefined}>
            {tr("Bị đánh dấu:")} {monitor.totals.flagged}
          </span>
          <span className="reviewChip">{monitor.session.duration_minutes} {tr("phút")}</span>
          <span className="reviewChip">{monitor.session.proctoring_enabled ? tr("Giám sát · cảnh báo {0} lần", monitor.session.max_violations) : tr("Không giám sát camera")}</span>
        </div>
      ) : null}

      <section className="panel">
        <TableToolbar search={{ value: table.query, onChange: table.setQuery, placeholder: tr("Tìm thí sinh…"), label: tr("Tìm thí sinh") }} active={hasFilters} onReset={clear}>
          <FilterSelect
            label={tr("Trạng thái")}
            value={state}
            onChange={setState}
            options={[
              { value: "in_progress", label: tr("Đang làm bài") },
              { value: "not_started", label: tr("Chưa vào thi") },
              { value: "finished", label: tr("Đã nộp") }
            ]}
          />
        </TableToolbar>

        <DataTable
          label={tr("Thí sinh trong kỳ thi")}
          rows={table.visible}
          rowKey={(row) => row.student_id}
          loading={!monitor && !error}
          filtered={hasFilters}
          searchTerm={table.query.trim()}
          onClearFilters={clear}
          emptyMessage={tr("Kỳ thi chưa gán thí sinh nào")}
          pagination={table.pagination}
          sort={table.sort}
          columns={[
            { key: "student", sortKey: "student", header: tr("Thí sinh"), render: (student) => (<div><strong>{student.student_name}</strong><div className="cellSub">{student.student_email}</div></div>) },
            {
              key: "state",
              sortKey: "state",
              header: tr("Trạng thái"),
              render: (student) => (
                <div className="badgeRow">
                  <span className={`badge ${STATE_LABEL[student.state].tone}`}>{STATE_LABEL[student.state].label}</span>
                  {student.is_cancelled ? <span className="badge red">{tr("Bị hủy bài")}</span> : student.is_flagged ? <span className="badge red">{tr("Bị đánh dấu")}</span> : null}
                </div>
              )
            },
            {
              key: "progress",
              sortKey: "progress",
              header: tr("Tiến độ"),
              numeric: true,
              render: (student) =>
                student.current_attempt
                  ? tr("{0}/{1} câu", student.current_attempt.answered, student.current_attempt.question_count)
                  : student.last_score !== null
                    ? tr("Điểm {0}", Number(student.last_score))
                    : "—"
            },
            { key: "left", sortKey: "left", header: tr("Còn lại"), numeric: true, render: (student) => (student.current_attempt ? remaining(student.current_attempt.ends_at) : "—") },
            {
              key: "violations",
              sortKey: "violations",
              header: tr("Vi phạm"),
              numeric: true,
              // The running attempt, or the latest one once the student has finished.
              render: (student) => (student.violation_count === null ? "—" : monitor?.session.proctoring_enabled ? `${student.violation_count}/${monitor.session.max_violations}` : student.violation_count)
            },
            {
              key: "event",
              sortKey: "event",
              header: tr("Sự kiện gần nhất"),
              render: (student) =>
                student.last_event_type ? (
                  <div>
                    {statusLabel(PROCTORING_EVENT_LABEL, student.last_event_type)}
                    {student.last_event_at ? <div className="cellSub">{formatDateTime(student.last_event_at)}</div> : null}
                  </div>
                ) : (
                  "—"
                )
            },
            {
              key: "actions",
              header: tr("Thao tác"),
              actions: true,
              render: (student) =>
                student.latest_attempt_id ? (
                  <div className="controlRow" style={{ margin: 0, justifyContent: "flex-end" }}>
                    <Link className="iconButton" href={`/dashboard/attempts/${student.latest_attempt_id}`} title={tr("Xem nhật ký giám sát")} aria-label={tr("Xem nhật ký giám sát của {0}", student.student_name)}>
                      <Eye size={16} aria-hidden="true" />
                    </Link>
                    {student.current_attempt ? (
                      <button className="iconButton" title={tr("Hủy bài do vi phạm")} aria-label={tr("Hủy bài của {0}", student.student_name)} onClick={() => setCancelTarget(student)}>
                        <Ban size={16} aria-hidden="true" />
                      </button>
                    ) : null}
                  </div>
                ) : null
            }
          ]}
        />
      </section>

      {cancelTarget ? (
        <div className="modalBackdrop" role="dialog" aria-modal="true" aria-labelledby="cancel-title">
          <div className="confirmModal">
            <h2 id="cancel-title">{tr("Hủy bài của")} {cancelTarget.student_name}?</h2>
            <p>{tr("Bài thi sẽ bị nộp ngay, chấm 0 điểm và đánh dấu gian lận. Lý do được lưu lại kèm tên bạn và thí sinh sẽ thấy.")}</p>
            <label className="field">
              <span>{tr("Lý do (bắt buộc)")}</span>
              <textarea className="textarea" value={note} onChange={(event) => setNote(event.target.value)} placeholder={tr("VD: Sử dụng điện thoại trong lúc thi")} maxLength={2000} autoFocus />
            </label>
            <div className="controlRow" style={{ marginTop: 12 }}>
              <button className="approveButton" onClick={() => setCancelTarget(null)} disabled={busy}>
                {tr("Không hủy")}
              </button>
              <button className="dangerButton" onClick={cancelAttempt} disabled={busy || note.trim().length < 5}>
                {busy ? tr("Đang hủy…") : tr("Hủy bài thi")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

export default function ProctoringPage() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<ExamSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [phase, setPhase] = useState("");

  useEffect(() => {
    api
      .get<{ data: ExamSession[] }>("/exam-sessions", { status: "open", per_page: 100 })
      .then((response) => setSessions(response.data))
      .finally(() => setLoading(false));
  }, []);

  const byPhase = useMemo(() => sessions.filter((session) => !phase || session.effective_status === phase), [sessions, phase]);
  const matches = useCallback((session: ExamSession, query: string) => session.title.toLowerCase().includes(query), []);
  const table = useClientTable(byPhase, { matches, initialPageSize: 10, sorters: SESSION_SORTERS });
  const hasFilters = Boolean(table.query.trim() || phase);
  const clear = () => {
    table.reset();
    setPhase("");
  };

  if (!can(user, "sessions.proctor")) {
    return <div className="emptyState">{tr("Bạn không có quyền coi thi.")}</div>;
  }

  if (selectedId !== null) {
    return <MonitorView sessionId={selectedId} onBack={() => setSelectedId(null)} />;
  }

  return (
    <>
      <PageHeader eyebrow={tr("Giám thị")} title={tr("Coi thi")} description={tr("Các kỳ thi đang bật mà bạn được phân công. Vào một kỳ thi để theo dõi thí sinh trực tiếp, xem nhật ký giám sát và hủy bài khi phát hiện gian lận.")} />

      <section className="panel">
        <TableToolbar search={{ value: table.query, onChange: table.setQuery, placeholder: tr("Tìm kỳ thi…"), label: tr("Tìm kỳ thi") }} active={hasFilters} onReset={clear}>
          <FilterSelect
            label={tr("Giai đoạn")}
            value={phase}
            onChange={setPhase}
            options={[
              { value: "open", label: tr("Đang diễn ra") },
              { value: "scheduled", label: tr("Chờ đến giờ") },
              { value: "closed", label: tr("Đã kết thúc") }
            ]}
          />
        </TableToolbar>

        <DataTable
          label={tr("Kỳ thi tôi coi")}
          rows={table.visible}
          rowKey={(row) => row.id}
          loading={loading}
          filtered={hasFilters}
          searchTerm={table.query.trim()}
          onClearFilters={clear}
          emptyMessage={tr("Hiện không có kỳ thi nào đang bật mà bạn được phân công")}
          emptyHint={tr("Quản trị viên gán bạn vào kỳ thi ở tab “Giáo viên coi thi”; kỳ thi phải được duyệt và bật.")}
          pagination={table.pagination}
          sort={table.sort}
          columns={[
            { key: "title", sortKey: "title", header: tr("Kỳ thi"), render: (session) => <strong>{session.title}</strong> },
            { key: "phase", sortKey: "phase", header: tr("Giai đoạn"), render: (session) => { const p = sessionPhase(session); return <span className={`badge ${p.tone}`}>{p.label}</span>; } },
            { key: "schedule", sortKey: "schedule", header: tr("Thời gian thi"), render: (session) => scheduleText(session) },
            { key: "size", sortKey: "size", header: tr("Quy mô"), numeric: true, render: (session) => tr("{0} thí sinh · {1} câu", session.assigned_student_count ?? 0, session.question_count ?? 0) },
            {
              key: "actions",
              header: tr("Thao tác"),
              actions: true,
              render: (session) => (
                <button className="primaryButton" onClick={() => setSelectedId(session.id)}>
                  <Eye size={16} aria-hidden="true" />
                  {tr("Vào coi thi")}
                </button>
              )
            }
          ]}
        />
      </section>
    </>
  );
}
