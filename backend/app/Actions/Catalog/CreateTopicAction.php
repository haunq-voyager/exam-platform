<?php

namespace App\Actions\Catalog;

use App\Data\Catalog\CreateTopicDto;
use App\Models\Topic;
use App\Models\User;

class CreateTopicAction
{
    public function execute(CreateTopicDto $dto, User $creator): Topic
    {
        return Topic::create([
            'subject_id' => $dto->subject_id,
            'name' => $dto->name,
            'description' => $dto->description,
            'image_path' => $dto->image_path,
            'created_by' => $creator->id,
        ]);
    }
}
