<?php

namespace App\Http\Controllers\Api;

use App\Actions\ExamSessions\ListAssignedSessionsAction;
use App\Http\Resources\StudentExamSessionResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StudentExamController extends BaseController
{
    public function __construct(
        private ListAssignedSessionsAction $listAssignedSessionsAction,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $sessions = $this->listAssignedSessionsAction->execute($request->user());

        return $this->respondSuccess(data: StudentExamSessionResource::collection($sessions)->resolve(), message: 'Assigned exam sessions retrieved successfully.');
    }
}
