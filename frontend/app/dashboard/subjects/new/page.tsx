"use client";


import { tr } from "../../../../lib/i18n";
import { useState } from "react";
import Link from "@/components/RoleLink";
import { useRouter } from "@/lib/use-role-router";
import { ArrowLeft, Save } from "lucide-react";
import { api, ApiError } from "../../../../lib/api-client";
import { useToast } from "../../../../lib/toast";

export default function NewSubjectPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await api.post("/subjects", { name, description: description || null });
      showToast(tr("Đã lưu môn học mới."));
      router.push("/dashboard/subjects");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : tr("Không thể tạo môn học."));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <header className="topbar">
        <div>
          <Link className="approveButton" href="/dashboard/subjects" style={{ marginBottom: 10 }}>
            <ArrowLeft size={16} />
            {tr("Danh sách môn học")}
          </Link>
          <p className="eyebrow">{tr("Môn học")}</p>
          <h1>{tr("Tạo môn học mới")}</h1>
        </div>
      </header>

      <section className="panel" style={{ maxWidth: 560 }}>
        <form onSubmit={handleSubmit}>
          {error ? <div className="formError" style={{ marginBottom: 14 }}>{error}</div> : null}
          <label className="field">
            <span>{tr("Tên môn học")}</span>
            <input value={name} onChange={(event) => setName(event.target.value)} required autoFocus />
          </label>
          <label className="field" style={{ marginTop: 14 }}>
            <span>{tr("Mô tả")}</span>
            <textarea className="textarea" value={description} onChange={(event) => setDescription(event.target.value)} />
          </label>
          <button className="primaryButton" type="submit" style={{ marginTop: 18 }} disabled={isSubmitting}>
            <Save size={16} />
            {isSubmitting ? tr("Đang lưu...") : tr("Lưu môn học")}
          </button>
        </form>
      </section>
    </>
  );
}
