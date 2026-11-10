"use client";


import { tr } from "../../../../lib/i18n";
import { useEffect, useState } from "react";
import Link from "@/components/RoleLink";
import { useParams } from "next/navigation";
import { BadgeCheck, ClipboardList, Eye, FileText, GraduationCap, Plus, Save, Settings, ShieldAlert, Trash2, Users } from "lucide-react";
import { api, ApiError } from "../../../../lib/api-client";
import { AttemptHistory } from "../../../../components/AttemptHistory";
import { useBreadcrumbLabel } from "../../../../components/Breadcrumbs";
import { ClientTable } from "../../../../components/ClientTable";
import { PageHeader } from "../../../../components/PageHeader";
import { FilterSelect } from "../../../../components/TableToolbar";
import { ApprovalBadge } from "../../../../components/ApprovalBadge";
import { ApprovalPanel } from "../../../../components/ApprovalPanel";
import { DepartmentSelect } from "../../../../components/DepartmentSelect";
import { ScheduleFields } from "../../../../components/ScheduleFields";
import { SessionExamEditor } from "../../../../components/SessionExamEditor";
import { ToggleSwitch, useSessionSwitch } from "../../../../components/SessionSwitch";
import { fromDatetimeLocal, toDatetimeLocal } from "../../../../lib/datetime";
import { scheduleText, sessionPhase } from "../../../../lib/session-phase";
import { StudentPicker } from "../../../../components/StudentPicker";
import { ExamSessionSettingsFields, type ExamSessionSettings } from "../../../../components/ExamSessionSettingsFields";
import { useAuth } from "../../../../lib/auth-context";
import { can } from "../../../../lib/permissions";
import { useToast } from "../../../../lib/toast";
import { ATTEMPT_STATUS_LABEL, SCORING_METHOD_LABEL, statusLabel } from "../../../../lib/status-labels";
import type { ExamAttempt, ExamSession, ExamSessionResult, User } from "../../../../lib/types";


type TabKey = "exam" | "approval" | "students" | "teachers" | "results" | "settings";

export default function ExamSessionDetailPage() {
  const params = useParams<{ id: string }>();
  const sessionId = params.id;
  const { showToast } = useToast();
  const { user } = useAuth();
  const canUpdate = can(user, "sessions.update");
  const canEnable = can(user, "sessions.enable");

  const [session, setSession] = useState<ExamSession | null>(null);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [attempts, setAttempts] = useState<ExamAttempt[]>([]);
  const [results, setResults] = useState<ExamSessionResult[]>([]);
  const [settings, setSettings] = useState<ExamSessionSettings | null>(null);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [resultFilter, setResultFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const [activeTab, setActiveTab] = useState<TabKey>("exam");
  const [pickerVersion, setPickerVersion] = useState(0);
  const [titleDraft, setTitleDraft] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [departmentId, setDepartmentId] = useState("");

  async function load() {
    try {
      const [sessionResponse, teachersResponse, attemptsResponse, resultsResponse] = await Promise.all([
        api.get<{ data: ExamSession }>(`/exam-sessions/${sessionId}`),
        // Each extra list needs its own permission (a teacher cannot list users, a head may not see results...).
        can(user, "users.view") ? api.get<{ data: User[] }>("/users", { role: "teacher", per_page: 100 }) : Promise.resolve({ data: [] as User[] }),
        can(user, "results.view") ? api.get<{ data: ExamAttempt[] }>(`/exam-sessions/${sessionId}/attempts`) : Promise.resolve({ data: [] as ExamAttempt[] }),
        can(user, "results.view") ? api.get<{ data: ExamSessionResult[] }>(`/exam-sessions/${sessionId}/results`) : Promise.resolve({ data: [] as ExamSessionResult[] })
      ]);
      setSession(sessionResponse.data);
      setTeachers(teachersResponse.data);
      setAttempts(attemptsResponse.data);
      setResults(resultsResponse.data);
      setTitleDraft(sessionResponse.data.title);
      setStartAt(toDatetimeLocal(sessionResponse.data.start_at));
      setEndAt(toDatetimeLocal(sessionResponse.data.end_at));
      setDepartmentId(sessionResponse.data.department_id ? String(sessionResponse.data.department_id) : "");
      setSettings({
        max_attempts: sessionResponse.data.max_attempts,
        scoring_method: sessionResponse.data.scoring_method,
        proctoring_enabled: sessionResponse.data.proctoring_enabled,
        max_violations: sessionResponse.data.max_violations
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : tr("Không thể tải chi tiết kỳ thi."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  useBreadcrumbLabel(session?.title);

  const { requestToggle, isBusy, dialog: switchDialog } = useSessionSwitch(load);

  async function handleUnassign(assignmentId: number) {
    await api.delete(`/exam-sessions/${sessionId}/assignments/${assignmentId}`);
    showToast(tr("Đã bỏ gán thí sinh."));
    setPickerVersion((value) => value + 1); // the student is selectable again
    await load();
  }

  async function handleAssignTeacher(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!selectedTeacherId) return;
    try {
      await api.post(`/exam-sessions/${sessionId}/teachers`, { teacher_id: Number(selectedTeacherId) });
      setSelectedTeacherId("");
      showToast(tr("Đã gán giảng viên phụ trách."));
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : tr("Không thể gán giảng viên."));
    }
  }

  async function handleRemoveTeacher(teacherId: number) {
    await api.delete(`/exam-sessions/${sessionId}/teachers/${teacherId}`);
    showToast(tr("Đã bỏ giảng viên phụ trách."));
    await load();
  }

  async function handleSaveSettings(event: React.FormEvent) {
    event.preventDefault();
    if (!settings) return;
    setError(null);
    setIsSavingSettings(true);
    try {
      if (startAt && endAt && new Date(endAt) <= new Date(startAt)) {
        setError(tr("Ngày kết thúc phải sau ngày bắt đầu."));
        return;
      }
      await api.patch(`/exam-sessions/${sessionId}`, {
        ...settings,
        title: titleDraft.trim() || undefined,
        // null clears a date; the zone-aware ISO string keeps the exam time identical for everyone.
        start_at: fromDatetimeLocal(startAt),
        end_at: fromDatetimeLocal(endAt),
        department_id: departmentId ? Number(departmentId) : null
      });
      showToast(tr("Đã lưu cài đặt kỳ thi."));
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : tr("Không thể lưu cài đặt."));
    } finally {
      setIsSavingSettings(false);
    }
  }


  const filteredResults = results.filter(
    (row) => !resultFilter || (resultFilter === "flagged" ? row.is_flagged : resultFilter === "taken" ? row.attempts_used > 0 : row.attempts_used === 0)
  );

  if (loading) {
    return <div className="emptyState">{tr("Đang tải...")}</div>;
  }

  if (!session) {
    return <div className="emptyState">{error ?? tr("Không thể tải chi tiết kỳ thi.")}</div>;
  }

  const attemptsByStudent = new Map<number, ExamAttempt[]>();
  attempts.forEach((attempt) => attemptsByStudent.set(attempt.student_id, [...(attemptsByStudent.get(attempt.student_id) ?? []), attempt]));

  const phase = sessionPhase(session);
  const assignedStudentIds = new Set(session.assignments?.map((item) => item.student_id));
  const assignedTeacherIds = new Set(session.teachers?.map((item) => item.id));
  const selectableTeachers = teachers.filter((teacher) => !assignedTeacherIds.has(teacher.id));

  return (
    <>
      <PageHeader
        eyebrow={tr("Quản lý kỳ thi{0}", session.code ? ` · ${session.code}` : "")}
        title={session.title}
        actions={
          <>
            <Link className="approveButton" href={`/dashboard/exam-sessions/${sessionId}/preview`}>
              <Eye size={16} aria-hidden="true" />
              {tr("Xem trước đề")}
            </Link>
            <span className="switchRow">
              <ToggleSwitch
                checked={session.is_enabled}
                disabled={isBusy(session.id) || !canEnable || (!session.is_enabled && session.approval.required && session.approval.status !== "approved")}
                label={
                  !canEnable
                    ? tr("Bạn không có quyền bật/tắt kỳ thi")
                    : !session.is_enabled && session.approval.required && session.approval.status !== "approved"
                      ? tr("Cần được duyệt xong mới bật được")
                      : session.is_enabled
                        ? tr("Tắt kỳ thi")
                        : tr("Bật kỳ thi")
                }
                onClick={() => requestToggle(session)}
              />
              {session.is_enabled ? tr("Đang bật") : tr("Đang tắt")}
            </span>
          </>
        }
      />

      {error ? <div className="formError" role="alert" style={{ marginBottom: 14 }}>{error}</div> : null}

      <div className="reviewChips" style={{ marginBottom: 12 }}>
        <span className={`badge ${phase.tone} statusPill`}>{phase.label}</span>
        {session.approval.required ? <ApprovalBadge sessionId={session.id} sessionTitle={session.title} approval={session.approval} className="statusPill" /> : null}
        {session.department_name ? <span className="reviewChip">{session.department_name}</span> : null}
        <span className="reviewChip">
          {session.question_count ?? 0} {tr("câu ·")} {session.duration_minutes ?? "—"} {tr("phút")}
        </span>
        <span className="reviewChip">{scheduleText(session)}</span>
        <span className="reviewChip">
          {session.max_attempts} {tr("lần thi")}{session.max_attempts > 1 ? ` (${statusLabel(SCORING_METHOD_LABEL, session.scoring_method).toLowerCase()})` : ""}
        </span>
        <span className="reviewChip">{session.proctoring_enabled ? tr("Giám sát · cảnh báo {0} lần", session.max_violations) : tr("Không giám sát")}</span>
      </div>

      {(session.question_count ?? 0) === 0 ? (
        <div className="reviewNotice" style={{ borderColor: "rgba(217,119,6,.4)", background: "#fffbeb", color: "#92400e" }}>
          {tr("Đề thi chưa có câu hỏi, chưa thể bật kỳ thi.")}
          <button className="linkButton" onClick={() => setActiveTab("exam")}>
            {tr("Thêm câu hỏi ngay")}
          </button>
        </div>
      ) : !session.end_at && !session.is_enabled ? (
        <p className="reviewEmpty" style={{ marginTop: 0 }}>
          {tr("Mẹo: đặt ngày bắt đầu/kết thúc ở tab “Cài đặt” để giới hạn thời gian thi trước khi bật kỳ thi.")}
        </p>
      ) : null}

      <div className="tabBar" role="tablist" aria-label={tr("Nội dung kỳ thi")}>
        {[
          { key: "exam" as TabKey, icon: FileText, label: tr("Đề thi ({0})", session.question_count ?? 0) },
          { key: "approval" as TabKey, icon: BadgeCheck, label: tr("Phê duyệt{0}", session.approval.can_act ? " (cần bạn duyệt)" : "") },
          { key: "students" as TabKey, icon: GraduationCap, label: tr("Thí sinh ({0})", session.assignments?.length ?? 0) },
          { key: "teachers" as TabKey, icon: Users, label: tr("Giáo viên coi thi ({0})", session.teachers?.length ?? 0) },
          { key: "results" as TabKey, icon: ClipboardList, label: tr("Kết quả ({0})", attempts.length) },
          ...(canUpdate ? [{ key: "settings" as TabKey, icon: Settings, label: tr("Cài đặt") }] : [])
        ].map(({ key, icon: Icon, label }) => (
          <button key={key} role="tab" aria-selected={activeTab === key} className={activeTab === key ? "tabButton active" : "tabButton"} onClick={() => setActiveTab(key)}>
            <Icon size={16} aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>

      {activeTab === "exam" ? (
        <section className="panel">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">{tr("Đề thi")}</p>
              <h2>{tr("Nội dung đề của kỳ thi này")}</h2>
            </div>
          </div>
          <SessionExamEditor sessionId={sessionId} onChanged={load} readOnly={!canUpdate} />
        </section>
      ) : null}

      {activeTab === "approval" ? (
        <section className="panel">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">{tr("Phê duyệt")}</p>
              <h2>{tr("Quy trình duyệt kỳ thi")}</h2>
            </div>
          </div>
          <ApprovalPanel sessionId={sessionId} onChanged={load} />
        </section>
      ) : null}

      {activeTab === "students" ? (
        <>
          {canUpdate ? (
            <section className="panel">
              <div className="panelHeader">
                <div>
                <p className="eyebrow">{tr("Thêm thí sinh")}</p>
                <h2>{tr("Chọn theo danh sách hoặc theo ngành")}</h2>
              </div>
            </div>
            <StudentPicker key={pickerVersion} sessionId={sessionId} onAssigned={load} />
          </section>
          ) : null}

          <section className="panel" style={{ marginTop: 16 }}>
            <div className="panelHeader">
              <div>
                <p className="eyebrow">{tr("Thí sinh")}</p>
                <h2>{tr("Đã gán vào kỳ thi (")}{session.assignments?.length ?? 0})</h2>
              </div>
            </div>
            <ClientTable
              label={tr("Thí sinh đã gán vào kỳ thi")}
              sorters={{ name: (item) => item.student_name, email: (item) => item.student_email, major: (item) => item.student_major, code: (item) => item.student_code, class: (item) => item.student_class }}
              rows={session.assignments ?? []}
              rowKey={(item) => item.id}
              searchText={(item) => `${item.student_name ?? ""} ${item.student_email ?? ""} ${item.student_major ?? ""} ${item.student_code ?? ""} ${item.student_class ?? ""}`}
              searchPlaceholder={tr("Tìm theo tên, email, ngành…")}
              emptyMessage={tr("Chưa gán thí sinh nào")}
              emptyHint={canUpdate ? tr("Chọn thí sinh ở bảng phía trên rồi bấm “Gán”.") : undefined}
              columns={[
                { key: "name", sortKey: "name", header: tr("Thí sinh"), render: (item) => <strong>{item.student_name}</strong> },
                { key: "email", sortKey: "email", header: "Email", render: (item) => item.student_email },
                { key: "code", sortKey: "code", header: tr("Mã sinh viên"), render: (item) => item.student_code ?? "—" },
                { key: "class", sortKey: "class", header: tr("Mã lớp"), render: (item) => item.student_class ?? "—" },
                { key: "major", sortKey: "major", header: tr("Ngành"), render: (item) => item.student_major ?? "—" },
                {
                  key: "actions",
                  header: tr("Thao tác"),
                  actions: true,
                  render: (item) => (
                    <button className="iconButton" onClick={() => handleUnassign(item.id)} title={tr("Bỏ gán")} aria-label={tr("Bỏ gán {0}", item.student_name)} disabled={!canUpdate}>
                      <Trash2 size={16} aria-hidden="true" />
                    </button>
                  )
                }
              ]}
            />
          </section>
        </>
      ) : null}

      {activeTab === "teachers" ? (
        <section className="panel">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">{tr("Giám thị")}</p>
              <h2>{tr("Giáo viên coi thi, phúc khảo và trả lời phản hồi")}</h2>
            </div>
          </div>
          {canUpdate ? (
          <form onSubmit={handleAssignTeacher} className="controlRow">
            <label className="field wide">
              <span>{tr("Chọn giáo viên")}</span>
              <select value={selectedTeacherId} onChange={(event) => setSelectedTeacherId(event.target.value)}>
                <option value="">{tr("-- Chọn giáo viên --")}</option>
                {selectableTeachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.name} ({teacher.email})
                  </option>
                ))}
              </select>
            </label>
            <button className="primaryButton" type="submit" disabled={!selectedTeacherId}>
              <Plus size={16} />
              {tr("Gán")}
            </button>
          </form>
          ) : null}

          <ClientTable
            label={tr("Giáo viên coi thi")}
            sorters={{ name: (item) => item.name, email: (item) => item.email }}
            rows={session.teachers ?? []}
            rowKey={(item) => item.id}
            searchText={(item) => `${item.name} ${item.email}`}
            searchPlaceholder={tr("Tìm giáo viên…")}
            emptyMessage={tr("Chưa gán giáo viên nào")}
            emptyHint={tr("Giáo viên được gán sẽ thấy kỳ thi này để coi thi, xử lý phúc khảo và trả lời phản hồi.")}
            columns={[
              { key: "name", sortKey: "name", header: tr("Giáo viên"), render: (item) => <strong>{item.name}</strong> },
              { key: "email", sortKey: "email", header: "Email", render: (item) => item.email },
              {
                key: "actions",
                header: tr("Thao tác"),
                actions: true,
                render: (item) => (
                  <button className="iconButton" onClick={() => handleRemoveTeacher(item.id)} title={tr("Bỏ gán")} aria-label={tr("Bỏ gán {0}", item.name)} disabled={!canUpdate}>
                    <Trash2 size={16} aria-hidden="true" />
                  </button>
                )
              }
            ]}
          />
        </section>
      ) : null}

      {activeTab === "results" ? (
        <section className="panel">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">{tr("Kết quả")}</p>
              <h2>{tr("Thí sinh & lịch sử các lần thi")}</h2>
            </div>
          </div>
          <ClientTable
            label={tr("Kết quả của thí sinh")}
            sorters={{ student: (row) => row.student_name, attempts: (row) => row.attempts_used, score: (row) => (row.final_score === null ? null : Number(row.final_score)), flag: (row) => (row.is_flagged ? 1 : 0) }}
            rows={filteredResults}
            rowKey={(row) => row.student_id}
            searchText={(row) => `${row.student_name ?? ""} ${row.student_email ?? ""}`}
            searchPlaceholder={tr("Tìm thí sinh…")}
            filtersActive={Boolean(resultFilter)}
            onResetFilters={() => setResultFilter("")}
            emptyMessage={tr("Chưa gán thí sinh nào")}
            filters={
              <FilterSelect
                label={tr("Lọc")}
                value={resultFilter}
                onChange={setResultFilter}
                options={[
                  { value: "flagged", label: tr("Bị đánh dấu gian lận") },
                  { value: "taken", label: tr("Đã thi") },
                  { value: "not_taken", label: tr("Chưa thi") }
                ]}
              />
            }
            expandable={{
              canExpand: (row) => row.attempts_used > 0,
              render: (row) => <AttemptHistory attempts={attemptsByStudent.get(row.student_id) ?? []} audience="staff" scoringMethod={session.scoring_method} />
            }}
            columns={[
              {
                key: "student",
                sortKey: "student",
                header: tr("Thí sinh"),
                render: (row) => (
                  <div>
                    <strong>{row.student_name}</strong>
                    <div className="reviewEmpty" style={{ margin: 0 }}>{row.student_email}</div>
                  </div>
                )
              },
              { key: "attempts", sortKey: "attempts", header: tr("Số lần thi"), numeric: true, render: (row) => `${row.attempts_used}/${session.max_attempts}` },
              {
                key: "score",
                sortKey: "score",
                header: tr("Điểm ({0})", statusLabel(SCORING_METHOD_LABEL, session.scoring_method).toLowerCase()),
                numeric: true,
                render: (row) => (row.final_score !== null ? `${row.final_score} / ${row.total_points}` : "—")
              },
              {
                key: "flag",
                sortKey: "flag",
                header: tr("Gian lận"),
                render: (row) =>
                  row.is_flagged ? (
                    <span className="badge red">
                      <ShieldAlert size={13} aria-hidden="true" /> {tr("Bị đánh dấu")}{row.cancelled_count > 0 ? tr(" · {0} bài bị hủy", row.cancelled_count) : ""}
                    </span>
                  ) : (
                    "—"
                  )
              }
            ]}
          />
        </section>
      ) : null}

      {activeTab === "settings" && settings && canUpdate ? (
        <section className="panel" style={{ maxWidth: 560 }}>
          <div className="panelHeader">
            <div>
              <p className="eyebrow">{tr("Cài đặt")}</p>
              <h2>{tr("Lịch thi, lần thi & giám sát gian lận")}</h2>
            </div>
          </div>
          <form onSubmit={handleSaveSettings}>
            <label className="field">
              <span>{tr("Tên kỳ thi")}</span>
              <input value={titleDraft} onChange={(event) => setTitleDraft(event.target.value)} required maxLength={255} />
            </label>
            <div style={{ marginTop: 14 }}>
              <DepartmentSelect value={departmentId} onChange={setDepartmentId} label={tr("Khoa (quyết định ai duyệt kỳ thi)")} />
              <small className="avatarHint" style={{ fontWeight: 500 }}>{tr("Đổi khoa hoặc lịch/thiết lập sẽ hủy duyệt cũ nếu kỳ thi đã được duyệt.")}</small>
            </div>
            <ScheduleFields
              startAt={startAt}
              endAt={endAt}
              onChange={(value) => {
                setStartAt(value.startAt);
                setEndAt(value.endAt);
              }}
            />
            <ExamSessionSettingsFields value={settings} onChange={setSettings} />
            <button className="primaryButton" type="submit" style={{ marginTop: 18 }} disabled={isSavingSettings}>
              <Save size={16} />
              {isSavingSettings ? tr("Đang lưu...") : tr("Lưu cài đặt")}
            </button>
          </form>
        </section>
      ) : null}

      {switchDialog}
    </>
  );
}
