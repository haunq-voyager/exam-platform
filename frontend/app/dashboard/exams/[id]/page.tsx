"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Play, Plus, Square, Trash2 } from "lucide-react";
import { api, ApiError } from "../../../../lib/api-client";
import { ATTEMPT_STATUS_LABEL, EXAM_STATUS_LABEL, statusLabel } from "../../../../lib/status-labels";
import type { Exam, ExamAttempt, Question, User } from "../../../../lib/types";

export default function ExamDetailPage() {
  const params = useParams<{ id: string }>();
  const examId = params.id;

  const [exam, setExam] = useState<Exam | null>(null);
  const [availableQuestions, setAvailableQuestions] = useState<Question[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [attempts, setAttempts] = useState<ExamAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedQuestionId, setSelectedQuestionId] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");

  async function load() {
    setLoading(true);
    try {
      const [examResponse, questionsResponse, usersResponse, attemptsResponse] = await Promise.all([
        api.get<{ data: Exam }>(`/exams/${examId}`),
        api.get<{ data: Question[] }>("/questions", { status: "approved", per_page: 100 }),
        api.get<{ data: User[] }>("/users", { role: "student" }),
        api.get<{ data: ExamAttempt[] }>(`/exams/${examId}/attempts`)
      ]);
      setExam(examResponse.data);
      setAvailableQuestions(questionsResponse.data);
      setStudents(usersResponse.data);
      setAttempts(attemptsResponse.data);
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
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không thể thêm câu hỏi.");
    }
  }

  async function handleRemoveQuestion(examQuestionId: number) {
    await api.delete(`/exams/${examId}/questions/${examQuestionId}`);
    await load();
  }

  async function handleAssignStudent(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!selectedStudentId) return;
    try {
      await api.post(`/exams/${examId}/assignments`, { student_id: Number(selectedStudentId) });
      setSelectedStudentId("");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không thể gán thí sinh.");
    }
  }

  async function handleUnassign(assignmentId: number) {
    await api.delete(`/exams/${examId}/assignments/${assignmentId}`);
    await load();
  }

  async function handlePublish() {
    await api.post(`/exams/${examId}/publish`);
    await load();
  }

  async function handleClose() {
    await api.post(`/exams/${examId}/close`);
    await load();
  }

  if (loading || !exam) {
    return <div className="emptyState">Đang tải...</div>;
  }

  const assignedQuestionIds = new Set(exam.questions?.map((item) => item.question_id));
  const assignedStudentIds = new Set(exam.assignments?.map((item) => item.student_id));
  const selectableQuestions = availableQuestions.filter((question) => !assignedQuestionIds.has(question.id));
  const selectableStudents = students.filter((student) => !assignedStudentIds.has(student.id));

  return (
    <>
      <header className="topbar">
        <div>
          <p className="eyebrow">Quản lý đề thi</p>
          <h1>{exam.title}</h1>
        </div>
        <div className="topActions">
          {exam.status !== "open" ? (
            <button className="primaryButton" onClick={handlePublish}>
              <Play size={18} />
              Mở đề thi
            </button>
          ) : (
            <button className="dangerButton" onClick={handleClose}>
              <Square size={16} />
              Đóng đề thi
            </button>
          )}
        </div>
      </header>

      {error ? <div className="formError" style={{ marginBottom: 14 }}>{error}</div> : null}

      <section className="roleBand">
        <div>
          <span>Trạng thái: {statusLabel(EXAM_STATUS_LABEL, exam.status)}</span>
          <h2>{exam.duration_minutes} phút · {exam.questions?.length ?? 0} câu hỏi</h2>
          <p>{exam.description}</p>
        </div>
      </section>

      <section className="contentGrid">
        <article className="panel">
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
        </article>

        <article className="panel">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">Thí sinh</p>
              <h2>Danh sách được gán</h2>
            </div>
          </div>
          <form onSubmit={handleAssignStudent} className="controlRow">
            <label className="field wide">
              <span>Chọn thí sinh</span>
              <select value={selectedStudentId} onChange={(event) => setSelectedStudentId(event.target.value)}>
                <option value="">-- Chọn thí sinh --</option>
                {selectableStudents.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.name} ({student.email})
                  </option>
                ))}
              </select>
            </label>
            <button className="primaryButton" type="submit" disabled={!selectedStudentId}>
              <Plus size={16} />
              Gán
            </button>
          </form>

          <div className="questionList">
            {(exam.assignments ?? []).map((item) => (
              <div className="questionItem" key={item.id}>
                <div>
                  <strong>{item.student_name}</strong>
                  <span>{item.student_email}</span>
                </div>
                <button className="linkButton" onClick={() => handleUnassign(item.id)}>
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="panel" style={{ marginTop: 18 }}>
        <div className="panelHeader">
          <div>
            <p className="eyebrow">Kết quả</p>
            <h2>Lượt làm bài</h2>
          </div>
        </div>
        {attempts.length === 0 ? (
          <div className="emptyState">Chưa có thí sinh nào làm bài.</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Thí sinh</th>
                <th>Trạng thái</th>
                <th>Điểm</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {attempts.map((attempt) => (
                <tr key={attempt.id}>
                  <td>{attempt.student_name}</td>
                  <td>
                    <span className="badge blue">{statusLabel(ATTEMPT_STATUS_LABEL, attempt.status)}</span>
                  </td>
                  <td>
                    {attempt.score !== null ? `${attempt.score} / ${attempt.total_points}` : "—"}
                  </td>
                  <td>
                    <Link className="linkButton" href={`/dashboard/attempts/${attempt.id}`}>
                      Xem chi tiết & cảnh báo
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
