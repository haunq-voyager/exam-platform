<?php

namespace App\Services\Ai\Support;

class QuestionGenerationPrompt
{
    public static function build(string $prompt, int $questionCount, ?string $difficulty): string
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
}
