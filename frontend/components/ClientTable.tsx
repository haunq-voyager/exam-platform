"use client";


import { tr } from "../lib/i18n";
import { useCallback } from "react";
import { DataTable, type DataTableColumn, type DataTableProps } from "./DataTable";
import { TableToolbar } from "./TableToolbar";
import { useClientTable } from "../lib/use-client-table";

interface ClientTableProps<T> {
  rows: T[];
  columns: DataTableColumn<T>[];
  rowKey: (row: T) => string | number;
  /** Accessible name of the table. */
  label?: string;
  loading?: boolean;
  emptyMessage?: string;
  emptyHint?: string;
  /** The text a row is searched by; omit to hide the search box. */
  searchText?: (row: T) => string;
  searchPlaceholder?: string;
  /** Extra filter controls shown next to the search box. Rows must already be filtered by the parent. */
  filters?: React.ReactNode;
  /** True when the parent's own filters are active (enables "Xóa bộ lọc" and the filtered empty state). */
  filtersActive?: boolean;
  /** Called by "Xóa bộ lọc" so the parent can clear its own filters. */
  onResetFilters?: () => void;
  /** Primary actions shown at the end of the toolbar. */
  toolbarEnd?: React.ReactNode;
  pageSize?: number;
  expandedRow?: DataTableProps<T>["expandedRow"];
  rowProps?: DataTableProps<T>["rowProps"];
  /** What each sortable column (those with a `sortKey`) is ordered by. */
  sorters?: Record<string, (row: T) => string | number | boolean | null | undefined>;
  expandable?: DataTableProps<T>["expandable"];
}

/** A table over rows that are already in memory: search box, optional filters and client-side pagination. */
export function ClientTable<T>({
  rows,
  columns,
  rowKey,
  label,
  loading,
  emptyMessage,
  emptyHint,
  searchText,
  searchPlaceholder = tr("Tìm kiếm…"),
  filters,
  filtersActive = false,
  onResetFilters,
  toolbarEnd,
  pageSize = 10,
  expandedRow,
  rowProps,
  sorters,
  expandable
}: ClientTableProps<T>) {
  const matches = useCallback((row: T, query: string) => (searchText ? searchText(row).toLowerCase().includes(query) : true), [searchText]);
  const table = useClientTable(rows, { matches, initialPageSize: pageSize, sorters });
  const searching = Boolean(table.query.trim());
  const active = searching || filtersActive;
  const reset = () => {
    table.reset();
    onResetFilters?.();
  };

  return (
    <>
      {searchText || filters || toolbarEnd ? (
        <TableToolbar
          search={searchText ? { value: table.query, onChange: table.setQuery, placeholder: searchPlaceholder, label: searchPlaceholder } : undefined}
          active={active}
          onReset={reset}
          end={toolbarEnd}
        >
          {filters}
        </TableToolbar>
      ) : null}
      <DataTable
        label={label}
        rows={table.visible}
        columns={columns}
        rowKey={rowKey}
        loading={loading}
        filtered={active}
        searchTerm={table.query.trim()}
        onClearFilters={reset}
        emptyMessage={emptyMessage}
        emptyHint={emptyHint}
        pagination={table.pagination}
        expandedRow={expandedRow}
        rowProps={rowProps}
        sort={sorters ? table.sort : undefined}
        expandable={expandable}
      />
    </>
  );
}
