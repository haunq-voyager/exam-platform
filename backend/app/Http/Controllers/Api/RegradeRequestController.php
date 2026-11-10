<?php

namespace App\Http\Controllers\Api;

use App\Actions\Regrades\CreateRegradeRequestAction;
use App\Actions\Regrades\ListRegradeRequestsAction;
use App\Actions\Regrades\ReviewRegradeRequestAction;
use App\Data\Regrades\CreateRegradeRequestDto;
use App\Data\Regrades\ListRegradeRequestsDto;
use App\Data\Regrades\ReviewRegradeRequestDto;
use App\Exceptions\ApiException;
use App\Http\Resources\RegradeRequestResource;
use App\Models\RegradeRequest;
use App\Services\Approvals\SessionAccess;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RegradeRequestController extends BaseController
{
    public function __construct(
        private CreateRegradeRequestAction $createRegradeRequestAction,
        private ListRegradeRequestsAction $listRegradeRequestsAction,
        private ReviewRegradeRequestAction $reviewRegradeRequestAction,
        private SessionAccess $sessionAccess,
    ) {}

    /** Staff: requests of the sessions they may see. */
    public function index(ListRegradeRequestsDto $dto, Request $request): JsonResponse
    {
        $regradeRequests = $this->listRegradeRequestsAction->execute($dto, $request->user());

        return $this->respondSuccess(data: RegradeRequestResource::collection($regradeRequests), message: 'Regrade requests retrieved successfully.');
    }

    /** Student: own requests, newest first. */
    public function mine(Request $request): JsonResponse
    {
        $requests = RegradeRequest::query()
            ->where('student_id', $request->user()->id)
            ->with(['student', 'reviewer', 'attempt.session'])
            ->orderByDesc('created_at')
            ->get();

        return $this->respondSuccess(data: RegradeRequestResource::collection($requests)->resolve(), message: 'Regrade requests retrieved successfully.');
    }

    public function store(CreateRegradeRequestDto $dto, Request $request): JsonResponse
    {
        $regradeRequest = $this->createRegradeRequestAction->execute($dto, $request->user());

        return $this->respondSuccess(
            data: RegradeRequestResource::make($regradeRequest->load(['student', 'attempt.session'])),
            message: 'Regrade request submitted successfully.',
            status: Response::HTTP_CREATED,
        );
    }

    public function review(ReviewRegradeRequestDto $dto, RegradeRequest $regradeRequest, Request $request): JsonResponse
    {
        $this->assertCanHandle($regradeRequest, $request);

        $regradeRequest = $this->reviewRegradeRequestAction->execute($regradeRequest, $dto, $request->user());

        return $this->respondSuccess(data: RegradeRequestResource::make($regradeRequest), message: 'Regrade request reviewed successfully.');
    }

    private function assertCanHandle(RegradeRequest $regradeRequest, Request $request): void
    {
        $session = $regradeRequest->attempt()->first()?->session()->first();

        if ($session === null || ! $this->sessionAccess->canView($request->user(), $session)) {
            throw new ApiException('You are not responsible for this exam session.', 'auth.forbidden', 403);
        }
    }
}
