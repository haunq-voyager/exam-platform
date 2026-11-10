"use client";


import { formatDate } from "../lib/format-date";
import { tr } from "../lib/i18n";
import { useCallback, useEffect, useRef, useState } from "react";
import { BadgeCheck, Bell, BellOff, CalendarClock, CheckCheck, ScanEye } from "lucide-react";
import { api } from "../lib/api-client";
import { useRouter } from "../lib/use-role-router";
import type { AppNotification } from "../lib/types";

const POLL_MS = 60_000;

function iconFor(type: string) {
  if (type.startsWith("approval")) return BadgeCheck;
  if (type.startsWith("proctor")) return ScanEye;
  return CalendarClock;
}

/** "5 phút trước", "2 giờ trước", "3 ngày trước", then the date. */
function timeAgo(value: string): string {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return tr("Vừa xong");
  if (seconds < 3600) return tr("{0} phút trước", Math.floor(seconds / 60));
  if (seconds < 86400) return tr("{0} giờ trước", Math.floor(seconds / 3600));
  if (seconds < 7 * 86400) return tr("{0} ngày trước", Math.floor(seconds / 86400));
  return formatDate(value);
}

/** The bell in the top bar: unread count, the latest notifications, and a link for each. Refreshes every minute. */
export function NotificationBell() {
  const router = useRouter();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const response = await api.get<{ data: { unread_count: number; items: AppNotification[] } }>("/notifications");
      setItems(response.data.items);
      setUnread(response.data.unread_count);
    } catch {
      // The bell is a convenience: a failed refresh keeps what is already shown.
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    load();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [load]);

  // Close on outside click and Escape.
  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function openItem(item: AppNotification) {
    setOpen(false);
    if (!item.is_read) {
      setItems((current) => current.map((entry) => (entry.id === item.id ? { ...entry, is_read: true } : entry)));
      setUnread((count) => Math.max(0, count - 1));
      api.post(`/notifications/${item.id}/read`).catch(() => undefined);
    }
    if (item.url) router.push(item.url);
  }

  async function markAllRead() {
    setItems((current) => current.map((entry) => ({ ...entry, is_read: true })));
    setUnread(0);
    api.post("/notifications/read-all").catch(() => load());
  }

  return (
    <div className="bellWrap" ref={wrapRef}>
      <button
        type="button"
        className="bellButton"
        onClick={() => {
          setOpen((value) => !value);
          if (!open) load();
        }}
        aria-label={unread > 0 ? tr("Thông báo, {0} chưa đọc", unread) : tr("Thông báo")}
        aria-haspopup="true"
        aria-expanded={open}
      >
        <Bell size={19} aria-hidden="true" />
        {unread > 0 ? <span className="bellBadge">{unread > 99 ? "99+" : unread}</span> : null}
      </button>

      {open ? (
        <div className="bellPanel" role="region" aria-label={tr("Thông báo")}>
          <div className="bellPanelHeader">
            <strong>{tr("Thông báo")}</strong>
            <button type="button" className="linkButton" onClick={markAllRead} disabled={unread === 0}>
              <CheckCheck size={15} aria-hidden="true" />
              {tr("Đánh dấu đã đọc")}
            </button>
          </div>

          {!loaded ? (
            <p className="bellEmpty" role="status">{tr("Đang tải…")}</p>
          ) : items.length === 0 ? (
            <div className="bellEmpty">
              <BellOff size={26} aria-hidden="true" />
              <strong>{tr("Chưa có thông báo")}</strong>
              <span>{tr("Kỳ thi cần duyệt, kỳ thi sắp diễn ra và các nhắc nhở sẽ hiện ở đây.")}</span>
            </div>
          ) : (
            <ul className="bellList">
              {items.map((item) => {
                const Icon = iconFor(item.type);
                return (
                  <li key={item.id}>
                    <button type="button" className={item.is_read ? "bellItem" : "bellItem unread"} onClick={() => openItem(item)}>
                      <span className="bellItemIcon" aria-hidden="true">
                        <Icon size={17} />
                      </span>
                      <span className="bellItemText">
                        <strong>{tr(item.title)}</strong>
                        {item.body ? <span>{item.body}</span> : null}
                        <time dateTime={item.created_at}>{timeAgo(item.created_at)}</time>
                      </span>
                      {item.is_read ? null : <span className="bellDot" aria-label={tr("Chưa đọc")} />}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
