<?php

namespace App\Http\Controllers\Api;

use App\Actions\ExamSessions\AssignTeacherToSessionAction;
use App\Actions\ExamSessions\RemoveTeacherFromSessionAction;
use App\Data\ExamSessions\AssignTeacherDto;
use App\Http\Resources\ExamSessionResource;
use App\Models\ExamSession;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpFoundation\Response;

class ExamSessionTeacherController extends BaseController
{
    public function __construct(
        private AssignTeacherToSessionAction $assignTeacherToSessionAction,
        private RemoveTeacherFromSessionAction $removeTeacherFromSessionAction,
    ) {}

    public function store(AssignTeacherDto $dto, ExamSession $examSession): JsonResponse
    {
        $session = $this->assignTeacherToSessionAction->execute($examSession, $dto);

        return $this->respondSuccess(
            data: ExamSessionResource::make($session),
            message: 'Teacher assigned to exam session successfully.',
            status: Response::HTTP_CREATED,
        );
    }

    public function destroy(ExamSession $examSession, User $teacher): JsonResponse
    {
        $this->removeTeacherFromSessionAction->execute($examSession, $teacher);

        return $this->respondSuccess(data: null, message: 'Teacher removed from exam session successfully.');
    }
}
