<?php

namespace App\Data\QuestionBank;

use Illuminate\Http\UploadedFile;
use Spatie\LaravelData\Data;

class ImportQuestionsDto extends Data
{
    public function __construct(
        public UploadedFile $file,
    ) {}

    public static function rules(): array
    {
        return [
            'file' => ['required', 'file', 'mimes:csv,txt', 'max:5120'],
        ];
    }
}
