export type UserRole = "admin" | "teacher" | "student";

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
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
}

export interface Exam {
  id: number;
  title: string;
  description: string | null;
  created_by: number;
  creator_name?: string;
  duration_minutes: number;
  shuffle_questions: boolean;
  shuffle_options: boolean;
  status: ExamStatus;
  start_at: string | null;
  end_at: string | null;
  question_count?: number;
  assigned_student_count?: number;
  questions?: ExamQuestionItem[];
  assignments?: ExamAssignmentItem[];
  created_at?: string;
}

export interface StudentExam {
  id: number;
  title: string;
  description: string | null;
  duration_minutes: number;
  status: ExamStatus;
  start_at: string | null;
  end_at: string | null;
  question_count: number;
  my_attempt_id: number | null;
  my_attempt_status: ExamAttemptStatus | null;
  my_score: number | null;
}

export type ExamAttemptStatus = "in_progress" | "submitted" | "graded";

export interface ExamAttempt {
  id: number;
  exam_id: number;
  exam_title?: string;
  student_id: number;
  student_name?: string;
  status: ExamAttemptStatus;
  started_at: string;
  submitted_at: string | null;
  score: number | null;
  total_points: number | null;
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

export interface ExamAttemptDetail extends ExamAttempt {
  duration_minutes: number;
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

export type ProctoringEventType = "no_face" | "multiple_faces" | "face_out_of_frame" | "tab_switch" | "inactive";
export type ProctoringSeverity = "low" | "medium" | "high";

export interface ProctoringEvent {
  id: number;
  session_id: number;
  event_type: ProctoringEventType;
  severity: ProctoringSeverity;
  occurred_at: string;
  metadata: Record<string, unknown> | null;
}
