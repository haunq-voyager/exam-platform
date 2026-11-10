<?php

namespace App\Http\Resources;

use App\Enums\ExamAttemptStatus;
use App\Enums\ExamStatus;
use App\Models\ExamAttempt;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\ExamAttempt */
class ExamAttemptDetailResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $isGraded = $this->status === ExamAttemptStatus::Graded && $this->canRevealAnswerKey($request);
        $answersByQuestionId = $this->answers->keyBy('question_id');
        $exam = $this->session->exam;

        return [
            'id' => $this->id,
            'exam_session_id' => $this->exam_session_id,
            'exam_session_title' => $this->session->title,
            'exam_title' => $exam->title,
            'duration_minutes' => $exam->duration_minutes,
            'student_id' => $this->student_id,
            'student_name' => $this->whenLoaded('student', fn () => $this->student?->name),
            'status' => $this->status,
            'started_at' => $this->started_at?->toISOString(),
            // When the attempt ends by itself: the exam duration or the session end date, whichever comes first.
            'ends_at' => $this->deadline()->toISOString(),
            'submitted_at' => $this->submitted_at?->toISOString(),
            'score' => $this->score,
            'total_points' => $this->total_points,
            'attempt_number' => $this->attempt_number,
            'max_attempts' => $this->session->max_attempts,
            'scoring_method' => $this->session->scoring_method,
            'proctoring_enabled' => $this->session->proctoring_enabled,
            'max_violations' => $this->session->max_violations,
            'violation_count' => $this->violation_count,
            'is_flagged' => $this->is_flagged,
            'is_cancelled' => $this->isCancelled(),
            'cancel_reason' => $this->cancel_reason,
            // Set when a proctor cancelled the attempt by hand (not the automatic violation limit).
            'cancel_note' => $this->cancel_note,
            'cancelled_by_proctor' => $this->cancelled_by !== null,
            'answer_key_revealed' => $isGraded,
            'questions' => $exam->examQuestions->sortBy('order')->values()->map(function ($examQuestion) use ($answersByQuestionId, $isGraded) {
                $answer = $answersByQuestionId->get($examQuestion->question_id);

                return [
                    'question_id' => $examQuestion->question_id,
                    'order' => $examQuestion->order,
                    'points' => $examQuestion->points,
                    'question_text' => $examQuestion->question->question_text,
                    'question_type' => $examQuestion->question->question_type,
                    'options' => $examQuestion->question->options,
                    'selected_answer' => $answer?->selected_answer,
                    'is_correct' => $isGraded ? $answer?->is_correct : null,
                    'points_earned' => $isGraded ? $answer?->points_earned : null,
                    'correct_answer' => $isGraded ? $examQuestion->question->correct_answer : null,
                    'explanation' => $isGraded ? $examQuestion->question->explanation : null,
                ];
            })->all(),
        ];
    }

    /**
     * Staff always see the answer key. A student only sees it once no further attempt is possible
     * (otherwise attempt N would leak the answers for attempt N+1), and never for a cheating-cancelled attempt.
     */
    private function canRevealAnswerKey(Request $request): bool
    {
        if (! $request->user()?->isStudent()) {
            return true;
        }

        if ($this->isCancelled()) {
            return false;
        }

        $session = $this->session;
        if ($session->status === ExamStatus::Closed) {
            return true;
        }

        $finishedAttempts = ExamAttempt::query()
            ->where('exam_session_id', $this->exam_session_id)
            ->where('student_id', $this->student_id)
            ->where('status', '!=', ExamAttemptStatus::InProgress)
            ->count();

        return $finishedAttempts >= $session->max_attempts;
    }
}
