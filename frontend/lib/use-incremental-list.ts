"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Renders a long list in slices: the first `pageSize` items immediately, then more whenever the returned sentinel
 * scrolls into view (inside its scroll container). The slice resets when `resetKey` changes (e.g. a new filter).
 */
export function useIncrementalList<T>(items: T[], pageSize: number, resetKey: string) {
  const [count, setCount] = useState(pageSize);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    setCount(pageSize);
  }, [resetKey, pageSize]);

  const hasMore = count < items.length;

  // Callback ref: (re)creates the observer whenever the sentinel element mounts.
  const sentinelRef = useCallback(
    (node: HTMLDivElement | null) => {
      observerRef.current?.disconnect();
      observerRef.current = null;
      if (!node) return;
      const observer = new IntersectionObserver((entries) => {
        if (entries.some((entry) => entry.isIntersecting)) setCount((current) => current + pageSize);
      });
      observer.observe(node);
      observerRef.current = observer;
    },
    [pageSize]
  );

  return { visible: items.slice(0, count), hasMore, sentinelRef, total: items.length };
}
