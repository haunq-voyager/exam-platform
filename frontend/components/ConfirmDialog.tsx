"use client";

import { AlertTriangle, HelpCircle } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Xác nhận",
  cancelLabel = "Huỷ",
  danger = false,
  loading = false,
  onConfirm,
  onCancel
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className="modalBackdrop" role="dialog" aria-modal="true">
      <div className="confirmModal">
        {danger ? <AlertTriangle size={30} color="var(--red)" /> : <HelpCircle size={30} />}
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
        <div className="controlRow">
          <button className="iconButton" style={{ width: "auto", padding: "0 16px" }} onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </button>
          <button className={danger ? "dangerButton" : "primaryButton"} onClick={onConfirm} disabled={loading}>
            {loading ? "Đang xử lý..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
