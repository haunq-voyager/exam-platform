<?php

namespace App\Actions\ExamSessions;

use App\Data\ExamSessions\UpdateExamSessionDto;
use App\Exceptions\ApiException;
use App\Models\ExamSession;
use App\Models\User;
use App\Services\Approvals\ApprovalService;
use Illuminate\Support\Carbon;
use Spatie\LaravelData\Optional;

class UpdateExamSessionAction
{
    /** Changes to these invalidate an approval; the title alone does not. */
    private const MATERIAL_FIELDS = ['start_at', 'end_at', 'max_attempts', 'scoring_method', 'proctoring_enabled', 'max_violations', 'department_id'];

    public function __construct(
        private ApprovalService $approvals,
    ) {}

    public function execute(ExamSession $session, UpdateExamSessionDto $dto, User $actor): ExamSession
    {
        $attributes = array_filter([
            'title' => $dto->title,
            'max_attempts' => $dto->max_attempts,
            'scoring_method' => $dto->scoring_method,
            'proctoring_enabled' => $dto->proctoring_enabled,
            'max_violations' => $dto->max_violations,
        ], fn ($value) => $value !== null);

        // Dates and department may be cleared by sending null explicitly; leaving them out keeps the current value.
        if (! $dto->start_at instanceof Optional) {
            $attributes['start_at'] = $dto->start_at;
        }
        if (! $dto->end_at instanceof Optional) {
            $attributes['end_at'] = $dto->end_at;
        }
        if (! $dto->department_id instanceof Optional) {
            $attributes['department_id'] = $dto->department_id;
        }

        $start = array_key_exists('start_at', $attributes) ? $attributes['start_at'] : $session->start_at;
        $end = array_key_exists('end_at', $attributes) ? $attributes['end_at'] : $session->end_at;
        if ($start !== null && $end !== null && Carbon::parse($end)->lessThanOrEqualTo(Carbon::parse($start))) {
            throw new ApiException('The end date must be after the start date.', 'exam_session.invalid_schedule', 422);
        }

        // Once students have attempted the exam, running it must stay adjustable (e.g. extend the end date) without
        // re-approval; before that, a material change sends the session back to draft.
        if ($this->changesMaterially($session, $attributes) && ! $session->attempts()->exists()) {
            $this->approvals->beforeMaterialChange($session, $actor);
        }

        $session->update($attributes);

        return $session;
    }

    /** @param array<string, mixed> $attributes */
    private function changesMaterially(ExamSession $session, array $attributes): bool
    {
        foreach (self::MATERIAL_FIELDS as $field) {
            if (! array_key_exists($field, $attributes)) {
                continue;
            }

            $current = $session->{$field};
            $new = $attributes[$field];
            $currentValue = $current instanceof \BackedEnum ? $current->value : ($current instanceof Carbon ? $current->getTimestamp() : $current);
            $newValue = $new instanceof \BackedEnum ? $new->value : (in_array($field, ['start_at', 'end_at'], true) && $new !== null ? Carbon::parse($new)->getTimestamp() : $new);

            if ($currentValue != $newValue) {
                return true;
            }
        }

        return false;
    }
}
