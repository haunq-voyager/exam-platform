"use client";

import { useEffect, useState } from "react";
import { Check, Plus, Trash2, X } from "lucide-react";
import { api, ApiError } from "../../../lib/api-client";
import { REVIEW_STATUS_LABEL, statusLabel } from "../../../lib/status-labels";
import type { Difficulty, Question, QuestionType, Topic } from "../../../lib/types";

const DIFFICULTY_LABEL: Record<Difficulty, string> = { easy: "Dễ", medium: "Trung bình", hard: "Khó" };
const STATUS_BADGE: Record<string, string> = {
  approved: "green",
  pending: "amber",
  rejected: "red",
  draft: "blue"
};

interface QuestionFormState {
  topic_id: string;
  question_type: QuestionType;
  difficulty: Difficulty;
  question_text: string;
  options: string[];
  correct_answer: string[];
  explanation: string;
}

const EMPTY_FORM: QuestionFormState = {
  topic_id: "",
  question_type: "single_choice",
  difficulty: "medium",
  question_text: "",
  options: ["", "", "", ""],
  correct_answer: [],
  explanation: ""
};

export default function QuestionsPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<QuestionFormState>(EMPTY_FORM);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");

  async function load() {
    setLoading(true);
    try {
      const [questionsResponse, topicsResponse] = await Promise.all([
        api.get<{ data: Question[] }>("/questions", { status: statusFilter, search }),
        api.get<{ data: Topic[] }>("/topics")
      ]);
      setQuestions(questionsResponse.data);
      setTopics(topicsResponse.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  function updateOption(index: number, value: string) {
    setForm((prev) => {
      const options = [...prev.options];
      options[index] = value;
      return { ...prev, options };
    });
  }

  function toggleCorrect(option: string) {
    setForm((prev) => {
      if (prev.question_type === "multiple_choice") {
        const isSelected = prev.correct_answer.includes(option);
        return {
          ...prev,
          correct_answer: isSelected ? prev.correct_answer.filter((value) => value !== option) : [...prev.correct_answer, option]
        };
      }
      return { ...prev, correct_answer: [option] };
    });
  }

  function handleTypeChange(type: QuestionType) {
    setForm((prev) => ({
      ...prev,
      question_type: type,
      options: type === "true_false" ? ["Đúng", "Sai"] : prev.options.length ? prev.options : ["", "", "", ""],
      correct_answer: []
    }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const options = form.options.map((option) => option.trim()).filter((option) => option !== "");
    if (options.length < 2) {
      setError("Cần ít nhất 2 lựa chọn đáp án.");
      return;
    }
    if (form.correct_answer.length === 0) {
      setError("Vui lòng chọn đáp án đúng.");
      return;
    }

    try {
      await api.post("/questions", {
        topic_id: form.topic_id ? Number(form.topic_id) : null,
        question_type: form.question_type,
        difficulty: form.difficulty,
        question_text: form.question_text,
        options,
        correct_answer: form.correct_answer,
        explanation: form.explanation || null
      });
      setForm(EMPTY_FORM);
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không thể tạo câu hỏi.");
    }
  }

  async function handleApprove(question: Question) {
    await api.post(`/questions/${question.id}/approve`);
    await load();
  }

  async function handleReject(question: Question) {
    await api.post(`/questions/${question.id}/reject`);
    await load();
  }

  async function handleDelete(question: Question) {
    if (!confirm("Xóa câu hỏi này?")) return;
    await api.delete(`/questions/${question.id}`);
    await load();
  }

  return (
    <>
      <header className="topbar">
        <div>
          <p className="eyebrow">Ngân hàng câu hỏi</p>
          <h1>Câu hỏi</h1>
        </div>
        <button className="primaryButton" onClick={() => setShowForm((value) => !value)}>
          <Plus size={18} />
          Thêm câu hỏi
        </button>
      </header>

      <div className="toolbar">
        <div className="controlRow" style={{ margin: 0 }}>
          <label className="field compact" style={{ width: 160 }}>
            <span>Trạng thái</span>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="">Tất cả</option>
              <option value="approved">Đã duyệt</option>
              <option value="pending">Chờ duyệt</option>
              <option value="rejected">Từ chối</option>
            </select>
          </label>
          <label className="field wide">
            <span>Tìm kiếm</span>
            <input value={search} onChange={(event) => setSearch(event.target.value)} onBlur={load} placeholder="Nội dung câu hỏi..." />
          </label>
        </div>
      </div>

      {showForm ? (
        <section className="panel" style={{ marginBottom: 18 }}>
          <form onSubmit={handleSubmit}>
            {error ? <div className="formError" style={{ marginBottom: 12 }}>{error}</div> : null}
            <div className="controlRow" style={{ flexWrap: "wrap" }}>
              <label className="field compact" style={{ width: 160 }}>
                <span>Chủ đề</span>
                <select value={form.topic_id} onChange={(event) => setForm((prev) => ({ ...prev, topic_id: event.target.value }))}>
                  <option value="">Không thuộc chủ đề</option>
                  {topics.map((topic) => (
                    <option key={topic.id} value={topic.id}>
                      {topic.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field compact" style={{ width: 170 }}>
                <span>Loại câu hỏi</span>
                <select value={form.question_type} onChange={(event) => handleTypeChange(event.target.value as QuestionType)}>
                  <option value="single_choice">Một đáp án đúng</option>
                  <option value="multiple_choice">Nhiều đáp án đúng</option>
                  <option value="true_false">Đúng / Sai</option>
                </select>
              </label>
              <label className="field compact" style={{ width: 140 }}>
                <span>Độ khó</span>
                <select value={form.difficulty} onChange={(event) => setForm((prev) => ({ ...prev, difficulty: event.target.value as Difficulty }))}>
                  <option value="easy">Dễ</option>
                  <option value="medium">Trung bình</option>
                  <option value="hard">Khó</option>
                </select>
              </label>
            </div>

            <label className="field">
              <span>Nội dung câu hỏi</span>
              <textarea
                className="textarea"
                value={form.question_text}
                onChange={(event) => setForm((prev) => ({ ...prev, question_text: event.target.value }))}
                required
              />
            </label>

            <div className="field" style={{ marginTop: 14 }}>
              <span>Đáp án (chọn ô tròn/vuông để đánh dấu đáp án đúng)</span>
              <div className="questionList">
                {form.options.map((option, index) => (
                  <div key={index} className="questionItem" style={{ gridTemplateColumns: "auto 1fr auto" }}>
                    <input
                      type={form.question_type === "multiple_choice" ? "checkbox" : "radio"}
                      name="correct-answer"
                      checked={option.trim() !== "" && form.correct_answer.includes(option.trim())}
                      onChange={() => toggleCorrect(option.trim())}
                      disabled={option.trim() === ""}
                    />
                    <input
                      value={option}
                      placeholder={`Lựa chọn ${index + 1}`}
                      onChange={(event) => updateOption(index, event.target.value)}
                      disabled={form.question_type === "true_false"}
                    />
                    {form.question_type !== "true_false" && form.options.length > 2 ? (
                      <button
                        type="button"
                        className="linkButton"
                        onClick={() => setForm((prev) => ({ ...prev, options: prev.options.filter((_, i) => i !== index) }))}
                      >
                        <X size={16} />
                      </button>
                    ) : (
                      <span />
                    )}
                  </div>
                ))}
              </div>
              {form.question_type !== "true_false" ? (
                <button
                  type="button"
                  className="linkButton"
                  style={{ marginTop: 8 }}
                  onClick={() => setForm((prev) => ({ ...prev, options: [...prev.options, ""] }))}
                >
                  + Thêm lựa chọn
                </button>
              ) : null}
            </div>

            <label className="field" style={{ marginTop: 14 }}>
              <span>Lời giải (không bắt buộc)</span>
              <textarea
                className="textarea"
                value={form.explanation}
                onChange={(event) => setForm((prev) => ({ ...prev, explanation: event.target.value }))}
              />
            </label>

            <button className="primaryButton" type="submit" style={{ marginTop: 14 }}>
              Lưu câu hỏi
            </button>
          </form>
        </section>
      ) : null}

      <section className="panel">
        {loading ? (
          <div className="emptyState">Đang tải...</div>
        ) : questions.length === 0 ? (
          <div className="emptyState">Chưa có câu hỏi nào.</div>
        ) : (
          <div className="questionList">
            {questions.map((question) => (
              <div className="questionItem" key={question.id}>
                <div>
                  <strong>{question.question_text}</strong>
                  <span>
                    {question.topic_name ?? "Không thuộc chủ đề"} · {DIFFICULTY_LABEL[question.difficulty]} ·{" "}
                    {question.source === "ai" ? "Sinh bởi AI" : "Thủ công"}
                  </span>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span className={`badge ${STATUS_BADGE[question.status]}`}>{statusLabel(REVIEW_STATUS_LABEL, question.status)}</span>
                  {question.status === "pending" ? (
                    <>
                      <button className="approveButton" onClick={() => handleApprove(question)}>
                        <Check size={16} />
                        Duyệt
                      </button>
                      <button className="linkButton" onClick={() => handleReject(question)}>
                        <X size={16} />
                      </button>
                    </>
                  ) : null}
                  <button className="linkButton" onClick={() => handleDelete(question)}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
