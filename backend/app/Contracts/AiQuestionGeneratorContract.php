<?php

namespace App\Contracts;

interface AiQuestionGeneratorContract
{
    /**
     * @return array<int, array{question_text: string, question_type: string, options: array<int, string>, correct_answer: array<int, string>, explanation: string, difficulty: string}>
     */
    public function generate(string $prompt, int $questionCount, ?string $difficulty): array;

    public function modelName(): string;
}
