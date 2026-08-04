<?php

namespace App\Actions\Uploads;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

class UploadImageAction
{
    public function execute(UploadedFile $image): array
    {
        $path = $image->store('uploads', 'public');

        return [
            'path' => $path,
            'url' => Storage::disk('public')->url($path),
        ];
    }
}
