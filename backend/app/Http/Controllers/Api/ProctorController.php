<?php

namespace App\Http\Controllers\Api;

use App\Actions\Attempts\CancelExamAttemptForCheatingAction;
use App\Actions\Attempts\ExpireOverdueAttemptsAction;
use App\Data\Proctoring\ProctorCancelAttemptDto;
use App\Enums\ExamAttemptStatus;
use App\Exceptions\ApiException;
use App\Models\ExamAttempt;
use App\Models\ExamSession;
use App\Services\Approvals\SessionAccess;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** What a proctor (giám thị) sees and can do during an exam session they are assigned to. */
class ProctorController extends BaseController
{
    public function __construct(
        private ExpireOverdueAttemptsAction $expireOverdueAttemptsAction,
        private CancelExamAttemptForCheatingAction $cancelExamAttemptForCheatingAction,
        private SessionAccess $sessionAccess,
    ) {}

    /** Live state of every assigned student: not started, working (with violations and progress) or finished. */
    public function monitor(ExamSession $examSession): JsonResponse
    {
        // Attempts past their deadline are finished first so "in progress" is truthful.
        $this->expireOverdueAttemptsAction->execute(sessionId: $examSession->id);

        $examSession->load('exam');
        $questionCount = $examSession->exam->examQuestions()->count();

        $attemptsByStudent = $examSession->attempts()
            ->withCount(['answers as answered_count' => fn ($query) => $query->whereNotNull('selected_answer')])
            ->with('proctoringSession')
            ->orderBy('attempt_number')
            ->get()
            ->groupBy('student_id');

        $students = $examSession->assignments()->with('student')->get()->map(function ($assignment) use ($attemptsByStudent, $questionCount) {
            $attempts = $attemptsByStudent->get($assignment->student_id, collect());
            $current = $attempts->firstWhere('status', ExamAttemptStatus::InProgress);
            $latest = $attempts->last();
            // Violations and events come from the running attempt, or the latest one once the student has finished.
            $shown = $current ?? $latest;
            $lastEvent = $shown?->proctoringSession?->events()->latest('occurred_at')->first();

            return [
                'student_id' => $assignment->student_id,
                'student_name' => $assignment->student?->name,
                'student_email' => $assignment->student?->email,
                'state' => $current !== null ? 'in_progress' : ($attempts->isEmpty() ? 'not_started' : 'finished'),
                'attempts_used' => $attempts->count(),
                'is_flagged' => $attempts->contains(fn (ExamAttempt $attempt) => $attempt->is_flagged),
                'last_score' => $latest?->status === ExamAttemptStatus::Graded ? $latest->score : null,
                'latest_attempt_id' => $shown?->id,
                'violation_count' => $shown?->violation_count,
                'is_cancelled' => $shown?->isCancelled() ?? false,
                'last_event_type' => $lastEvent?->event_type?->value,
                'last_event_at' => $lastEvent?->occurred_at?->toISOString(),
                'current_attempt' => $current === null ? null : [
                    'id' => $current->id,
                    'attempt_number' => $current->attempt_number,
                    'started_at' => $current->started_at?->toISOString(),
                    'ends_at' => $current->deadline()->toISOString(),
                    'violation_count' => $current->violation_count,
                    'is_flagged' => $current->is_flagged,
                    'answered' => (int) $current->answered_count,
                    'question_count' => $questionCount,
                    'last_event_type' => $lastEvent?->event_type?->value,
                    'last_event_at' => $lastEvent?->occurred_at?->toISOString(),
                ],
            ];
        })->values();

        return $this->respondSuccess(data: [
            'session' => [
                'id' => $examSession->id,
                'title' => $examSession->title,
                'effective_status' => $examSession->effectiveStatus(),
                'start_at' => $examSession->start_at?->toISOString(),
                'end_at' => $examSession->end_at?->toISOString(),
                'duration_minutes' => $examSession->exam->duration_minutes,
                'proctoring_enabled' => $examSession->proctoring_enabled,
                'max_violations' => $examSession->max_violations,
            ],
            'totals' => [
                'assigned' => $students->count(),
                'not_started' => $students->where('state', 'not_started')->count(),
                'in_progress' => $students->where('state', 'in_progress')->count(),
                'finished' => $students->where('state', 'finished')->count(),
                'flagged' => $students->where('is_flagged', true)->count(),
            ],
            'students' => $students->all(),
        ], message: 'Session monitor retrieved successfully.');
    }

    /** A proctor ends an attempt for cheating by hand: graded 0, flagged, with who and why recorded. */
    public function cancel(ProctorCancelAttemptDto $dto, ExamAttempt $examAttempt, Request $request): JsonResponse
    {
        $session = $examAttempt->session()->first();
        if ($session === null || ! $this->sessionAccess->canView($request->user(), $session)) {
            throw new ApiException('You are not responsible for this exam session.', 'auth.forbidden', 403);
        }

        $attempt = $this->cancelExamAttemptForCheatingAction->execute($examAttempt);
        $attempt->update(['cancel_note' => trim($dto->note), 'cancelled_by' => $request->user()->id]);

        return $this->respondSuccess(data: ['id' => $attempt->id, 'status' => $attempt->status, 'is_cancelled' => true], message: 'Attempt cancelled successfully.');
    }
}
