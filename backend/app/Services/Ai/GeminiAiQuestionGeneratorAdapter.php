<?php

namespace App\Services\Ai;

use App\Contracts\AiQuestionGeneratorContract;
use App\Exceptions\ApiException;
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
                "https://generativelanguage.googleapis.com/v1beta/models/{$this->model}:generateContent",
                [
                    'contents' => [[
                        'parts' => [['text' => $this->buildPrompt($prompt, $questionCount, $difficulty)]],
                    ]],
                    'generationConfig' => [
                        'responseMimeType' => 'application/json',
                        'responseSchema' => self::RESPONSE_SCHEMA,
                        'temperature' => 0.7,
                    ],
                ],
                ['key' => $this->apiKey],
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
            ->map(fn (array $item) => $this->normalizeItem($item))
            ->filter()
            ->take($questionCount)
            ->values()
            ->all();
    }

    public function modelName(): string
    {
        return "gemini/{$this->model}";
    }

    private function buildPrompt(string $prompt, int $questionCount, ?string $difficulty): string
    {
        $difficultyLine = $difficulty !== null
            ? "Toàn bộ câu hỏi phải ở mức độ khó: {$difficulty}."
            : 'Có thể pha trộn các mức độ khó easy/medium/hard.';

        return <<<PROMPT
            Bạn là trợ lý ra đề thi trắc nghiệm cho một hệ thống thi trực tuyến.
            Hãy sinh chính xác {$questionCount} câu hỏi trắc nghiệm bằng tiếng Việt cho chủ đề/yêu cầu sau:

            "{$prompt}"

            Yêu cầu:
            - Mỗi câu hỏi có 4 lựa chọn (option), trừ khi loại câu hỏi là true_false thì chỉ có 2 lựa chọn ("Đúng", "Sai").
            - Trường correct_answer phải là các giá trị lấy nguyên văn từ options.
            - question_type là một trong: single_choice, multiple_choice, true_false.
            - {$difficultyLine}
            - Câu hỏi phải rõ ràng, đúng kiến thức, không trùng lặp nội dung giữa các câu.
            - explanation giải thích ngắn gọn vì sao đáp án đó đúng.
            PROMPT;
    }

    /**
     * @return array{question_text: string, question_type: string, options: array<int, string>, correct_answer: array<int, string>, explanation: string, difficulty: string}|null
     */
    private function normalizeItem(array $item): ?array
    {
        $options = array_values(array_filter(array_map('strval', (array) ($item['options'] ?? []))));
        $correctAnswer = array_values(array_intersect(
            array_map('strval', (array) ($item['correct_answer'] ?? [])),
            $options,
        ));

        if (
            ! isset($item['question_text'], $item['question_type'])
            || count($options) < 2
            || $correctAnswer === []
        ) {
            return null;
        }

        $questionType = in_array($item['question_type'], ['single_choice', 'multiple_choice', 'true_false'], true)
            ? $item['question_type']
            : 'single_choice';

        $difficultyValue = in_array($item['difficulty'] ?? null, ['easy', 'medium', 'hard'], true)
            ? $item['difficulty']
            : 'medium';

        return [
            'question_text' => (string) $item['question_text'],
            'question_type' => $questionType,
            'options' => $options,
            'correct_answer' => $correctAnswer,
            'explanation' => (string) ($item['explanation'] ?? ''),
            'difficulty' => $difficultyValue,
        ];
    }
}
