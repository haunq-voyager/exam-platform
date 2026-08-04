<?php

namespace App\Actions\Exams;

use App\Data\Exams\CreateExamDto;
use App\Models\Exam;
use App\Models\User;

class CreateExamAction
{
    public function execute(CreateExamDto $dto, User $creator): Exam
    {
        return Exam::create([
            'title' => $dto->title,
            'description' => $dto->description,
            'created_by' => $creator->id,
            'duration_minutes' => $dto->duration_minutes,
            'shuffle_questions' => $dto->shuffle_questions,
            'shuffle_options' => $dto->shuffle_options,
        ]);
    }
}
