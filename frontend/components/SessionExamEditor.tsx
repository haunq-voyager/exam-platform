"use client";


import { tr } from "../lib/i18n";
import { useCallback, useEffect, useState } from "react";
import { ArrowDown, ArrowUp, GripVertical, Lock, Plus, Save, Trash2, X } from "lucide-react";
import { api, ApiError } from "../lib/api-client";
import { useToast } from "../lib/toast";
import type { Exam, ExamQuestionItem, Question } from "../lib/types";
import { ClientTable } from "./ClientTable";
import { QuestionPicker } from "./QuestionPicker";

interface SessionExamResponse {
  exam: Exam;
  is_shared: boolean;
  locked: boolean;
}

const DIFFICULTY_LABEL: Record<string, string> = { get easy() { return tr("Dễ"); }, get medium() { return tr("Trung bình"); }, get hard() { return tr("Khó"); } };

interface Props {
  sessionId: number | string;
  /** Called after a change so the page header (question count, duration) refreshes. */
  onChanged: () => void | Promise<void>;
  /** Viewing only (no permission to edit sessions): every control is disabled. */
  readOnly?: boolean;
}

/**
 * Full control over the exam content of one session: settings, questions, points and order.
 * A shared template is never touched: the first change gives the session its own copy (done by the API).
 */
export function SessionExamEditor({ sessionId, onChanged, readOnly = false }: Props) {
  const { showToast } = useToast();
  const base = `/exam-sessions/${sessionId}/exam`;
  const [data, setData] = useState<SessionExamResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState(30);
  const [shuffleQuestions, setShuffleQuestions] = useState(true);
  const [shuffleOptions, setShuffleOptions] = useState(true);
  const [pointDrafts, setPointDrafts] = useState<Record<number, string>>({});

  const [adding, setAdding] = useState(false);
  const [picked, setPicked] = useState<Question[]>([]);
  const [newPoints, setNewPoints] = useState(1);

  // Drag and drop of rows. A row is only draggable while its handle is held, so the point inputs stay selectable.
  const [armedId, setArmedId] = useState<number | null>(null);
  const [dragId, setDragId] = useState<number | null>(null);
  const [overId, setOverId] = useState<number | null>(null);

  const apply = useCallback((response: SessionExamResponse) => {
    setData(response);
    setTitle(response.exam.title);
    setDuration(response.exam.duration_minutes);
    setShuffleQuestions(response.exam.shuffle_questions);
    setShuffleOptions(response.exam.shuffle_options);
    setPointDrafts({});
  }, []);

  useEffect(() => {
    api
      .get<{ data: SessionExamResponse }>(base)
      .then((response) => apply(response.data))
      .catch((err) => setError(err instanceof ApiError ? err.message : tr("Không thể tải đề thi.")));
  }, [base, apply]);

  async function run(action: () => Promise<{ data: SessionExamResponse }>, success?: string) {
    setError(null);
    setBusy(true);
    try {
      const response = await action();
      apply(response.data);
      if (success) showToast(success);
      await onChanged();
      return true;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : tr("Không thể lưu thay đổi."));
      return false;
    } finally {
      setBusy(false);
    }
  }

  if (!data) {
    return <div className="emptyState">{error ?? tr("Đang tải đề thi...")}</div>;
  }

  const { exam, is_shared: isShared, locked: lockedByAttempts } = data;
  const locked = lockedByAttempts || readOnly;
  const questions: ExamQuestionItem[] = exam.questions ?? [];
  const totalPoints = questions.reduce((sum, item) => sum + Number(item.points), 0);
  const existingIds = new Set(questions.map((item) => item.question_id));

  function move(index: number, delta: number) {
    const ids = questions.map((item) => item.question_id);
    const target = index + delta;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    run(() => api.put<{ data: SessionExamResponse }>(`${base}/question-order`, { ordered_question_ids: ids }));
  }

  /** Drag and drop: the dragged question takes the place of the one it is dropped on. */
  function moveTo(fromId: number, toId: number) {
    const ids = questions.map((item) => item.id);
    const from = ids.indexOf(fromId);
    const to = ids.indexOf(toId);
    if (from < 0 || to < 0 || from === to) return;
    const order = questions.map((item) => item.question_id);
    const [moved] = order.splice(from, 1);
    order.splice(to, 0, moved);
    run(() => api.put<{ data: SessionExamResponse }>(`${base}/question-order`, { ordered_question_ids: order }), tr("Đã đổi thứ tự câu hỏi."));
  }

  function endDrag() {
    setArmedId(null);
    setDragId(null);
    setOverId(null);
  }

  function savePoints(item: ExamQuestionItem) {
    const draft = pointDrafts[item.id];
    if (draft === undefined || Number(draft) === Number(item.points) || draft.trim() === "") return;
    run(() => api.patch<{ data: SessionExamResponse }>(`${base}/questions/${item.id}`, { points: Number(draft) }));
  }

  async function addPicked() {
    const ids = picked.filter((question) => !existingIds.has(question.id)).map((question) => question.id);
    if (ids.length === 0) return;
    const ok = await run(() => api.post<{ data: SessionExamResponse }>(`${base}/questions`, { question_ids: ids, points: newPoints }), tr("Đã thêm {0} câu hỏi.", ids.length));
    if (ok) {
      setPicked([]);
      setAdding(false);
    }
  }

  return (
    <div>
      {readOnly ? (
        <p className="reviewEmpty" style={{ marginTop: 0 }}>{tr("Bạn chỉ có quyền xem đề thi của kỳ thi này.")}</p>
      ) : lockedByAttempts ? (
        <div className="reviewNotice" style={{ borderColor: "rgba(217,119,6,.4)", background: "#fffbeb", color: "#92400e" }}>
          <Lock size={16} />
          {tr("Đã có thí sinh bắt đầu làm bài nên nội dung đề bị khóa (không thể thêm/bớt câu hỏi hay đổi điểm, thời lượng).")}
        </div>
      ) : isShared ? (
        <p className="reviewEmpty" style={{ marginTop: 0 }}>
          {tr("Kỳ thi đang dùng chung đề mẫu")} <strong>{exam.title}</strong>{tr(". Khi bạn chỉnh sửa, hệ thống tự tạo")} <strong>{tr("bản sao riêng")}</strong> {tr("cho kỳ thi này; đề mẫu và các kỳ thi khác không bị thay đổi.")}
        </p>
      ) : null}

      {error ? <div className="formError" style={{ marginBottom: 12 }}>{error}</div> : null}

      <form
        onSubmit={(event) => {
          event.preventDefault();
          run(
            () =>
              api.patch<{ data: SessionExamResponse }>(base, {
                title,
                duration_minutes: duration,
                shuffle_questions: shuffleQuestions,
                shuffle_options: shuffleOptions
              }),
            tr("Đã lưu cài đặt đề thi.")
          );
        }}
      >
        <div className="controlRow" style={{ alignItems: "flex-end", flexWrap: "wrap", margin: 0 }}>
          <label className="field" style={{ flex: "2 1 260px" }}>
            <span>{tr("Tên đề thi")}</span>
            <input value={title} onChange={(event) => setTitle(event.target.value)} disabled={locked || busy} required maxLength={255} />
          </label>
          <label className="field" style={{ width: 160 }}>
            <span>{tr("Thời gian làm bài (phút)")}</span>
            <input
              type="number"
              min={1}
              max={600}
              value={duration}
              onChange={(event) => setDuration(Math.max(1, Number(event.target.value) || 1))}
              disabled={locked || busy}
            />
          </label>
        </div>
        <div className="controlRow" style={{ gap: 18, margin: "12px 0" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700 }}>
            <input type="checkbox" checked={shuffleQuestions} onChange={(event) => setShuffleQuestions(event.target.checked)} disabled={locked || busy} />
            {tr("Xáo trộn thứ tự câu hỏi")}
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700 }}>
            <input type="checkbox" checked={shuffleOptions} onChange={(event) => setShuffleOptions(event.target.checked)} disabled={locked || busy} />
            {tr("Xáo trộn đáp án")}
          </label>
          <button className="primaryButton" type="submit" disabled={locked || busy}>
            <Save size={16} />
            {tr("Lưu cài đặt đề")}
          </button>
        </div>
      </form>

      <div className="panelHeader" style={{ marginTop: 18, marginBottom: 10 }}>
        <div>
          <p className="eyebrow">{tr("Câu hỏi")}</p>
          <h3 style={{ margin: 0 }}>
            {questions.length} {tr("câu · tổng")} {totalPoints} {tr("điểm")}
          </h3>
        </div>
        <button className="primaryButton" onClick={() => setAdding((value) => !value)} disabled={locked || busy}>
          {adding ? <X size={16} /> : <Plus size={16} />}
          {adding ? tr("Đóng") : tr("Thêm câu hỏi")}
        </button>
      </div>

      {adding ? (
        <div className="panel" style={{ marginBottom: 14, boxShadow: "none" }}>
          <QuestionPicker selected={picked} onChange={setPicked} alreadyIds={Array.from(existingIds)} />
          <div className="stickyActions" style={{ position: "static" }}>
            <span>
              {tr("Đã chọn")} <strong>{picked.filter((question) => !existingIds.has(question.id)).length}</strong> {tr("câu mới")}
            </span>
            <div className="controlRow" style={{ margin: 0, alignItems: "center" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700 }}>
                {tr("Điểm mỗi câu")}
                <input
                  type="number"
                  min={0}
                  step={0.5}
                  value={newPoints}
                  onChange={(event) => setNewPoints(Math.max(0, Number(event.target.value) || 0))}
                  style={{ width: 80, minHeight: 34 }}
                />
              </label>
              <button className="primaryButton" onClick={addPicked} disabled={busy || picked.every((question) => existingIds.has(question.id))}>
                <Plus size={16} />
                {tr("Thêm vào đề")}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {questions.length === 0 ? (
        <div className="emptyState">{tr("Đề chưa có câu hỏi. Bấm “Thêm câu hỏi” để chọn từ ngân hàng câu hỏi. Cần ít nhất 1 câu mới bật được kỳ thi.")}</div>
      ) : (
        <ClientTable
          label={tr("Câu hỏi trong đề")}
          rows={questions}
          rowKey={(item) => item.id}
          searchText={(item) => `${item.question?.question_text ?? ""} ${item.question?.topic_name ?? ""}`}
          searchPlaceholder={tr("Tìm câu hỏi trong đề…")}
          pageSize={25}
          rowProps={(item) =>
            locked
              ? {}
              : {
                  draggable: armedId === item.id,
                  className: `${dragId === item.id ? "dragging" : ""} ${overId === item.id && dragId !== item.id ? "dropTarget" : ""}`.trim(),
                  onDragStart: (event) => {
                    event.dataTransfer.effectAllowed = "move";
                    event.dataTransfer.setData("text/plain", String(item.id));
                    setDragId(item.id);
                  },
                  onDragOver: (event) => {
                    if (dragId === null) return;
                    event.preventDefault(); // allows the drop
                    event.dataTransfer.dropEffect = "move";
                    if (overId !== item.id) setOverId(item.id);
                  },
                  onDrop: (event) => {
                    event.preventDefault();
                    if (dragId !== null) moveTo(dragId, item.id);
                    endDrag();
                  },
                  onDragEnd: endDrag
                }
          }
          columns={[
            {
              key: "order",
              header: "#",
              width: "84px",
              render: (item) => (
                <span className="dragCell">
                  {locked ? null : (
                    <span
                      className="dragHandle"
                      title={tr("Giữ và kéo để đổi thứ tự")}
                      aria-hidden="true"
                      onPointerDown={() => setArmedId(item.id)}
                      onPointerUp={() => setArmedId(null)}
                    >
                      <GripVertical size={16} />
                    </span>
                  )}
                  {questions.findIndex((entry) => entry.id === item.id) + 1}
                </span>
              )
            },
            { key: "question", header: tr("Câu hỏi"), width: "340px", render: (item) => <strong>{item.question?.question_text}</strong> },
            { key: "topic", header: tr("Chủ đề"), width: "160px", render: (item) => item.question?.topic_name ?? tr("Không thuộc chủ đề") },
            {
              key: "difficulty",
              header: tr("Độ khó"),
              width: "110px",
              render: (item) => DIFFICULTY_LABEL[item.question?.difficulty ?? ""] ?? item.question?.difficulty
            },
            {
              key: "points",
              header: tr("Điểm"),
              width: "100px",
              render: (item) => (
                <input
                  type="number"
                  min={0}
                  step={0.5}
                  value={pointDrafts[item.id] ?? String(Number(item.points))}
                  onChange={(event) => setPointDrafts((drafts) => ({ ...drafts, [item.id]: event.target.value }))}
                  onBlur={() => savePoints(item)}
                  disabled={locked || busy}
                  aria-label={tr("Điểm của câu hỏi")}
                  style={{ width: 70, minHeight: 34 }}
                />
              )
            },
            {
              key: "actions",
              header: "",
              width: "130px",
              render: (item) => {
                const index = questions.findIndex((entry) => entry.id === item.id);
                return (
                  <div className="controlRow" style={{ margin: 0, gap: 4 }}>
                    <button className="iconButton" title={tr("Lên")} aria-label={tr("Chuyển câu lên")} onClick={() => move(index, -1)} disabled={locked || busy || index === 0}>
                      <ArrowUp size={15} />
                    </button>
                    <button className="iconButton" title={tr("Xuống")} aria-label={tr("Chuyển câu xuống")} onClick={() => move(index, 1)} disabled={locked || busy || index === questions.length - 1}>
                      <ArrowDown size={15} />
                    </button>
                    <button
                      className="iconButton"
                      title={tr("Bỏ câu này")} aria-label={tr("Bỏ câu hỏi khỏi đề")}
                      onClick={() => run(() => api.delete<{ data: SessionExamResponse }>(`${base}/questions/${item.id}`), tr("Đã bỏ câu hỏi khỏi đề."))}
                      disabled={locked || busy}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                );
              }
            }
          ]}
        />
      )}
    </div>
  );
}
