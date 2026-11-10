<?php

namespace App\Http\Controllers\Api;

use App\Actions\Proctoring\ListProctoringEventsAction;
use App\Actions\Proctoring\RecordProctoringEventAction;
use App\Data\Proctoring\RecordProctoringEventDto;
use App\Http\Resources\ProctoringEventResource;
use App\Models\ExamAttempt;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ProctoringEventController extends BaseController
{
    public function __construct(
        private RecordProctoringEventAction $recordProctoringEventAction,
        private ListProctoringEventsAction $listProctoringEventsAction,
        private \App\Services\Approvals\SessionAccess $sessionAccess,
    ) {}

    public function store(RecordProctoringEventDto $dto, ExamAttempt $examAttempt, Request $request): JsonResponse
    {
        ['event' => $event, 'attempt' => $attempt] = $this->recordProctoringEventAction->execute($examAttempt, $dto, $request->user());

        return $this->respondSuccess(
            data: [
                'event' => ProctoringEventResource::make($event)->resolve(),
                'violation' => [
                    'count' => $attempt->violation_count,
                    'max_violations' => $attempt->session->max_violations,
                    'remaining' => max(0, $attempt->session->max_violations - $attempt->violation_count),
                    'flagged' => $attempt->is_flagged,
                    'cancelled' => $attempt->isCancelled(),
                ],
            ],
            message: 'Proctoring event recorded successfully.',
            status: Response::HTTP_CREATED,
        );
    }

    public function index(ExamAttempt $examAttempt, Request $request): JsonResponse
    {
        // Only for sessions the viewer is responsible for (a teacher: the sessions they proctor).
        $session = $examAttempt->session()->first();
        if ($session === null || ! $this->sessionAccess->canView($request->user(), $session)) {
            throw new \App\Exceptions\ApiException('You are not responsible for this exam session.', 'auth.forbidden', 403);
        }

        $events = $this->listProctoringEventsAction->execute($examAttempt);

        return $this->respondSuccess(data: ProctoringEventResource::collection($events)->resolve(), message: 'Proctoring events retrieved successfully.');
    }
}
