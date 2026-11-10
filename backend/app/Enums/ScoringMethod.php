<?php

namespace App\Enums;

use Illuminate\Support\Collection;

enum ScoringMethod: string
{
    case Highest = 'highest';
    case Average = 'average';
    case First = 'first';
    case Last = 'last';

    /**
     * Combine the scores of a student's finished attempts into one final score.
     * Cancelled attempts are graded with 0, so they are included like any other attempt.
     *
     * @param  Collection<int, \App\Models\ExamAttempt>  $attempts  graded attempts of one student
     */
    public function aggregate(Collection $attempts): ?float
    {
        if ($attempts->isEmpty()) {
            return null;
        }

        $ordered = $attempts->sortBy('attempt_number')->values();

        return match ($this) {
            self::Highest => (float) $ordered->max('score'),
            self::Average => round((float) $ordered->avg('score'), 2),
            self::First => (float) $ordered->first()->score,
            self::Last => (float) $ordered->last()->score,
        };
    }
}
