<?php

namespace App\Data\Catalog;

use Spatie\LaravelData\Data;

class UpdateSubjectDto extends Data
{
    public function __construct(
        public ?string $name = null,
        public ?string $description = null,
        public ?string $image_path = null,
    ) {}

    public static function rules(): array
    {
        return [
            'name' => ['sometimes', 'nullable', 'string', 'max:255'],
            'description' => ['sometimes', 'nullable', 'string'],
            'image_path' => ['sometimes', 'nullable', 'string', 'max:255'],
        ];
    }
}
