"use client";


import { tr } from "../../../lib/i18n";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ShieldAlert } from "lucide-react";
import { api } from "../../../lib/api-client";
import { AttemptHistory } from "../../../components/AttemptHistory";
import { DataTable } from "../../../components/DataTable";
import { PageHeader } from "../../../components/PageHeader";
import { FilterSelect, TableToolbar } from "../../../components/TableToolbar";
import { SCORING_METHOD_LABEL, statusLabel } from "../../../lib/status-labels";
import { useClientTable } from "../../../lib/use-client-table";
import type { ExamAttempt, StudentExam } from "../../../lib/types";

interface ResultGroup {
  sessionId: number;
  title: string;
  attempts: ExamAttempt[];
  exam: StudentExam | null;
  latestStartedAt: string;
}

const FILTERS = [
  { value: "flagged", get label() { return tr("Có vi phạm"); } },
  { value: "scored", get label() { return tr("Đã có điểm"); } },
  { value: "in_progress", get label() { return tr("Đang làm dở"); } }
];

const SORTERS = {
  title: (group: ResultGroup) => group.title,
  attempts: (group: ResultGroup) => group.attempts.length,
  score: (group: ResultGroup) => group.exam?.my_score
};

export default function ResultsPage() {
  const [attempts, setAttempts] = useState<ExamAttempt[]>([]);
  const [exams, setExams] = useState<StudentExam[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    Promise.all([api.get<{ data: ExamAttempt[] }>("/exam-attempts"), api.get<{ data: StudentExam[] }>("/student/exams")])
      .then(([attemptResponse, examResponse]) => {
        setAttempts(attemptResponse.data);
        setExams(examResponse.data);
      })
      .finally(() => setLoading(false));
  }, []);

  // One row per exam session; every retake sits inside that row.
  const groups = useMemo<ResultGroup[]>(() => {
    const bySession = new Map<number, ExamAttempt[]>();
    attempts.forEach((attempt) => bySession.set(attempt.exam_session_id, [...(bySession.get(attempt.exam_session_id) ?? []), attempt]));

    return Array.from(bySession.entries())
      .map(([sessionId, sessionAttempts]) => ({
        sessionId,
        title: sessionAttempts[0].exam_session_title ?? sessionAttempts[0].exam_title ?? tr("Kỳ thi #{0}", sessionId),
        attempts: sessionAttempts,
        exam: exams.find((exam) => exam.id === sessionId) ?? null,
        latestStartedAt: sessionAttempts.map((attempt) => attempt.started_at).sort().pop() ?? ""
      }))
      .sort((a, b) => b.latestStartedAt.localeCompare(a.latestStartedAt));
  }, [attempts, exams]);

  const byFilter = useMemo(
    () =>
      groups.filter((group) => {
        if (filter === "flagged") return group.attempts.some((attempt) => attempt.is_flagged);
        if (filter === "scored") return group.exam?.my_score !== null && group.exam?.my_score !== undefined;
        if (filter === "in_progress") return group.attempts.some((attempt) => attempt.status === "in_progress");
        return true;
      }),
    [groups, filter]
  );
  const matches = useCallback((group: ResultGroup, query: string) => group.title.toLowerCase().includes(query), []);
  const table = useClientTable(byFilter, { matches, initialPageSize: 10, sorters: SORTERS });
  const hasFilters = Boolean(table.query.trim() || filter);
  const clear = () => {
    table.reset();
    setFilter("");
  };

  return (
    <>
      <PageHeader title={tr("Kết quả làm bài")} description={tr("Điểm của từng kỳ thi. Mở một dòng để xem các lần thi, bấm “Xem” để xem chi tiết bài làm và gửi yêu cầu phúc khảo.")} />

      <section className="panel">
        <TableToolbar search={{ value: table.query, onChange: table.setQuery, placeholder: tr("Tìm theo tên kỳ thi…"), label: tr("Tìm kết quả") }} active={hasFilters} onReset={clear}>
          <FilterSelect label={tr("Lọc")} value={filter} onChange={setFilter} options={FILTERS} />
        </TableToolbar>

        <DataTable
          label={tr("Kết quả theo kỳ thi")}
          rows={table.visible}
          rowKey={(row) => row.sessionId}
          loading={loading}
          filtered={hasFilters}
          searchTerm={table.query.trim()}
          onClearFilters={clear}
          emptyMessage={tr("Bạn chưa làm bài thi nào")}
          emptyHint={tr("Sau khi nộp bài, điểm và lịch sử các lần thi sẽ hiện ở đây.")}
          pagination={table.pagination}
          sort={table.sort}
          expandable={{
            defaultExpandedKey: table.visible[0]?.sessionId,
            render: (group) => <AttemptHistory attempts={group.attempts} audience="student" scoringMethod={group.exam?.scoring_method} />
          }}
          columns={[
            {
              key: "title",
              sortKey: "title",
              header: tr("Kỳ thi"),
              render: (group) => (
                <div>
                  <strong>{group.title}</strong>
                  {group.attempts.some((attempt) => attempt.is_flagged) ? (
                    <div>
                      <span className="badge amber">
                        <ShieldAlert size={12} aria-hidden="true" /> {tr("Có vi phạm")}
                      </span>
                    </div>
                  ) : null}
                </div>
              )
            },
            { key: "attempts", sortKey: "attempts", header: tr("Số lần thi"), numeric: true, render: (group) => `${group.attempts.length}${group.exam ? `/${group.exam.max_attempts}` : ""}` },
            {
              key: "method",
              header: tr("Cách tính điểm"),
              render: (group) => (group.exam && group.exam.max_attempts > 1 ? statusLabel(SCORING_METHOD_LABEL, group.exam.scoring_method) : tr("Một lần thi"))
            },
            {
              key: "score",
              sortKey: "score",
              header: tr("Điểm cuối cùng"),
              numeric: true,
              render: (group) => (group.exam?.my_score !== null && group.exam?.my_score !== undefined ? <strong>{group.exam.my_score}</strong> : "—")
            }
          ]}
        />
      </section>
    </>
  );
}
