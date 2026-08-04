<?php

namespace App\Http\Controllers\Api;

use App\Actions\Regrades\CreateRegradeRequestAction;
use App\Actions\Regrades\ListRegradeRequestsAction;
use App\Actions\Regrades\ReviewRegradeRequestAction;
use App\Data\Regrades\CreateRegradeRequestDto;
use App\Data\Regrades\ListRegradeRequestsDto;
use App\Data\Regrades\ReviewRegradeRequestDto;
use App\Http\Resources\RegradeRequestResource;
use App\Models\RegradeRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RegradeRequestController extends BaseController
{
    public function __construct(
        private CreateRegradeRequestAction $createRegradeRequestAction,
        private ListRegradeRequestsAction $listRegradeRequestsAction,
        private ReviewRegradeRequestAction $reviewRegradeRequestAction,
    ) {}

    public function index(ListRegradeRequestsDto $dto): JsonResponse
    {
        $regradeRequests = $this->listRegradeRequestsAction->execute($dto);

        return $this->respondSuccess(data: RegradeRequestResource::collection($regradeRequests), message: 'Regrade requests retrieved successfully.');
    }

    public function store(CreateRegradeRequestDto $dto, Request $request): JsonResponse
    {
        $regradeRequest = $this->createRegradeRequestAction->execute($dto, $request->user());

        return $this->respondSuccess(
            data: RegradeRequestResource::make($regradeRequest),
            message: 'Regrade request submitted successfully.',
            status: Response::HTTP_CREATED,
        );
    }

    public function show(RegradeRequest $regradeRequest): JsonResponse
    {
        return $this->respondSuccess(
            data: RegradeRequestResource::make($regradeRequest->load(['student', 'reviewer', 'attempt.session'])),
            message: 'Regrade request retrieved successfully.',
        );
    }

    public function review(ReviewRegradeRequestDto $dto, RegradeRequest $regradeRequest, Request $request): JsonResponse
    {
        $regradeRequest = $this->reviewRegradeRequestAction->execute($regradeRequest, $dto, $request->user());

        return $this->respondSuccess(data: RegradeRequestResource::make($regradeRequest), message: 'Regrade request reviewed successfully.');
    }
}
