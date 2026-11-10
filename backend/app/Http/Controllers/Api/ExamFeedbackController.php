<?php

namespace App\Http\Controllers\Api;

use App\Data\Feedback\CreateFeedbackDto;
use App\Data\Feedback\ReplyFeedbackDto;
use App\Exceptions\ApiException;
use App\Models\ExamAttempt;
use App\Models\ExamFeedback;
use App\Models\ExamSession;
use App\Services\Approvals\SessionAccess;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/** Students send feedback about an exam / attempt; the responsible teachers reply. */
class ExamFeedbackController extends BaseController
{
    public function __construct(
        private SessionAccess $sessionAccess,
    ) {}

    /** Student: send feedback about a session they are assigned to (optionally about one attempt). */
    public function store(CreateFeedbackDto $dto, ExamSession $examSession, Request $request): JsonResponse
    {
        $student = $request->user();

        if (! $examSession->assignments()->where('student_id', $student->id)->exists()) {
            throw new ApiException('You are not assigned to this exam session.', 'exam_attempt.not_assigned', 403);
        }

        if ($dto->exam_attempt_id !== null) {
            $ownsAttempt = ExamAttempt::query()
                ->whereKey($dto->exam_attempt_id)
                ->where('student_id', $student->id)
                ->where('exam_session_id', $examSession->id)
                ->exists();
            if (! $ownsAttempt) {
                throw new ApiException('This attempt does not belong to you or to this session.', 'feedback.invalid_attempt', 422);
            }
        }

        $feedback = ExamFeedback::create([
            'exam_session_id' => $examSession->id,
            'exam_attempt_id' => $dto->exam_attempt_id,
            'student_id' => $student->id,
            'message' => trim($dto->message),
        ]);

        return $this->respondSuccess(data: $this->present($feedback->load(['session', 'attempt', 'student', 'replier'])), message: 'Feedback sent successfully.', status: Response::HTTP_CREATED);
    }

    /** Student: own feedback and the replies. */
    public function mine(Request $request): JsonResponse
    {
        $query = ExamFeedback::query()
            ->where('student_id', $request->user()->id)
            ->with(['session', 'attempt', 'student', 'replier'])
            ->orderByDesc('created_at');

        if ($request->filled('exam_session_id')) {
            $query->where('exam_session_id', (int) $request->query('exam_session_id'));
        }

        return $this->respondSuccess(data: $query->get()->map(fn (ExamFeedback $feedback) => $this->present($feedback))->all(), message: 'Feedback retrieved successfully.');
    }

    /** Staff: feedback of the sessions they may see. `scope`: unanswered (default) | answered | all. */
    public function index(Request $request): JsonResponse
    {
        $scope = (string) $request->query('scope', 'unanswered');

        $query = ExamFeedback::query()
            ->with(['session', 'attempt', 'student', 'replier'])
            ->whereHas('session', fn (Builder $sessions) => $this->sessionAccess->scopeVisible($sessions, $request->user()));

        match ($scope) {
            'answered' => $query->whereNotNull('replied_at'),
            'all' => null,
            default => $query->whereNull('replied_at'),
        };

        $feedback = $query->orderBy('created_at', $scope === 'unanswered' ? 'asc' : 'desc')->limit(200)->get();

        return $this->respondSuccess(data: $feedback->map(fn (ExamFeedback $item) => $this->present($item))->all(), message: 'Feedback retrieved successfully.');
    }

    public function reply(ReplyFeedbackDto $dto, ExamFeedback $feedback, Request $request): JsonResponse
    {
        $session = $feedback->session()->first();
        if ($session === null || ! $this->sessionAccess->canView($request->user(), $session)) {
            throw new ApiException('You are not responsible for this exam session.', 'auth.forbidden', 403);
        }

        $feedback->update([
            'reply' => trim($dto->reply),
            'replied_by' => $request->user()->id,
            'replied_at' => now(),
        ]);

        return $this->respondSuccess(data: $this->present($feedback->load(['session', 'attempt', 'student', 'replier'])), message: 'Reply saved successfully.');
    }

    /** @return array<string, mixed> */
    private function present(ExamFeedback $feedback): array
    {
        return [
            'id' => $feedback->id,
            'exam_session_id' => $feedback->exam_session_id,
            'exam_session_title' => $feedback->session?->title,
            'exam_attempt_id' => $feedback->exam_attempt_id,
            'attempt_number' => $feedback->attempt?->attempt_number,
            'student_id' => $feedback->student_id,
            'student_name' => $feedback->student?->name,
            'student_email' => $feedback->student?->email,
            'message' => $feedback->message,
            'reply' => $feedback->reply,
            'replied_by_name' => $feedback->replier?->name,
            'replied_at' => $feedback->replied_at?->toISOString(),
            'created_at' => $feedback->created_at?->toISOString(),
        ];
    }
}
