<?php

namespace App\Http\Controllers\Api;

use App\Actions\ExamSessions\AssignStudentToSessionAction;
use App\Actions\ExamSessions\UnassignStudentFromSessionAction;
use App\Data\ExamSessions\AssignStudentDto;
use App\Http\Resources\ExamSessionAssignmentResource;
use App\Models\ExamSession;
use App\Models\ExamSessionAssignment;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpFoundation\Response;

class ExamSessionAssignmentController extends BaseController
{
    public function __construct(
        private AssignStudentToSessionAction $assignStudentToSessionAction,
        private UnassignStudentFromSessionAction $unassignStudentFromSessionAction,
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

    public function destroy(ExamSession $examSession, ExamSessionAssignment $assignment): JsonResponse
    {
        $this->unassignStudentFromSessionAction->execute($assignment);

        return $this->respondSuccess(data: null, message: 'Student unassigned from exam session successfully.');
    }
}
