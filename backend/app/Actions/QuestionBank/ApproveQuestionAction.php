<?php

namespace App\Actions\QuestionBank;

use App\Enums\QuestionStatus;
use App\Models\Question;
use App\Models\User;

class ApproveQuestionAction
{
    public function execute(Question $question, User $updater): Question
    {
        $question->update(['status' => QuestionStatus::Approved, 'updated_by' => $updater->id]);

        return $question;
    }
}
