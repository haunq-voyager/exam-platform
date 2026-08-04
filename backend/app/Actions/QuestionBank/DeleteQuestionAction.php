<?php

namespace App\Actions\QuestionBank;

use App\Models\Question;

class DeleteQuestionAction
{
    public function execute(Question $question): void
    {
        $question->delete();
    }
}
