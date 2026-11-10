<?php

namespace App\Http\Controllers\Api;

use App\Actions\Exams\UpdateExamAction;
use App\Actions\ExamSessions\ResolveEditableSessionExamAction;
use App\Data\Exams\UpdateExamDto;
use App\Data\ExamSessions\AddSessionExamQuestionsDto;
use App\Data\ExamSessions\ReorderSessionExamQuestionsDto;
use App\Data\ExamSessions\UpdateSessionExamQuestionDto;
use App\Enums\QuestionStatus;
use App\Http\Resources\ExamResource;
use App\Models\Exam;
use App\Models\ExamQuestion;
use App\Models\ExamSession;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** Edits the exam content (settings, questions, points, order) of one exam session. */
class ExamSessionExamController extends BaseController
{
    public function __construct(
        private ResolveEditableSessionExamAction $resolveEditableSessionExamAction,
        private UpdateExamAction $updateExamAction,
    ) {}

    public function show(ExamSession $examSession): JsonResponse
    {
        return $this->respondExam($examSession, $examSession->exam, 'Session exam retrieved successfully.');
    }

    public function update(UpdateExamDto $dto, ExamSession $examSession, Request $request): JsonResponse
    {
        $exam = $this->resolveEditableSessionExamAction->execute($examSession, $request->user());
        $this->updateExamAction->execute($exam, $dto);

        return $this->respondExam($examSession, $exam->refresh(), 'Session exam updated successfully.');
    }

    public function addQuestions(AddSessionExamQuestionsDto $dto, ExamSession $examSession, Request $request): JsonResponse
    {
        $exam = $this->resolveEditableSessionExamAction->execute($examSession, $request->user());

        $existing = $exam->examQuestions()->pluck('question_id')->all();
        $order = (int) $exam->examQuestions()->max('order');

        $newIds = collect($dto->question_ids)
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->diff($existing);

        // Only approved, non-deleted questions can go into an exam.
        $allowed = \App\Models\Question::query()->whereIn('id', $newIds)->where('status', QuestionStatus::Approved)->pluck('id');

        foreach ($newIds->intersect($allowed) as $questionId) {
            $exam->examQuestions()->create(['question_id' => $questionId, 'order' => ++$order, 'points' => $dto->points]);
        }

        return $this->respondExam($examSession, $exam, 'Questions added successfully.');
    }

    public function updateQuestion(UpdateSessionExamQuestionDto $dto, ExamSession $examSession, ExamQuestion $examQuestion, Request $request): JsonResponse
    {
        $exam = $this->resolveEditableSessionExamAction->execute($examSession, $request->user());
        $target = $this->sameQuestionIn($exam, $examQuestion);
        $target->update(['points' => $dto->points]);

        return $this->respondExam($examSession, $exam, 'Question updated successfully.');
    }

    public function removeQuestion(ExamSession $examSession, ExamQuestion $examQuestion, Request $request): JsonResponse
    {
        $exam = $this->resolveEditableSessionExamAction->execute($examSession, $request->user());
        $this->sameQuestionIn($exam, $examQuestion)->delete();

        // Keep the order numbers gap-free.
        foreach ($exam->examQuestions()->orderBy('order')->get() as $index => $remaining) {
            $remaining->update(['order' => $index + 1]);
        }

        return $this->respondExam($examSession, $exam, 'Question removed successfully.');
    }

    public function reorder(ReorderSessionExamQuestionsDto $dto, ExamSession $examSession, Request $request): JsonResponse
    {
        $exam = $this->resolveEditableSessionExamAction->execute($examSession, $request->user());

        $order = 0;
        foreach ($dto->ordered_question_ids as $questionId) {
            $exam->examQuestions()->where('question_id', (int) $questionId)->update(['order' => ++$order]);
        }

        return $this->respondExam($examSession, $exam, 'Questions reordered successfully.');
    }

    /** The request names a row of the template the page showed; after copy-on-write the same question lives in the copy. */
    private function sameQuestionIn(Exam $exam, ExamQuestion $examQuestion): ExamQuestion
    {
        return $exam->examQuestions()->where('question_id', $examQuestion->question_id)->firstOrFail();
    }

    private function respondExam(ExamSession $session, Exam $exam, string $message): JsonResponse
    {
        $exam->load(['examQuestions' => fn ($query) => $query->orderBy('order')->with('question.topic')]);

        return $this->respondSuccess(
            data: [
                'exam' => ExamResource::make($exam)->resolve(),
                // Shared template: the first edit will give this session its own private copy.
                'is_shared' => $exam->is_template,
                // Frozen once students have started attempting.
                'locked' => $session->attempts()->exists(),
            ],
            message: $message,
        );
    }
}
