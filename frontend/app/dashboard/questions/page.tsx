"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Eye, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { api } from "../../../lib/api-client";
import { DataTable } from "../../../components/DataTable";
import { ConfirmDialog } from "../../../components/ConfirmDialog";
import { QuestionPreviewModal } from "../../../components/QuestionPreviewModal";
import { metaOf, type PaginatedResponse } from "../../../lib/pagination";
import { useToast } from "../../../lib/toast";
import { REVIEW_STATUS_LABEL, statusLabel } from "../../../lib/status-labels";
import type { Difficulty, Question } from "../../../lib/types";

const DIFFICULTY_LABEL: Record<Difficulty, string> = { easy: "Dễ", medium: "Trung bình", hard: "Khó" };
const STATUS_BADGE: Record<string, string> = { approved: "green", pending: "amber", rejected: "red", draft: "blue" };

type ConfirmAction = { type: "approve" | "reject" | "delete"; question: Question } | null;

export default function QuestionsPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [meta, setMeta] = useState({ current_page: 1, per_page: 15, total: 0 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [previewQuestion, setPreviewQuestion] = useState<Question | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get<PaginatedResponse<Question>>("/questions", { status: statusFilter, search, page, per_page: 15 });
      setQuestions(response.data);
      setMeta(metaOf(response));
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search, page]);

  useEffect(() => {
    load();
  }, [load]);

  async function runConfirmedAction() {
    if (!confirmAction) return;
    setIsProcessing(true);
    try {
      if (confirmAction.type === "approve") {
        await api.post(`/questions/${confirmAction.question.id}/approve`);
        showToast("Đã duyệt câu hỏi.");
      } else if (confirmAction.type === "reject") {
        await api.post(`/questions/${confirmAction.question.id}/reject`);
        showToast("Đã từ chối câu hỏi.");
      } else {
        await api.delete(`/questions/${confirmAction.question.id}`);
        showToast("Đã xoá câu hỏi.");
      }
      setConfirmAction(null);
      await load();
    } catch {
      showToast("Không thể thực hiện thao tác.", "error");
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleBulkDelete() {
    setIsProcessing(true);
    try {
      await Promise.all(Array.from(selectedIds).map((id) => api.delete(`/questions/${id}`)));
      showToast(`Đã xoá ${selectedIds.size} câu hỏi.`);
      setSelectedIds(new Set());
      setBulkDeleteOpen(false);
      await load();
    } catch {
      showToast("Không thể xoá một số câu hỏi.", "error");
    } finally {
      setIsProcessing(false);
    }
  }

  const confirmCopy: Record<NonNullable<ConfirmAction>["type"], { title: string; description: (q: Question) => string; danger?: boolean; label: string }> = {
    approve: { title: "Duyệt câu hỏi?", description: (q) => `Duyệt câu hỏi "${q.question_text.slice(0, 60)}..." vào ngân hàng câu hỏi?`, label: "Duyệt" },
    reject: { title: "Từ chối câu hỏi?", description: (q) => `Từ chối câu hỏi "${q.question_text.slice(0, 60)}..."?`, danger: true, label: "Từ chối" },
    delete: { title: "Xoá câu hỏi?", description: (q) => `Xoá câu hỏi "${q.question_text.slice(0, 60)}..."?`, danger: true, label: "Xoá" }
  };

  return (
    <>
      <header className="topbar">
        <div>
          <p className="eyebrow">Ngân hàng câu hỏi</p>
          <h1>Câu hỏi</h1>
        </div>
        <button className="primaryButton" onClick={() => router.push("/dashboard/questions/new")}>
          <Plus size={18} />
          Thêm câu hỏi
        </button>
      </header>

      <div className="toolbar">
        <div className="controlRow" style={{ margin: 0 }}>
          <label className="field compact" style={{ width: 160 }}>
            <span>Trạng thái</span>
            <select
              value={statusFilter}
              onChange={(event) => {
                setPage(1);
                setStatusFilter(event.target.value);
              }}
            >
              <option value="">Tất cả</option>
              <option value="approved">Đã duyệt</option>
              <option value="pending">Chờ duyệt</option>
              <option value="rejected">Từ chối</option>
            </select>
          </label>
          <label className="searchField">
            <Search size={17} />
            <input
              value={search}
              onChange={(event) => {
                setPage(1);
                setSearch(event.target.value);
              }}
              placeholder="Tìm nội dung câu hỏi..."
            />
          </label>
        </div>
      </div>

      <section className="panel">
        <DataTable
          rows={questions}
          rowKey={(row) => row.id}
          loading={loading}
          emptyMessage="Chưa có câu hỏi nào."
          pagination={{ page: meta.current_page, perPage: meta.per_page, total: meta.total, onPageChange: setPage }}
          selection={{
            selectedIds,
            getId: (row) => row.id,
            onToggle: (id) =>
              setSelectedIds((prev) => {
                const next = new Set(prev);
                if (next.has(id)) next.delete(id);
                else next.add(id);
                return next;
              }),
            onToggleAll: (checked) => setSelectedIds(checked ? new Set(questions.map((row) => row.id)) : new Set()),
            bulkActions: (
              <button className="dangerButton" onClick={() => setBulkDeleteOpen(true)}>
                <Trash2 size={16} />
                Xoá đã chọn
              </button>
            )
          }}
          columns={[
            { key: "text", header: "Câu hỏi", width: "38%", render: (row) => <strong>{row.question_text.slice(0, 80)}</strong> },
            {
              key: "meta",
              header: "Thông tin",
              width: "27%",
              render: (row) => (
                <span style={{ color: "var(--muted)", fontSize: 13 }}>
                  {row.topic_name ?? "Không thuộc chủ đề"} · {DIFFICULTY_LABEL[row.difficulty]} · {row.source === "ai" ? "Sinh bởi AI" : "Thủ công"}
                </span>
              )
            },
            {
              key: "status",
              header: "Trạng thái",
              width: "13%",
              render: (row) => <span className={`badge ${STATUS_BADGE[row.status]}`}>{statusLabel(REVIEW_STATUS_LABEL, row.status)}</span>
            },
            {
              key: "actions",
              header: "",
              width: "220px",
              render: (row) => (
                <div className="controlRow" style={{ margin: 0, justifyContent: "flex-end" }}>
                  {row.status === "pending" ? (
                    <>
                      <button className="iconButton" title="Duyệt" onClick={() => setConfirmAction({ type: "approve", question: row })}>
                        <Check size={16} />
                      </button>
                      <button className="iconButton" title="Từ chối" onClick={() => setConfirmAction({ type: "reject", question: row })}>
                        <X size={16} />
                      </button>
                    </>
                  ) : null}
                  <button className="iconButton" title="Xem trước" onClick={() => setPreviewQuestion(row)}>
                    <Eye size={16} />
                  </button>
                  <Link className="iconButton" href={`/dashboard/questions/${row.id}/edit`} title="Sửa">
                    <Pencil size={16} />
                  </Link>
                  <button className="iconButton" title="Xoá" onClick={() => setConfirmAction({ type: "delete", question: row })}>
                    <Trash2 size={16} />
                  </button>
                </div>
              )
            }
          ]}
        />
      </section>

      <ConfirmDialog
        open={confirmAction !== null}
        title={confirmAction ? confirmCopy[confirmAction.type].title : ""}
        description={confirmAction ? confirmCopy[confirmAction.type].description(confirmAction.question) : undefined}
        confirmLabel={confirmAction ? confirmCopy[confirmAction.type].label : undefined}
        danger={confirmAction ? confirmCopy[confirmAction.type].danger : false}
        loading={isProcessing}
        onCancel={() => setConfirmAction(null)}
        onConfirm={runConfirmedAction}
      />

      <ConfirmDialog
        open={bulkDeleteOpen}
        title="Xoá các câu hỏi đã chọn?"
        description={`Xoá ${selectedIds.size} câu hỏi?`}
        confirmLabel="Xoá"
        danger
        loading={isProcessing}
        onCancel={() => setBulkDeleteOpen(false)}
        onConfirm={handleBulkDelete}
      />

      <QuestionPreviewModal question={previewQuestion} onClose={() => setPreviewQuestion(null)} />
    </>
  );
}
