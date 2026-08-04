<?php

namespace App\Actions\Catalog;

use App\Models\Topic;

class DeleteTopicAction
{
    public function execute(Topic $topic): void
    {
        $topic->delete();
    }
}
