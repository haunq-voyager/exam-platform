<?php

namespace App\Actions\QuestionBank;

use App\Data\QuestionBank\UpdateQuestionDto;
use App\Models\Question;
use App\Models\User;

class UpdateQuestionAction
{
    public function execute(Question $question, UpdateQuestionDto $dto, User $updater): Question
    {
        $question->update(array_filter([
            'topic_id' => $dto->topic_id,
            'question_text' => $dto->question_text,
            'question_type' => $dto->question_type,
            'options' => $dto->options,
            'correct_answer' => $dto->correct_answer,
            'explanation' => $dto->explanation,
            'difficulty' => $dto->difficulty,
        ], fn ($value) => $value !== null) + ['updated_by' => $updater->id]);

        return $question;
    }
}
