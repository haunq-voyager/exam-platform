"use client";


import { tr } from "../../../../lib/i18n";
import { useEffect, useState } from "react";
import Link from "@/components/RoleLink";
import { useRouter } from "@/lib/use-role-router";
import { ArrowLeft, ListChecks, Save, X } from "lucide-react";
import { api, ApiError } from "../../../../lib/api-client";
import { DEFAULT_EXAM_SESSION_SETTINGS, ExamSessionSettingsFields, type ExamSessionSettings } from "../../../../components/ExamSessionSettingsFields";
import { DepartmentSelect } from "../../../../components/DepartmentSelect";
import { QuestionPicker } from "../../../../components/QuestionPicker";
import { ScheduleFields } from "../../../../components/ScheduleFields";
import { fromDatetimeLocal } from "../../../../lib/datetime";
import { useAuth } from "../../../../lib/auth-context";
import { useToast } from "../../../../lib/toast";
import type { Exam, Question } from "../../../../lib/types";

type Source = "exam" | "manual";

export default function NewExamSessionPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const { user } = useAuth();
  // Defaults to the creator's own department; it decides who approves the session.
  const [departmentId, setDepartmentId] = useState(user?.department_id ? String(user.department_id) : "");
  const [exams, setExams] = useState<Exam[]>([]);
  const [title, setTitle] = useState("");
  const [source, setSource] = useState<Source>("exam");
  const [examId, setExamId] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [newExamTitle, setNewExamTitle] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [settings, setSettings] = useState<ExamSessionSettings>(DEFAULT_EXAM_SESSION_SETTINGS);
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
    if (source === "exam" && !examId) {
      setError(tr("Chọn một đề thi làm mẫu cho kỳ thi."));
      return;
    }

    const content =
      source === "exam"
        ? { exam_id: Number(examId) }
        : {
            question_ids: questions.map((question) => question.id),
            duration_minutes: durationMinutes,
            ...(newExamTitle.trim() ? { new_exam_title: newExamTitle.trim() } : {})
          };

    setIsSubmitting(true);
    try {
      const response = await api.post<{ data: { id: number } }>("/exam-sessions", {
        title,
        ...content,
        // Zone-aware ISO strings: the bare local value would be read as UTC by the server.
        start_at: fromDatetimeLocal(startAt),
        end_at: fromDatetimeLocal(endAt),
        department_id: departmentId ? Number(departmentId) : null,
        ...settings
      });
      showToast(tr("Đã lưu kỳ thi mới."));
      router.push(`/dashboard/exam-sessions/${response.data.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : tr("Không thể tạo kỳ thi."));
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
            {tr("Danh sách kỳ thi")}
          </Link>
          <p className="eyebrow">{tr("Lịch thi")}</p>
          <h1>{tr("Tạo kỳ thi mới")}</h1>
        </div>
      </header>

      <form onSubmit={handleSubmit}>
        <section className="panel" style={{ maxWidth: 560 }}>
          {error ? <div className="formError" style={{ marginBottom: 14 }}>{error}</div> : null}
          <label className="field">
            <span>{tr("Tên kỳ thi")}</span>
            <input value={title} onChange={(event) => setTitle(event.target.value)} required placeholder={tr("VD: Kiểm tra giữa kỳ - Ca 1")} autoFocus />
          </label>
          <div style={{ marginTop: 14 }}>
            <DepartmentSelect value={departmentId} onChange={setDepartmentId} label={tr("Khoa (người duyệt kỳ thi được xác định theo khoa)")} />
          </div>

          <div className="field" style={{ marginTop: 14 }}>
            <span>{tr("Nội dung đề thi")}</span>
            <div className="segmentGroup" role="tablist" aria-label={tr("Nguồn đề thi")}>
              <button type="button" className={source === "exam" ? "segment active" : "segment"} onClick={() => setSource("exam")}>
                {tr("Dùng đề thi có sẵn")}
              </button>
              <button type="button" className={source === "manual" ? "segment active" : "segment"} onClick={() => setSource("manual")}>
                {tr("Chọn câu hỏi thủ công")}
              </button>
            </div>
            <small className="avatarHint" style={{ fontWeight: 500 }}>
              {source === "exam"
                ? tr("Sau khi tạo vẫn chỉnh được đề cho riêng kỳ thi này (thêm/bớt câu, đổi điểm, thời gian); đề mẫu gốc không bị thay đổi.")
                : tr("Có thể chọn ngay bây giờ hoặc tạo kỳ thi trống rồi thêm câu hỏi sau ở tab “Đề thi”.")}
            </small>
          </div>

          {source === "exam" ? (
            <label className="field" style={{ marginTop: 14 }}>
              <span>{tr("Đề thi")}</span>
              <select value={examId} onChange={(event) => setExamId(event.target.value)}>
                <option value="">{tr("-- Chọn đề thi --")}</option>
                {exams.map((exam) => (
                  <option key={exam.id} value={exam.id}>
                    {exam.title} ({exam.question_count} {tr("câu)")}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <div className="controlRow" style={{ marginTop: 14 }}>
              <label className="field compact">
                <span>{tr("Thời gian làm bài (phút)")}</span>
                <input
                  type="number"
                  min={1}
                  max={600}
                  value={durationMinutes}
                  onChange={(event) => setDurationMinutes(Math.max(1, Number(event.target.value) || 1))}
                />
              </label>
              <label className="field compact">
                <span>{tr("Tên đề thi (tuỳ chọn)")}</span>
                <input value={newExamTitle} onChange={(event) => setNewExamTitle(event.target.value)} placeholder={tr("Mặc định: tên kỳ thi")} />
              </label>
            </div>
          )}

          <ScheduleFields
            startAt={startAt}
            endAt={endAt}
            onChange={(value) => {
              setStartAt(value.startAt);
              setEndAt(value.endAt);
            }}
          />
          <ExamSessionSettingsFields value={settings} onChange={setSettings} />
        </section>

        {source === "manual" ? (
          <section className="panel" style={{ marginTop: 16 }}>
            <div className="panelHeader">
              <div>
                <p className="eyebrow">{tr("Câu hỏi")}</p>
                <h2>{tr("Chọn câu hỏi từ ngân hàng (")}{questions.length} {tr("đã chọn)")}</h2>
              </div>
            </div>
            <QuestionPicker selected={questions} onChange={setQuestions} />

            {questions.length > 0 ? (
              <div style={{ marginTop: 16 }}>
                <p className="sideTitle">{tr("Thứ tự câu trong đề")}</p>
                <div className="scrollArea" style={{ maxHeight: 220, minHeight: 0 }}>
                  <div className="questionList">
                    {questions.map((question, index) => (
                      <div className="questionItem" key={question.id}>
                        <div>
                          <strong>
                            {index + 1}. {question.question_text}
                          </strong>
                          <span>{question.topic_name ?? tr("Không thuộc chủ đề")}</span>
                        </div>
                        <button
                          type="button"
                          className="linkButton"
                          title={tr("Bỏ câu này")}
                          onClick={() => setQuestions((current) => current.filter((item) => item.id !== question.id))}
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </section>
        ) : null}

        <div className="stickyActions">
          {source === "manual" ? (
            <span>
              <ListChecks size={16} /> {tr("Đã chọn")} <strong>{questions.length}</strong> {tr("câu ·")} {durationMinutes} {tr("phút")}
            </span>
          ) : (
            <span />
          )}
          <button className="primaryButton" type="submit" disabled={isSubmitting}>
            <Save size={16} />
            {isSubmitting ? tr("Đang lưu...") : tr("Lưu kỳ thi")}
          </button>
        </div>
      </form>
    </>
  );
}
