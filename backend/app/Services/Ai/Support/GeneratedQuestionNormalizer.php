<?php

namespace App\Services\Ai\Support;

class GeneratedQuestionNormalizer
{
    /**
     * @return array{question_text: string, question_type: string, options: array<int, string>, correct_answer: array<int, string>, explanation: string, difficulty: string}|null
     */
    public static function normalize(array $item): ?array
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
