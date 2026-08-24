"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, CheckCircle2, Clock3, FileQuestion } from "lucide-react";
import { api } from "../../../../../lib/api-client";
import { EXAM_STATUS_LABEL, statusLabel } from "../../../../../lib/status-labels";
import type { Exam, ExamSession } from "../../../../../lib/types";

const DIFFICULTY_LABEL: Record<string, string> = { easy: "Dễ", medium: "Trung bình", hard: "Khó" };
const STATUS_BADGE: Record<string, string> = { draft: "blue", scheduled: "amber", open: "green", closed: "red" };

export default function ExamSessionPreviewPage() {
  const params = useParams<{ id: string }>();
  const [session, setSession] = useState<ExamSession | null>(null);
  const [exam, setExam] = useState<Exam | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const sessionResponse = await api.get<{ data: ExamSession }>(`/exam-sessions/${params.id}`);
        setSession(sessionResponse.data);
        const examResponse = await api.get<{ data: Exam }>(`/exams/${sessionResponse.data.exam_id}`);
        setExam(examResponse.data);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [params.id]);

  if (loading) {
    return <div className="emptyState">Đang tải...</div>;
  }

  if (!session || !exam) {
    return <div className="emptyState">Không thể tải nội dung xem trước.</div>;
  }

  const questions = (exam.questions ?? []).slice().sort((a, b) => a.order - b.order);

  return (
    <>
      <header className="topbar">
        <div>
          <Link className="approveButton" href={`/dashboard/exam-sessions/${session.id}`} style={{ marginBottom: 10 }}>
            <ArrowLeft size={16} />
            Quay lại quản lý kỳ thi
          </Link>
          <p className="eyebrow">Xem trước · chỉ giảng viên/quản trị viên nhìn thấy đáp án</p>
          <h1>{session.title}</h1>
        </div>
      </header>

      <section className="roleBand">
        <div>
          <span>
            <span className={`badge ${STATUS_BADGE[session.status]}`}>{statusLabel(EXAM_STATUS_LABEL, session.status)}</span>
            {" · "}Đề thi: {exam.title}
          </span>
          <h2>{questions.length} câu hỏi</h2>
          <div className="examDetailStats">
            <span>
              <Clock3 size={16} />
              {exam.duration_minutes} phút
            </span>
            <span>
              <FileQuestion size={16} />
              {exam.question_count ?? questions.length} câu hỏi
            </span>
          </div>
        </div>
      </section>

      <section className="panel">
        {questions.length === 0 ? (
          <div className="emptyState">Đề thi chưa có câu hỏi nào.</div>
        ) : (
          <div style={{ display: "grid", gap: 18 }}>
            {questions.map((item, index) => (
              <article key={item.id} className="panel" style={{ boxShadow: "none", border: "1px solid var(--line)" }}>
                <div className="controlRow" style={{ margin: "0 0 10px", justifyContent: "space-between" }}>
                  <strong>
                    Câu {index + 1}/{questions.length}
                  </strong>
                  <div className="controlRow" style={{ margin: 0 }}>
                    <span className="badge blue">{DIFFICULTY_LABEL[item.question?.difficulty ?? ""] ?? item.question?.difficulty}</span>
                    <span className="badge">{item.points} điểm</span>
                  </div>
                </div>
                <p style={{ fontWeight: 700, marginBottom: 12 }}>{item.question?.question_text}</p>
                <div>
                  {(item.question?.options ?? []).map((option) => (
                    <div key={option} className={item.question?.correct_answer.includes(option) ? "previewOption correct" : "previewOption"}>
                      {item.question?.correct_answer.includes(option) ? <CheckCircle2 size={16} /> : <span style={{ width: 16 }} />}
                      <span>{option}</span>
                    </div>
                  ))}
                </div>
                {item.question?.explanation ? (
                  <div className="previewExplanation">
                    <strong style={{ color: "var(--ink)" }}>Lời giải: </strong>
                    {item.question.explanation}
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
