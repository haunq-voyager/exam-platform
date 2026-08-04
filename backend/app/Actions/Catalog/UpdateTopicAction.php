<?php

namespace App\Actions\Catalog;

use App\Data\Catalog\UpdateTopicDto;
use App\Models\Topic;
use App\Models\User;

class UpdateTopicAction
{
    public function execute(Topic $topic, UpdateTopicDto $dto, User $updater): Topic
    {
        $topic->update(array_filter([
            'subject_id' => $dto->subject_id,
            'name' => $dto->name,
            'description' => $dto->description,
            'image_path' => $dto->image_path,
        ], fn ($value) => $value !== null) + ['updated_by' => $updater->id]);

        return $topic;
    }
}
