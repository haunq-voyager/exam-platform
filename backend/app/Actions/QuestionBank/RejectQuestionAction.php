<?php

namespace App\Actions\QuestionBank;

use App\Enums\QuestionStatus;
use App\Models\Question;
use App\Models\User;

class RejectQuestionAction
{
    public function execute(Question $question, User $updater): Question
    {
        $question->update(['status' => QuestionStatus::Rejected, 'updated_by' => $updater->id]);

        return $question;
    }
}
