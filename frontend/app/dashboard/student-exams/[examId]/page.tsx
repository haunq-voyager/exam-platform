"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, BookOpenCheck, CalendarClock, CheckCircle2, ClipboardList, Clock3, FileText, MessageSquareText, PlayCircle, ShieldCheck } from "lucide-react";
import { api, ApiError } from "../../../../lib/api-client";
import { ATTEMPT_STATUS_LABEL, EXAM_STATUS_LABEL, statusLabel } from "../../../../lib/status-labels";
import type { ExamAttempt, StudentExam } from "../../../../lib/types";

function formatDate(value: string | null): string {
  if (!value) return "Chưa đặt lịch";
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function formatCountdown(value: string | null): string {
  if (!value) return "Đang cập nhật";
  const diff = new Date(value).getTime() - Date.now();
  if (diff <= 0) return "Có thể vào thi";
  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  return days > 0 ? `${days} ngày ${hours} giờ` : `${hours} giờ ${minutes} phút`;
}

export default function StudentExamDetailPage() {
  const params = useParams<{ examId: string }>();
  const examId = Number(params.examId);
  const router = useRouter();
  const [exams, setExams] = useState<StudentExam[]>([]);
  const [attempts, setAttempts] = useState<ExamAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");
  const [feedbackSaved, setFeedbackSaved] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [examResponse, attemptResponse] = await Promise.all([
          api.get<{ data: StudentExam[] }>("/student/exams"),
          api.get<{ data: ExamAttempt[] }>("/exam-attempts")
        ]);
        setExams(examResponse.data);
        setAttempts(attemptResponse.data);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const exam = useMemo(() => exams.find((item) => item.id === examId) ?? null, [exams, examId]);
  const examAttempts = useMemo(() => attempts.filter((attempt) => attempt.exam_id === examId), [attempts, examId]);

  async function handleStart() {
    if (!exam) return;
    setError(null);
    try {
      if (exam.my_attempt_id && exam.my_attempt_status === "in_progress") {
        router.push(`/exam/${exam.my_attempt_id}`);
        return;
      }
      const response = await api.post<{ data: { id: number } }>(`/exams/${exam.id}/attempts`);
      router.push(`/exam/${response.data.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không thể bắt đầu làm bài.");
    }
  }

  function handleFeedback(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedbackSaved(true);
  }

  if (loading) {
    return <div className="emptyState">Đang tải chi tiết kỳ thi...</div>;
  }

  if (!exam) {
    return (
      <section className="panel">
        <div className="emptyState">Không tìm thấy kỳ thi.</div>
      </section>
    );
  }

  const canStart = exam.status === "open" && exam.my_attempt_status !== "graded";

  return (
    <>
      <header className="topbar">
        <Link className="approveButton" href="/dashboard/student-exams">
          <ArrowLeft size={16} />
          Quay lại
        </Link>
      </header>

      {error ? <div className="formError" style={{ marginBottom: 14 }}>{error}</div> : null}

      <section className="examDetailHero">
        <div>
          <p className="eyebrow">Chi tiết kỳ thi</p>
          <h1>{exam.title}</h1>
          <p>{exam.description ?? "Đọc kỹ thông tin, quy định và lịch sử các lần thi trước khi vào phòng thi."}</p>
          <div className="examDetailStats">
            <span>
              <Clock3 size={16} />
              {exam.duration_minutes} phút
            </span>
            <span>
              <FileText size={16} />
              {exam.question_count} câu hỏi
            </span>
            <span>
              <CalendarClock size={16} />
              {formatDate(exam.start_at)}
            </span>
          </div>
        </div>
        <div className="examStartCard">
          <span className="badge blue">{statusLabel(EXAM_STATUS_LABEL, exam.status)}</span>
          <strong>{exam.status === "scheduled" ? formatCountdown(exam.start_at) : statusLabel(ATTEMPT_STATUS_LABEL, exam.my_attempt_status)}</strong>
          <p>{exam.end_at ? `Hạn kết thúc: ${formatDate(exam.end_at)}` : "Giáo viên chưa đặt hạn kết thúc."}</p>
          <button className="primaryButton wide" onClick={handleStart} disabled={!canStart}>
            <PlayCircle size={17} />
            {exam.my_attempt_status === "in_progress" ? "Tiếp tục bài đang làm" : "Bắt đầu làm bài"}
          </button>
        </div>
      </section>

      <section className="detailGrid">
        <article className="panel">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">Mô tả</p>
              <h2>Thông tin bài thi</h2>
            </div>
          </div>
          <div className="detailInfoGrid">
            <div>
              <BookOpenCheck size={20} />
              <strong>Nội dung</strong>
              <span>{exam.description ?? "Bài thi đánh giá kiến thức tổng hợp theo đề cương môn học."}</span>
            </div>
            <div>
              <ShieldCheck size={20} />
              <strong>Giám sát</strong>
              <span>Có ghi nhận sự kiện rời tab, trạng thái camera và tự động nộp khi hết giờ.</span>
            </div>
            <div>
              <ClipboardList size={20} />
              <strong>Chấm điểm</strong>
              <span>Kết quả hiển thị sau khi nộp bài và hệ thống chấm đáp án.</span>
            </div>
          </div>
        </article>

        <article className="panel">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">Quy định</p>
              <h2>Trước khi vào thi</h2>
            </div>
          </div>
          <ul className="rulesList">
            <li>Không rời khỏi tab thi trong quá trình làm bài.</li>
            <li>Đáp án được tự động lưu định kỳ, nhưng bạn vẫn nên kiểm tra trước khi nộp.</li>
            <li>Khi còn 5 phút, hệ thống sẽ hiện cảnh báo thời gian.</li>
            <li>Nếu thoát giữa chừng, vào lại sẽ tiếp tục đúng attempt đang làm nếu còn thời gian.</li>
          </ul>
        </article>

        <article className="panel detailWide">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">Lịch sử</p>
              <h2>Các lần thi trước đó</h2>
            </div>
          </div>
          {examAttempts.length === 0 ? (
            <div className="emptyState">Chưa có lần thi nào.</div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Bắt đầu</th>
                  <th>Trạng thái</th>
                  <th>Điểm</th>
                  <th>Chi tiết</th>
                </tr>
              </thead>
              <tbody>
                {examAttempts.map((attempt) => (
                  <tr key={attempt.id}>
                    <td>{formatDate(attempt.started_at)}</td>
                    <td><span className="badge blue">{statusLabel(ATTEMPT_STATUS_LABEL, attempt.status)}</span></td>
                    <td>{attempt.score !== null ? `${attempt.score} / ${attempt.total_points}` : "Chưa có"}</td>
                    <td>
                      <Link className="linkButton" href={attempt.status === "in_progress" ? `/exam/${attempt.id}` : `/dashboard/results/${attempt.id}`}>
                        Xem
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </article>

        <article className="panel detailWide">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">Góp ý</p>
              <h2>Gửi ghi chú cho giáo viên</h2>
            </div>
          </div>
          <form onSubmit={handleFeedback} className="feedbackForm">
            <label className="field">
              Nội dung góp ý
              <textarea className="textarea" value={feedback} onChange={(event) => setFeedback(event.target.value)} placeholder="Nhập thắc mắc hoặc ghi chú về kỳ thi..." />
            </label>
            <button className="approveButton" type="submit">
              <MessageSquareText size={16} />
              Lưu góp ý
            </button>
            {feedbackSaved ? <span className="saveHint"><CheckCircle2 size={15} /> Đã ghi nhận trên giao diện demo.</span> : null}
          </form>
        </article>
      </section>
    </>
  );
}
