<?php

namespace App\Http\Controllers\Api;

use App\Actions\QuestionBank\ApproveQuestionAction;
use App\Actions\QuestionBank\CreateQuestionAction;
use App\Actions\QuestionBank\DeleteQuestionAction;
use App\Actions\QuestionBank\ExportQuestionImportTemplateAction;
use App\Actions\QuestionBank\GetQuestionStatsAction;
use App\Actions\QuestionBank\ImportQuestionsFromExcelAction;
use App\Actions\QuestionBank\ListQuestionsAction;
use App\Actions\QuestionBank\RejectQuestionAction;
use App\Actions\QuestionBank\UpdateQuestionAction;
use App\Data\QuestionBank\CreateQuestionDto;
use App\Data\QuestionBank\ImportQuestionsDto;
use App\Data\QuestionBank\ListQuestionsDto;
use App\Data\QuestionBank\UpdateQuestionDto;
use App\Http\Resources\QuestionResource;
use App\Models\Question;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response as HttpResponse;
use Symfony\Component\HttpFoundation\Response;

class QuestionController extends BaseController
{
    public function __construct(
        private ListQuestionsAction $listQuestionsAction,
        private CreateQuestionAction $createQuestionAction,
        private UpdateQuestionAction $updateQuestionAction,
        private DeleteQuestionAction $deleteQuestionAction,
        private ApproveQuestionAction $approveQuestionAction,
        private RejectQuestionAction $rejectQuestionAction,
        private GetQuestionStatsAction $getQuestionStatsAction,
        private ImportQuestionsFromExcelAction $importQuestionsFromExcelAction,
        private ExportQuestionImportTemplateAction $exportQuestionImportTemplateAction,
    ) {}

    public function index(ListQuestionsDto $dto): JsonResponse
    {
        $questions = $this->listQuestionsAction->execute($dto);

        return $this->respondSuccess(data: QuestionResource::collection($questions), message: 'Questions retrieved successfully.');
    }

    public function store(CreateQuestionDto $dto, Request $request): JsonResponse
    {
        $question = $this->createQuestionAction->execute($dto, $request->user());

        return $this->respondSuccess(data: QuestionResource::make($question), message: 'Question created successfully.', status: Response::HTTP_CREATED);
    }

    public function show(Question $question): JsonResponse
    {
        return $this->respondSuccess(data: QuestionResource::make($question->load(['topic', 'creator', 'updater'])), message: 'Question retrieved successfully.');
    }

    public function update(UpdateQuestionDto $dto, Question $question, Request $request): JsonResponse
    {
        $question = $this->updateQuestionAction->execute($question, $dto, $request->user());

        return $this->respondSuccess(data: QuestionResource::make($question), message: 'Question updated successfully.');
    }

    public function destroy(Question $question): JsonResponse
    {
        $this->deleteQuestionAction->execute($question);

        return $this->respondSuccess(data: null, message: 'Question deleted successfully.');
    }

    public function approve(Question $question, Request $request): JsonResponse
    {
        $question = $this->approveQuestionAction->execute($question, $request->user());

        return $this->respondSuccess(data: QuestionResource::make($question), message: 'Question approved successfully.');
    }

    public function reject(Question $question, Request $request): JsonResponse
    {
        $question = $this->rejectQuestionAction->execute($question, $request->user());

        return $this->respondSuccess(data: QuestionResource::make($question), message: 'Question rejected successfully.');
    }

    public function stats(): JsonResponse
    {
        return $this->respondSuccess(data: $this->getQuestionStatsAction->execute(), message: 'Question stats retrieved successfully.');
    }

    public function import(ImportQuestionsDto $dto, Request $request): JsonResponse
    {
        $result = $this->importQuestionsFromExcelAction->execute($dto->file, $request->user());

        return $this->respondSuccess(data: $result, message: 'Questions imported successfully.');
    }

    public function importTemplate(): HttpResponse
    {
        $content = $this->exportQuestionImportTemplateAction->execute();

        return response($content, Response::HTTP_OK, [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="question-import-template.csv"',
        ]);
    }
}
