"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import { api, ApiError } from "../../../../../lib/api-client";
import { useToast } from "../../../../../lib/toast";
import type { Subject } from "../../../../../lib/types";

export default function EditSubjectPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { showToast } = useToast();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const response = await api.get<{ data: Subject }>(`/subjects/${params.id}`);
        setName(response.data.name);
        setDescription(response.data.description ?? "");
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
      await api.patch(`/subjects/${params.id}`, { name, description: description || null });
      showToast("Đã lưu thay đổi môn học.");
      router.push("/dashboard/subjects");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không thể lưu môn học.");
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
          <Link className="approveButton" href="/dashboard/subjects" style={{ marginBottom: 10 }}>
            <ArrowLeft size={16} />
            Danh sách môn học
          </Link>
          <p className="eyebrow">Môn học</p>
          <h1>Sửa môn học</h1>
        </div>
      </header>

      <section className="panel" style={{ maxWidth: 560 }}>
        <form onSubmit={handleSubmit}>
          {error ? <div className="formError" style={{ marginBottom: 14 }}>{error}</div> : null}
          <label className="field">
            <span>Tên môn học</span>
            <input value={name} onChange={(event) => setName(event.target.value)} required autoFocus />
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
