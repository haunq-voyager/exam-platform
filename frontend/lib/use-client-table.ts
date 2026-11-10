"use client";

import { useEffect, useMemo, useState } from "react";
import type { SortDirection } from "../components/DataTable";

type SortValue = string | number | boolean | null | undefined;

interface Options<T> {
  /** Does this row match the (trimmed, lower-cased) search text? */
  matches: (row: T, query: string) => boolean;
  initialPageSize?: number;
  /** What each sortable column is ordered by, keyed by the column's `sortKey`. */
  sorters?: Record<string, (row: T) => SortValue>;
}

const collator = new Intl.Collator("vi", { numeric: true, sensitivity: "base" });

function compare(a: SortValue, b: SortValue): number {
  if (a === null || a === undefined || a === "") return b === null || b === undefined || b === "" ? 0 : 1; // empty values last
  if (b === null || b === undefined || b === "") return -1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return collator.compare(String(a), String(b));
}

/** Search + sort + paginate a list that is already in memory, with the same state a server-side table keeps. */
export function useClientTable<T>(rows: T[], { matches, initialPageSize = 10, sorters }: Options<T>) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [direction, setDirection] = useState<SortDirection>("asc");

  const normalized = query.trim().toLowerCase();
  const filtered = useMemo(() => (normalized ? rows.filter((row) => matches(row, normalized)) : rows), [rows, normalized, matches]);

  const sorted = useMemo(() => {
    const sorter = sortKey && sorters ? sorters[sortKey] : undefined;
    if (!sorter) return filtered;
    const factor = direction === "asc" ? 1 : -1;
    // Array.prototype.sort is stable, so equal rows keep their original order.
    return [...filtered].sort((a, b) => {
      const left = sorter(a);
      const right = sorter(b);
      const empty = (value: SortValue) => value === null || value === undefined || value === "";
      // Empty values stay last in both directions.
      if (empty(left) || empty(right)) return compare(left, right);
      return compare(left, right) * factor;
    });
  }, [filtered, sorters, sortKey, direction]);

  // Any change of the result set (search text, new data, page size, order) starts again from the first page.
  useEffect(() => {
    setPage(1);
  }, [normalized, rows, pageSize, sortKey, direction]);

  const lastPage = Math.max(1, Math.ceil(sorted.length / pageSize));
  const current = Math.min(page, lastPage);
  const visible = useMemo(() => sorted.slice((current - 1) * pageSize, current * pageSize), [sorted, current, pageSize]);

  return {
    query,
    setQuery,
    /** Rows after search/filters, before paging (for counts). */
    filtered,
    visible,
    pagination: { page: current, perPage: pageSize, total: sorted.length, onPageChange: setPage, onPerPageChange: setPageSize },
    /** Pass to `<DataTable sort={...}>` (only when `sorters` was given). */
    sort: {
      key: sortKey,
      direction,
      onChange: (key: string | null, next: SortDirection) => {
        setSortKey(key);
        setDirection(next);
      }
    },
    reset: () => {
      setQuery("");
      setPage(1);
    }
  };
}
