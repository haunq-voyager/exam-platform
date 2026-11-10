import { tr } from "./i18n";
export const EXAM_STATUS_LABEL: Record<string, string> = {
  get draft() { return tr("Bản nháp"); },
  get scheduled() { return tr("Sắp diễn ra"); },
  get open() { return tr("Đang mở"); },
  get closed() { return tr("Đã đóng"); }
};

export const ATTEMPT_STATUS_LABEL: Record<string, string> = {
  get in_progress() { return tr("Đang làm"); },
  get submitted() { return tr("Đã nộp"); },
  get graded() { return tr("Đã chấm"); }
};

export const REVIEW_STATUS_LABEL: Record<string, string> = {
  get draft() { return tr("Bản nháp"); },
  get pending() { return tr("Chờ duyệt"); },
  get approved() { return tr("Đã duyệt"); },
  get rejected() { return tr("Từ chối"); }
};

export const SEVERITY_LABEL: Record<string, string> = {
  get low() { return tr("Thấp"); },
  get medium() { return tr("Trung bình"); },
  high: "Cao"
};

export const PROCTORING_EVENT_LABEL: Record<string, string> = {
  get no_face() { return tr("Không thấy khuôn mặt"); },
  get multiple_faces() { return tr("Nhiều khuôn mặt"); },
  get face_out_of_frame() { return tr("Lệch khỏi khung hình"); },
  get tab_switch() { return tr("Rời khỏi tab"); },
  get window_blur() { return tr("Chuyển sang cửa sổ/màn hình khác"); },
  get looking_away() { return tr("Không nhìn vào màn hình thi"); },
  get inactive() { return tr("Không hoạt động"); }
};

export function statusLabel(labels: Record<string, string>, value: string | null | undefined): string {
  if (!value) return tr("Chưa có");
  return labels[value] ?? value;
}

export const SCORING_METHOD_LABEL: Record<string, string> = {
  get highest() { return tr("Điểm cao nhất"); },
  get average() { return tr("Điểm trung bình"); },
  get first() { return tr("Điểm lần đầu"); },
  get last() { return tr("Điểm lần cuối"); }
};
