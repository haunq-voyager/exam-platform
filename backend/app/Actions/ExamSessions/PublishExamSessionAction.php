<?php

namespace App\Actions\ExamSessions;

use App\Enums\ExamStatus;
use App\Exceptions\ApiException;
use App\Models\ExamSession;
use App\Services\Approvals\ApprovalService;

/** Switches a session on. Students can then enter it within its start/end window. */
class PublishExamSessionAction
{
    public function __construct(
        private ApprovalService $approvals,
    ) {}

    public function execute(ExamSession $session): ExamSession
    {
        if (! $session->exam()->first()?->examQuestions()->exists()) {
            throw new ApiException('The exam has no questions yet.', 'exam_session.no_questions', 422);
        }

        if ($this->approvals->isRequired() && $session->approval_status !== ApprovalService::APPROVED) {
            throw new ApiException('The session must be approved before it can be switched on.', 'exam_session.not_approved', 422);
        }

        if ($session->end_at !== null && now()->greaterThan($session->end_at)) {
            throw new ApiException('The end date has already passed; change the schedule first.', 'exam_session.already_ended', 422);
        }

        $session->update(['status' => ExamStatus::Open]);

        return $session;
    }
}
