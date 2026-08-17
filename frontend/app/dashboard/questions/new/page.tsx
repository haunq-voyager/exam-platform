"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { api, ApiError } from "../../../../lib/api-client";
import { useToast } from "../../../../lib/toast";
import { QuestionForm, type QuestionFormState } from "../../../../components/QuestionForm";
import type { Topic } from "../../../../lib/types";

export default function NewQuestionPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const response = await api.get<{ data: Topic[] }>("/topics", { per_page: 100 });
      setTopics(response.data);
    }
    load();
  }, []);

  async function handleSubmit(form: QuestionFormState) {
    setError(null);
    try {
      await api.post("/questions", {
        topic_id: form.topic_id ? Number(form.topic_id) : null,
        question_type: form.question_type,
        difficulty: form.difficulty,
        question_text: form.question_text,
        options: form.options,
        correct_answer: form.correct_answer,
        explanation: form.explanation || null
      });
      showToast("Đã lưu câu hỏi mới.");
      router.push("/dashboard/questions");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không thể tạo câu hỏi.");
    }
  }

  return (
    <>
      <header className="topbar">
        <div>
          <Link className="approveButton" href="/dashboard/questions" style={{ marginBottom: 10 }}>
            <ArrowLeft size={16} />
            Danh sách câu hỏi
          </Link>
          <p className="eyebrow">Ngân hàng câu hỏi</p>
          <h1>Thêm câu hỏi mới</h1>
        </div>
      </header>

      <section className="panel" style={{ maxWidth: 720 }}>
        <QuestionForm topics={topics} submitLabel="Lưu câu hỏi" submittingLabel="Đang lưu..." onSubmit={handleSubmit} error={error} />
      </section>
    </>
  );
}
