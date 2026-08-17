"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, ClipboardList, GraduationCap, Play, Plus, Square, Trash2, Users } from "lucide-react";
import { api, ApiError } from "../../../../lib/api-client";
import { ConfirmDialog } from "../../../../components/ConfirmDialog";
import { useToast } from "../../../../lib/toast";
import { ATTEMPT_STATUS_LABEL, EXAM_STATUS_LABEL, statusLabel } from "../../../../lib/status-labels";
import type { ExamAttempt, ExamSession, User } from "../../../../lib/types";

const STATUS_BADGE: Record<string, string> = { draft: "blue", scheduled: "amber", open: "green", closed: "red" };

type TabKey = "students" | "teachers" | "results";

export default function ExamSessionDetailPage() {
  const params = useParams<{ id: string }>();
  const sessionId = params.id;
  const { showToast } = useToast();

  const [session, setSession] = useState<ExamSession | null>(null);
  const [students, setStudents] = useState<User[]>([]);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [attempts, setAttempts] = useState<ExamAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const [publishConfirmOpen, setPublishConfirmOpen] = useState(false);
  const [closeConfirmOpen, setCloseConfirmOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("students");

  async function load() {
    setLoading(true);
    try {
      const [sessionResponse, studentsResponse, teachersResponse, attemptsResponse] = await Promise.all([
        api.get<{ data: ExamSession }>(`/exam-sessions/${sessionId}`),
        api.get<{ data: User[] }>("/users", { role: "student", per_page: 100 }),
        api.get<{ data: User[] }>("/users", { role: "teacher", per_page: 100 }),
        api.get<{ data: ExamAttempt[] }>(`/exam-sessions/${sessionId}/attempts`)
      ]);
      setSession(sessionResponse.data);
      setStudents(studentsResponse.data);
      setTeachers(teachersResponse.data);
      setAttempts(attemptsResponse.data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không thể tải chi tiết kỳ thi.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  async function handleAssignStudent(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!selectedStudentId) return;
    try {
      await api.post(`/exam-sessions/${sessionId}/assignments`, { student_id: Number(selectedStudentId) });
      setSelectedStudentId("");
      showToast("Đã gán thí sinh vào kỳ thi.");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không thể gán thí sinh.");
    }
  }

  async function handleUnassign(assignmentId: number) {
    await api.delete(`/exam-sessions/${sessionId}/assignments/${assignmentId}`);
    showToast("Đã bỏ gán thí sinh.");
    await load();
  }

  async function handleAssignTeacher(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!selectedTeacherId) return;
    try {
      await api.post(`/exam-sessions/${sessionId}/teachers`, { teacher_id: Number(selectedTeacherId) });
      setSelectedTeacherId("");
      showToast("Đã gán giảng viên phụ trách.");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không thể gán giảng viên.");
    }
  }

  async function handleRemoveTeacher(teacherId: number) {
    await api.delete(`/exam-sessions/${sessionId}/teachers/${teacherId}`);
    showToast("Đã bỏ giảng viên phụ trách.");
    await load();
  }

  async function handlePublish() {
    setIsProcessing(true);
    try {
      await api.post(`/exam-sessions/${sessionId}/publish`);
      showToast("Đã mở kỳ thi.");
      setPublishConfirmOpen(false);
      await load();
    } catch {
      showToast("Không thể mở kỳ thi.", "error");
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleClose() {
    setIsProcessing(true);
    try {
      await api.post(`/exam-sessions/${sessionId}/close`);
      showToast("Đã đóng kỳ thi.");
      setCloseConfirmOpen(false);
      await load();
    } catch {
      showToast("Không thể đóng kỳ thi.", "error");
    } finally {
      setIsProcessing(false);
    }
  }

  if (loading) {
    return <div className="emptyState">Đang tải...</div>;
  }

  if (!session) {
    return <div className="emptyState">{error ?? "Không thể tải chi tiết kỳ thi."}</div>;
  }

  const assignedStudentIds = new Set(session.assignments?.map((item) => item.student_id));
  const assignedTeacherIds = new Set(session.teachers?.map((item) => item.id));
  const selectableStudents = students.filter((student) => !assignedStudentIds.has(student.id));
  const selectableTeachers = teachers.filter((teacher) => !assignedTeacherIds.has(teacher.id));

  return (
    <>
      <header className="topbar">
        <div>
          <Link className="approveButton" href="/dashboard/exam-sessions" style={{ marginBottom: 10 }}>
            <ArrowLeft size={16} />
            Danh sách kỳ thi
          </Link>
          <p className="eyebrow">Quản lý kỳ thi</p>
          <h1>{session.title}</h1>
        </div>
        <div className="topActions">
          {session.status !== "open" ? (
            <button className="primaryButton" onClick={() => setPublishConfirmOpen(true)}>
              <Play size={18} />
              Mở kỳ thi
            </button>
          ) : (
            <button className="dangerButton" onClick={() => setCloseConfirmOpen(true)}>
              <Square size={16} />
              Đóng kỳ thi
            </button>
          )}
        </div>
      </header>

      {error ? <div className="formError" style={{ marginBottom: 14 }}>{error}</div> : null}

      <section className="roleBand">
        <div>
          <span>
            <span className={`badge ${STATUS_BADGE[session.status]}`}>{statusLabel(EXAM_STATUS_LABEL, session.status)}</span>
            {" · "}Đề thi: {session.exam_title}
          </span>
          <h2>{session.question_count ?? 0} câu hỏi</h2>
          <p>
            {session.start_at ? `Bắt đầu: ${new Date(session.start_at).toLocaleString("vi-VN")}` : "Chưa đặt lịch bắt đầu"}
            {session.end_at ? ` · Kết thúc: ${new Date(session.end_at).toLocaleString("vi-VN")}` : ""}
          </p>
        </div>
      </section>

      <div className="tabBar">
        <button className={activeTab === "students" ? "tabButton active" : "tabButton"} onClick={() => setActiveTab("students")}>
          <GraduationCap size={16} />
          Thí sinh ({session.assignments?.length ?? 0})
        </button>
        <button className={activeTab === "teachers" ? "tabButton active" : "tabButton"} onClick={() => setActiveTab("teachers")}>
          <Users size={16} />
          Giảng viên ({session.teachers?.length ?? 0})
        </button>
        <button className={activeTab === "results" ? "tabButton active" : "tabButton"} onClick={() => setActiveTab("results")}>
          <ClipboardList size={16} />
          Kết quả ({attempts.length})
        </button>
      </div>

      {activeTab === "students" ? (
        <section className="panel">
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

          {(session.assignments ?? []).length === 0 ? (
            <div className="emptyState">Chưa gán thí sinh nào.</div>
          ) : (
            <div className="questionList">
              {(session.assignments ?? []).map((item) => (
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
          )}
        </section>
      ) : null}

      {activeTab === "teachers" ? (
        <section className="panel">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">Giảng viên</p>
              <h2>Giảng viên phụ trách</h2>
            </div>
          </div>
          <form onSubmit={handleAssignTeacher} className="controlRow">
            <label className="field wide">
              <span>Chọn giảng viên</span>
              <select value={selectedTeacherId} onChange={(event) => setSelectedTeacherId(event.target.value)}>
                <option value="">-- Chọn giảng viên --</option>
                {selectableTeachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.name} ({teacher.email})
                  </option>
                ))}
              </select>
            </label>
            <button className="primaryButton" type="submit" disabled={!selectedTeacherId}>
              <Plus size={16} />
              Gán
            </button>
          </form>

          {(session.teachers ?? []).length === 0 ? (
            <div className="emptyState">Chưa gán giảng viên nào.</div>
          ) : (
            <div className="questionList">
              {(session.teachers ?? []).map((item) => (
                <div className="questionItem" key={item.id}>
                  <div>
                    <strong>{item.name}</strong>
                    <span>{item.email}</span>
                  </div>
                  <button className="linkButton" onClick={() => handleRemoveTeacher(item.id)}>
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {activeTab === "results" ? (
        <section className="panel">
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
                    <td>{attempt.score !== null ? `${attempt.score} / ${attempt.total_points}` : "—"}</td>
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
      ) : null}

      <ConfirmDialog
        open={publishConfirmOpen}
        title="Mở kỳ thi?"
        description={`Mở "${session.title}" cho thí sinh được gán vào làm bài ngay?`}
        confirmLabel="Mở kỳ thi"
        loading={isProcessing}
        onCancel={() => setPublishConfirmOpen(false)}
        onConfirm={handlePublish}
      />

      <ConfirmDialog
        open={closeConfirmOpen}
        title="Đóng kỳ thi?"
        description={`Đóng "${session.title}"? Thí sinh sẽ không thể bắt đầu làm bài mới sau khi đóng.`}
        confirmLabel="Đóng kỳ thi"
        danger
        loading={isProcessing}
        onCancel={() => setCloseConfirmOpen(false)}
        onConfirm={handleClose}
      />
    </>
  );
}
