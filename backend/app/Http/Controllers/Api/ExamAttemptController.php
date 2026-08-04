<?php

namespace App\Http\Controllers\Api;

use App\Actions\Attempts\GetAttemptStatsAction;
use App\Actions\Attempts\ListExamAttemptsForSessionAction;
use App\Actions\Attempts\ListMyExamAttemptsAction;
use App\Actions\Attempts\SaveExamAttemptAnswerAction;
use App\Actions\Attempts\ShowExamAttemptAction;
use App\Actions\Attempts\StartExamAttemptAction;
use App\Actions\Attempts\SubmitExamAttemptAction;
use App\Data\Attempts\SaveAnswerDto;
use App\Http\Resources\ExamAttemptDetailResource;
use App\Http\Resources\ExamAttemptResource;
use App\Models\ExamAttempt;
use App\Models\ExamSession;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ExamAttemptController extends BaseController
{
    public function __construct(
        private StartExamAttemptAction $startExamAttemptAction,
        private SaveExamAttemptAnswerAction $saveExamAttemptAnswerAction,
        private SubmitExamAttemptAction $submitExamAttemptAction,
        private ShowExamAttemptAction $showExamAttemptAction,
        private ListMyExamAttemptsAction $listMyExamAttemptsAction,
        private ListExamAttemptsForSessionAction $listExamAttemptsForSessionAction,
        private GetAttemptStatsAction $getAttemptStatsAction,
    ) {}

    public function store(ExamSession $examSession, Request $request): JsonResponse
    {
        $attempt = $this->startExamAttemptAction->execute($examSession, $request->user());

        return $this->respondSuccess(
            data: ExamAttemptResource::make($attempt),
            message: 'Exam attempt started successfully.',
            status: Response::HTTP_CREATED,
        );
    }

    public function index(Request $request): JsonResponse
    {
        $attempts = $this->listMyExamAttemptsAction->execute($request->user());

        return $this->respondSuccess(data: ExamAttemptResource::collection($attempts)->resolve(), message: 'Exam attempts retrieved successfully.');
    }

    public function indexForSession(ExamSession $examSession): JsonResponse
    {
        $attempts = $this->listExamAttemptsForSessionAction->execute($examSession);

        return $this->respondSuccess(data: ExamAttemptResource::collection($attempts)->resolve(), message: 'Exam attempts retrieved successfully.');
    }

    public function show(ExamAttempt $examAttempt, Request $request): JsonResponse
    {
        $attempt = $this->showExamAttemptAction->execute($examAttempt, $request->user());

        return $this->respondSuccess(data: ExamAttemptDetailResource::make($attempt), message: 'Exam attempt retrieved successfully.');
    }

    public function saveAnswer(SaveAnswerDto $dto, ExamAttempt $examAttempt, Request $request): JsonResponse
    {
        $this->saveExamAttemptAnswerAction->execute($examAttempt, $dto, $request->user());

        return $this->respondSuccess(data: null, message: 'Answer saved successfully.');
    }

    public function submit(ExamAttempt $examAttempt, Request $request): JsonResponse
    {
        $attempt = $this->submitExamAttemptAction->execute($examAttempt, $request->user());

        return $this->respondSuccess(data: ExamAttemptDetailResource::make($attempt->load('session.exam.examQuestions.question')), message: 'Exam submitted successfully.');
    }

    public function stats(Request $request): JsonResponse
    {
        $days = (int) $request->query('days', 30);

        return $this->respondSuccess(data: $this->getAttemptStatsAction->execute($days)->toArray(), message: 'Attempt stats retrieved successfully.');
    }
}
