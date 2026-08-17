"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import { api, ApiError } from "../../../../lib/api-client";
import { useToast } from "../../../../lib/toast";
import type { Exam } from "../../../../lib/types";

export default function NewExamSessionPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [exams, setExams] = useState<Exam[]>([]);
  const [title, setTitle] = useState("");
  const [examId, setExamId] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function load() {
      const response = await api.get<{ data: Exam[] }>("/exams", { per_page: 100 });
      setExams(response.data);
    }
    load();
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!examId) {
      setError("Chọn một đề thi làm mẫu cho kỳ thi.");
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await api.post<{ data: { id: number } }>("/exam-sessions", {
        title,
        exam_id: Number(examId),
        start_at: startAt || null,
        end_at: endAt || null
      });
      showToast("Đã lưu kỳ thi mới.");
      router.push(`/dashboard/exam-sessions/${response.data.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không thể tạo kỳ thi.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <header className="topbar">
        <div>
          <Link className="approveButton" href="/dashboard/exam-sessions" style={{ marginBottom: 10 }}>
            <ArrowLeft size={16} />
            Danh sách kỳ thi
          </Link>
          <p className="eyebrow">Lịch thi</p>
          <h1>Tạo kỳ thi mới</h1>
        </div>
      </header>

      <section className="panel" style={{ maxWidth: 560 }}>
        <form onSubmit={handleSubmit}>
          {error ? <div className="formError" style={{ marginBottom: 14 }}>{error}</div> : null}
          <label className="field">
            <span>Tên kỳ thi</span>
            <input value={title} onChange={(event) => setTitle(event.target.value)} required placeholder="VD: Kiểm tra giữa kỳ - Ca 1" autoFocus />
          </label>
          <label className="field" style={{ marginTop: 14 }}>
            <span>Đề thi</span>
            <select value={examId} onChange={(event) => setExamId(event.target.value)} required>
              <option value="">-- Chọn đề thi --</option>
              {exams.map((exam) => (
                <option key={exam.id} value={exam.id}>
                  {exam.title} ({exam.question_count} câu)
                </option>
              ))}
            </select>
          </label>
          <div className="controlRow" style={{ marginTop: 14 }}>
            <label className="field compact">
              <span>Bắt đầu</span>
              <input type="datetime-local" value={startAt} onChange={(event) => setStartAt(event.target.value)} />
            </label>
            <label className="field compact">
              <span>Kết thúc</span>
              <input type="datetime-local" value={endAt} onChange={(event) => setEndAt(event.target.value)} />
            </label>
          </div>
          <button className="primaryButton" type="submit" style={{ marginTop: 18 }} disabled={isSubmitting}>
            <Save size={16} />
            {isSubmitting ? "Đang lưu..." : "Lưu kỳ thi"}
          </button>
        </form>
      </section>
    </>
  );
}
