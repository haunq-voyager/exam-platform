"use client";


import { formatDateTime } from "../../../lib/format-date";
import { tr } from "../../../lib/i18n";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "@/components/RoleLink";
import { useRouter } from "@/lib/use-role-router";
import { PlayCircle, RotateCcw } from "lucide-react";
import { api, ApiError } from "../../../lib/api-client";
import { DataTable } from "../../../components/DataTable";
import { ExamRulesModal } from "../../../components/ExamRulesModal";
import { PageHeader } from "../../../components/PageHeader";
import { FilterSelect, TableToolbar } from "../../../components/TableToolbar";
import { markRulesAcknowledged } from "../../../lib/exam-rules";
import { ATTEMPT_STATUS_LABEL, EXAM_STATUS_LABEL, SCORING_METHOD_LABEL, statusLabel } from "../../../lib/status-labels";
import { useClientTable } from "../../../lib/use-client-table";
import type { StudentExam } from "../../../lib/types";

const STATUS_BADGE: Record<string, string> = { draft: "blue", scheduled: "amber", open: "green", closed: "red" };

const STATUS_FILTERS = [
  { value: "open", get label() { return tr("Đang mở"); } },
  { value: "scheduled", get label() { return tr("Sắp diễn ra"); } },
  { value: "closed", get label() { return tr("Đã kết thúc"); } },
  { value: "done", get label() { return tr("Đã có điểm"); } }
];

function formatDate(value: string | null): string {
  if (!value) return tr("Chưa đặt lịch");
  return formatDateTime(value);
}

const SORTERS = {
  title: (row: StudentExam) => row.title,
  status: (row: StudentExam) => row.status,
  time: (row: StudentExam) => row.start_at,
  attempts: (row: StudentExam) => row.my_attempt_count,
  score: (row: StudentExam) => row.my_score
};

export default function StudentExamsPage() {
  const router = useRouter();
  const [exams, setExams] = useState<StudentExam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [pendingExam, setPendingExam] = useState<StudentExam | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => {
    api
      .get<{ data: StudentExam[] }>("/student/exams")
      .then((response) => setExams(response.data))
      .finally(() => setLoading(false));
  }, []);

  const byStatus = useMemo(
    () => exams.filter((exam) => !statusFilter || (statusFilter === "done" ? exam.my_score !== null : exam.status === statusFilter)),
    [exams, statusFilter]
  );
  const matches = useCallback((exam: StudentExam, query: string) => `${exam.title} ${exam.exam_title ?? ""} ${exam.description ?? ""}`.toLowerCase().includes(query), []);
  const table = useClientTable(byStatus, { matches, initialPageSize: 10, sorters: SORTERS });
  const hasFilters = Boolean(table.query.trim() || statusFilter);

  async function handleConfirmStart() {
    const exam = pendingExam;
    if (!exam) return;
    setError(null);
    setIsStarting(true);
    try {
      let attemptId = exam.my_attempt_id;
      if (!attemptId || exam.my_attempt_status !== "in_progress") {
        const response = await api.post<{ data: { id: number } }>(`/exam-sessions/${exam.id}/attempts`);
        attemptId = response.data.id;
      }
      markRulesAcknowledged(attemptId);
      router.push(`/exam/${attemptId}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : tr("Không thể bắt đầu làm bài."));
      setPendingExam(null);
    } finally {
      setIsStarting(false);
    }
  }

  return (
    <>
      <PageHeader title={tr("Đề thi của tôi")} description={tr("Các kỳ thi bạn được giao. Vào phòng thi khi kỳ thi đang mở, hoặc xem lại điểm và lịch sử các lần thi.")} />

      {error ? <div className="formError" role="alert" style={{ marginBottom: 14 }}>{error}</div> : null}

      <section className="panel">
        <TableToolbar
          search={{ value: table.query, onChange: table.setQuery, placeholder: tr("Tìm theo tên kỳ thi…"), label: tr("Tìm kỳ thi") }}
          active={hasFilters}
          onReset={() => {
            table.reset();
            setStatusFilter("");
          }}
        >
          <FilterSelect label={tr("Trạng thái")} value={statusFilter} onChange={setStatusFilter} options={STATUS_FILTERS} />
        </TableToolbar>

        <DataTable
          label={tr("Danh sách kỳ thi của tôi")}
          rows={table.visible}
          rowKey={(row) => row.id}
          loading={loading}
          filtered={hasFilters}
          searchTerm={table.query.trim()}
          onClearFilters={() => {
            table.reset();
            setStatusFilter("");
          }}
          emptyMessage={tr("Bạn chưa được giao kỳ thi nào")}
          emptyHint={tr("Khi giáo vụ gán bạn vào một kỳ thi, kỳ thi sẽ xuất hiện ở đây.")}
          pagination={table.pagination}
          sort={table.sort}
          columns={[
            {
              key: "title",
              sortKey: "title",
              header: tr("Kỳ thi"),
              render: (row) => (
                <div>
                  <Link href={`/dashboard/student-exams/${row.id}`}>
                    <strong>{row.title}</strong>
                  </Link>
                  <div className="reviewEmpty" style={{ margin: 0 }}>
                    {row.duration_minutes} {tr("phút ·")} {row.question_count} {tr("câu")}
                  </div>
                  {row.my_flagged ? <span className="badge red">{tr("Bị đánh dấu gian lận")}</span> : null}
                </div>
              )
            },
            {
              key: "status",
              sortKey: "status",
              header: tr("Trạng thái"),
              render: (row) => (
                <div>
                  <span className={`badge ${STATUS_BADGE[row.status] ?? "blue"}`}>{statusLabel(EXAM_STATUS_LABEL, row.status)}</span>
                  {row.my_attempt_status ? <div className="reviewEmpty" style={{ margin: "4px 0 0" }}>{statusLabel(ATTEMPT_STATUS_LABEL, row.my_attempt_status)}</div> : null}
                </div>
              )
            },
            { key: "time", sortKey: "time", header: tr("Thời gian thi"), render: (row) => `${formatDate(row.start_at)} → ${row.end_at ? formatDate(row.end_at) : tr("không giới hạn")}` },
            { key: "attempts", sortKey: "attempts", header: tr("Số lần thi"), numeric: true, render: (row) => `${row.my_attempt_count}/${row.max_attempts}` },
            {
              key: "score",
              sortKey: "score",
              header: tr("Điểm"),
              numeric: true,
              render: (row) =>
                row.my_score !== null ? (
                  <span title={row.max_attempts > 1 ? statusLabel(SCORING_METHOD_LABEL, row.scoring_method) : undefined}>
                    <strong>{row.my_score}</strong>
                  </span>
                ) : (
                  "—"
                )
            },
            {
              key: "actions",
              header: tr("Thao tác"),
              actions: true,
              render: (row) => (
                <div className="controlRow" style={{ margin: 0, justifyContent: "flex-end" }}>
                  {row.can_attempt ? (
                    <button className="primaryButton" onClick={() => setPendingExam(row)}>
                      {row.my_attempt_status === "in_progress" ? <PlayCircle size={16} aria-hidden="true" /> : row.my_attempt_count > 0 ? <RotateCcw size={16} aria-hidden="true" /> : <PlayCircle size={16} aria-hidden="true" />}
                      {row.my_attempt_status === "in_progress" ? tr("Tiếp tục làm bài") : row.my_attempt_count > 0 ? tr("Thi lại (lần {0})", row.my_attempt_count + 1) : tr("Vào phòng thi")}
                    </button>
                  ) : null}
                  <Link className="approveButton" href={`/dashboard/student-exams/${row.id}`}>
                    {tr("Chi tiết")}
                  </Link>
                </div>
              )
            }
          ]}
        />
      </section>

      {pendingExam ? (
        <ExamRulesModal
          title={pendingExam.title}
          durationMinutes={pendingExam.duration_minutes}
          questionCount={pendingExam.question_count}
          maxAttempts={pendingExam.max_attempts}
          scoringMethod={pendingExam.scoring_method}
          proctoringEnabled={pendingExam.proctoring_enabled}
          maxViolations={pendingExam.max_violations}
          confirmLabel={pendingExam.my_attempt_status === "in_progress" ? tr("Tôi đồng ý, tiếp tục làm bài") : tr("Tôi đồng ý, bắt đầu làm bài")}
          loading={isStarting}
          onConfirm={handleConfirmStart}
          onCancel={() => setPendingExam(null)}
        />
      ) : null}
    </>
  );
}
