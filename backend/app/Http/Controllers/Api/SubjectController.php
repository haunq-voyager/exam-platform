<?php

namespace App\Http\Controllers\Api;

use App\Actions\Catalog\CreateSubjectAction;
use App\Actions\Catalog\DeleteSubjectAction;
use App\Actions\Catalog\ListSubjectsAction;
use App\Actions\Catalog\UpdateSubjectAction;
use App\Data\Catalog\CreateSubjectDto;
use App\Data\Catalog\ListSubjectsDto;
use App\Data\Catalog\UpdateSubjectDto;
use App\Http\Resources\SubjectResource;
use App\Models\Subject;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SubjectController extends BaseController
{
    public function __construct(
        private ListSubjectsAction $listSubjectsAction,
        private CreateSubjectAction $createSubjectAction,
        private UpdateSubjectAction $updateSubjectAction,
        private DeleteSubjectAction $deleteSubjectAction,
    ) {}

    public function index(ListSubjectsDto $dto): JsonResponse
    {
        $subjects = $this->listSubjectsAction->execute($dto);

        return $this->respondSuccess(data: SubjectResource::collection($subjects), message: 'Subjects retrieved successfully.');
    }

    public function store(CreateSubjectDto $dto, Request $request): JsonResponse
    {
        $subject = $this->createSubjectAction->execute($dto, $request->user());

        return $this->respondSuccess(data: SubjectResource::make($subject), message: 'Subject created successfully.', status: Response::HTTP_CREATED);
    }

    public function show(Subject $subject): JsonResponse
    {
        return $this->respondSuccess(data: SubjectResource::make($subject->load(['creator', 'updater'])), message: 'Subject retrieved successfully.');
    }

    public function update(UpdateSubjectDto $dto, Subject $subject, Request $request): JsonResponse
    {
        $subject = $this->updateSubjectAction->execute($subject, $dto, $request->user());

        return $this->respondSuccess(data: SubjectResource::make($subject), message: 'Subject updated successfully.');
    }

    public function destroy(Subject $subject): JsonResponse
    {
        $this->deleteSubjectAction->execute($subject);

        return $this->respondSuccess(data: null, message: 'Subject deleted successfully.');
    }
}
