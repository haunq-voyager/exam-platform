"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { api, ApiError } from "../../../../lib/api-client";
import { useToast } from "../../../../lib/toast";
import type { Exam, Question } from "../../../../lib/types";

export default function ExamDetailPage() {
  const params = useParams<{ id: string }>();
  const examId = params.id;
  const { showToast } = useToast();

  const [exam, setExam] = useState<Exam | null>(null);
  const [availableQuestions, setAvailableQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedQuestionId, setSelectedQuestionId] = useState("");

  async function load() {
    setLoading(true);
    try {
      const [examResponse, questionsResponse] = await Promise.all([
        api.get<{ data: Exam }>(`/exams/${examId}`),
        api.get<{ data: Question[] }>("/questions", { status: "approved", per_page: 100 })
      ]);
      setExam(examResponse.data);
      setAvailableQuestions(questionsResponse.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examId]);

  async function handleAddQuestion(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!selectedQuestionId) return;
    try {
      await api.post(`/exams/${examId}/questions`, {
        question_id: Number(selectedQuestionId),
        order: (exam?.questions?.length ?? 0) + 1,
        points: 1
      });
      setSelectedQuestionId("");
      showToast("Đã thêm câu hỏi vào đề thi.");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không thể thêm câu hỏi.");
    }
  }

  async function handleRemoveQuestion(examQuestionId: number) {
    await api.delete(`/exams/${examId}/questions/${examQuestionId}`);
    showToast("Đã bỏ câu hỏi khỏi đề thi.");
    await load();
  }

  if (loading || !exam) {
    return <div className="emptyState">Đang tải...</div>;
  }

  const assignedQuestionIds = new Set(exam.questions?.map((item) => item.question_id));
  const selectableQuestions = availableQuestions.filter((question) => !assignedQuestionIds.has(question.id));

  return (
    <>
      <header className="topbar">
        <div>
          <Link className="approveButton" href="/dashboard/exams" style={{ marginBottom: 10 }}>
            <ArrowLeft size={16} />
            Danh sách đề thi
          </Link>
          <p className="eyebrow">Quản lý đề thi</p>
          <h1>{exam.title}</h1>
        </div>
      </header>

      {error ? <div className="formError" style={{ marginBottom: 14 }}>{error}</div> : null}

      <section className="roleBand">
        <div>
          <span>{exam.duration_minutes} phút · {exam.questions?.length ?? 0} câu hỏi</span>
          <h2>{exam.title}</h2>
          <p>{exam.description}</p>
        </div>
      </section>

      <section className="panel">
        <div className="panelHeader">
          <div>
            <p className="eyebrow">Câu hỏi</p>
            <h2>Danh sách câu hỏi trong đề</h2>
          </div>
        </div>
        <form onSubmit={handleAddQuestion} className="controlRow">
          <label className="field wide">
            <span>Chọn câu hỏi để thêm</span>
            <select value={selectedQuestionId} onChange={(event) => setSelectedQuestionId(event.target.value)}>
              <option value="">-- Chọn câu hỏi đã duyệt --</option>
              {selectableQuestions.map((question) => (
                <option key={question.id} value={question.id}>
                  {question.question_text.slice(0, 60)}
                </option>
              ))}
            </select>
          </label>
          <button className="primaryButton" type="submit" disabled={!selectedQuestionId}>
            <Plus size={16} />
            Thêm
          </button>
        </form>

        <div className="questionList">
          {(exam.questions ?? []).map((item) => (
            <div className="questionItem" key={item.id}>
              <div>
                <strong>
                  #{item.order} · {item.question?.question_text}
                </strong>
                <span>{item.points} điểm</span>
              </div>
              <button className="linkButton" onClick={() => handleRemoveQuestion(item.id)}>
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
