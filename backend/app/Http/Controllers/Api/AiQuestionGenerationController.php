<?php

namespace App\Http\Controllers\Api;

use App\Actions\Ai\ApproveAiGeneratedQuestionsAction;
use App\Actions\Ai\CreateAiGenerationAction;
use App\Actions\Ai\ListAiGenerationsAction;
use App\Actions\Ai\RejectAiGeneratedQuestionsAction;
use App\Data\Ai\CreateAiGenerationDto;
use App\Data\Ai\ReviewGeneratedQuestionsDto;
use App\Http\Resources\AiGenerationResource;
use App\Models\AiGeneration;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AiQuestionGenerationController extends BaseController
{
    public function __construct(
        private CreateAiGenerationAction $createAiGenerationAction,
        private ApproveAiGeneratedQuestionsAction $approveAiGeneratedQuestionsAction,
        private RejectAiGeneratedQuestionsAction $rejectAiGeneratedQuestionsAction,
        private ListAiGenerationsAction $listAiGenerationsAction,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $generations = $this->listAiGenerationsAction->execute(
            perPage: (int) $request->query('per_page', 15),
            page: (int) $request->query('page', 1),
        );

        return $this->respondSuccess(data: AiGenerationResource::collection($generations), message: 'AI generations retrieved successfully.');
    }

    public function store(CreateAiGenerationDto $dto, Request $request): JsonResponse
    {
        $generation = $this->createAiGenerationAction->execute($dto, $request->user());

        return $this->respondSuccess(
            data: AiGenerationResource::make($generation),
            message: 'AI question generation completed successfully.',
            status: Response::HTTP_CREATED,
        );
    }

    public function show(AiGeneration $aiGeneration): JsonResponse
    {
        return $this->respondSuccess(
            data: AiGenerationResource::make($aiGeneration->load('generatedQuestions')),
            message: 'AI generation retrieved successfully.',
        );
    }

    public function approve(ReviewGeneratedQuestionsDto $dto, AiGeneration $aiGeneration, Request $request): JsonResponse
    {
        $generation = $this->approveAiGeneratedQuestionsAction->execute($aiGeneration, $dto, $request->user());

        return $this->respondSuccess(data: AiGenerationResource::make($generation), message: 'Generated questions approved successfully.');
    }

    public function reject(ReviewGeneratedQuestionsDto $dto, AiGeneration $aiGeneration): JsonResponse
    {
        $generation = $this->rejectAiGeneratedQuestionsAction->execute($aiGeneration, $dto);

        return $this->respondSuccess(data: AiGenerationResource::make($generation), message: 'Generated questions rejected successfully.');
    }
}
