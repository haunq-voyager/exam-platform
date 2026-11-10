"use client";


import { tr } from "../../../lib/i18n";
import { useCallback, useEffect, useState } from "react";
import Link from "@/components/RoleLink";
import { useRouter } from "@/lib/use-role-router";
import { Check, Eye, Pencil, Plus, Trash2, X } from "lucide-react";
import { useServerSort } from "../../../lib/use-server-sort";
import { api } from "../../../lib/api-client";
import { DataTable } from "../../../components/DataTable";
import { PageHeader } from "../../../components/PageHeader";
import { FilterSelect, TableToolbar } from "../../../components/TableToolbar";
import { ConfirmDialog } from "../../../components/ConfirmDialog";
import { QuestionPreviewModal } from "../../../components/QuestionPreviewModal";
import { metaOf, type PaginatedResponse } from "../../../lib/pagination";
import { useToast } from "../../../lib/toast";
import { REVIEW_STATUS_LABEL, statusLabel } from "../../../lib/status-labels";
import type { Difficulty, Question } from "../../../lib/types";

const DIFFICULTY_LABEL: Record<Difficulty, string> = { get easy() { return tr("Dễ"); }, get medium() { return tr("Trung bình"); }, get hard() { return tr("Khó"); } };
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

  const serverSort = useServerSort(() => setPage(1));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get<PaginatedResponse<Question>>("/questions", { status: statusFilter, search, page, per_page: 15, ...serverSort.params });
      setQuestions(response.data);
      setMeta(metaOf(response));
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search, page, serverSort.params]);

  useEffect(() => {
    load();
  }, [load]);

  const hasFilters = Boolean(search.trim() || statusFilter);
  const clearFilters = () => {
    setPage(1);
    setSearch("");
    setStatusFilter("");
  };

  async function runConfirmedAction() {
    if (!confirmAction) return;
    setIsProcessing(true);
    try {
      if (confirmAction.type === "approve") {
        await api.post(`/questions/${confirmAction.question.id}/approve`);
        showToast(tr("Đã duyệt câu hỏi."));
      } else if (confirmAction.type === "reject") {
        await api.post(`/questions/${confirmAction.question.id}/reject`);
        showToast(tr("Đã từ chối câu hỏi."));
      } else {
        await api.delete(`/questions/${confirmAction.question.id}`);
        showToast(tr("Đã xoá câu hỏi."));
      }
      setConfirmAction(null);
      await load();
    } catch {
      showToast(tr("Không thể thực hiện thao tác."), "error");
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleBulkDelete() {
    setIsProcessing(true);
    try {
      await Promise.all(Array.from(selectedIds).map((id) => api.delete(`/questions/${id}`)));
      showToast(tr("Đã xoá {0} câu hỏi.", selectedIds.size));
      setSelectedIds(new Set());
      setBulkDeleteOpen(false);
      await load();
    } catch {
      showToast(tr("Không thể xoá một số câu hỏi."), "error");
    } finally {
      setIsProcessing(false);
    }
  }

  const confirmCopy: Record<NonNullable<ConfirmAction>["type"], { title: string; description: (q: Question) => string; danger?: boolean; label: string }> = {
    approve: { title: tr("Duyệt câu hỏi?"), description: (q) => tr("Duyệt câu hỏi \"{0}...\" vào ngân hàng câu hỏi?", q.question_text.slice(0, 60)), label: tr("Duyệt") },
    reject: { title: tr("Từ chối câu hỏi?"), description: (q) => tr("Từ chối câu hỏi \"{0}...\"?", q.question_text.slice(0, 60)), danger: true, label: tr("Từ chối") },
    delete: { title: tr("Xoá câu hỏi?"), description: (q) => tr("Xoá câu hỏi \"{0}...\"?", q.question_text.slice(0, 60)), danger: true, label: tr("Xoá") }
  };

  return (
    <>
      <PageHeader
        eyebrow={tr("Ngân hàng câu hỏi")}
        title={tr("Câu hỏi")}
        description={tr("Tạo thủ công hoặc sinh bằng AI, duyệt rồi dùng để soạn đề thi.")}
        actions={
          <button className="primaryButton" onClick={() => router.push("/dashboard/questions/new")}>
            <Plus size={16} aria-hidden="true" />
            {tr("Thêm câu hỏi")}
          </button>
        }
      />

      <section className="panel">
        <TableToolbar
          search={{
            value: search,
            onChange: (value) => {
              setPage(1);
              setSearch(value);
            },
            placeholder: tr("Tìm nội dung câu hỏi…"),
            label: tr("Tìm câu hỏi")
          }}
          active={hasFilters}
          onReset={clearFilters}
        >
          <FilterSelect
            label={tr("Trạng thái")}
            value={statusFilter}
            onChange={(value) => {
              setPage(1);
              setStatusFilter(value);
            }}
            options={[
              { value: "approved", label: tr("Đã duyệt") },
              { value: "pending", label: tr("Chờ duyệt") },
              { value: "rejected", label: tr("Từ chối") }
            ]}
          />
        </TableToolbar>

        <DataTable
          label={tr("Ngân hàng câu hỏi")}
          rows={questions}
          rowKey={(row) => row.id}
          loading={loading}
          filtered={hasFilters}
          searchTerm={search.trim()}
          onClearFilters={clearFilters}
          emptyMessage={tr("Chưa có câu hỏi nào")}
          emptyHint={tr("Bấm “Thêm câu hỏi” để tạo thủ công hoặc sinh bằng AI.")}
          pagination={{ page: meta.current_page, perPage: meta.per_page, total: meta.total, onPageChange: setPage }}
          sort={serverSort.sort}
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
                {tr("Xoá đã chọn")}
              </button>
            )
          }}
          columns={[
            { key: "text", sortKey: "question_text", header: tr("Câu hỏi"), width: "38%", render: (row) => <strong>{row.question_text.slice(0, 80)}</strong> },
            {
              key: "meta",
              header: tr("Thông tin"),
              width: "27%",
              render: (row) => (
                <span style={{ color: "var(--muted)", fontSize: 13 }}>
                  {row.topic_name ?? tr("Không thuộc chủ đề")} · {DIFFICULTY_LABEL[row.difficulty]} · {row.source === "ai" ? tr("Sinh bởi AI") : tr("Thủ công")}
                </span>
              )
            },
            {
              key: "status",
              sortKey: "status",
              header: tr("Trạng thái"),
              width: "13%",
              render: (row) => <span className={`badge ${STATUS_BADGE[row.status]}`}>{statusLabel(REVIEW_STATUS_LABEL, row.status)}</span>
            },
            {
              key: "actions",
              header: tr("Thao tác"),
              actions: true,
              width: "220px",
              render: (row) => (
                <div className="controlRow" style={{ margin: 0, justifyContent: "flex-end" }}>
                  {row.status === "pending" ? (
                    <>
                      <button className="iconButton" title={tr("Duyệt")} aria-label={tr("Duyệt câu hỏi")} onClick={() => setConfirmAction({ type: "approve", question: row })}>
                        <Check size={16} aria-hidden="true" />
                      </button>
                      <button className="iconButton" title={tr("Từ chối")} aria-label={tr("Từ chối câu hỏi")} onClick={() => setConfirmAction({ type: "reject", question: row })}>
                        <X size={16} aria-hidden="true" />
                      </button>
                    </>
                  ) : null}
                  <button className="iconButton" title={tr("Xem trước")} aria-label={tr("Xem trước câu hỏi")} onClick={() => setPreviewQuestion(row)}>
                    <Eye size={16} aria-hidden="true" />
                  </button>
                  <Link className="iconButton" href={`/dashboard/questions/${row.id}/edit`} title={tr("Sửa")} aria-label={tr("Sửa câu hỏi")}>
                    <Pencil size={16} aria-hidden="true" />
                  </Link>
                  <button className="iconButton" title={tr("Xoá")} aria-label={tr("Xoá câu hỏi")} onClick={() => setConfirmAction({ type: "delete", question: row })}>
                    <Trash2 size={16} aria-hidden="true" />
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
        title={tr("Xoá các câu hỏi đã chọn?")}
        description={tr("Xoá {0} câu hỏi?", selectedIds.size)}
        confirmLabel={tr("Xoá")}
        danger
        loading={isProcessing}
        onCancel={() => setBulkDeleteOpen(false)}
        onConfirm={handleBulkDelete}
      />

      <QuestionPreviewModal question={previewQuestion} onClose={() => setPreviewQuestion(null)} />
    </>
  );
}
