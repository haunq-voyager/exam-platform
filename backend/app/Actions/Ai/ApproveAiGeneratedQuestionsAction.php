<?php

namespace App\Actions\Ai;

use App\Data\Ai\ReviewGeneratedQuestionsDto;
use App\Enums\AiGeneratedQuestionStatus;
use App\Enums\QuestionSource;
use App\Enums\QuestionStatus;
use App\Models\AiGeneration;
use App\Models\Question;
use App\Models\User;

class ApproveAiGeneratedQuestionsAction
{
    public function execute(AiGeneration $generation, ReviewGeneratedQuestionsDto $dto, User $teacher): AiGeneration
    {
        $pendingQuestions = $generation->generatedQuestions()
            ->where('status', AiGeneratedQuestionStatus::Pending)
            ->when(
                $dto->generated_question_ids !== null,
                fn ($query) => $query->whereIn('id', $dto->generated_question_ids),
            )
            ->get();

        foreach ($pendingQuestions as $generatedQuestion) {
            $question = Question::create([
                'topic_id' => $generation->topic_id,
                'created_by' => $teacher->id,
                'question_text' => $generatedQuestion->question_text,
                'question_type' => $generatedQuestion->question_type,
                'options' => $generatedQuestion->options,
                'correct_answer' => $generatedQuestion->correct_answer,
                'explanation' => $generatedQuestion->explanation,
                'difficulty' => $generatedQuestion->difficulty,
                'status' => QuestionStatus::Approved,
                'source' => QuestionSource::Ai,
            ]);

            $generatedQuestion->update([
                'status' => AiGeneratedQuestionStatus::Approved,
                'approved_question_id' => $question->id,
            ]);
        }

        return $generation->fresh('generatedQuestions');
    }
}
