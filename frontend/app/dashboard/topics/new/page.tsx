"use client";


import { tr } from "../../../../lib/i18n";
import { useEffect, useState } from "react";
import Link from "@/components/RoleLink";
import { useRouter } from "@/lib/use-role-router";
import { ArrowLeft, Save } from "lucide-react";
import { api, ApiError } from "../../../../lib/api-client";
import { useToast } from "../../../../lib/toast";
import type { Subject } from "../../../../lib/types";

export default function NewTopicPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectId, setSubjectId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function load() {
      const response = await api.get<{ data: Subject[] }>("/subjects", { per_page: 100 });
      setSubjects(response.data);
      if (response.data.length > 0) setSubjectId(String(response.data[0].id));
    }
    load();
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!subjectId) {
      setError(tr("Chọn môn học cho chủ đề."));
      return;
    }
    setIsSubmitting(true);
    try {
      await api.post("/topics", { subject_id: Number(subjectId), name, description: description || null });
      showToast(tr("Đã lưu chủ đề mới."));
      router.push("/dashboard/topics");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : tr("Không thể tạo chủ đề."));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <header className="topbar">
        <div>
          <Link className="approveButton" href="/dashboard/topics" style={{ marginBottom: 10 }}>
            <ArrowLeft size={16} />
            {tr("Danh sách chủ đề")}
          </Link>
          <p className="eyebrow">{tr("Chủ đề")}</p>
          <h1>{tr("Tạo chủ đề mới")}</h1>
        </div>
      </header>

      <section className="panel" style={{ maxWidth: 560 }}>
        <form onSubmit={handleSubmit}>
          {error ? <div className="formError" style={{ marginBottom: 14 }}>{error}</div> : null}
          <label className="field">
            <span>{tr("Môn học")}</span>
            <select value={subjectId} onChange={(event) => setSubjectId(event.target.value)} required>
              <option value="">{tr("-- Chọn môn học --")}</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field" style={{ marginTop: 14 }}>
            <span>{tr("Tên chủ đề")}</span>
            <input value={name} onChange={(event) => setName(event.target.value)} required />
          </label>
          <label className="field" style={{ marginTop: 14 }}>
            <span>{tr("Mô tả")}</span>
            <textarea className="textarea" value={description} onChange={(event) => setDescription(event.target.value)} />
          </label>
          <button className="primaryButton" type="submit" style={{ marginTop: 18 }} disabled={isSubmitting}>
            <Save size={16} />
            {isSubmitting ? tr("Đang lưu...") : tr("Lưu chủ đề")}
          </button>
        </form>
      </section>
    </>
  );
}
