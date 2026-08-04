<?php

namespace App\Actions\Exams;

use App\Data\Exams\AddExamQuestionDto;
use App\Models\Exam;
use App\Models\ExamQuestion;

class AddQuestionToExamAction
{
    public function execute(Exam $exam, AddExamQuestionDto $dto): ExamQuestion
    {
        return $exam->examQuestions()->create([
            'question_id' => $dto->question_id,
            'order' => $dto->order,
            'points' => $dto->points,
        ]);
    }
}
