"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import { api, ApiError } from "../../../../../lib/api-client";
import { useToast } from "../../../../../lib/toast";
import type { Subject, Topic } from "../../../../../lib/types";

export default function EditTopicPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { showToast } = useToast();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectId, setSubjectId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [topicResponse, subjectsResponse] = await Promise.all([
          api.get<{ data: Topic }>(`/topics/${params.id}`),
          api.get<{ data: Subject[] }>("/subjects", { per_page: 100 })
        ]);
        setSubjectId(String(topicResponse.data.subject_id));
        setName(topicResponse.data.name);
        setDescription(topicResponse.data.description ?? "");
        setSubjects(subjectsResponse.data);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [params.id]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await api.patch(`/topics/${params.id}`, { subject_id: Number(subjectId), name, description: description || null });
      showToast("Đã lưu thay đổi chủ đề.");
      router.push("/dashboard/topics");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không thể lưu chủ đề.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (loading) {
    return <div className="emptyState">Đang tải...</div>;
  }

  return (
    <>
      <header className="topbar">
        <div>
          <Link className="approveButton" href="/dashboard/topics" style={{ marginBottom: 10 }}>
            <ArrowLeft size={16} />
            Danh sách chủ đề
          </Link>
          <p className="eyebrow">Chủ đề</p>
          <h1>Sửa chủ đề</h1>
        </div>
      </header>

      <section className="panel" style={{ maxWidth: 560 }}>
        <form onSubmit={handleSubmit}>
          {error ? <div className="formError" style={{ marginBottom: 14 }}>{error}</div> : null}
          <label className="field">
            <span>Môn học</span>
            <select value={subjectId} onChange={(event) => setSubjectId(event.target.value)} required>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field" style={{ marginTop: 14 }}>
            <span>Tên chủ đề</span>
            <input value={name} onChange={(event) => setName(event.target.value)} required />
          </label>
          <label className="field" style={{ marginTop: 14 }}>
            <span>Mô tả</span>
            <textarea className="textarea" value={description} onChange={(event) => setDescription(event.target.value)} />
          </label>
          <button className="primaryButton" type="submit" style={{ marginTop: 18 }} disabled={isSubmitting}>
            <Save size={16} />
            {isSubmitting ? "Đang lưu..." : "Lưu thay đổi"}
          </button>
        </form>
      </section>
    </>
  );
}
