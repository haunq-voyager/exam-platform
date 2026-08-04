<?php

namespace App\Actions\QuestionBank;

use App\Data\QuestionBank\CreateQuestionDto;
use App\Enums\QuestionSource;
use App\Enums\QuestionStatus;
use App\Models\Question;
use App\Models\User;

class CreateQuestionAction
{
    public function execute(CreateQuestionDto $dto, User $creator): Question
    {
        return Question::create([
            'topic_id' => $dto->topic_id,
            'created_by' => $creator->id,
            'question_text' => $dto->question_text,
            'question_type' => $dto->question_type,
            'options' => $dto->options,
            'correct_answer' => $dto->correct_answer,
            'explanation' => $dto->explanation,
            'difficulty' => $dto->difficulty,
            'status' => QuestionStatus::Approved,
            'source' => QuestionSource::Manual,
        ]);
    }
}
