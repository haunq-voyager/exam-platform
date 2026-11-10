"use client";

import { useMemo, useState } from "react";
import type { DataTableSort, SortDirection } from "../components/DataTable";

/** Sort state of a table whose rows are sorted by the API: `params` go into the request, `sort` into <DataTable>. */
export function useServerSort(onChange?: () => void) {
  const [sortBy, setSortBy] = useState<string | null>(null);
  const [direction, setDirection] = useState<SortDirection>("asc");

  const sort: DataTableSort = {
    key: sortBy,
    direction,
    onChange: (key, next) => {
      setSortBy(key);
      setDirection(next);
      onChange?.();
    }
  };
  const params = useMemo(() => (sortBy ? { sort_by: sortBy, sort_order: direction } : {}), [sortBy, direction]);

  return { sort, params };
}
