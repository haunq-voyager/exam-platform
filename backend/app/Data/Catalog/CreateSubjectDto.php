<?php

namespace App\Data\Catalog;

use Spatie\LaravelData\Data;

class CreateSubjectDto extends Data
{
    public function __construct(
        public string $name,
        public ?string $description = null,
        public ?string $image_path = null,
    ) {}

    public static function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'image_path' => ['nullable', 'string', 'max:255'],
        ];
    }
}
