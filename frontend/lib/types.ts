export type UserRole = "admin" | "teacher" | "department_head" | "training_office" | "student";

export type PermissionKey =
  | "users.view"
  | "users.manage"
  | "departments.manage"
  | "roles.manage"
  | "catalog.manage"
  | "questions.manage"
  | "exams.manage"
  | "sessions.view"
  | "sessions.view_all"
  | "sessions.create"
  | "sessions.update"
  | "sessions.enable"
  | "sessions.proctor"
  | "regrades.review"
  | "feedback.respond"
  | "results.view"
  | "proctoring.view";

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  avatar_url?: string | null;
  role_label?: string;
  department_id?: number | null;
  department_name?: string | null;
  /** Chỉ có ở người dùng đang đăng nhập. */
  permissions?: PermissionKey[];
  is_approver?: boolean;
  major?: string | null;
  user_code?: string | null;
  class_code?: string | null;
  academic_year?: string | null;
  study_start_year?: number | null;
  study_end_year?: number | null;
  date_of_birth?: string | null;
  gender?: "male" | "female" | "other" | null;
  phone?: string | null;
  permanent_address?: string | null;
  temporary_address?: string | null;
  created_at?: string;
}

export interface Subject {
  id: number;
  name: string;
  description: string | null;
  topics_count?: number;
}

export interface Topic {
  id: number;
  subject_id: number;
  subject_name?: string;
  name: string;
  description: string | null;
}

export type QuestionType = "single_choice" | "multiple_choice" | "true_false";
export type Difficulty = "easy" | "medium" | "hard";
export type QuestionStatus = "draft" | "pending" | "approved" | "rejected";
export type QuestionSource = "manual" | "ai";

export interface Question {
  id: number;
  topic_id: number | null;
  topic_name?: string | null;
  created_by: number;
  creator_name?: string;
  question_text: string;
  question_type: QuestionType;
  options: string[];
  correct_answer: string[];
  explanation: string | null;
  difficulty: Difficulty;
  status: QuestionStatus;
  source: QuestionSource;
  created_at?: string;
}

export type ExamStatus = "draft" | "scheduled" | "open" | "closed";

export interface ExamQuestionItem {
  id: number;
  question_id: number;
  order: number;
  points: number;
  question?: Question;
}

export interface ExamAssignmentItem {
  id: number;
  student_id: number;
  student_name?: string;
  student_email?: string;
  student_major?: string | null;
  student_code?: string | null;
  student_class?: string | null;
  student_year?: string | null;
}

/** Đề thi mẫu (ngân hàng câu hỏi + thời lượng) — dùng lại được cho nhiều kỳ thi. */
export interface Exam {
  id: number;
  title: string;
  description: string | null;
  created_by: number;
  creator_name?: string;
  duration_minutes: number;
  shuffle_questions: boolean;
  shuffle_options: boolean;
  question_count?: number;
  questions?: ExamQuestionItem[];
  created_at?: string;
}

export type ScoringMethod = "highest" | "average" | "first" | "last";

export interface ExamSessionTeacher {
  id: number;
  name: string;
  email: string;
}

/** Kỳ thi cụ thể: một lần mở đề thi mẫu cho thí sinh làm, có lịch và trạng thái riêng. */
export interface ExamSession {
  id: number;
  /** Mã kỳ thi, ví dụ KT2611-0042. */
  code: string | null;
  title: string;
  department_id?: number | null;
  department_name?: string | null;
  approval: SessionApprovalSummary;
  /** Trạng thái lưu: draft (chưa bật), open (đang bật), closed (đã tắt/đã đóng). */
  status: ExamStatus;
  /** Trạng thái thí sinh thấy: open thành scheduled trước giờ bắt đầu và closed sau giờ kết thúc. */
  effective_status: ExamStatus;
  is_enabled: boolean;
  duration_minutes?: number;
  /** Đề đang dùng chung (đề mẫu): lần sửa đầu tiên sẽ tạo bản sao riêng cho kỳ thi. */
  exam_is_shared?: boolean;
  start_at: string | null;
  end_at: string | null;
  max_attempts: number;
  scoring_method: ScoringMethod;
  proctoring_enabled: boolean;
  /** Số lần vi phạm được phép; vi phạm thứ (max_violations + 1) sẽ bị hủy bài. 0 = hủy ngay lần đầu. */
  max_violations: number;
  created_by: number;
  creator_name?: string;
  exam_id: number;
  exam_title?: string;
  question_count?: number;
  teachers?: ExamSessionTeacher[];
  assigned_student_count?: number;
  attempt_count?: number;
  assignments?: ExamAssignmentItem[];
  created_at?: string;
}

export interface StudentExam {
  id: number;
  code: string | null;
  title: string;
  exam_title?: string;
  description: string | null;
  duration_minutes: number;
  status: ExamStatus;
  start_at: string | null;
  end_at: string | null;
  question_count: number;
  max_attempts: number;
  scoring_method: ScoringMethod;
  proctoring_enabled: boolean;
  max_violations: number;
  my_attempt_id: number | null;
  my_attempt_status: ExamAttemptStatus | null;
  my_attempt_count: number;
  /** Điểm cuối cùng theo cách tính điểm của kỳ thi. */
  my_score: number | null;
  my_flagged: boolean;
  can_attempt: boolean;
}

export type ExamAttemptStatus = "in_progress" | "submitted" | "graded";

export interface ExamAttempt {
  id: number;
  exam_session_id: number;
  exam_session_title?: string;
  exam_title?: string;
  student_id: number;
  student_name?: string;
  status: ExamAttemptStatus;
  started_at: string;
  submitted_at: string | null;
  score: number | null;
  total_points: number | null;
  attempt_number: number;
  violation_count: number;
  is_flagged: boolean;
  is_cancelled: boolean;
  cancel_note?: string | null;
  cancelled_by_proctor?: boolean;
  cancel_reason: string | null;
}

export interface ExamSessionResult {
  student_id: number;
  student_name: string | null;
  student_email: string | null;
  attempts_used: number;
  final_score: number | null;
  total_points: number | null;
  is_flagged: boolean;
  cancelled_count: number;
}

export interface ExamAttemptQuestionDetail {
  question_id: number;
  order: number;
  points: number;
  question_text: string;
  question_type: QuestionType;
  options: string[];
  selected_answer: string[] | null;
  is_correct: boolean | null;
  points_earned: number | null;
  correct_answer: string[] | null;
  explanation: string | null;
}

export interface ViolationState {
  count: number;
  max_violations: number;
  remaining: number;
  flagged: boolean;
  cancelled: boolean;
}

export interface ExamAttemptDetail extends ExamAttempt {
  /** Thời điểm bài tự kết thúc: hết thời lượng hoặc đến giờ kết thúc kỳ thi, tùy cái nào đến trước. */
  ends_at: string;
  duration_minutes: number;
  max_attempts: number;
  scoring_method: ScoringMethod;
  proctoring_enabled: boolean;
  max_violations: number;
  /** false khi thí sinh còn lượt thi / bài bị hủy: đáp án đúng và từng câu đúng/sai bị ẩn. */
  answer_key_revealed: boolean;
  questions: ExamAttemptQuestionDetail[];
}

export type AiGenerationStatus = "pending" | "completed" | "failed";
export type AiGeneratedQuestionStatus = "pending" | "approved" | "rejected";

export interface AiGeneratedQuestion {
  id: number;
  question_text: string;
  question_type: QuestionType;
  options: string[];
  correct_answer: string[];
  explanation: string | null;
  difficulty: Difficulty;
  status: AiGeneratedQuestionStatus;
  approved_question_id: number | null;
}

export interface AiGeneration {
  id: number;
  teacher_id: number;
  subject_id: number | null;
  topic_id: number | null;
  prompt: string;
  model: string;
  question_count: number;
  difficulty: Difficulty | null;
  status: AiGenerationStatus;
  generated_questions: AiGeneratedQuestion[];
  created_at?: string;
}

export type ProctoringEventType = "no_face" | "multiple_faces" | "face_out_of_frame" | "tab_switch" | "window_blur" | "looking_away" | "inactive";
export type ProctoringSeverity = "low" | "medium" | "high";

export interface ProctoringEvent {
  id: number;
  session_id: number;
  event_type: ProctoringEventType;
  severity: ProctoringSeverity;
  occurred_at: string;
  metadata: Record<string, unknown> | null;
}

export interface Department {
  id: number;
  name: string;
  code: string | null;
  users_count: number | null;
  sessions_count: number | null;
}

export type ApprovalStatus = "draft" | "pending" | "approved" | "rejected";
export type ApprovalAction = "submitted" | "approved" | "rejected" | "withdrawn" | "reset" | "auto_approved";

/** Phần duyệt gắn trong mỗi kỳ thi. */
export interface SessionApprovalSummary {
  required: boolean;
  status: ApprovalStatus;
  level_name: string | null;
  level_position: number | null;
  submitted_at: string | null;
  approved_at: string | null;
  can_act: boolean;
}

export interface ApprovalLevel {
  id?: number;
  position?: number;
  name: string;
  role: UserRole;
  role_label?: string;
  scope: "department" | "global";
  is_active: boolean;
}

export interface ApprovalHistoryEntry {
  id: number;
  action: ApprovalAction;
  level_name: string | null;
  actor_name: string | null;
  actor_role: string | null;
  comment: string | null;
  created_at: string;
}

export interface ApprovalState {
  status: ApprovalStatus;
  required: boolean;
  submitted_at: string | null;
  approved_at: string | null;
  department_name: string | null;
  creator_name: string | null;
  current_level: { position: number; name: string } | null;
  levels: { position: number; name: string; role_label: string; scope: string; state: "done" | "current" | "upcoming" }[];
  can_act: boolean;
  can_submit: boolean;
  can_withdraw: boolean;
  history: ApprovalHistoryEntry[];
}

export interface PermissionMatrix {
  permissions: { key: PermissionKey; label: string; group: string }[];
  roles: { key: UserRole; label: string; configurable: boolean; permissions: PermissionKey[] }[];
}

export interface Workload {
  running_sessions: number;
  in_progress_attempts: number;
  pending_regrades: number;
  unanswered_feedback: number;
}

export interface DashboardCharts {
  session_stages: Record<"draft" | "pending" | "rejected" | "scheduled" | "open" | "closed", number>;
  sessions_per_month: { month: string; total: number }[];
  score_distribution: { from: number; to: number; total: number }[];
  filters: { years: number[]; departments: { id: number; name: string }[] };
}

export type RegradeStatus = "pending" | "approved" | "rejected";

export interface RegradeRequest {
  id: number;
  exam_attempt_id: number;
  exam_session_id?: number;
  exam_session_title?: string;
  attempt_number?: number;
  current_score?: number | string | null;
  total_points?: number | string | null;
  student_id: number;
  student_name?: string;
  student_email?: string;
  reason: string;
  status: RegradeStatus;
  old_score: number | string | null;
  new_score: number | string | null;
  response: string | null;
  reviewer_name?: string;
  reviewed_at: string | null;
  created_at: string;
}

export interface ExamFeedback {
  id: number;
  exam_session_id: number;
  exam_session_title: string | null;
  exam_attempt_id: number | null;
  attempt_number: number | null;
  student_name: string | null;
  student_email: string | null;
  message: string;
  reply: string | null;
  replied_by_name: string | null;
  replied_at: string | null;
  created_at: string;
}

export interface MonitorStudent {
  student_id: number;
  student_name: string | null;
  student_email: string | null;
  state: "not_started" | "in_progress" | "finished";
  attempts_used: number;
  is_flagged: boolean;
  last_score: number | string | null;
  /** The running attempt, or the latest one once finished: the log link and the fields below describe it. */
  latest_attempt_id: number | null;
  violation_count: number | null;
  is_cancelled: boolean;
  last_event_type: ProctoringEventType | null;
  last_event_at: string | null;
  current_attempt: {
    id: number;
    attempt_number: number;
    started_at: string;
    ends_at: string;
    violation_count: number;
    is_flagged: boolean;
    answered: number;
    question_count: number;
    last_event_type: ProctoringEventType | null;
    last_event_at: string | null;
  } | null;
}

export interface SessionMonitor {
  session: {
    id: number;
    title: string;
    effective_status: ExamStatus;
    start_at: string | null;
    end_at: string | null;
    duration_minutes: number;
    proctoring_enabled: boolean;
    max_violations: number;
  };
  totals: { assigned: number; not_started: number; in_progress: number; finished: number; flagged: number };
  students: MonitorStudent[];
}

/** An entry of the notification bell. `url` is a canonical "/dashboard/..." path. */
export interface AppNotification {
  id: number;
  type: string;
  title: string;
  body: string | null;
  url: string | null;
  is_read: boolean;
  created_at: string;
}

export interface MailTemplate {
  id: number;
  key: string;
  name: string;
  description: string | null;
  subject: string;
  body_html: string;
  button_label: string;
  accent_color: string;
  footer_text: string | null;
  is_active: boolean;
  /** Days before the exam the reminder is sent, e.g. "7" or "7,3,1". */
  send_days_before: string;
  updated_at: string | null;
}

export interface MailPlaceholder {
  key: string;
  label: string;
  sample: string;
}
