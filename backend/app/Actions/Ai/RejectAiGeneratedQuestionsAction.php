<?php

namespace App\Actions\Ai;

use App\Data\Ai\ReviewGeneratedQuestionsDto;
use App\Enums\AiGeneratedQuestionStatus;
use App\Models\AiGeneration;

class RejectAiGeneratedQuestionsAction
{
    public function execute(AiGeneration $generation, ReviewGeneratedQuestionsDto $dto): AiGeneration
    {
        $generation->generatedQuestions()
            ->where('status', AiGeneratedQuestionStatus::Pending)
            ->when(
                $dto->generated_question_ids !== null,
                fn ($query) => $query->whereIn('id', $dto->generated_question_ids),
            )
            ->update(['status' => AiGeneratedQuestionStatus::Rejected]);

        return $generation->fresh('generatedQuestions');
    }
}
