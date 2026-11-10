"use client";


import { tr } from "../../../../../lib/i18n";
import { useEffect, useState } from "react";
import Link from "@/components/RoleLink";
import { useParams } from "next/navigation";
import { useRouter } from "@/lib/use-role-router";
import { ArrowLeft } from "lucide-react";
import { api, ApiError } from "../../../../../lib/api-client";
import { useToast } from "../../../../../lib/toast";
import { QuestionForm, type QuestionFormState } from "../../../../../components/QuestionForm";
import type { Question, Topic } from "../../../../../lib/types";

export default function EditQuestionPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { showToast } = useToast();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [initialValue, setInitialValue] = useState<QuestionFormState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [questionResponse, topicsResponse] = await Promise.all([
          api.get<{ data: Question }>(`/questions/${params.id}`),
          api.get<{ data: Topic[] }>("/topics", { per_page: 100 })
        ]);
        const question = questionResponse.data;
        setInitialValue({
          topic_id: question.topic_id ? String(question.topic_id) : "",
          question_type: question.question_type,
          difficulty: question.difficulty,
          question_text: question.question_text,
          options: question.options,
          correct_answer: question.correct_answer,
          explanation: question.explanation ?? ""
        });
        setTopics(topicsResponse.data);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [params.id]);

  async function handleSubmit(form: QuestionFormState) {
    setError(null);
    try {
      await api.patch(`/questions/${params.id}`, {
        topic_id: form.topic_id ? Number(form.topic_id) : null,
        question_type: form.question_type,
        difficulty: form.difficulty,
        question_text: form.question_text,
        options: form.options,
        correct_answer: form.correct_answer,
        explanation: form.explanation || null
      });
      showToast(tr("Đã lưu thay đổi câu hỏi."));
      router.push("/dashboard/questions");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : tr("Không thể lưu câu hỏi."));
    }
  }

  if (loading || !initialValue) {
    return <div className="emptyState">{tr("Đang tải...")}</div>;
  }

  return (
    <>
      <header className="topbar">
        <div>
          <Link className="approveButton" href="/dashboard/questions" style={{ marginBottom: 10 }}>
            <ArrowLeft size={16} />
            {tr("Danh sách câu hỏi")}
          </Link>
          <p className="eyebrow">{tr("Ngân hàng câu hỏi")}</p>
          <h1>{tr("Sửa câu hỏi")}</h1>
        </div>
      </header>

      <section className="panel" style={{ maxWidth: 720 }}>
        <QuestionForm
          topics={topics}
          initialValue={initialValue}
          submitLabel={tr("Lưu thay đổi")}
          submittingLabel={tr("Đang lưu...")}
          onSubmit={handleSubmit}
          error={error}
        />
      </section>
    </>
  );
}
