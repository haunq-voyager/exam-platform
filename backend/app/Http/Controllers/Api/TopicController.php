<?php

namespace App\Http\Controllers\Api;

use App\Actions\Catalog\CreateTopicAction;
use App\Actions\Catalog\DeleteTopicAction;
use App\Actions\Catalog\ListTopicsAction;
use App\Actions\Catalog\UpdateTopicAction;
use App\Data\Catalog\CreateTopicDto;
use App\Data\Catalog\ListTopicsDto;
use App\Data\Catalog\UpdateTopicDto;
use App\Http\Resources\TopicResource;
use App\Models\Topic;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class TopicController extends BaseController
{
    public function __construct(
        private ListTopicsAction $listTopicsAction,
        private CreateTopicAction $createTopicAction,
        private UpdateTopicAction $updateTopicAction,
        private DeleteTopicAction $deleteTopicAction,
    ) {}

    public function index(ListTopicsDto $dto): JsonResponse
    {
        $topics = $this->listTopicsAction->execute($dto);

        return $this->respondSuccess(data: TopicResource::collection($topics), message: 'Topics retrieved successfully.');
    }

    public function store(CreateTopicDto $dto, Request $request): JsonResponse
    {
        $topic = $this->createTopicAction->execute($dto, $request->user());

        return $this->respondSuccess(data: TopicResource::make($topic), message: 'Topic created successfully.', status: Response::HTTP_CREATED);
    }

    public function show(Topic $topic): JsonResponse
    {
        return $this->respondSuccess(data: TopicResource::make($topic->load(['subject', 'creator', 'updater'])), message: 'Topic retrieved successfully.');
    }

    public function update(UpdateTopicDto $dto, Topic $topic, Request $request): JsonResponse
    {
        $topic = $this->updateTopicAction->execute($topic, $dto, $request->user());

        return $this->respondSuccess(data: TopicResource::make($topic), message: 'Topic updated successfully.');
    }

    public function destroy(Topic $topic): JsonResponse
    {
        $this->deleteTopicAction->execute($topic);

        return $this->respondSuccess(data: null, message: 'Topic deleted successfully.');
    }
}
