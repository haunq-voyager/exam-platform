"use client";


import { formatDateTime } from "../../../lib/format-date";
import { tr } from "../../../lib/i18n";
import { useCallback, useEffect, useRef, useState } from "react";
import { RotateCcw, Save, Send } from "lucide-react";
import { api, ApiError } from "../../../lib/api-client";
import { ConfirmDialog } from "../../../components/ConfirmDialog";
import { DataTable } from "../../../components/DataTable";
import { PageHeader } from "../../../components/PageHeader";
import { ToggleSwitch } from "../../../components/SessionSwitch";
import { useAuth } from "../../../lib/auth-context";
import { can } from "../../../lib/permissions";
import { useToast } from "../../../lib/toast";
import type { MailPlaceholder, MailTemplate } from "../../../lib/types";

type Field = "subject" | "body_html" | "footer_text";
type Draft = Pick<MailTemplate, "subject" | "body_html" | "button_label" | "accent_color" | "footer_text" | "is_active" | "send_days_before">;

const fmt = (value: string | null) => (value ? formatDateTime(value) : tr("Mặc định"));

/** Whole number of days between 1 and 60, or null while the field is empty / out of range. */
function validDays(value: string): number | null {
  const days = Number(value);
  return /^d+$/.test(value) && days >= 1 && days <= 60 ? days : null;
}

/** An older value like "7,3,1" is shown as its first (largest) number. */
const firstDay = (value: string) => value.split(",")[0].trim() || "7";

const toDraft = (template: MailTemplate): Draft => ({
  subject: template.subject,
  body_html: template.body_html,
  button_label: template.button_label,
  accent_color: template.accent_color,
  footer_text: template.footer_text ?? "",
  is_active: template.is_active,
  send_days_before: firstDay(template.send_days_before)
});

export default function MailTemplatesPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [templates, setTemplates] = useState<MailTemplate[]>([]);
  const [placeholders, setPlaceholders] = useState<MailPlaceholder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [preview, setPreview] = useState<{ subject: string; html: string } | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const lastField = useRef<Field>("body_html");
  const fields = useRef<Record<Field, HTMLInputElement | HTMLTextAreaElement | null>>({ subject: null, body_html: null, footer_text: null });

  const selected = templates.find((template) => template.id === selectedId) ?? null;
  const dirty = Boolean(selected && draft && JSON.stringify(draft) !== JSON.stringify(toDraft(selected)));
  const days = draft ? validDays(draft.send_days_before) : null;

  const load = useCallback(async () => {
    try {
      const response = await api.get<{ data: { templates: MailTemplate[]; placeholders: MailPlaceholder[] } }>("/mail-templates");
      setTemplates(response.data.templates);
      setPlaceholders(response.data.placeholders);
      return response.data.templates;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load().then((list) => {
      if (list[0]) {
        setSelectedId(list[0].id);
        setDraft(toDraft(list[0]));
      }
    });
  }, [load]);

  // Live preview of the unsaved edits, rendered by the server with sample data (debounced).
  useEffect(() => {
    if (!selected || !draft) return;
    const timer = window.setTimeout(() => {
      api
        .post<{ data: { subject: string; html: string } }>(`/mail-templates/${selected.id}/preview`, { ...draft, send_days_before: undefined })
        .then((response) => {
          setPreview(response.data);
          setPreviewError(null);
        })
        .catch((err) => setPreviewError(err instanceof ApiError ? (Object.values(err.errors ?? {}).flat()[0] ?? err.message) : tr("Không thể xem trước.")));
    }, 500);
    return () => window.clearTimeout(timer);
  }, [selected, draft]);

  if (!can(user, "roles.manage")) {
    return <div className="emptyState">{tr("Bạn không có quyền chỉnh sửa mẫu email.")}</div>;
  }

  function select(template: MailTemplate) {
    if (dirty && !window.confirm(tr("Bạn có thay đổi chưa lưu. Bỏ thay đổi và chuyển mẫu khác?"))) return;
    setSelectedId(template.id);
    setDraft(toDraft(template));
    setError(null);
  }

  function patch(partial: Partial<Draft>) {
    setDraft((current) => (current ? { ...current, ...partial } : current));
  }

  /** Inserts {{placeholder}} where the caret is in the field that was edited last. */
  function insertPlaceholder(key: string) {
    const field = lastField.current;
    const element = fields.current[field];
    const token = `{{${key}}}`;
    if (!draft || !element) return;
    const start = element.selectionStart ?? draft[field]?.length ?? 0;
    const end = element.selectionEnd ?? start;
    const value = draft[field] ?? "";
    patch({ [field]: value.slice(0, start) + token + value.slice(end) } as Partial<Draft>);
    window.requestAnimationFrame(() => {
      element.focus();
      element.setSelectionRange(start + token.length, start + token.length);
    });
  }

  async function save() {
    if (!selected || !draft) return;
    setSaving(true);
    setError(null);
    try {
      await api.put(`/mail-templates/${selected.id}`, draft);
      const list = await load();
      const fresh = list.find((template) => template.id === selected.id);
      if (fresh) setDraft(toDraft(fresh));
      showToast(tr("Đã lưu mẫu email."));
    } catch (err) {
      setError(err instanceof ApiError ? (Object.values(err.errors ?? {}).flat()[0] ?? err.message) : tr("Không thể lưu mẫu email."));
    } finally {
      setSaving(false);
    }
  }

  async function sendTest() {
    if (!selected || !draft) return;
    setSending(true);
    try {
      const response = await api.post<{ data: { to: string } }>(`/mail-templates/${selected.id}/test`, { ...draft, send_days_before: undefined });
      showToast(tr("Đã gửi email thử tới {0}.", response.data.to));
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : tr("Không thể gửi email thử."), "error");
    } finally {
      setSending(false);
    }
  }

  async function reset() {
    if (!selected) return;
    setSaving(true);
    try {
      await api.post(`/mail-templates/${selected.id}/reset`);
      const list = await load();
      const fresh = list.find((template) => template.id === selected.id);
      if (fresh) setDraft(toDraft(fresh));
      setResetOpen(false);
      showToast(tr("Đã khôi phục mẫu mặc định."));
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : tr("Không thể khôi phục mẫu."), "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow={tr("Quản trị")}
        title={tr("Mẫu email")}
        description={tr("Chỉnh nội dung và giao diện các email hệ thống gửi đi. Dùng {{tên_biến}} để chèn thông tin kỳ thi; xem trước bên phải cập nhật ngay khi bạn gõ.")}
      />

      <section className="panel">
        <DataTable
          label={tr("Các mẫu email")}
          rows={templates}
          rowKey={(row) => row.id}
          loading={loading}
          emptyMessage={tr("Chưa có mẫu email nào")}
          rowProps={(row) => ({ className: row.id === selectedId ? "activeRow" : "" })}
          columns={[
            { key: "name", header: tr("Mẫu email"), render: (row) => (<div><strong>{tr(row.name)}</strong>{row.description ? <div className="cellSub" style={{ whiteSpace: "normal" }}>{tr(row.description)}</div> : null}</div>) },
            { key: "state", header: tr("Trạng thái"), render: (row) => <span className={`badge ${row.is_active ? "green" : "amber"}`}>{row.is_active ? tr("Đang gửi") : tr("Tạm tắt")}</span> },
            { key: "updated", header: tr("Cập nhật"), render: (row) => fmt(row.updated_at) },
            {
              key: "actions",
              header: tr("Thao tác"),
              actions: true,
              render: (row) => (
                <button className={row.id === selectedId ? "primaryButton" : "approveButton"} onClick={() => select(row)} aria-pressed={row.id === selectedId}>
                  {row.id === selectedId ? tr("Đang chỉnh sửa") : tr("Chỉnh sửa")}
                </button>
              )
            }
          ]}
        />
      </section>

      {selected && draft ? (
        <div className="mailEditor">
          <section className="panel">
            <div className="panelHeader">
              <div>
                <p className="eyebrow">{tr("Nội dung")}</p>
                <h2>{tr(selected.name)}</h2>
              </div>
              <span className="switchRow">
                <ToggleSwitch checked={draft.is_active} label={draft.is_active ? tr("Tắt gửi email này") : tr("Bật gửi email này")} onClick={() => patch({ is_active: !draft.is_active })} />
                {draft.is_active ? tr("Đang gửi") : tr("Tạm tắt")}
              </span>
            </div>

            {error ? <div className="formError" role="alert" style={{ marginBottom: 12 }}>{error}</div> : null}

            <div className="field" style={{ marginBottom: 14 }}>
              <label htmlFor="send-days">{tr("Gửi nhắc trước (ngày)")}</label>
              <input
                id="send-days"
                type="number"
                min={1}
                max={60}
                step={1}
                inputMode="numeric"
                value={draft.send_days_before}
                onChange={(event) => patch({ send_days_before: event.target.value.replace(/D/g, "") })}
                onKeyDown={(event) => {
                  // A whole number only: no decimal point, sign or exponent.
                  if ([".", ",", "-", "+", "e", "E"].includes(event.key)) event.preventDefault();
                }}
                aria-invalid={days === null ? true : undefined}
                aria-describedby="send-days-hint"
                style={{ maxWidth: 160 }}
              />
              <small id="send-days-hint" style={{ color: days === null ? "#b91c1c" : "var(--muted)", fontWeight: 500 }}>
                {days === null ? tr("Nhập số nguyên từ 1 đến 60.") : tr("Thí sinh nhận email khi kỳ thi còn {0} ngày nữa là bắt đầu.", days)}
              </small>
            </div>

            <label className="field">
              <span>{tr("Tiêu đề email")}</span>
              <input
                ref={(element) => {
                  fields.current.subject = element;
                }}
                value={draft.subject}
                onFocus={() => (lastField.current = "subject")}
                onChange={(event) => patch({ subject: event.target.value })}
                maxLength={255}
              />
            </label>

            <div className="field" style={{ marginTop: 14 }}>
              <span>{tr("Chèn thông tin (bấm để chèn vào ô đang soạn)")}</span>
              <div className="placeholderChips">
                {placeholders.map((item) => (
                  <button key={item.key} type="button" className="segment" onClick={() => insertPlaceholder(item.key)} title={tr("{0} - ví dụ: {1}", item.label, item.sample)}>
                    {`{{${item.key}}}`}
                  </button>
                ))}
              </div>
            </div>

            <label className="field" style={{ marginTop: 14 }}>
              <span>{tr("Nội dung (HTML)")}</span>
              <textarea
                ref={(element) => {
                  fields.current.body_html = element;
                }}
                className="textarea codeArea"
                rows={16}
                spellCheck={false}
                value={draft.body_html}
                onFocus={() => (lastField.current = "body_html")}
                onChange={(event) => patch({ body_html: event.target.value })}
              />
              <small style={{ color: "var(--muted)", fontWeight: 500 }}>{tr("Dùng các thẻ HTML cơ bản: p, strong, ul, li, table, a. Giá trị chèn vào đã được hệ thống tự làm an toàn.")}</small>
            </label>

            <div className="formGrid" style={{ marginTop: 14 }}>
              <label className="field">
                <span>{tr("Chữ trên nút (để trống nếu không cần nút)")}</span>
                <input value={draft.button_label} onChange={(event) => patch({ button_label: event.target.value })} maxLength={60} />
              </label>
              <div className="field">
                <label htmlFor="accent-hex">{tr("Màu chủ đạo")}</label>
                <span className="colorRow">
                  <input type="color" value={draft.accent_color} onChange={(event) => patch({ accent_color: event.target.value })} aria-label={tr("Chọn màu chủ đạo")} />
                  <input id="accent-hex" value={draft.accent_color} onChange={(event) => patch({ accent_color: event.target.value })} maxLength={7} spellCheck={false} />
                </span>
              </div>
            </div>

            <label className="field" style={{ marginTop: 14 }}>
              <span>{tr("Chân email")}</span>
              <textarea
                ref={(element) => {
                  fields.current.footer_text = element;
                }}
                className="textarea"
                rows={3}
                value={draft.footer_text ?? ""}
                onFocus={() => (lastField.current = "footer_text")}
                onChange={(event) => patch({ footer_text: event.target.value })}
              />
            </label>

            <div className="controlRow" style={{ marginBottom: 0, flexWrap: "wrap" }}>
              <button className="primaryButton" onClick={save} disabled={saving || !dirty || days === null} aria-busy={saving || undefined}>
                <Save size={16} aria-hidden="true" />
                {saving ? tr("Đang lưu…") : tr("Lưu thay đổi")}
              </button>
              <button className="approveButton" onClick={sendTest} disabled={sending} aria-busy={sending || undefined} title={tr("Gửi bản đang soạn tới {0}", user?.email)}>
                <Send size={16} aria-hidden="true" />
                {sending ? tr("Đang gửi…") : tr("Gửi thử cho tôi")}
              </button>
              <button className="approveButton" onClick={() => setResetOpen(true)} disabled={saving}>
                <RotateCcw size={16} aria-hidden="true" />
                {tr("Khôi phục mặc định")}
              </button>
              {dirty ? <span className="reviewEmpty" style={{ margin: 0 }}>{tr("Có thay đổi chưa lưu")}</span> : null}
            </div>
          </section>

          <section className="panel mailPreview">
            <div className="panelHeader">
              <div>
                <p className="eyebrow">{tr("Xem trước")}</p>
                <h2>{tr("Email thí sinh nhận được")}</h2>
              </div>
            </div>
            {previewError ? <div className="formError" role="alert">{previewError}</div> : null}
            {preview ? (
              <>
                <p className="mailSubject">
                  <span>{tr("Tiêu đề:")}</span> <strong>{preview.subject}</strong>
                </p>
                <iframe className="mailFrame" title={tr("Xem trước email")} sandbox="" srcDoc={preview.html} />
              </>
            ) : (
              <p className="reviewEmpty" role="status">{tr("Đang dựng bản xem trước…")}</p>
            )}
            <p className="reviewEmpty" style={{ marginBottom: 0 }}>{tr("Dữ liệu trong bản xem trước là dữ liệu mẫu.")}</p>
          </section>
        </div>
      ) : null}

      <ConfirmDialog
        open={resetOpen}
        title={tr("Khôi phục mẫu mặc định?")}
        description={tr("Nội dung và giao diện hiện tại của mẫu này sẽ bị thay bằng bản mặc định của hệ thống.")}
        confirmLabel={tr("Khôi phục")}
        danger
        loading={saving}
        onCancel={() => setResetOpen(false)}
        onConfirm={reset}
      />
    </>
  );
}
