<?php

namespace App\Actions\Attempts;

use App\Data\Attempts\SaveAnswerDto;
use App\Enums\ExamAttemptStatus;
use App\Exceptions\ApiException;
use App\Models\ExamAttempt;
use App\Models\ExamAttemptAnswer;
use App\Models\User;

class SaveExamAttemptAnswerAction
{
    public function execute(ExamAttempt $attempt, SaveAnswerDto $dto, User $student): ExamAttemptAnswer
    {
        $this->assertOwnedAndInProgress($attempt, $student);

        $belongsToExam = $attempt->session->exam->examQuestions()->where('question_id', $dto->question_id)->exists();
        if (! $belongsToExam) {
            throw new ApiException('This question does not belong to the exam.', 'exam_attempt.question_not_in_exam', 422);
        }

        return ExamAttemptAnswer::updateOrCreate(
            ['attempt_id' => $attempt->id, 'question_id' => $dto->question_id],
            ['selected_answer' => $dto->selected_answer, 'autosaved_at' => now()],
        );
    }

    private function assertOwnedAndInProgress(ExamAttempt $attempt, User $student): void
    {
        if ($attempt->student_id !== $student->id) {
            throw new ApiException('You do not have access to this attempt.', 'exam_attempt.forbidden', 403);
        }

        if ($attempt->status !== ExamAttemptStatus::InProgress) {
            throw new ApiException('This attempt is no longer in progress.', 'exam_attempt.not_in_progress', 422);
        }
    }
}
