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
 * Calls the Anthropic Claude API to generate structured multiple-choice
 * questions, using tool-use (forced tool_choice) to guarantee structured
 * JSON output. Swap this in via AppServiceProvider only — calling code
 * never changes.
 */
class ClaudeAiQuestionGeneratorAdapter implements AiQuestionGeneratorContract
{
    private const TOOL_NAME = 'submit_questions';

    public function __construct(
        private readonly string $apiKey,
        private readonly string $model,
    ) {}

    public function generate(string $prompt, int $questionCount, ?string $difficulty): array
    {
        $response = Http::withHeaders([
            'x-api-key' => $this->apiKey,
            'anthropic-version' => '2023-06-01',
        ])
            ->timeout(60)
            ->post('https://api.anthropic.com/v1/messages', [
                'model' => $this->model,
                'max_tokens' => 4096,
                'messages' => [
                    ['role' => 'user', 'content' => QuestionGenerationPrompt::build($prompt, $questionCount, $difficulty)],
                ],
                'tools' => [$this->toolDefinition()],
                'tool_choice' => ['type' => 'tool', 'name' => self::TOOL_NAME],
            ]);

        if ($response->failed()) {
            Log::warning('Claude question generation request failed', [
                'status' => $response->status(),
                'body' => $response->body(),
            ]);

            throw new ApiException(
                'Không thể gọi dịch vụ AI để sinh câu hỏi. Vui lòng thử lại sau.',
                'ai.provider_error',
                Response::HTTP_BAD_GATEWAY,
            );
        }

        $toolUseBlock = collect($response->json('content', []))
            ->firstWhere('type', 'tool_use');

        $items = $toolUseBlock['input']['questions'] ?? null;

        if (! is_array($items) || $items === []) {
            Log::warning('Claude question generation returned an unparseable payload', ['body' => $response->body()]);

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
        return "claude/{$this->model}";
    }

    private function toolDefinition(): array
    {
        return [
            'name' => self::TOOL_NAME,
            'description' => 'Submit the generated multiple-choice questions.',
            'input_schema' => [
                'type' => 'object',
                'properties' => [
                    'questions' => [
                        'type' => 'array',
                        'items' => [
                            'type' => 'object',
                            'properties' => [
                                'question_text' => ['type' => 'string'],
                                'question_type' => [
                                    'type' => 'string',
                                    'enum' => ['single_choice', 'multiple_choice', 'true_false'],
                                ],
                                'options' => ['type' => 'array', 'items' => ['type' => 'string']],
                                'correct_answer' => ['type' => 'array', 'items' => ['type' => 'string']],
                                'explanation' => ['type' => 'string'],
                                'difficulty' => [
                                    'type' => 'string',
                                    'enum' => ['easy', 'medium', 'hard'],
                                ],
                            ],
                            'required' => ['question_text', 'question_type', 'options', 'correct_answer', 'explanation', 'difficulty'],
                        ],
                    ],
                ],
                'required' => ['questions'],
            ],
        ];
    }
}
