<?php

namespace App\Actions\QuestionBank;

use App\Enums\Difficulty;
use App\Enums\QuestionSource;
use App\Enums\QuestionStatus;
use App\Enums\QuestionType;
use App\Models\Question;
use App\Models\Topic;
use App\Models\User;
use Illuminate\Http\UploadedFile;

/**
 * Imports questions from a CSV file (the format Excel exports/opens natively).
 * Each row becomes a `pending` question awaiting teacher/admin approval.
 */
class ImportQuestionsFromExcelAction
{
    private const OPTION_COLUMNS = ['option_a', 'option_b', 'option_c', 'option_d'];

    public function execute(UploadedFile $file, User $creator): array
    {
        $handle = fopen($file->getRealPath(), 'r');
        $header = array_map(fn ($column) => strtolower(trim((string) $column)), fgetcsv($handle) ?: []);

        $successCount = 0;
        $errors = [];
        $rowNumber = 1;

        while (($row = fgetcsv($handle)) !== false) {
            $rowNumber++;

            if (count(array_filter($row, fn ($value) => trim((string) $value) !== '')) === 0) {
                continue;
            }

            $rowData = array_combine($header, array_pad($row, count($header), null));

            try {
                $this->importRow($rowData, $creator);
                $successCount++;
            } catch (\Throwable $exception) {
                $errors[] = ['row' => $rowNumber, 'message' => $exception->getMessage()];
            }
        }

        fclose($handle);

        return [
            'success_count' => $successCount,
            'error_count' => count($errors),
            'errors' => $errors,
        ];
    }

    private function importRow(array $rowData, User $creator): void
    {
        $questionText = trim((string) ($rowData['question_text'] ?? ''));
        if ($questionText === '') {
            throw new \RuntimeException('question_text is required.');
        }

        $options = collect(self::OPTION_COLUMNS)
            ->map(fn ($column) => trim((string) ($rowData[$column] ?? '')))
            ->filter(fn ($value) => $value !== '')
            ->values()
            ->all();

        if (count($options) < 2) {
            throw new \RuntimeException('At least 2 options are required (option_a, option_b, ...).');
        }

        $correctAnswer = collect(explode('|', (string) ($rowData['correct_answer'] ?? '')))
            ->map(fn ($value) => trim($value))
            ->filter(fn ($value) => $value !== '')
            ->values()
            ->all();

        if (count($correctAnswer) < 1) {
            throw new \RuntimeException('correct_answer is required (use "|" to separate multiple correct options).');
        }

        $topicName = trim((string) ($rowData['topic_name'] ?? ''));
        $topic = $topicName !== '' ? Topic::query()->where('name', $topicName)->first() : null;

        $questionType = count($correctAnswer) > 1
            ? QuestionType::MultipleChoice
            : (strtolower(trim((string) ($rowData['question_type'] ?? ''))) === 'true_false' ? QuestionType::TrueFalse : QuestionType::SingleChoice);

        $difficulty = Difficulty::tryFrom(strtolower(trim((string) ($rowData['difficulty'] ?? '')))) ?? Difficulty::Medium;

        Question::create([
            'topic_id' => $topic?->id,
            'created_by' => $creator->id,
            'question_text' => $questionText,
            'question_type' => $questionType,
            'options' => $options,
            'correct_answer' => $correctAnswer,
            'explanation' => filled($rowData['explanation'] ?? null) ? trim((string) $rowData['explanation']) : null,
            'difficulty' => $difficulty,
            'status' => QuestionStatus::Pending,
            'source' => QuestionSource::Manual,
        ]);
    }
}
