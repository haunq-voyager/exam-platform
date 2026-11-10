"use client";


import { tr } from "../lib/i18n";
import { useState } from "react";
import { ScrollText } from "lucide-react";
import { SCORING_METHOD_LABEL, statusLabel } from "../lib/status-labels";
import type { ScoringMethod } from "../lib/types";

interface Props {
  title: string;
  durationMinutes: number;
  questionCount: number;
  maxAttempts: number;
  scoringMethod?: ScoringMethod;
  proctoringEnabled: boolean;
  maxViolations: number;
  confirmLabel?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel?: () => void;
}

/** Exam regulations the student must accept before entering the exam room. */
export function ExamRulesModal({
  title,
  durationMinutes,
  questionCount,
  maxAttempts,
  scoringMethod,
  proctoringEnabled,
  maxViolations,
  confirmLabel = tr("Tôi đồng ý, bắt đầu làm bài"),
  loading = false,
  onConfirm,
  onCancel
}: Props) {
  const [agreed, setAgreed] = useState(false);

  return (
    <div className="modalBackdrop" role="dialog" aria-modal="true">
      <div className="confirmModal rulesModal">
        <ScrollText size={30} />
        <h2>{tr("Quy chế thi")}</h2>
        <p>
          <strong>{title}</strong> · {questionCount} {tr("câu ·")} {durationMinutes} {tr("phút")}
        </p>

        <ul className="rulesList">
          <li>
            {tr("Thời gian làm bài tính từ lúc bạn bấm bắt đầu và")} <strong>{tr("không dừng lại")}</strong> {tr("dù bạn thoát trang. Hết giờ, hệ thống tự nộp bài.")}
          </li>
          <li>
            {maxAttempts > 1 ? (
              <>
                {tr("Bạn được thi tối đa")} <strong>{maxAttempts} {tr("lần")}</strong>
                {scoringMethod ? <>{tr(", điểm cuối cùng tính theo")} <strong>{statusLabel(SCORING_METHOD_LABEL, scoringMethod).toLowerCase()}</strong></> : null}{tr(". Đáp án chỉ hiển thị sau khi bạn hết lượt thi.")}
              </>
            ) : (
              <>{tr("Bạn chỉ được thi")} <strong>{tr("1 lần")}</strong>.</>
            )}
          </li>
          {proctoringEnabled ? (
            <>
              <li>
                <strong>{tr("Chỉ được thao tác trên màn hình thi.")}</strong> {tr("Chuyển tab, chuyển sang cửa sổ/ứng dụng khác, click ra màn hình khác hoặc làm trình duyệt mất tiêu điểm đều bị tính là")} <strong>{tr("vi phạm")}</strong>.
              </li>
              <li>
                <strong>{tr("Khuôn mặt phải nằm trọn trong khung camera")}</strong> {tr("suốt thời gian thi. Không thấy mặt, chỉ thấy một phần khuôn mặt hoặc có nhiều hơn một người đều bị tính là")} <strong>{tr("vi phạm")}</strong>.
              </li>
              <li>
                <strong>{tr("Giữ mắt hướng vào màn hình thi.")}</strong> {tr("Quay đầu hẳn sang một bên hoặc liếc mắt ra ngoài màn hình (sang trái/phải, lên trên, xuống dưới) liên tục khoảng 2 giây cũng bị tính là")} <strong>{tr("vi phạm")}</strong>{tr(". Bạn không cần nhìn thẳng vào ống kính, chỉ cần nhìn vào nội dung bài thi.")}
              </li>
              <li>
                {tr("Hệ thống chỉ gửi về máy chủ các sự kiện vi phạm,")} <strong>{tr("không ghi hình hay lưu video")}</strong>{tr(". Hình camera chỉ hiển thị trên máy của bạn.")}
              </li>
              <li>
                {tr("Chỉ cần")} <strong>{tr("1 lần vi phạm")}</strong>{tr(", bài làm đã bị")} <strong>{tr("đánh dấu")}</strong> {tr("để giảng viên xem xét.")}
              </li>
              <li>
                {maxViolations === 0 ? (
                  <>
                    {tr("Kỳ thi này")} <strong>{tr("không cho phép vi phạm")}</strong>{tr(": ngay lần đầu bài thi sẽ bị nộp tự động, chấm")} <strong>{tr("0 điểm")}</strong> {tr("và đánh dấu gian lận.")}
                  </>
                ) : (
                  <>
                    {tr("Bạn được cảnh báo tối đa")} <strong>{maxViolations} {tr("lần")}</strong>{tr(". Vi phạm lần thứ")} {maxViolations + 1}{tr(", bài thi bị nộp tự động, chấm")} <strong>{tr("0 điểm")}</strong> {tr("và đánh dấu gian lận.")}
                  </>
                )}
              </li>
            </>
          ) : (
            <li>{tr("Kỳ thi này không bật giám sát camera, nhưng bạn vẫn phải làm bài trung thực.")}</li>
          )}
          <li>{tr("Mọi hành vi gian lận (trao đổi, tra cứu, nhờ người khác làm hộ...) đều bị xử lý theo quy định của nhà trường.")}</li>
        </ul>

        <label style={{ display: "flex", alignItems: "flex-start", gap: 12, margin: "20px 0", fontSize: 16, fontWeight: 700 }}>
          <input type="checkbox" checked={agreed} onChange={(event) => setAgreed(event.target.checked)} style={{ marginTop: 4, width: 18, height: 18 }} />
          <span>{tr("Tôi đã đọc, hiểu và đồng ý tuân thủ quy chế thi.")}</span>
        </label>

        <div className="controlRow">
          {onCancel ? (
            <button className="iconButton" style={{ width: "auto", padding: "0 16px" }} onClick={onCancel} disabled={loading}>
              {tr("Để sau")}
            </button>
          ) : null}
          <button className="primaryButton" onClick={onConfirm} disabled={!agreed || loading}>
            {loading ? tr("Đang vào phòng thi...") : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
