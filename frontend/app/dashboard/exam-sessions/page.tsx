"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Play, Plus, Search, Square, Users } from "lucide-react";
import { api } from "../../../lib/api-client";
import { DataTable } from "../../../components/DataTable";
import { ConfirmDialog } from "../../../components/ConfirmDialog";
import { metaOf, type PaginatedResponse } from "../../../lib/pagination";
import { useToast } from "../../../lib/toast";
import { EXAM_STATUS_LABEL, statusLabel } from "../../../lib/status-labels";
import type { ExamSession } from "../../../lib/types";

const STATUS_BADGE: Record<string, string> = { draft: "blue", scheduled: "amber", open: "green", closed: "red" };

type ConfirmAction = { type: "publish" | "close"; session: ExamSession } | null;

export default function ExamSessionsPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [sessions, setSessions] = useState<ExamSession[]>([]);
  const [meta, setMeta] = useState({ current_page: 1, per_page: 15, total: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get<PaginatedResponse<ExamSession>>("/exam-sessions", {
        search,
        status: statusFilter || undefined,
        page,
        per_page: 15
      });
      setSessions(response.data);
      setMeta(metaOf(response));
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, page]);

  useEffect(() => {
    load();
  }, [load]);

  async function runConfirmedAction() {
    if (!confirmAction) return;
    setIsProcessing(true);
    try {
      if (confirmAction.type === "publish") {
        await api.post(`/exam-sessions/${confirmAction.session.id}/publish`);
        showToast(`Đã mở kỳ thi "${confirmAction.session.title}".`);
      } else {
        await api.post(`/exam-sessions/${confirmAction.session.id}/close`);
        showToast(`Đã đóng kỳ thi "${confirmAction.session.title}".`);
      }
      setConfirmAction(null);
      await load();
    } catch {
      showToast("Không thể thực hiện thao tác.", "error");
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <>
      <header className="topbar">
        <div>
          <p className="eyebrow">Lịch thi</p>
          <h1>Danh sách kỳ thi</h1>
        </div>
        <button className="primaryButton" onClick={() => router.push("/dashboard/exam-sessions/new")}>
          <Plus size={18} />
          Tạo kỳ thi
        </button>
      </header>

      <div className="toolbar">
        <div className="controlRow" style={{ margin: 0 }}>
          <label className="searchField">
            <Search size={17} />
            <input
              value={search}
              onChange={(event) => {
                setPage(1);
                setSearch(event.target.value);
              }}
              placeholder="Tìm kỳ thi..."
            />
          </label>
          <label className="field compact" style={{ width: 180 }}>
            <span>Trạng thái</span>
            <select
              value={statusFilter}
              onChange={(event) => {
                setPage(1);
                setStatusFilter(event.target.value);
              }}
            >
              <option value="">Tất cả</option>
              <option value="draft">Bản nháp</option>
              <option value="scheduled">Sắp diễn ra</option>
              <option value="open">Đang mở</option>
              <option value="closed">Đã đóng</option>
            </select>
          </label>
        </div>
      </div>

      <section className="panel">
        <DataTable
          rows={sessions}
          rowKey={(row) => row.id}
          loading={loading}
          emptyMessage="Chưa có kỳ thi nào. Tạo kỳ thi từ một đề thi có sẵn để mở cho thí sinh."
          pagination={{ page: meta.current_page, perPage: meta.per_page, total: meta.total, onPageChange: setPage }}
          columns={[
            { key: "title", header: "Kỳ thi", render: (row) => <strong>{row.title}</strong> },
            { key: "exam", header: "Đề thi", render: (row) => row.exam_title },
            {
              key: "status",
              header: "Trạng thái",
              render: (row) => <span className={`badge ${STATUS_BADGE[row.status]}`}>{statusLabel(EXAM_STATUS_LABEL, row.status)}</span>
            },
            {
              key: "start_at",
              header: "Thời gian",
              render: (row) => (row.start_at ? new Date(row.start_at).toLocaleString("vi-VN") : "Chưa đặt lịch")
            },
            { key: "students", header: "Thí sinh", render: (row) => row.assigned_student_count ?? 0 },
            {
              key: "actions",
              header: "",
              render: (row) => (
                <div className="controlRow" style={{ margin: 0, justifyContent: "flex-end" }}>
                  {row.status !== "open" ? (
                    <button className="iconButton" title="Mở kỳ thi" onClick={() => setConfirmAction({ type: "publish", session: row })}>
                      <Play size={16} />
                    </button>
                  ) : (
                    <button className="iconButton" title="Đóng kỳ thi" onClick={() => setConfirmAction({ type: "close", session: row })}>
                      <Square size={16} />
                    </button>
                  )}
                  <Link className="iconButton" href={`/dashboard/exam-sessions/${row.id}`} title="Quản lý thí sinh & giảng viên">
                    <Users size={16} />
                  </Link>
                </div>
              )
            }
          ]}
        />
      </section>

      <ConfirmDialog
        open={confirmAction !== null}
        title={confirmAction?.type === "publish" ? "Mở kỳ thi?" : "Đóng kỳ thi?"}
        description={
          confirmAction
            ? confirmAction.type === "publish"
              ? `Mở "${confirmAction.session.title}" cho thí sinh được gán vào làm bài ngay?`
              : `Đóng "${confirmAction.session.title}"? Thí sinh sẽ không thể bắt đầu làm bài mới sau khi đóng.`
            : undefined
        }
        confirmLabel={confirmAction?.type === "publish" ? "Mở kỳ thi" : "Đóng kỳ thi"}
        danger={confirmAction?.type === "close"}
        loading={isProcessing}
        onCancel={() => setConfirmAction(null)}
        onConfirm={runConfirmedAction}
      />
    </>
  );
}
