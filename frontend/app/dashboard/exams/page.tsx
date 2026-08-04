"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { api, ApiError } from "../../../lib/api-client";
import { EXAM_STATUS_LABEL, statusLabel } from "../../../lib/status-labels";
import type { Exam } from "../../../lib/types";

const STATUS_BADGE: Record<string, string> = { draft: "blue", scheduled: "amber", open: "green", closed: "red" };

export default function ExamsPage() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const response = await api.get<{ data: Exam[] }>("/exams");
      setExams(response.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await api.post("/exams", { title, description: description || null, duration_minutes: durationMinutes });
      setTitle("");
      setDescription("");
      setDurationMinutes(30);
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không thể tạo đề thi.");
    }
  }

  return (
    <>
      <header className="topbar">
        <div>
          <p className="eyebrow">Đề thi & kỳ thi</p>
          <h1>Danh sách đề thi</h1>
        </div>
        <button className="primaryButton" onClick={() => setShowForm((value) => !value)}>
          <Plus size={18} />
          Tạo đề thi
        </button>
      </header>

      {showForm ? (
        <section className="panel" style={{ marginBottom: 18 }}>
          <form onSubmit={handleCreate} className="controlRow" style={{ flexWrap: "wrap" }}>
            {error ? <div className="formError" style={{ width: "100%" }}>{error}</div> : null}
            <label className="field wide">
              <span>Tên đề thi</span>
              <input value={title} onChange={(event) => setTitle(event.target.value)} required />
            </label>
            <label className="field wide">
              <span>Mô tả</span>
              <input value={description} onChange={(event) => setDescription(event.target.value)} />
            </label>
            <label className="field compact">
              <span>Thời gian (phút)</span>
              <input type="number" min={1} value={durationMinutes} onChange={(event) => setDurationMinutes(Number(event.target.value))} />
            </label>
            <button className="primaryButton" type="submit">
              Tạo
            </button>
          </form>
        </section>
      ) : null}

      <section className="panel">
        {loading ? (
          <div className="emptyState">Đang tải...</div>
        ) : exams.length === 0 ? (
          <div className="emptyState">Chưa có đề thi nào.</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Tên đề thi</th>
                <th>Trạng thái</th>
                <th>Thời gian</th>
                <th>Số câu</th>
                <th>Thí sinh</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {exams.map((exam) => (
                <tr key={exam.id}>
                  <td>{exam.title}</td>
                  <td>
                    <span className={`badge ${STATUS_BADGE[exam.status]}`}>{statusLabel(EXAM_STATUS_LABEL, exam.status)}</span>
                  </td>
                  <td>{exam.duration_minutes} phút</td>
                  <td>{exam.question_count}</td>
                  <td>{exam.assigned_student_count}</td>
                  <td>
                    <Link className="linkButton" href={`/dashboard/exams/${exam.id}`}>
                      Quản lý
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
