"use client";


import { tr } from "../lib/i18n";
import { Fragment, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, SearchX, Inbox, X } from "lucide-react";

export interface DataTableColumn<T> {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
  width?: string;
  /** Right-aligned, tabular figures: for counts and scores. */
  numeric?: boolean;
  /** Makes the header sortable. Client tables: a key of the sorters; server tables: the API's `sort_by` value. */
  sortKey?: string;
  /** Buttons / icon actions: right-aligned and never wrapped. */
  actions?: boolean;
}

export type SortDirection = "asc" | "desc";

export interface DataTableSort {
  /** `sortKey` of the column the table is sorted by; null = the default order. */
  key: string | null;
  direction: SortDirection;
  onChange: (key: string | null, direction: SortDirection) => void;
}

/** Click cycle of a header: ascending → descending → back to the default order. */
export function nextSort(sort: Pick<DataTableSort, "key" | "direction">, key: string): [string | null, SortDirection] {
  if (sort.key !== key) return [key, "asc"];
  return sort.direction === "asc" ? [key, "desc"] : [null, "asc"];
}

export interface DataTablePagination {
  page: number;
  perPage: number;
  total: number;
  onPageChange: (page: number) => void;
  /** When given, a "rows per page" select is shown. */
  onPerPageChange?: (perPage: number) => void;
  pageSizes?: number[];
}

export interface DataTableSelection<T> {
  selectedIds: Set<number>;
  onToggle: (id: number) => void;
  onToggleAll: (checked: boolean) => void;
  getId: (row: T) => number;
  bulkActions?: React.ReactNode;
  /** "Bỏ chọn" in the bulk bar; defaults to onToggleAll(false). Use when the selection spans several pages. */
  onClear?: () => void;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string | number;
  /** Accessible name of the table (read by screen readers, not shown). */
  label?: string;
  loading?: boolean;
  /** Text of the empty state when nothing exists yet. */
  emptyMessage?: string;
  emptyHint?: string;
  /** True when search/filters are active: the empty state then offers to clear them instead. */
  filtered?: boolean;
  searchTerm?: string;
  onClearFilters?: () => void;
  pagination?: DataTablePagination;
  selection?: DataTableSelection<T>;
  /** Extra full-width row rendered under a row; return null/false for rows that are collapsed. */
  expandedRow?: (row: T) => React.ReactNode;
  /** Sorting state; columns with a `sortKey` get a clickable header. */
  sort?: DataTableSort;
  /** Extra attributes for a row (drag and drop handlers, a state class...). `className` is added to the row's own. */
  rowProps?: (row: T) => React.HTMLAttributes<HTMLTableRowElement> & { draggable?: boolean };
  /** Built-in expandable rows: a chevron button per row toggles `render(row)` under it. */
  expandable?: { render: (row: T) => React.ReactNode; canExpand?: (row: T) => boolean; defaultExpandedKey?: string | number };
}

const DEFAULT_PAGE_SIZES = [10, 15, 25, 50];

/** Page numbers with ellipses: 1 … 4 5 [6] 7 8 … 20 */
function pageItems(current: number, last: number): (number | "gap-start" | "gap-end")[] {
  if (last <= 7) return Array.from({ length: last }, (_, index) => index + 1);
  const items: (number | "gap-start" | "gap-end")[] = [1];
  const from = Math.max(2, current - 1);
  const to = Math.min(last - 1, current + 1);
  if (from > 2) items.push("gap-start");
  for (let page = from; page <= to; page += 1) items.push(page);
  if (to < last - 1) items.push("gap-end");
  items.push(last);
  return items;
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  label = tr("Bảng dữ liệu"),
  loading,
  emptyMessage = tr("Chưa có dữ liệu."),
  emptyHint,
  filtered = false,
  searchTerm,
  onClearFilters,
  pagination,
  selection,
  expandedRow,
  rowProps,
  sort,
  expandable
}: DataTableProps<T>) {
  const [expandedKeys, setExpandedKeys] = useState<Set<string | number>>(new Set(expandable?.defaultExpandedKey !== undefined ? [expandable.defaultExpandedKey] : []));
  const allOnPageSelected = selection ? rows.length > 0 && rows.every((row) => selection.selectedIds.has(selection.getId(row))) : false;
  const lastPage = pagination ? Math.max(1, Math.ceil(pagination.total / pagination.perPage)) : 1;
  const extraColumns = (selection ? 1 : 0) + (expandable ? 1 : 0);
  const skeletonRows = useMemo(() => Array.from({ length: Math.min(pagination?.perPage ?? 6, 8) }, (_, index) => index), [pagination?.perPage]);

  function toggleExpanded(key: string | number) {
    setExpandedKeys((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const from = pagination && pagination.total > 0 ? (pagination.page - 1) * pagination.perPage + 1 : 0;
  const to = pagination ? Math.min(pagination.total, pagination.page * pagination.perPage) : 0;

  return (
    <div>
      {selection && selection.selectedIds.size > 0 ? (
        <div className="bulkBar">
          <span>
            {tr("Đã chọn")} <strong>{selection.selectedIds.size}</strong> {tr("mục")}
          </span>
          <div className="bulkBarActions">
            {selection.bulkActions}
            <button className="iconButton" title={tr("Bỏ chọn")} aria-label={tr("Bỏ chọn tất cả")} onClick={() => (selection.onClear ? selection.onClear() : selection.onToggleAll(false))}>
              <X size={16} />
            </button>
          </div>
        </div>
      ) : null}

      {/* Announces the result count after a search / filter / page change. */}
      <p className="srOnly" role="status">
        {loading ? tr("Đang tải dữ liệu") : pagination ? tr("{0} kết quả", pagination.total) : tr("{0} kết quả", rows.length)}
      </p>

      {loading ? (
        <div className="tableWrap" aria-busy="true">
          <table className="table" aria-label={label}>
            <thead>
              <tr>
                {Array.from({ length: columns.length + extraColumns }, (_, index) => (
                  <th key={index}>
                    <span className="skeletonCell" style={{ width: "60%" }} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {skeletonRows.map((row) => (
                <tr key={row}>
                  {Array.from({ length: columns.length + extraColumns }, (_, index) => (
                    <td key={index}>
                      <span className="skeletonCell" style={{ width: `${55 + ((row + index) % 4) * 10}%` }} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : rows.length === 0 ? (
        <div className="emptyState tableWrap" style={{ padding: "40px 16px" }}>
          {filtered ? <SearchX size={32} color="#64748b" aria-hidden="true" /> : <Inbox size={32} color="#64748b" aria-hidden="true" />}
          <strong>{filtered ? (searchTerm ? tr("Không có kết quả cho “{0}”", searchTerm) : tr("Không có kết quả phù hợp bộ lọc")) : emptyMessage}</strong>
          {filtered ? <p>{tr("Thử đổi từ khóa hoặc bỏ bớt bộ lọc.")}</p> : emptyHint ? <p>{emptyHint}</p> : null}
          {filtered && onClearFilters ? (
            <button className="approveButton" onClick={onClearFilters}>
              {tr("Xóa bộ lọc")}
            </button>
          ) : null}
        </div>
      ) : (
        <div className="tableWrap">
          <table className="table" aria-label={label}>
            <thead>
              <tr>
                {expandable ? (
                  <th style={{ width: 44 }}>
                    <span className="srOnly">{tr("Mở rộng")}</span>
                  </th>
                ) : null}
                {selection ? (
                  <th style={{ width: 44 }}>
                    <input type="checkbox" checked={allOnPageSelected} onChange={(event) => selection.onToggleAll(event.target.checked)} aria-label={tr("Chọn tất cả các dòng trong trang")} />
                  </th>
                ) : null}
                {columns.map((column) => {
                  const sorted = sort && column.sortKey !== undefined && sort.key === column.sortKey ? sort.direction : null;
                  return (
                    <th
                      key={column.key}
                      scope="col"
                      className={column.numeric || column.actions ? "num" : undefined}
                      style={column.width ? { width: column.width } : undefined}
                      aria-sort={sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : column.sortKey !== undefined ? "none" : undefined}
                    >
                      {sort && column.sortKey !== undefined ? (
                        <button
                          type="button"
                          className={sorted ? "sortButton active" : "sortButton"}
                          onClick={() => sort.onChange(...nextSort(sort, column.sortKey as string))}
                          title={tr("Sắp xếp theo {0}", column.header.toLowerCase())}
                        >
                          {column.header}
                          {sorted === "asc" ? <ArrowUp size={13} aria-hidden="true" /> : sorted === "desc" ? <ArrowDown size={13} aria-hidden="true" /> : <ArrowUpDown size={13} aria-hidden="true" />}
                        </button>
                      ) : (
                        column.header
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="tableBody">
              {rows.map((row) => {
                const key = rowKey(row);
                const id = selection?.getId(row);
                const canExpand = expandable ? (expandable.canExpand ? expandable.canExpand(row) : true) : false;
                const open = canExpand && expandedKeys.has(key);
                const expanded = open ? expandable?.render(row) : expandedRow?.(row);
                const extra = rowProps?.(row);
                return (
                  <Fragment key={key}>
                    <tr {...extra} className={`rowEnter ${extra?.className ?? ""}`.trim()}>
                      {expandable ? (
                        <td>
                          {canExpand ? (
                            <button className="rowToggle" aria-expanded={open} aria-label={open ? tr("Thu gọn dòng") : tr("Mở rộng dòng")} onClick={() => toggleExpanded(key)}>
                              <ChevronRight size={16} />
                            </button>
                          ) : null}
                        </td>
                      ) : null}
                      {selection ? (
                        <td>
                          <input type="checkbox" checked={id !== undefined && selection.selectedIds.has(id)} onChange={() => id !== undefined && selection.onToggle(id)} aria-label={tr("Chọn dòng này")} />
                        </td>
                      ) : null}
                      {columns.map((column) => (
                        <td key={column.key} className={column.actions ? "cellActions" : column.numeric ? "num" : undefined}>
                          {column.render(row)}
                        </td>
                      ))}
                    </tr>
                    {expanded ? (
                      <tr className="expandedRow">
                        <td colSpan={columns.length + extraColumns}>{expanded}</td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {pagination && pagination.total > 0 && !loading ? (
        <nav className="pager" aria-label={tr("Phân trang")}>
          <span>
            {tr("Hiển thị")} <strong>{from}–{to}</strong> / {pagination.total}
            {pagination.onPerPageChange ? (
              <label className="pagerSize">
                {" "}
                {tr("· Mỗi trang")}
                <select value={pagination.perPage} onChange={(event) => pagination.onPerPageChange?.(Number(event.target.value))} aria-label={tr("Số dòng mỗi trang")}>
                  {(pagination.pageSizes ?? DEFAULT_PAGE_SIZES).map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </span>
          {lastPage > 1 ? (
            <div className="pagerControls">
              <button className="pagerButton" onClick={() => pagination.onPageChange(1)} disabled={pagination.page <= 1} aria-label={tr("Trang đầu")}>
                <ChevronsLeft size={16} />
              </button>
              <button className="pagerButton" onClick={() => pagination.onPageChange(pagination.page - 1)} disabled={pagination.page <= 1} aria-label={tr("Trang trước")}>
                <ChevronLeft size={16} />
              </button>
              {pageItems(pagination.page, lastPage).map((item) =>
                typeof item === "number" ? (
                  <button
                    key={item}
                    className="pagerButton"
                    aria-current={item === pagination.page ? "page" : undefined}
                    aria-label={`Trang ${item}`}
                    onClick={() => pagination.onPageChange(item)}
                  >
                    {item}
                  </button>
                ) : (
                  <span key={item} aria-hidden="true" style={{ padding: "0 4px" }}>
                    …
                  </span>
                )
              )}
              <button className="pagerButton" onClick={() => pagination.onPageChange(pagination.page + 1)} disabled={pagination.page >= lastPage} aria-label={tr("Trang sau")}>
                <ChevronRight size={16} />
              </button>
              <button className="pagerButton" onClick={() => pagination.onPageChange(lastPage)} disabled={pagination.page >= lastPage} aria-label={tr("Trang cuối")}>
                <ChevronsRight size={16} />
              </button>
            </div>
          ) : null}
        </nav>
      ) : null}
    </div>
  );
}
