<?php

namespace App\Http\Controllers\Api;

use App\Actions\Exams\AddQuestionToExamAction;
use App\Actions\Exams\RemoveQuestionFromExamAction;
use App\Data\Exams\AddExamQuestionDto;
use App\Http\Resources\ExamQuestionResource;
use App\Models\Exam;
use App\Models\ExamQuestion;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpFoundation\Response;

class ExamQuestionController extends BaseController
{
    public function __construct(
        private AddQuestionToExamAction $addQuestionToExamAction,
        private RemoveQuestionFromExamAction $removeQuestionFromExamAction,
    ) {}

    public function store(AddExamQuestionDto $dto, Exam $exam): JsonResponse
    {
        $examQuestion = $this->addQuestionToExamAction->execute($exam, $dto);

        return $this->respondSuccess(
            data: ExamQuestionResource::make($examQuestion->load('question')),
            message: 'Question added to exam successfully.',
            status: Response::HTTP_CREATED,
        );
    }

    public function destroy(Exam $exam, ExamQuestion $examQuestion): JsonResponse
    {
        $this->removeQuestionFromExamAction->execute($examQuestion);

        return $this->respondSuccess(data: null, message: 'Question removed from exam successfully.');
    }
}
