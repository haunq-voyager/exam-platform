export const EXAM_STATUS_LABEL: Record<string, string> = {
  draft: "Bản nháp",
  scheduled: "Sắp diễn ra",
  open: "Đang mở",
  closed: "Đã đóng"
};

export const ATTEMPT_STATUS_LABEL: Record<string, string> = {
  in_progress: "Đang làm",
  submitted: "Đã nộp",
  graded: "Đã chấm"
};

export const REVIEW_STATUS_LABEL: Record<string, string> = {
  draft: "Bản nháp",
  pending: "Chờ duyệt",
  approved: "Đã duyệt",
  rejected: "Từ chối"
};

export const SEVERITY_LABEL: Record<string, string> = {
  low: "Thấp",
  medium: "Trung bình",
  high: "Cao"
};

export const PROCTORING_EVENT_LABEL: Record<string, string> = {
  no_face: "Không thấy khuôn mặt",
  multiple_faces: "Nhiều khuôn mặt",
  face_out_of_frame: "Lệch khỏi khung hình",
  tab_switch: "Rời khỏi tab",
  inactive: "Không hoạt động"
};

export function statusLabel(labels: Record<string, string>, value: string | null | undefined): string {
  if (!value) return "Chưa có";
  return labels[value] ?? value;
}
