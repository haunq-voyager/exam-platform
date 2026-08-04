<?php

namespace App\Http\Resources;

use App\Enums\ExamAttemptStatus;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\ExamAttempt */
class ExamAttemptDetailResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $isGraded = $this->status === ExamAttemptStatus::Graded;
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
            'submitted_at' => $this->submitted_at?->toISOString(),
            'score' => $this->score,
            'total_points' => $this->total_points,
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
}
