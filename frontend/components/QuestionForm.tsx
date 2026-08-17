"use client";

import { useState } from "react";
import { Save, X } from "lucide-react";
import type { Difficulty, QuestionType, Topic } from "../lib/types";

export interface QuestionFormState {
  topic_id: string;
  question_type: QuestionType;
  difficulty: Difficulty;
  question_text: string;
  options: string[];
  correct_answer: string[];
  explanation: string;
}

export const EMPTY_QUESTION_FORM: QuestionFormState = {
  topic_id: "",
  question_type: "single_choice",
  difficulty: "medium",
  question_text: "",
  options: ["", "", "", ""],
  correct_answer: [],
  explanation: ""
};

interface QuestionFormProps {
  topics: Topic[];
  initialValue?: QuestionFormState;
  submitLabel: string;
  submittingLabel: string;
  onSubmit: (form: QuestionFormState) => Promise<void>;
  error: string | null;
}

export function QuestionForm({ topics, initialValue, submitLabel, submittingLabel, onSubmit, error }: QuestionFormProps) {
  const [form, setForm] = useState<QuestionFormState>(initialValue ?? EMPTY_QUESTION_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

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
    setLocalError(null);
    const options = form.options.map((option) => option.trim()).filter((option) => option !== "");
    if (options.length < 2) {
      setLocalError("Cần ít nhất 2 lựa chọn đáp án.");
      return;
    }
    const correctAnswer = form.correct_answer.filter((answer) => options.includes(answer));
    if (correctAnswer.length === 0) {
      setLocalError("Vui lòng chọn đáp án đúng.");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({ ...form, options, correct_answer: correctAnswer });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {(error ?? localError) ? <div className="formError" style={{ marginBottom: 12 }}>{error ?? localError}</div> : null}
      <div className="controlRow" style={{ flexWrap: "wrap" }}>
        <label className="field compact" style={{ width: 200 }}>
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
        <label className="field compact" style={{ width: 190 }}>
          <span>Loại câu hỏi</span>
          <select value={form.question_type} onChange={(event) => handleTypeChange(event.target.value as QuestionType)}>
            <option value="single_choice">Một đáp án đúng</option>
            <option value="multiple_choice">Nhiều đáp án đúng</option>
            <option value="true_false">Đúng / Sai</option>
          </select>
        </label>
        <label className="field compact" style={{ width: 150 }}>
          <span>Độ khó</span>
          <select value={form.difficulty} onChange={(event) => setForm((prev) => ({ ...prev, difficulty: event.target.value as Difficulty }))}>
            <option value="easy">Dễ</option>
            <option value="medium">Trung bình</option>
            <option value="hard">Khó</option>
          </select>
        </label>
      </div>

      <label className="field" style={{ marginTop: 14 }}>
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

      <button className="primaryButton" type="submit" style={{ marginTop: 18 }} disabled={isSubmitting}>
        <Save size={16} />
        {isSubmitting ? submittingLabel : submitLabel}
      </button>
    </form>
  );
}
