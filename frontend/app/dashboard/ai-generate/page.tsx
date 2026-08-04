"use client";

import { useEffect, useState } from "react";
import { Check, Sparkles, X } from "lucide-react";
import { api, ApiError } from "../../../lib/api-client";
import { REVIEW_STATUS_LABEL, statusLabel } from "../../../lib/status-labels";
import type { AiGeneration, Difficulty, Subject, Topic } from "../../../lib/types";

export default function AiGeneratePage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [subjectId, setSubjectId] = useState("");
  const [topicId, setTopicId] = useState("");
  const [prompt, setPrompt] = useState("");
  const [questionCount, setQuestionCount] = useState(5);
  const [difficulty, setDifficulty] = useState<Difficulty | "">("");
  const [generation, setGeneration] = useState<AiGeneration | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.get<{ data: Subject[] }>("/subjects"), api.get<{ data: Topic[] }>("/topics")]).then(
      ([subjectsResponse, topicsResponse]) => {
        setSubjects(subjectsResponse.data);
        setTopics(topicsResponse.data);
      }
    );
  }, []);

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
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không thể sinh câu hỏi lúc này.");
    } finally {
      setIsGenerating(false);
    }
  }

  async function refreshGeneration(id: number) {
    const response = await api.get<{ data: AiGeneration }>(`/ai/question-generations/${id}`);
    setGeneration(response.data);
  }

  async function handleApprove(generatedQuestionId?: number) {
    if (!generation) return;
    await api.post(`/ai/question-generations/${generation.id}/approve`, {
      generated_question_ids: generatedQuestionId ? [generatedQuestionId] : null
    });
    await refreshGeneration(generation.id);
  }

  async function handleReject(generatedQuestionId?: number) {
    if (!generation) return;
    await api.post(`/ai/question-generations/${generation.id}/reject`, {
      generated_question_ids: generatedQuestionId ? [generatedQuestionId] : null
    });
    await refreshGeneration(generation.id);
  }

  const pendingCount = generation?.generated_questions.filter((question) => question.status === "pending").length ?? 0;

  return (
    <>
      <header className="topbar">
        <div>
          <p className="eyebrow">AI tạo câu hỏi · Human-in-the-loop</p>
          <h1>Sinh câu hỏi bằng AI</h1>
        </div>
      </header>

      <div className="formError" style={{ marginBottom: 18, background: "#eef2ef", color: "var(--muted)" }}>
        Đang dùng <strong>mock AI provider</strong> (chưa gọi API AI thật) để demo luồng Human-in-the-loop — sinh câu hỏi,
        giảng viên duyệt/từ chối trước khi đưa vào ngân hàng câu hỏi. Khi có API key thật, chỉ cần đổi binding ở
        backend, không ảnh hưởng giao diện này.
      </div>

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
                <select value={subjectId} onChange={(event) => setSubjectId(event.target.value)}>
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
                  {topics.map((topic) => (
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
        </article>

        <article className="panel">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">Kết quả</p>
              <h2>Duyệt câu hỏi AI đề xuất</h2>
            </div>
            {generation && pendingCount > 0 ? (
              <div style={{ display: "flex", gap: 8 }}>
                <button className="approveButton" onClick={() => handleApprove()}>
                  <Check size={16} />
                  Duyệt tất cả
                </button>
                <button className="linkButton" onClick={() => handleReject()}>
                  Từ chối tất cả
                </button>
              </div>
            ) : null}
          </div>

          {!generation ? (
            <div className="emptyState">Chưa có yêu cầu sinh câu hỏi nào.</div>
          ) : (
            <div className="questionList">
              {generation.generated_questions.map((question) => (
                <div className="questionItem" key={question.id}>
                  <div>
                    <strong>{question.question_text}</strong>
                    <span>
                      {question.difficulty} · {question.options.join(" | ")}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span
                      className={`badge ${
                        question.status === "approved" ? "green" : question.status === "rejected" ? "red" : "amber"
                      }`}
                    >
                      {statusLabel(REVIEW_STATUS_LABEL, question.status)}
                    </span>
                    {question.status === "pending" ? (
                      <>
                        <button className="linkButton" onClick={() => handleApprove(question.id)} title="Duyệt">
                          <Check size={16} />
                        </button>
                        <button className="linkButton" onClick={() => handleReject(question.id)} title="Từ chối">
                          <X size={16} />
                        </button>
                      </>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </article>
      </section>
    </>
  );
}
