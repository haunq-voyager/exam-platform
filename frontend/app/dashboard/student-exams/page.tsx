"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarClock, CheckCircle2, Clock3, FileText, Filter, Hourglass, PlayCircle, Search } from "lucide-react";
import { api, ApiError } from "../../../lib/api-client";
import { ATTEMPT_STATUS_LABEL, EXAM_STATUS_LABEL, statusLabel } from "../../../lib/status-labels";
import type { ExamStatus, StudentExam } from "../../../lib/types";

const STATUS_BADGE: Record<string, string> = { draft: "blue", scheduled: "amber", open: "green", closed: "red" };
const STATUS_LABEL: Record<string, string> = {
  all: "Tất cả",
  scheduled: "Sắp diễn ra",
  open: "Đang mở",
  closed: "Đã đóng",
  graded: "Đã thi"
};

function formatDate(value: string | null): string {
  if (!value) return "Chưa đặt lịch";
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function formatCountdown(value: string | null): string {
  if (!value) return "Đang cập nhật";
  const diff = new Date(value).getTime() - Date.now();
  if (diff <= 0) return "Đã đến giờ";
  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  if (days > 0) return `${days} ngày ${hours} giờ`;
  return `${hours} giờ ${minutes} phút`;
}

function statusOf(exam: StudentExam): ExamStatus | "graded" {
  return exam.my_attempt_status === "graded" ? "graded" : exam.status;
}

export default function StudentExamsPage() {
  const [exams, setExams] = useState<StudentExam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [query, setQuery] = useState("");
  const router = useRouter();

  async function load() {
    setLoading(true);
    try {
      const response = await api.get<{ data: StudentExam[] }>("/student/exams");
      setExams(response.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filteredExams = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return exams.filter((exam) => {
      const matchesStatus = statusFilter === "all" || statusOf(exam) === statusFilter;
      const matchesQuery = !normalized || exam.title.toLowerCase().includes(normalized) || (exam.description ?? "").toLowerCase().includes(normalized);
      return matchesStatus && matchesQuery;
    });
  }, [exams, query, statusFilter]);

  async function handleStart(exam: StudentExam) {
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

  return (
    <>
      <header className="topbar">
        <div>
          <p className="eyebrow">Thí sinh</p>
          <h1>Kỳ thi của tôi</h1>
        </div>
      </header>

      {error ? <div className="formError" style={{ marginBottom: 14 }}>{error}</div> : null}

      <section className="clientHero examHeroBanner">
        <div>
          <p className="eyebrow">ExamHub workspace</p>
          <h2>Theo dõi lịch thi, điểm số và tiến trình trong một màn hình</h2>
          <p>Mỗi kỳ thi có thể xem chi tiết trước khi vào phòng thi, tiếp tục bài đang làm và nhận biết trạng thái bằng màu sắc rõ ràng.</p>
        </div>
        <div className="clientHeroArt" aria-hidden="true">
          <FileText size={30} />
          <div>
            <span>Kỳ thi được giao</span>
            <strong>{exams.length}</strong>
          </div>
        </div>
      </section>

      <section className="examFilterBar">
        <label className="searchField">
          <Search size={17} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm kỳ thi..." />
        </label>
        <div className="segmentGroup" aria-label="Lọc trạng thái">
          {["all", "scheduled", "open", "closed", "graded"].map((item) => (
            <button key={item} className={statusFilter === item ? "segment active" : "segment"} onClick={() => setStatusFilter(item)}>
              {STATUS_LABEL[item]}
            </button>
          ))}
        </div>
      </section>

      <section className="clientPanel">
        {loading ? (
          <div className="emptyState">Đang tải...</div>
        ) : filteredExams.length === 0 ? (
          <div className="emptyState">Không có kỳ thi phù hợp bộ lọc.</div>
        ) : (
          <div className="examCardGrid">
            {filteredExams.map((exam, index) => {
              const examStatus = statusOf(exam);
              const isOpen = exam.status === "open";
              const isInProgress = exam.my_attempt_status === "in_progress";
              const bgClass = `examCardBg${(index % 4) + 1}`;

              return (
                <article className={`studentExamCard ${bgClass}`} key={exam.id}>
                  <Link className="studentExamLink" href={`/dashboard/student-exams/${exam.id}`} aria-label={`Xem chi tiết ${exam.title}`} />
                  <div className="studentExamTop">
                    <span className={`badge ${STATUS_BADGE[exam.status] ?? "blue"}`}>
                      {examStatus === "graded" ? "Đã chấm" : statusLabel(EXAM_STATUS_LABEL, exam.status)}
                    </span>
                    <span className="countdownPill">
                      <Hourglass size={15} />
                      {exam.status === "scheduled" ? formatCountdown(exam.start_at) : statusLabel(ATTEMPT_STATUS_LABEL, exam.my_attempt_status)}
                    </span>
                  </div>
                  <div className="studentExamContent">
                    <h2>{exam.title}</h2>
                    <p>{exam.description ?? "Kỳ thi trực tuyến có giám sát và tự động lưu bài làm."}</p>
                  </div>
                  <div className="studentExamMeta">
                    <span>
                      <Clock3 size={15} />
                      {exam.duration_minutes} phút
                    </span>
                    <span>
                      <FileText size={15} />
                      {exam.question_count} câu
                    </span>
                    <span>
                      <CalendarClock size={15} />
                      {formatDate(exam.start_at)}
                    </span>
                  </div>
                  <div className="studentExamActions">
                    {exam.my_attempt_status === "graded" ? (
                      <span className="scorePill">
                        <CheckCircle2 size={16} />
                        Điểm: {exam.my_score}
                      </span>
                    ) : isOpen ? (
                      <button className="primaryButton" onClick={() => handleStart(exam)}>
                        <PlayCircle size={17} />
                        {isInProgress ? "Tiếp tục làm bài" : "Vào phòng thi"}
                      </button>
                    ) : (
                      <span className="badge amber">
                        <Filter size={14} />
                        Chờ đến giờ thi
                      </span>
                    )}
                    <Link className="approveButton" href={`/dashboard/student-exams/${exam.id}`}>
                      Xem chi tiết
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}
