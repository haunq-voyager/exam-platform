import { tr } from "./i18n";
import type { ApprovalAction, ApprovalStatus, PermissionKey, User } from "./types";

/** Admins hold every permission; others exactly the list the API returned for them. */
export function can(user: User | null | undefined, permission: PermissionKey): boolean {
  if (!user) return false;
  return user.role === "admin" || (user.permissions ?? []).includes(permission);
}

export function canAny(user: User | null | undefined, ...permissions: PermissionKey[]): boolean {
  return permissions.some((permission) => can(user, permission));
}

export const ROLE_LABEL: Record<string, string> = {
  get admin() { return tr("Quản trị viên"); },
  get teacher() { return tr("Giảng viên"); },
  get department_head() { return tr("Trưởng khoa"); },
  get training_office() { return tr("Phòng đào tạo"); },
  get student() { return tr("Thí sinh"); }
};

export const APPROVAL_STATUS_LABEL: Record<ApprovalStatus, { label: string; tone: "blue" | "amber" | "green" | "red" }> = {
  draft: { get label() { return tr("Chưa gửi duyệt"); }, tone: "blue" },
  pending: { get label() { return tr("Chờ duyệt"); }, tone: "amber" },
  approved: { get label() { return tr("Đã duyệt"); }, tone: "green" },
  rejected: { get label() { return tr("Bị từ chối"); }, tone: "red" }
};

export const APPROVAL_ACTION_LABEL: Record<ApprovalAction, string> = {
  get submitted() { return tr("Gửi duyệt"); },
  get approved() { return tr("Đã duyệt"); },
  get rejected() { return tr("Từ chối"); },
  get withdrawn() { return tr("Thu hồi yêu cầu duyệt"); },
  get reset() { return tr("Hủy duyệt do chỉnh sửa"); },
  get auto_approved() { return tr("Tự động duyệt"); }
};
