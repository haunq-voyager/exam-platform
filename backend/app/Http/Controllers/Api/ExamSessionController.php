<?php

namespace App\Http\Controllers\Api;

use App\Actions\ExamSessions\CloseExamSessionAction;
use App\Actions\ExamSessions\CreateExamSessionAction;
use App\Actions\ExamSessions\DeleteExamSessionAction;
use App\Actions\ExamSessions\GetExamSessionStatsAction;
use App\Actions\ExamSessions\ListExamSessionsAction;
use App\Actions\ExamSessions\PublishExamSessionAction;
use App\Actions\ExamSessions\UpdateExamSessionAction;
use App\Data\ExamSessions\CreateExamSessionDto;
use App\Data\ExamSessions\ListExamSessionsDto;
use App\Data\ExamSessions\UpdateExamSessionDto;
use App\Http\Resources\ExamSessionResource;
use App\Models\ExamSession;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ExamSessionController extends BaseController
{
    public function __construct(
        private ListExamSessionsAction $listExamSessionsAction,
        private CreateExamSessionAction $createExamSessionAction,
        private UpdateExamSessionAction $updateExamSessionAction,
        private DeleteExamSessionAction $deleteExamSessionAction,
        private PublishExamSessionAction $publishExamSessionAction,
        private CloseExamSessionAction $closeExamSessionAction,
        private GetExamSessionStatsAction $getExamSessionStatsAction,
    ) {}

    public function index(ListExamSessionsDto $dto): JsonResponse
    {
        $sessions = $this->listExamSessionsAction->execute($dto);

        return $this->respondSuccess(data: ExamSessionResource::collection($sessions), message: 'Exam sessions retrieved successfully.');
    }

    public function store(CreateExamSessionDto $dto, Request $request): JsonResponse
    {
        $session = $this->createExamSessionAction->execute($dto, $request->user());

        return $this->respondSuccess(
            data: ExamSessionResource::make($session->load(['exam', 'creator'])),
            message: 'Exam session created successfully.',
            status: Response::HTTP_CREATED,
        );
    }

    public function show(ExamSession $examSession): JsonResponse
    {
        $examSession->load([
            'creator',
            'teachers',
            'exam' => fn ($query) => $query->withCount('examQuestions'),
            'assignments.student',
        ]);

        return $this->respondSuccess(data: ExamSessionResource::make($examSession), message: 'Exam session retrieved successfully.');
    }

    public function update(UpdateExamSessionDto $dto, ExamSession $examSession): JsonResponse
    {
        $examSession = $this->updateExamSessionAction->execute($examSession, $dto);

        return $this->respondSuccess(data: ExamSessionResource::make($examSession), message: 'Exam session updated successfully.');
    }

    public function destroy(ExamSession $examSession): JsonResponse
    {
        $this->deleteExamSessionAction->execute($examSession);

        return $this->respondSuccess(data: null, message: 'Exam session deleted successfully.');
    }

    public function publish(ExamSession $examSession): JsonResponse
    {
        $examSession = $this->publishExamSessionAction->execute($examSession);

        return $this->respondSuccess(data: ExamSessionResource::make($examSession), message: 'Exam session published successfully.');
    }

    public function close(ExamSession $examSession): JsonResponse
    {
        $examSession = $this->closeExamSessionAction->execute($examSession);

        return $this->respondSuccess(data: ExamSessionResource::make($examSession), message: 'Exam session closed successfully.');
    }

    public function stats(): JsonResponse
    {
        $stats = $this->getExamSessionStatsAction->execute();

        return $this->respondSuccess(data: $stats->toArray(), message: 'Exam session stats retrieved successfully.');
    }
}
