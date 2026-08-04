<?php

namespace App\Data\Uploads;

use Illuminate\Http\UploadedFile;
use Spatie\LaravelData\Data;

class UploadImageDto extends Data
{
    public function __construct(
        public UploadedFile $image,
    ) {}

    public static function rules(): array
    {
        return [
            'image' => ['required', 'image', 'max:4096'],
        ];
    }
}
