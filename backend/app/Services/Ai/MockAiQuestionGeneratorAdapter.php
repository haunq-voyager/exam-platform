<?php

namespace App\Services\Ai;

use App\Contracts\AiQuestionGeneratorContract;

/**
 * Deterministic placeholder provider used while no real AI API key is configured.
 * Swap the AiQuestionGeneratorContract binding in AppServiceProvider to an
 * OpenAI/Gemini adapter later without touching any calling code.
 */
class MockAiQuestionGeneratorAdapter implements AiQuestionGeneratorContract
{
    private const DIFFICULTIES = ['easy', 'medium', 'hard'];

    public function generate(string $prompt, int $questionCount, ?string $difficulty): array
    {
        $topic = trim($prompt) !== '' ? trim($prompt) : 'chủ đề chưa xác định';

        return collect(range(1, $questionCount))
            ->map(function (int $index) use ($topic, $difficulty) {
                $resolvedDifficulty = $difficulty ?? self::DIFFICULTIES[($index - 1) % count(self::DIFFICULTIES)];

                return [
                    'question_text' => "Câu hỏi mẫu #{$index} về \"{$topic}\" (do AI mock sinh ra để demo luồng duyệt).",
                    'question_type' => 'single_choice',
                    'options' => [
                        "Đáp án A cho câu {$index}",
                        "Đáp án B cho câu {$index}",
                        "Đáp án C cho câu {$index}",
                        "Đáp án D cho câu {$index}",
                    ],
                    'correct_answer' => ['Đáp án A cho câu '.$index],
                    'explanation' => "Đây là lời giải mẫu do AI mock sinh ra cho câu hỏi #{$index}, dùng để kiểm thử luồng duyệt câu hỏi.",
                    'difficulty' => $resolvedDifficulty,
                ];
            })
            ->all();
    }

    public function modelName(): string
    {
        return 'mock-question-generator-v1';
    }
}
