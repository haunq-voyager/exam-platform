<?php

namespace App\Actions\ExamSessions;

use App\Data\ExamSessions\BulkAssignStudentsDto;
use App\Models\ExamSession;
use App\Models\ExamSessionAssignment;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class BulkAssignStudentsToSessionAction
{
    public function __construct(
        private ListAssignableStudentsAction $listAssignableStudentsAction,
    ) {}

    /** @return int number of students newly assigned */
    public function execute(ExamSession $session, BulkAssignStudentsDto $dto): int
    {
        $candidates = $this->listAssignableStudentsAction->query($session, $dto->search, $dto->major);

        if ($dto->student_ids !== null) {
            // Only real, unassigned students: ids of teachers/admins or already assigned students are ignored.
            $candidates->whereIn('id', $dto->student_ids);
        }

        return DB::transaction(function () use ($session, $candidates) {
            $count = 0;
            $candidates->select('id')->chunkById(200, function ($students) use ($session, &$count) {
                $rows = $students->map(fn (User $student) => [
                    'exam_session_id' => $session->id,
                    'student_id' => $student->id,
                    'created_at' => now(),
                    'updated_at' => now(),
                ])->all();

                $count += ExamSessionAssignment::query()->insertOrIgnore($rows);
            });

            return $count;
        });
    }
}
