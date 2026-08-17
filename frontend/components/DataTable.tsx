"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";

export interface DataTableColumn<T> {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
  width?: string;
}

export interface DataTablePagination {
  page: number;
  perPage: number;
  total: number;
  onPageChange: (page: number) => void;
}

export interface DataTableSelection<T> {
  selectedIds: Set<number>;
  onToggle: (id: number) => void;
  onToggleAll: (checked: boolean) => void;
  getId: (row: T) => number;
  bulkActions?: React.ReactNode;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string | number;
  loading?: boolean;
  emptyMessage?: string;
  pagination?: DataTablePagination;
  selection?: DataTableSelection<T>;
}

export function DataTable<T>({ columns, rows, rowKey, loading, emptyMessage = "Không có dữ liệu.", pagination, selection }: DataTableProps<T>) {
  const allOnPageSelected = selection ? rows.length > 0 && rows.every((row) => selection.selectedIds.has(selection.getId(row))) : false;
  const lastPage = pagination ? Math.max(1, Math.ceil(pagination.total / pagination.perPage)) : 1;

  return (
    <div>
      {selection && selection.selectedIds.size > 0 ? (
        <div className="bulkBar">
          <span>
            Đã chọn <strong>{selection.selectedIds.size}</strong> mục
          </span>
          <div className="bulkBarActions">
            {selection.bulkActions}
            <button className="iconButton" title="Bỏ chọn" onClick={() => selection.onToggleAll(false)}>
              <X size={16} />
            </button>
          </div>
        </div>
      ) : null}

      {loading ? (
        <div className="emptyState">Đang tải...</div>
      ) : rows.length === 0 ? (
        <div className="emptyState">{emptyMessage}</div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table className="table">
            <thead>
              <tr>
                {selection ? (
                  <th style={{ width: 40 }}>
                    <input
                      type="checkbox"
                      checked={allOnPageSelected}
                      onChange={(event) => selection.onToggleAll(event.target.checked)}
                      aria-label="Chọn tất cả"
                    />
                  </th>
                ) : null}
                {columns.map((column) => (
                  <th key={column.key} style={column.width ? { width: column.width } : undefined}>
                    {column.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const id = selection?.getId(row);
                return (
                  <tr key={rowKey(row)}>
                    {selection ? (
                      <td>
                        <input
                          type="checkbox"
                          checked={id !== undefined && selection.selectedIds.has(id)}
                          onChange={() => id !== undefined && selection.onToggle(id)}
                          aria-label="Chọn dòng"
                        />
                      </td>
                    ) : null}
                    {columns.map((column) => (
                      <td key={column.key}>{column.render(row)}</td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {pagination && pagination.total > 0 ? (
        <div className="tablePagination">
          <span>
            Trang {pagination.page} / {lastPage} · {pagination.total} kết quả
          </span>
          <div className="controlRow" style={{ margin: 0 }}>
            <button
              className="iconButton"
              onClick={() => pagination.onPageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              title="Trang trước"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              className="iconButton"
              onClick={() => pagination.onPageChange(pagination.page + 1)}
              disabled={pagination.page >= lastPage}
              title="Trang sau"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
