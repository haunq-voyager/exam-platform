<?php

namespace App\Actions\ExamSessions;

use App\Actions\Exams\AddQuestionToExamAction;
use App\Actions\Exams\CreateExamAction;
use App\Data\Exams\AddExamQuestionDto;
use App\Data\Exams\CreateExamDto;
use App\Data\ExamSessions\CreateExamSessionDto;
use App\Enums\ExamStatus;
use App\Models\Exam;
use App\Models\ExamSession;
use App\Models\User;

class CreateExamSessionAction
{
    public function __construct(
        private CreateExamAction $createExamAction,
        private AddQuestionToExamAction $addQuestionToExamAction,
    ) {}

    public function execute(CreateExamSessionDto $dto, User $creator): ExamSession
    {
        $exam = $dto->exam_id !== null
            ? Exam::findOrFail($dto->exam_id)
            : $this->createExamFromQuestionBank($dto, $creator);

        return ExamSession::create([
            'exam_id' => $exam->id,
            'title' => $dto->title,
            'created_by' => $creator->id,
            'status' => ExamStatus::Draft,
            'start_at' => $dto->start_at,
            'end_at' => $dto->end_at,
        ]);
    }

    private function createExamFromQuestionBank(CreateExamSessionDto $dto, User $creator): Exam
    {
        $exam = $this->createExamAction->execute(
            new CreateExamDto(
                title: $dto->new_exam_title ?? $dto->title,
                description: null,
                duration_minutes: $dto->duration_minutes ?? 60,
            ),
            $creator,
        );

        foreach (array_values($dto->question_ids ?? []) as $index => $questionId) {
            $this->addQuestionToExamAction->execute($exam, new AddExamQuestionDto(
                question_id: $questionId,
                order: $index + 1,
                points: 1,
            ));
        }

        return $exam;
    }
}
