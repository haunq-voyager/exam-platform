<?php

namespace App\Services\Ai;

use App\Contracts\AiQuestionGeneratorContract;
use App\Exceptions\ApiException;
use App\Services\Ai\Support\GeneratedQuestionNormalizer;
use App\Services\Ai\Support\QuestionGenerationPrompt;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

/**
 * Calls the Google Gemini API (free-tier friendly) to generate structured
 * multiple-choice questions. Swap this in via AppServiceProvider only —
 * calling code never changes.
 */
class GeminiAiQuestionGeneratorAdapter implements AiQuestionGeneratorContract
{
    private const RESPONSE_SCHEMA = [
        'type' => 'ARRAY',
        'items' => [
            'type' => 'OBJECT',
            'properties' => [
                'question_text' => ['type' => 'STRING'],
                'question_type' => [
                    'type' => 'STRING',
                    'enum' => ['single_choice', 'multiple_choice', 'true_false'],
                ],
                'options' => ['type' => 'ARRAY', 'items' => ['type' => 'STRING']],
                'correct_answer' => ['type' => 'ARRAY', 'items' => ['type' => 'STRING']],
                'explanation' => ['type' => 'STRING'],
                'difficulty' => [
                    'type' => 'STRING',
                    'enum' => ['easy', 'medium', 'hard'],
                ],
            ],
            'required' => ['question_text', 'question_type', 'options', 'correct_answer', 'explanation', 'difficulty'],
        ],
    ];

    public function __construct(
        private readonly string $apiKey,
        private readonly string $model,
    ) {}

    public function generate(string $prompt, int $questionCount, ?string $difficulty): array
    {
        $response = Http::timeout(60)
            ->post(
                "https://generativelanguage.googleapis.com/v1beta/models/{$this->model}:generateContent?".http_build_query(['key' => $this->apiKey]),
                [
                    'contents' => [[
                        'parts' => [['text' => QuestionGenerationPrompt::build($prompt, $questionCount, $difficulty)]],
                    ]],
                    'generationConfig' => [
                        'responseMimeType' => 'application/json',
                        'responseSchema' => self::RESPONSE_SCHEMA,
                        'temperature' => 0.7,
                    ],
                ],
            );

        if ($response->failed()) {
            Log::warning('Gemini question generation request failed', [
                'status' => $response->status(),
                'body' => $response->body(),
            ]);

            throw new ApiException(
                'Không thể gọi dịch vụ AI để sinh câu hỏi. Vui lòng thử lại sau.',
                'ai.provider_error',
                Response::HTTP_BAD_GATEWAY,
            );
        }

        $text = $response->json('candidates.0.content.parts.0.text');
        $items = is_string($text) ? json_decode($text, true) : null;

        if (! is_array($items) || $items === []) {
            Log::warning('Gemini question generation returned an unparseable payload', ['body' => $response->body()]);

            throw new ApiException(
                'Dịch vụ AI trả về dữ liệu không hợp lệ. Vui lòng thử lại.',
                'ai.invalid_response',
                Response::HTTP_BAD_GATEWAY,
            );
        }

        return collect($items)
            ->map(fn (array $item) => GeneratedQuestionNormalizer::normalize($item))
            ->filter()
            ->take($questionCount)
            ->values()
            ->all();
    }

    public function modelName(): string
    {
        return "gemini/{$this->model}";
    }
}
