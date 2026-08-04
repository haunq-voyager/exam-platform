<?php

namespace App\Actions\Exams;

use App\Data\Exams\UpdateExamDto;
use App\Models\Exam;

class UpdateExamAction
{
    public function execute(Exam $exam, UpdateExamDto $dto): Exam
    {
        $exam->update(array_filter([
            'title' => $dto->title,
            'description' => $dto->description,
            'duration_minutes' => $dto->duration_minutes,
            'shuffle_questions' => $dto->shuffle_questions,
            'shuffle_options' => $dto->shuffle_options,
        ], fn ($value) => $value !== null));

        return $exam;
    }
}
