"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, PenLine, Sparkles } from "lucide-react";
import { api, ApiError } from "../../../../lib/api-client";
import { useToast } from "../../../../lib/toast";
import { QuestionForm, type QuestionFormState } from "../../../../components/QuestionForm";
import { REVIEW_STATUS_LABEL, statusLabel } from "../../../../lib/status-labels";
import type { AiGeneration, Difficulty, Subject, Topic } from "../../../../lib/types";

type Mode = "manual" | "ai";

export default function NewQuestionPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [mode, setMode] = useState<Mode>("manual");
  const [topics, setTopics] = useState<Topic[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.get<{ data: Topic[] }>("/topics", { per_page: 100 }), api.get<{ data: Subject[] }>("/subjects", { per_page: 100 })]).then(
      ([topicsResponse, subjectsResponse]) => {
        setTopics(topicsResponse.data);
        setSubjects(subjectsResponse.data);
      }
    );
  }, []);

  async function handleManualSubmit(form: QuestionFormState) {
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

      <div className="tabBar">
        <button className={mode === "manual" ? "tabButton active" : "tabButton"} onClick={() => setMode("manual")}>
          <PenLine size={16} />
          Nhập thủ công
        </button>
        <button className={mode === "ai" ? "tabButton active" : "tabButton"} onClick={() => setMode("ai")}>
          <Sparkles size={16} />
          Sinh bằng AI
        </button>
      </div>

      {mode === "manual" ? (
        <section className="panel" style={{ maxWidth: 720 }}>
          <QuestionForm topics={topics} submitLabel="Lưu câu hỏi" submittingLabel="Đang lưu..." onSubmit={handleManualSubmit} error={error} />
        </section>
      ) : (
        <AiGenerateSection topics={topics} subjects={subjects} />
      )}
    </>
  );
}

function AiGenerateSection({ topics, subjects }: { topics: Topic[]; subjects: Subject[] }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [subjectId, setSubjectId] = useState("");
  const [topicId, setTopicId] = useState("");
  const [prompt, setPrompt] = useState("");
  const [questionCount, setQuestionCount] = useState(5);
  const [difficulty, setDifficulty] = useState<Difficulty | "">("");
  const [generation, setGeneration] = useState<AiGeneration | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filteredTopics = subjectId ? topics.filter((topic) => topic.subject_id === Number(subjectId)) : topics;

  async function handleGenerate(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setIsGenerating(true);
    try {
      const response = await api.post<{ data: AiGeneration }>("/ai/question-generations", {
        subject_id: subjectId ? Number(subjectId) : null,
        topic_id: topicId ? Number(topicId) : null,
        prompt,
        question_count: questionCount,
        difficulty: difficulty || null
      });
      setGeneration(response.data);
      setSelectedIds(new Set(response.data.generated_questions.map((question) => question.id)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không thể sinh câu hỏi lúc này.");
    } finally {
      setIsGenerating(false);
    }
  }

  function toggleSelected(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSaveSelected() {
    if (!generation) return;
    setError(null);
    setIsSaving(true);
    try {
      const rejectedIds = generation.generated_questions.map((question) => question.id).filter((id) => !selectedIds.has(id));

      if (selectedIds.size > 0) {
        await api.post(`/ai/question-generations/${generation.id}/approve`, {
          generated_question_ids: Array.from(selectedIds)
        });
      }
      if (rejectedIds.length > 0) {
        await api.post(`/ai/question-generations/${generation.id}/reject`, {
          generated_question_ids: rejectedIds
        });
      }

      showToast(`Đã thêm ${selectedIds.size} câu hỏi vào ngân hàng câu hỏi.`);
      router.push("/dashboard/questions");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không thể lưu câu hỏi đã chọn.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="contentGrid">
      <article className="panel aiPanel">
        <div className="panelHeader">
          <div>
            <p className="eyebrow">Yêu cầu sinh câu hỏi</p>
            <h2>Cấu hình</h2>
          </div>
          <Sparkles size={22} />
        </div>

        <form onSubmit={handleGenerate}>
          {error ? <div className="formError" style={{ marginBottom: 12 }}>{error}</div> : null}
          <div className="controlRow" style={{ flexWrap: "wrap" }}>
            <label className="field compact" style={{ width: 170 }}>
              <span>Môn học</span>
              <select
                value={subjectId}
                onChange={(event) => {
                  setSubjectId(event.target.value);
                  setTopicId("");
                }}
              >
                <option value="">Không chọn</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field compact" style={{ width: 170 }}>
              <span>Chủ đề</span>
              <select value={topicId} onChange={(event) => setTopicId(event.target.value)}>
                <option value="">Không chọn</option>
                {filteredTopics.map((topic) => (
                  <option key={topic.id} value={topic.id}>
                    {topic.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="field">
            <span>Chủ đề / nội dung bài học</span>
            <textarea className="textarea" value={prompt} onChange={(event) => setPrompt(event.target.value)} required />
          </label>

          <div className="controlRow">
            <label className="field compact">
              <span>Số câu</span>
              <input
                type="number"
                min={1}
                max={10}
                value={questionCount}
                onChange={(event) => setQuestionCount(Number(event.target.value))}
              />
            </label>
            <label className="field compact">
              <span>Mức độ</span>
              <select value={difficulty} onChange={(event) => setDifficulty(event.target.value as Difficulty | "")}>
                <option value="">Kết hợp</option>
                <option value="easy">Dễ</option>
                <option value="medium">Trung bình</option>
                <option value="hard">Khó</option>
              </select>
            </label>
            <button className="primaryButton wide" type="submit" disabled={isGenerating}>
              <Sparkles size={18} />
              {isGenerating ? "Đang sinh..." : `Sinh ${questionCount} câu`}
            </button>
          </div>
        </form>

        <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
          Quy trình Human-in-the-loop: AI đề xuất câu hỏi, bạn chọn câu muốn giữ rồi lưu vào ngân hàng câu hỏi ở khung
          bên cạnh.{generation ? <> Nhà cung cấp AI: <strong>{generation.model}</strong>.</> : null}
        </p>
      </article>

      <article className="panel">
        <div className="panelHeader">
          <div>
            <p className="eyebrow">Kết quả</p>
            <h2>Chọn câu hỏi để lưu</h2>
          </div>
          {generation ? (
            <button className="primaryButton" onClick={handleSaveSelected} disabled={isSaving || selectedIds.size === 0}>
              {isSaving ? "Đang lưu..." : `Lưu ${selectedIds.size} câu đã chọn`}
            </button>
          ) : null}
        </div>

        {!generation ? (
          <div className="emptyState">Chưa có câu hỏi nào được sinh. Điền yêu cầu bên trái và bấm "Sinh câu hỏi".</div>
        ) : (
          <div className="questionList">
            {generation.generated_questions.map((question) => (
              <label className="questionItem" style={{ gridTemplateColumns: "auto 1fr auto" }} key={question.id}>
                <input type="checkbox" checked={selectedIds.has(question.id)} onChange={() => toggleSelected(question.id)} />
                <div>
                  <strong>{question.question_text}</strong>
                  <span>
                    {question.difficulty} · {question.options.join(" | ")} · Đáp án: {question.correct_answer.join(", ")}
                  </span>
                </div>
                <span className={`badge ${question.status === "approved" ? "green" : question.status === "rejected" ? "red" : "amber"}`}>
                  {statusLabel(REVIEW_STATUS_LABEL, question.status)}
                </span>
              </label>
            ))}
          </div>
        )}
      </article>
    </section>
  );
}
