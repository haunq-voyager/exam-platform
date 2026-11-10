"use client";


import { tr } from "../../../../lib/i18n";
import { useState } from "react";
import Link from "@/components/RoleLink";
import { useRouter } from "@/lib/use-role-router";
import { ArrowLeft, Save } from "lucide-react";
import { api, ApiError } from "../../../../lib/api-client";
import { useToast } from "../../../../lib/toast";

export default function NewExamPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const response = await api.post<{ data: { id: number } }>("/exams", {
        title,
        description: description || null,
        duration_minutes: durationMinutes
      });
      showToast(tr("Đã lưu đề thi mới."));
      router.push(`/dashboard/exams/${response.data.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : tr("Không thể tạo đề thi."));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <header className="topbar">
        <div>
          <Link className="approveButton" href="/dashboard/exams" style={{ marginBottom: 10 }}>
            <ArrowLeft size={16} />
            {tr("Danh sách đề thi")}
          </Link>
          <p className="eyebrow">{tr("Ngân hàng đề thi")}</p>
          <h1>{tr("Tạo đề thi mới")}</h1>
        </div>
      </header>

      <section className="panel" style={{ maxWidth: 560 }}>
        <form onSubmit={handleSubmit}>
          {error ? <div className="formError" style={{ marginBottom: 14 }}>{error}</div> : null}
          <label className="field">
            <span>{tr("Tên đề thi")}</span>
            <input value={title} onChange={(event) => setTitle(event.target.value)} required autoFocus />
          </label>
          <label className="field" style={{ marginTop: 14 }}>
            <span>{tr("Mô tả")}</span>
            <textarea className="textarea" value={description} onChange={(event) => setDescription(event.target.value)} />
          </label>
          <label className="field" style={{ marginTop: 14, maxWidth: 200 }}>
            <span>{tr("Thời gian (phút)")}</span>
            <input type="number" min={1} value={durationMinutes} onChange={(event) => setDurationMinutes(Number(event.target.value))} />
          </label>
          <button className="primaryButton" type="submit" style={{ marginTop: 18 }} disabled={isSubmitting}>
            <Save size={16} />
            {isSubmitting ? tr("Đang lưu...") : tr("Lưu đề thi")}
          </button>
        </form>
      </section>
    </>
  );
}
