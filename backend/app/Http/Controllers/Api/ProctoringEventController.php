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
    ) {}

    public function store(RecordProctoringEventDto $dto, ExamAttempt $examAttempt, Request $request): JsonResponse
    {
        $event = $this->recordProctoringEventAction->execute($examAttempt, $dto, $request->user());

        return $this->respondSuccess(
            data: ProctoringEventResource::make($event),
            message: 'Proctoring event recorded successfully.',
            status: Response::HTTP_CREATED,
        );
    }

    public function index(ExamAttempt $examAttempt): JsonResponse
    {
        $events = $this->listProctoringEventsAction->execute($examAttempt);

        return $this->respondSuccess(data: ProctoringEventResource::collection($events)->resolve(), message: 'Proctoring events retrieved successfully.');
    }
}
