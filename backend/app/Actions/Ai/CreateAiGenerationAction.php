<?php

namespace App\Actions\Ai;

use App\Contracts\AiQuestionGeneratorContract;
use App\Data\Ai\CreateAiGenerationDto;
use App\Enums\AiGenerationStatus;
use App\Enums\AiGeneratedQuestionStatus;
use App\Models\AiGeneration;
use App\Models\User;

class CreateAiGenerationAction
{
    public function __construct(
        private AiQuestionGeneratorContract $aiQuestionGenerator,
    ) {}

    public function execute(CreateAiGenerationDto $dto, User $teacher): AiGeneration
    {
        $generation = AiGeneration::create([
            'teacher_id' => $teacher->id,
            'subject_id' => $dto->subject_id,
            'topic_id' => $dto->topic_id,
            'prompt' => $dto->prompt,
            'model' => $this->aiQuestionGenerator->modelName(),
            'question_count' => $dto->question_count,
            'difficulty' => $dto->difficulty,
            'status' => AiGenerationStatus::Pending,
        ]);

        $generatedItems = $this->aiQuestionGenerator->generate(
            prompt: $dto->prompt,
            questionCount: $dto->question_count,
            difficulty: $dto->difficulty?->value,
        );

        foreach ($generatedItems as $item) {
            $generation->generatedQuestions()->create([
                'question_text' => $item['question_text'],
                'question_type' => $item['question_type'],
                'options' => $item['options'],
                'correct_answer' => $item['correct_answer'],
                'explanation' => $item['explanation'],
                'difficulty' => $item['difficulty'],
                'status' => AiGeneratedQuestionStatus::Pending,
            ]);
        }

        $generation->update([
            'status' => AiGenerationStatus::Completed,
            'raw_response' => $generatedItems,
        ]);

        return $generation->fresh('generatedQuestions');
    }
}
