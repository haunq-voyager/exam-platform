<?php

namespace App\Actions\Catalog;

use App\Data\Catalog\UpdateSubjectDto;
use App\Models\Subject;
use App\Models\User;

class UpdateSubjectAction
{
    public function execute(Subject $subject, UpdateSubjectDto $dto, User $updater): Subject
    {
        $subject->update(array_filter([
            'name' => $dto->name,
            'description' => $dto->description,
            'image_path' => $dto->image_path,
        ], fn ($value) => $value !== null) + ['updated_by' => $updater->id]);

        return $subject;
    }
}
