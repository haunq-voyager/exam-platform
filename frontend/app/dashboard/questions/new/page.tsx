"use client";


import { tr } from "../../../../lib/i18n";
import { useEffect, useState } from "react";
import Link from "@/components/RoleLink";
import { useRouter } from "@/lib/use-role-router";
import { ArrowLeft, PenLine, Sparkles } from "lucide-react";
import { api, ApiError } from "../../../../lib/api-client";
import { useToast } from "../../../../lib/toast";
import { QuestionForm, type QuestionFormState } from "../../../../components/QuestionForm";
import { ClientTable } from "../../../../components/ClientTable";
import { REVIEW_STATUS_LABEL, statusLabel } from "../../../../lib/status-labels";
import type { AiGeneration, Difficulty, Subject, Topic } from "../../../../lib/types";

const DIFFICULTY_LABEL: Record<string, string> = { get easy() { return tr("Dễ"); }, get medium() { return tr("Trung bình"); }, get hard() { return tr("Khó"); } };

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
      showToast(tr("Đã lưu câu hỏi mới."));
      router.push("/dashboard/questions");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : tr("Không thể tạo câu hỏi."));
    }
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
          <h1>{tr("Thêm câu hỏi mới")}</h1>
        </div>
      </header>

      <div className="tabBar">
        <button className={mode === "manual" ? "tabButton active" : "tabButton"} onClick={() => setMode("manual")}>
          <PenLine size={16} />
          {tr("Nhập thủ công")}
        </button>
        <button className={mode === "ai" ? "tabButton active" : "tabButton"} onClick={() => setMode("ai")}>
          <Sparkles size={16} />
          {tr("Sinh bằng AI")}
        </button>
      </div>

      {mode === "manual" ? (
        <section className="panel" style={{ maxWidth: 720 }}>
          <QuestionForm topics={topics} submitLabel={tr("Lưu câu hỏi")} submittingLabel={tr("Đang lưu...")} onSubmit={handleManualSubmit} error={error} />
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
      setError(err instanceof ApiError ? err.message : tr("Không thể sinh câu hỏi lúc này."));
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

      showToast(tr("Đã thêm {0} câu hỏi vào ngân hàng câu hỏi.", selectedIds.size));
      router.push("/dashboard/questions");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : tr("Không thể lưu câu hỏi đã chọn."));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="contentGrid">
      <article className="panel aiPanel">
        <div className="panelHeader">
          <div>
            <p className="eyebrow">{tr("Yêu cầu sinh câu hỏi")}</p>
            <h2>{tr("Cấu hình")}</h2>
          </div>
          <Sparkles size={22} />
        </div>

        <form onSubmit={handleGenerate}>
          {error ? <div className="formError" style={{ marginBottom: 12 }}>{error}</div> : null}
          <div className="controlRow" style={{ flexWrap: "wrap" }}>
            <label className="field compact" style={{ width: 170 }}>
              <span>{tr("Môn học")}</span>
              <select
                value={subjectId}
                onChange={(event) => {
                  setSubjectId(event.target.value);
                  setTopicId("");
                }}
              >
                <option value="">{tr("Không chọn")}</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field compact" style={{ width: 170 }}>
              <span>{tr("Chủ đề")}</span>
              <select value={topicId} onChange={(event) => setTopicId(event.target.value)}>
                <option value="">{tr("Không chọn")}</option>
                {filteredTopics.map((topic) => (
                  <option key={topic.id} value={topic.id}>
                    {topic.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="field">
            <span>{tr("Chủ đề / nội dung bài học")}</span>
            <textarea className="textarea" value={prompt} onChange={(event) => setPrompt(event.target.value)} required />
          </label>

          <div className="controlRow">
            <label className="field compact">
              <span>{tr("Số câu")}</span>
              <input
                type="number"
                min={1}
                max={10}
                value={questionCount}
                onChange={(event) => setQuestionCount(Number(event.target.value))}
              />
            </label>
            <label className="field compact">
              <span>{tr("Mức độ")}</span>
              <select value={difficulty} onChange={(event) => setDifficulty(event.target.value as Difficulty | "")}>
                <option value="">{tr("Kết hợp")}</option>
                <option value="easy">{tr("Dễ")}</option>
                <option value="medium">{tr("Trung bình")}</option>
                <option value="hard">{tr("Khó")}</option>
              </select>
            </label>
            <button className="primaryButton wide" type="submit" disabled={isGenerating}>
              <Sparkles size={18} />
              {isGenerating ? tr("Đang sinh...") : tr("Sinh {0} câu", questionCount)}
            </button>
          </div>
        </form>

        <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
          {tr("Quy trình Human-in-the-loop: AI đề xuất câu hỏi, bạn chọn câu muốn giữ rồi lưu vào ngân hàng câu hỏi ở khung bên cạnh.")}{generation ? <> {tr("Nhà cung cấp AI:")} <strong>{generation.model}</strong>.</> : null}
        </p>
      </article>

      <article className="panel">
        <div className="panelHeader">
          <div>
            <p className="eyebrow">{tr("Kết quả")}</p>
            <h2>{tr("Chọn câu hỏi để lưu")}</h2>
          </div>
          {generation ? (
            <button className="primaryButton" onClick={handleSaveSelected} disabled={isSaving || selectedIds.size === 0}>
              {isSaving ? tr("Đang lưu...") : tr("Lưu {0} câu đã chọn", selectedIds.size)}
            </button>
          ) : null}
        </div>

        {!generation ? (
          <div className="emptyState">{tr("Chưa có câu hỏi nào được sinh. Điền yêu cầu bên trái và bấm \"Sinh câu hỏi\".")}</div>
        ) : (
          <ClientTable
            rows={generation.generated_questions}
            rowKey={(question) => question.id}
            searchText={(question) => question.question_text}
            searchPlaceholder={tr("Tìm câu hỏi đã sinh...")}
            columns={[
              {
                key: "select",
                header: "",
                width: "44px",
                render: (question) => (
                  <input type="checkbox" checked={selectedIds.has(question.id)} onChange={() => toggleSelected(question.id)} aria-label={tr("Chọn câu hỏi")} />
                )
              },
              {
                key: "question",
                header: tr("Câu hỏi"),
                width: "380px",
                render: (question) => (
                  <div>
                    <strong>{question.question_text}</strong>
                    <div className="reviewEmpty" style={{ margin: 0 }}>{question.options.join(" | ")}</div>
                  </div>
                )
              },
              { key: "difficulty", header: tr("Độ khó"), width: "110px", render: (question) => DIFFICULTY_LABEL[question.difficulty] ?? question.difficulty },
              { key: "answer", header: tr("Đáp án"), width: "140px", render: (question) => question.correct_answer.join(", ") },
              {
                key: "status",
                header: tr("Trạng thái"),
                width: "130px",
                render: (question) => (
                  <span className={`badge ${question.status === "approved" ? "green" : question.status === "rejected" ? "red" : "amber"}`}>
                    {statusLabel(REVIEW_STATUS_LABEL, question.status)}
                  </span>
                )
              }
            ]}
          />
        )}
      </article>
    </section>
  );
}
