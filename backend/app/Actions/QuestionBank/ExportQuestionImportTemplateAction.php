<?php

namespace App\Actions\QuestionBank;

class ExportQuestionImportTemplateAction
{
    private const HEADER = ['question_text', 'topic_name', 'question_type', 'option_a', 'option_b', 'option_c', 'option_d', 'correct_answer', 'difficulty', 'explanation'];

    private const EXAMPLE_ROW = [
        'Laravel là framework được viết bằng ngôn ngữ lập trình nào?',
        'Lập trình Web với Laravel & Next.js',
        'single_choice',
        'PHP',
        'Python',
        'Ruby',
        'Java',
        'PHP',
        'easy',
        'Đáp án đúng là: PHP.',
    ];

    public function execute(): string
    {
        $handle = fopen('php://temp', 'r+');
        fputcsv($handle, self::HEADER);
        fputcsv($handle, self::EXAMPLE_ROW);
        rewind($handle);
        $content = stream_get_contents($handle);
        fclose($handle);

        return $content;
    }
}
