"use client";


import { tr } from "../../../../lib/i18n";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Plus, Trash2, X } from "lucide-react";
import { api, ApiError } from "../../../../lib/api-client";
import { useBreadcrumbLabel } from "../../../../components/Breadcrumbs";
import { ClientTable } from "../../../../components/ClientTable";
import { PageHeader } from "../../../../components/PageHeader";
import { QuestionPicker } from "../../../../components/QuestionPicker";
import { useToast } from "../../../../lib/toast";
import type { Exam, Question } from "../../../../lib/types";

export default function ExamDetailPage() {
  const params = useParams<{ id: string }>();
  const examId = params.id;
  const { showToast } = useToast();

  const [exam, setExam] = useState<Exam | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [picked, setPicked] = useState<Question[]>([]);
  const [points, setPoints] = useState(1);
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      const response = await api.get<{ data: Exam }>(`/exams/${examId}`);
      setExam(response.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examId]);

  useBreadcrumbLabel(exam?.title);

  const assignedIds = (exam?.questions ?? []).map((item) => item.question_id);
  const newQuestions = picked.filter((question) => !assignedIds.includes(question.id));

  /** One request per ticked question, in the order they were picked. */
  async function handleAddPicked() {
    setError(null);
    setSaving(true);
    let added = 0;
    try {
      const start = exam?.questions?.length ?? 0;
      for (const question of newQuestions) {
        await api.post(`/exams/${examId}/questions`, { question_id: question.id, order: start + added + 1, points });
        added += 1;
      }
      showToast(tr("Đã thêm {0} câu hỏi vào đề thi.", added));
      setPicked([]);
      setAdding(false);
    } catch (err) {
      setError(
        `${added > 0 ? tr("Đã thêm {0}/{1} câu, ", added, newQuestions.length) : ""}${err instanceof ApiError ? err.message : tr("không thể thêm câu hỏi.")}`
      );
      setPicked((current) => current.filter((question) => !newQuestions.slice(0, added).some((done) => done.id === question.id)));
    } finally {
      setSaving(false);
      await load();
    }
  }

  async function handleRemoveQuestion(examQuestionId: number) {
    await api.delete(`/exams/${examId}/questions/${examQuestionId}`);
    showToast(tr("Đã bỏ câu hỏi khỏi đề thi."));
    await load();
  }

  if (loading || !exam) {
    return <div className="emptyState" role="status">{tr("Đang tải…")}</div>;
  }

  return (
    <>
      <PageHeader eyebrow={tr("Quản lý đề thi")} title={exam.title} description={tr("{0} phút · {1} câu hỏi{2}", exam.duration_minutes, exam.questions?.length ?? 0, exam.description ? ` · ${exam.description}` : "")} />

      {error ? <div className="formError" role="alert" style={{ marginBottom: 14 }}>{error}</div> : null}

      <section className="panel">
        <div className="panelHeader">
          <div>
            <p className="eyebrow">{tr("Câu hỏi")}</p>
            <h2>{tr("Danh sách câu hỏi trong đề")}</h2>
          </div>
          <button className="primaryButton" onClick={() => setAdding((value) => !value)}>
            {adding ? <X size={16} aria-hidden="true" /> : <Plus size={16} aria-hidden="true" />}
            {adding ? tr("Đóng") : tr("Thêm câu hỏi")}
          </button>
        </div>

        {adding ? (
          <div className="panel" style={{ marginBottom: 16, boxShadow: "none" }}>
            <QuestionPicker selected={picked} onChange={setPicked} alreadyIds={assignedIds} />
            <div className="stickyActions" style={{ position: "static" }}>
              <span>
                {tr("Đã chọn")} <strong>{newQuestions.length}</strong> {tr("câu mới")}
              </span>
              <div className="controlRow" style={{ margin: 0, alignItems: "center" }}>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700 }}>
                  {tr("Điểm mỗi câu")}
                  <input type="number" min={0} step={0.5} value={points} onChange={(event) => setPoints(Math.max(0, Number(event.target.value) || 0))} style={{ width: 80, minHeight: 34 }} />
                </label>
                <button className="primaryButton" onClick={handleAddPicked} disabled={saving || newQuestions.length === 0}>
                  <Plus size={16} aria-hidden="true" />
                  {saving ? tr("Đang thêm…") : tr("Thêm {0} câu vào đề", newQuestions.length || "").replace("  ", " ")}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <ClientTable
          label={tr("Câu hỏi trong đề")}
          sorters={{ order: (item) => item.order, question: (item) => item.question?.question_text, points: (item) => Number(item.points) }}
          rows={exam.questions ?? []}
          rowKey={(item) => item.id}
          searchText={(item) => item.question?.question_text ?? ""}
          searchPlaceholder={tr("Tìm câu hỏi trong đề…")}
          emptyMessage={tr("Đề chưa có câu hỏi")}
          emptyHint={tr("Bấm “Thêm câu hỏi” để chọn nhiều câu từ ngân hàng câu hỏi.")}
          columns={[
            { key: "order", sortKey: "order", header: "#", numeric: true, width: "60px", render: (item) => item.order },
            { key: "question", sortKey: "question", header: tr("Câu hỏi"), render: (item) => <strong>{item.question?.question_text}</strong> },
            { key: "points", sortKey: "points", header: tr("Điểm"), numeric: true, width: "90px", render: (item) => item.points },
            {
              key: "actions",
              header: tr("Thao tác"),
              actions: true,
              render: (item) => (
                <button className="iconButton" onClick={() => handleRemoveQuestion(item.id)} title={tr("Bỏ khỏi đề")} aria-label={tr("Bỏ câu hỏi khỏi đề")}>
                  <Trash2 size={16} aria-hidden="true" />
                </button>
              )
            }
          ]}
        />
      </section>
    </>
  );
}
