<?php

namespace App\Actions\ExamSessions;

use App\Data\ExamSessions\CreateExamSessionDto;
use App\Enums\ExamStatus;
use App\Models\Exam;
use App\Models\ExamSession;
use App\Models\User;
use App\Services\Approvals\ApprovalService;

class CreateExamSessionAction
{
    public function execute(CreateExamSessionDto $dto, User $creator): ExamSession
    {
        $exam = $dto->exam_id !== null
            ? Exam::findOrFail($dto->exam_id)
            : $this->createSessionExam($dto, $creator);

        return ExamSession::create([
            'exam_id' => $exam->id,
            'title' => $dto->title,
            'created_by' => $creator->id,
            'status' => ExamStatus::Draft,
            'start_at' => $dto->start_at,
            'end_at' => $dto->end_at,
            'max_attempts' => $dto->max_attempts,
            'scoring_method' => $dto->scoring_method,
            'proctoring_enabled' => $dto->proctoring_enabled,
            'max_violations' => $dto->max_violations,
            // Defaults to the creator's own department: that decides which department head approves it.
            'department_id' => $dto->department_id ?? $creator->department_id,
            'approval_status' => ApprovalService::DRAFT,
        ]);
    }

    /** The private exam content of this session: not listed as a reusable template and freely editable. */
    private function createSessionExam(CreateExamSessionDto $dto, User $creator): Exam
    {
        $exam = Exam::create([
            'title' => $dto->new_exam_title ?? $dto->title,
            'description' => null,
            'created_by' => $creator->id,
            'duration_minutes' => $dto->duration_minutes ?? 60,
            'shuffle_questions' => true,
            'shuffle_options' => true,
            'is_template' => false,
        ]);

        foreach (array_values(array_unique($dto->question_ids ?? [])) as $index => $questionId) {
            $exam->examQuestions()->create(['question_id' => $questionId, 'order' => $index + 1, 'points' => 1]);
        }

        return $exam;
    }
}
