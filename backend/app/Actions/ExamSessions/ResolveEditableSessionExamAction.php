<?php

namespace App\Actions\ExamSessions;

use App\Exceptions\ApiException;
use App\Models\Exam;
use App\Models\ExamSession;
use App\Models\User;
use App\Services\Approvals\ApprovalService;
use Illuminate\Support\Facades\DB;

/**
 * Returns the exam a session may be edited through.
 *
 * - Once anyone has started an attempt the content is frozen (answers and totals reference it).
 * - A reusable template is never modified from a session: the first edit gives the session a private copy
 *   (copy-on-write) and every later edit goes to that copy.
 */
class ResolveEditableSessionExamAction
{
    public function __construct(
        private ApprovalService $approvals,
    ) {}

    public function execute(ExamSession $session, User $actor): Exam
    {
        if ($session->attempts()->exists()) {
            throw new ApiException('The exam content cannot be changed after students started attempting it.', 'exam_session.exam_locked', 422);
        }

        // Editing the content invalidates an earlier approval (and is refused while approval is pending).
        $this->approvals->beforeMaterialChange($session, $actor);

        $exam = $session->exam;
        if (! $exam->is_template) {
            return $exam;
        }

        $copy = DB::transaction(function () use ($session, $exam, $actor) {
            $copy = Exam::create([
                'title' => $exam->title,
                'description' => $exam->description,
                'created_by' => $actor->id,
                'duration_minutes' => $exam->duration_minutes,
                'shuffle_questions' => $exam->shuffle_questions,
                'shuffle_options' => $exam->shuffle_options,
                'is_template' => false,
            ]);

            foreach ($exam->examQuestions()->orderBy('order')->get() as $examQuestion) {
                $copy->examQuestions()->create([
                    'question_id' => $examQuestion->question_id,
                    'order' => $examQuestion->order,
                    'points' => $examQuestion->points,
                ]);
            }

            $session->update(['exam_id' => $copy->id]);

            return $copy;
        });

        $session->setRelation('exam', $copy);

        return $copy;
    }
}
