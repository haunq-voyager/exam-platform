<?php

namespace App\Data\Users;

use Illuminate\Http\UploadedFile;
use Spatie\LaravelData\Data;

class UploadAvatarDto extends Data
{
    public function __construct(
        public UploadedFile $avatar,
    ) {}

    public static function rules(): array
    {
        return [
            'avatar' => ['required', 'file', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
        ];
    }
}
