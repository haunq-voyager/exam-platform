<?php

namespace App\Http\Controllers\Api;

use App\Actions\ExamSessions\AssignStudentToSessionAction;
use App\Actions\ExamSessions\BulkAssignStudentsToSessionAction;
use App\Actions\ExamSessions\ListAssignableStudentsAction;
use App\Actions\ExamSessions\UnassignStudentFromSessionAction;
use App\Data\ExamSessions\AssignStudentDto;
use App\Data\ExamSessions\BulkAssignStudentsDto;
use App\Data\ExamSessions\ListAssignableStudentsDto;
use App\Http\Resources\ExamSessionAssignmentResource;
use App\Http\Resources\UserResource;
use App\Models\ExamSession;
use App\Models\ExamSessionAssignment;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpFoundation\Response;

class ExamSessionAssignmentController extends BaseController
{
    public function __construct(
        private AssignStudentToSessionAction $assignStudentToSessionAction,
        private UnassignStudentFromSessionAction $unassignStudentFromSessionAction,
        private ListAssignableStudentsAction $listAssignableStudentsAction,
        private BulkAssignStudentsToSessionAction $bulkAssignStudentsToSessionAction,
    ) {}

    public function store(AssignStudentDto $dto, ExamSession $examSession): JsonResponse
    {
        $assignment = $this->assignStudentToSessionAction->execute($examSession, $dto);

        return $this->respondSuccess(
            data: ExamSessionAssignmentResource::make($assignment->load('student')),
            message: 'Student assigned to exam session successfully.',
            status: Response::HTTP_CREATED,
        );
    }

    /** Students not yet assigned to the session, paginated, filterable by search text and major. */
    public function candidates(ListAssignableStudentsDto $dto, ExamSession $examSession): JsonResponse
    {
        $students = $this->listAssignableStudentsAction->execute($examSession, $dto);

        return $this->respondSuccess(
            data: UserResource::collection($students),
            message: 'Assignable students retrieved successfully.',
        );
    }

    public function bulkStore(BulkAssignStudentsDto $dto, ExamSession $examSession): JsonResponse
    {
        $assigned = $this->bulkAssignStudentsToSessionAction->execute($examSession, $dto);

        return $this->respondSuccess(
            data: ['assigned_count' => $assigned],
            message: 'Students assigned to exam session successfully.',
            status: Response::HTTP_CREATED,
        );
    }

    public function destroy(ExamSession $examSession, ExamSessionAssignment $assignment): JsonResponse
    {
        $this->unassignStudentFromSessionAction->execute($assignment);

        return $this->respondSuccess(data: null, message: 'Student unassigned from exam session successfully.');
    }
}
