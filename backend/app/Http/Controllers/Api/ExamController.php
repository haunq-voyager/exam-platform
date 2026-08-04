<?php

namespace App\Http\Controllers\Api;

use App\Actions\Exams\CreateExamAction;
use App\Actions\Exams\DeleteExamAction;
use App\Actions\Exams\ListExamsAction;
use App\Actions\Exams\UpdateExamAction;
use App\Data\Exams\CreateExamDto;
use App\Data\Exams\ListExamsDto;
use App\Data\Exams\UpdateExamDto;
use App\Http\Resources\ExamResource;
use App\Models\Exam;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ExamController extends BaseController
{
    public function __construct(
        private ListExamsAction $listExamsAction,
        private CreateExamAction $createExamAction,
        private UpdateExamAction $updateExamAction,
        private DeleteExamAction $deleteExamAction,
    ) {}

    public function index(ListExamsDto $dto): JsonResponse
    {
        $exams = $this->listExamsAction->execute($dto);

        return $this->respondSuccess(data: ExamResource::collection($exams), message: 'Exams retrieved successfully.');
    }

    public function store(CreateExamDto $dto, Request $request): JsonResponse
    {
        $exam = $this->createExamAction->execute($dto, $request->user());

        return $this->respondSuccess(data: ExamResource::make($exam), message: 'Exam created successfully.', status: Response::HTTP_CREATED);
    }

    public function show(Exam $exam): JsonResponse
    {
        $exam->load(['creator', 'examQuestions.question']);

        return $this->respondSuccess(data: ExamResource::make($exam), message: 'Exam retrieved successfully.');
    }

    public function update(UpdateExamDto $dto, Exam $exam): JsonResponse
    {
        $exam = $this->updateExamAction->execute($exam, $dto);

        return $this->respondSuccess(data: ExamResource::make($exam), message: 'Exam updated successfully.');
    }

    public function destroy(Exam $exam): JsonResponse
    {
        $this->deleteExamAction->execute($exam);

        return $this->respondSuccess(data: null, message: 'Exam deleted successfully.');
    }
}
