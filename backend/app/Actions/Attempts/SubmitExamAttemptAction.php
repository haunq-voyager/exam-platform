<?php

namespace App\Actions\Attempts;

use App\Enums\ExamAttemptStatus;
use App\Exceptions\ApiException;
use App\Models\ExamAttempt;
use App\Models\ExamAttemptAnswer;
use App\Models\User;

class SubmitExamAttemptAction
{
    public function execute(ExamAttempt $attempt, User $student): ExamAttempt
    {
        if ($attempt->student_id !== $student->id) {
            throw new ApiException('You do not have access to this attempt.', 'exam_attempt.forbidden', 403);
        }

        return $this->gradeInProgressAttempt($attempt);
    }

    public function executeSystem(ExamAttempt $attempt): ExamAttempt
    {
        return $this->gradeInProgressAttempt($attempt);
    }

    private function gradeInProgressAttempt(ExamAttempt $attempt): ExamAttempt
    {
        if ($attempt->status !== ExamAttemptStatus::InProgress) {
            throw new ApiException('This attempt is no longer in progress.', 'exam_attempt.not_in_progress', 422);
        }

        $examQuestions = $attempt->session->exam->examQuestions()->with('question')->get();
        $answersByQuestionId = $attempt->answers()->get()->keyBy('question_id');

        $totalScore = 0;
        $totalPoints = 0;

        foreach ($examQuestions as $examQuestion) {
            $totalPoints += (float) $examQuestion->points;

            /** @var ExamAttemptAnswer|null $answer */
            $answer = $answersByQuestionId->get($examQuestion->question_id);
            $selected = $answer?->selected_answer ?? [];
            $isCorrect = $this->answersMatch($selected, $examQuestion->question->correct_answer);
            $pointsEarned = $isCorrect ? (float) $examQuestion->points : 0;
            $totalScore += $pointsEarned;

            ExamAttemptAnswer::updateOrCreate(
                ['attempt_id' => $attempt->id, 'question_id' => $examQuestion->question_id],
                [
                    'selected_answer' => $answer?->selected_answer,
                    'is_correct' => $isCorrect,
                    'points_earned' => $pointsEarned,
                ],
            );
        }

        $attempt->update([
            'status' => ExamAttemptStatus::Graded,
            'submitted_at' => now(),
            'score' => $totalScore,
            'total_points' => $totalPoints,
        ]);

        return $attempt->fresh(['answers']);
    }

    private function answersMatch(array $selected, array $correct): bool
    {
        $normalizedSelected = collect($selected)->map(fn ($value) => (string) $value)->sort()->values()->all();
        $normalizedCorrect = collect($correct)->map(fn ($value) => (string) $value)->sort()->values()->all();

        return $normalizedSelected === $normalizedCorrect;
    }
}
