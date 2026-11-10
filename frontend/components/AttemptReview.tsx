"use client";


import { tr } from "../lib/i18n";
import { useMemo, useState, type ReactNode } from "react";
import { CheckCircle2, ChevronLeft, ChevronRight, XCircle } from "lucide-react";
import type { ExamAttemptDetail, ExamAttemptQuestionDetail } from "../lib/types";

interface Props {
  attempt: ExamAttemptDetail;
  /** Who is looking: wording differs ("Bạn chọn" vs "Thí sinh chọn"). */
  perspective: "student" | "staff";
  /** Shown at the top of the left column, above the question list (e.g. the attempt history). */
  sidebarTop?: ReactNode;
  /** Optional third column (e.g. the proctoring log for admins). */
  sidePanel?: ReactNode;
  /** Pixels used above the review by the page header/notices; the review fills the rest of the viewport. */
  fitOffset?: number;
}

type QuestionResult = "correct" | "wrong" | "pending";

const OPTION_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/**
 * Read-only review of a finished attempt, laid out like the exam room: question list on the left, selected question
 * on the right. It fits the viewport; the list, the question body and the side panel each scroll on their own.
 */
export function AttemptReview({ attempt, perspective, sidebarTop, sidePanel, fitOffset = 200 }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const revealed = attempt.status === "graded" && attempt.answer_key_revealed;
  const subject = perspective === "student" ? tr("Bạn") : tr("Thí sinh");

  const results = useMemo<QuestionResult[]>(
    () => attempt.questions.map((question) => (revealed ? (question.is_correct ? "correct" : "wrong") : "pending")),
    [attempt.questions, revealed]
  );
  const correctCount = results.filter((result) => result === "correct").length;
  const wrongCount = results.filter((result) => result === "wrong").length;
  const percent = Math.round((correctCount / Math.max(1, attempt.questions.length)) * 100);

  const question: ExamAttemptQuestionDetail | undefined = attempt.questions[activeIndex];
  const result = results[activeIndex];

  return (
    <section className={`examWorkspaceGrid fitViewport${sidePanel ? "" : " twoColumns"}`} style={{ ["--fit-offset" as string]: `${fitOffset}px` }}>
      <aside className="panel questionSidebar">
        {sidebarTop}
        <p className="sideTitle">{revealed ? tr("Câu hỏi · đúng {0}/{1}", correctCount, attempt.questions.length) : tr("Câu hỏi · {0} câu", attempt.questions.length)}</p>
        {revealed ? (
          <div className="examProgressLine">
            <i style={{ width: `${percent}%` }} />
          </div>
        ) : null}
        <div className="paletteGrid">
          {attempt.questions.map((item, index) => {
            const hasAnswer = (item.selected_answer ?? []).length > 0;
            const className = [
              "paletteDot",
              index === activeIndex ? "active" : "",
              results[index] === "correct" ? "correct" : "",
              results[index] === "wrong" ? "wrong" : "",
              results[index] === "pending" && hasAnswer ? "answered" : ""
            ]
              .filter(Boolean)
              .join(" ");
            const title =
              results[index] === "correct" ? tr("đúng") : results[index] === "wrong" ? "sai" : hasAnswer ? tr("đã trả lời") : tr("chưa trả lời");
            return (
              <button key={item.question_id} className={className} onClick={() => setActiveIndex(index)} title={tr("Câu {0}: {1}", index + 1, title)}>
                {index + 1}
              </button>
            );
          })}
        </div>
        {revealed ? (
          <div className="paletteLegend">
            <span>
              <i className="legendCorrect" /> {tr("Đúng (")}{correctCount})
            </span>
            <span>
              <i className="legendWrong" /> {tr("Sai / bỏ trống (")}{wrongCount})
            </span>
            <span>
              <i className="legendCurrent" /> {tr("Đang xem")}
            </span>
          </div>
        ) : null}
      </aside>

      <article className="panel examPanel fitPanel">
        {question ? (
          <>
            <div className="panelHeader" style={{ marginBottom: 12 }}>
              <div>
                <p className="eyebrow">
                  {tr("Câu")} {activeIndex + 1} / {attempt.questions.length}
                </p>
              </div>
              {result === "pending" ? null : (
                <span className={`badge ${result === "correct" ? "green" : "red"}`}>
                  {result === "correct" ? <CheckCircle2 size={14} /> : <XCircle size={14} />}{" "}
                  {result === "correct" ? tr("Đúng") : "Sai"} · {question.points_earned ?? 0}/{question.points} {tr("điểm")}
                </span>
              )}
            </div>

            <div className="fitBody">
              <div className="examQuestion">
                <h3>{question.question_text}</h3>
                {question.options.map((option, optionIndex) => {
                  const isSelected = (question.selected_answer ?? []).includes(option);
                  const isCorrectOption = revealed && (question.correct_answer ?? []).includes(option);
                  const isWrongSelection = revealed && isSelected && !isCorrectOption;
                  const className = ["answer", "reviewOption", isCorrectOption ? "reviewCorrect" : "", isWrongSelection ? "reviewWrong" : "", !revealed && isSelected ? "selected" : ""]
                    .filter(Boolean)
                    .join(" ");
                  return (
                    <div className={className} key={option}>
                      <b>{OPTION_LETTERS[optionIndex] ?? optionIndex + 1}</b>
                      <span>{option}</span>
                      <span className="reviewTags">
                        {isSelected ? <span className={`badge ${isWrongSelection ? "red" : isCorrectOption ? "green" : "blue"}`}>{subject} {tr("chọn")}</span> : null}
                        {isCorrectOption ? <span className="badge green">{tr("Đáp án đúng")}</span> : null}
                      </span>
                    </div>
                  );
                })}
                {(question.selected_answer ?? []).length === 0 ? <p className="reviewEmpty">{subject} {tr("chưa trả lời câu này.")}</p> : null}
                {revealed && question.explanation ? (
                  <div className="reviewExplanation">
                    <strong>{tr("Giải thích")}</strong>
                    <p>{question.explanation}</p>
                  </div>
                ) : null}
                {!revealed ? (
                  <p className="reviewEmpty">
                    {attempt.is_cancelled
                      ? tr("Bài thi bị hủy nên đáp án và kết quả từng câu không được hiển thị.")
                      : tr("Đáp án đúng và kết quả từng câu sẽ hiển thị khi hết lượt thi của kỳ thi này.")}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="fitFooter">
              <div className="controlRow" style={{ justifyContent: "space-between" }}>
                <button className="iconButton" style={{ width: "auto", padding: "0 16px" }} onClick={() => setActiveIndex((index) => Math.max(0, index - 1))} disabled={activeIndex === 0}>
                  <ChevronLeft size={17} />
                  {tr("Câu trước")}
                </button>
                <button
                  className="primaryButton"
                  onClick={() => setActiveIndex((index) => Math.min(attempt.questions.length - 1, index + 1))}
                  disabled={activeIndex >= attempt.questions.length - 1}
                >
                  {tr("Câu tiếp theo")}
                  <ChevronRight size={17} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="emptyState">{tr("Bài thi không có câu hỏi.")}</div>
        )}
      </article>

      {sidePanel}
    </section>
  );
}
