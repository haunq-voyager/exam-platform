<?php

namespace App\Actions\Catalog;

use App\Data\Catalog\CreateSubjectDto;
use App\Models\Subject;
use App\Models\User;

class CreateSubjectAction
{
    public function execute(CreateSubjectDto $dto, User $creator): Subject
    {
        return Subject::create([
            'name' => $dto->name,
            'description' => $dto->description,
            'image_path' => $dto->image_path,
            'created_by' => $creator->id,
        ]);
    }
}
