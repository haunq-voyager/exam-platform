"use client";


import { tr } from "../lib/i18n";
import { CheckCircle2, X } from "lucide-react";
import { REVIEW_STATUS_LABEL, statusLabel } from "../lib/status-labels";
import type { Question } from "../lib/types";

const DIFFICULTY_LABEL: Record<string, string> = { get easy() { return tr("Dễ"); }, get medium() { return tr("Trung bình"); }, get hard() { return tr("Khó"); } };
const STATUS_BADGE: Record<string, string> = { approved: "green", pending: "amber", rejected: "red", draft: "blue" };

interface QuestionPreviewModalProps {
  question: Question | null;
  onClose: () => void;
}

export function QuestionPreviewModal({ question, onClose }: QuestionPreviewModalProps) {
  if (!question) return null;

  return (
    <div className="modalBackdrop" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="previewModal" onClick={(event) => event.stopPropagation()}>
        <div className="previewModalHeader">
          <div>
            <p className="eyebrow">{tr("Xem trước câu hỏi")}</p>
            <h2 style={{ lineHeight: 1.35 }}>{question.question_text}</h2>
          </div>
          <button className="iconButton" onClick={onClose} title={tr("Đóng")}>
            <X size={16} />
          </button>
        </div>

        <div className="controlRow" style={{ margin: "0 0 16px" }}>
          <span className={`badge ${STATUS_BADGE[question.status]}`}>{statusLabel(REVIEW_STATUS_LABEL, question.status)}</span>
          <span className="badge blue">{DIFFICULTY_LABEL[question.difficulty] ?? question.difficulty}</span>
          <span className="badge">{question.source === "ai" ? tr("Sinh bởi AI") : tr("Thủ công")}</span>
          {question.topic_name ? <span className="badge">{question.topic_name}</span> : null}
        </div>

        <div>
          {question.options.map((option) => (
            <div key={option} className={question.correct_answer.includes(option) ? "previewOption correct" : "previewOption"}>
              {question.correct_answer.includes(option) ? <CheckCircle2 size={16} /> : <span style={{ width: 16 }} />}
              <span>{option}</span>
            </div>
          ))}
        </div>

        {question.explanation ? (
          <div className="previewExplanation">
            <strong style={{ color: "var(--ink)" }}>{tr("Lời giải:")} </strong>
            {question.explanation}
          </div>
        ) : null}
      </div>
    </div>
  );
}
