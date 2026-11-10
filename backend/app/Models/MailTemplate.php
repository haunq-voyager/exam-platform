<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

/**
 * @property int $id
 * @property string $key
 * @property string $name
 * @property string|null $description
 * @property string $subject
 * @property string $body_html
 * @property string $button_label
 * @property string $accent_color
 * @property string|null $footer_text
 * @property bool $is_active
 * @property string $send_days_before comma separated days before the start, e.g. "7,3,1"
 */
#[Fillable(['key', 'name', 'description', 'subject', 'body_html', 'button_label', 'accent_color', 'footer_text', 'is_active', 'send_days_before', 'updated_by'])]
class MailTemplate extends Model
{
    public const STUDENT_EXAM_REMINDER = 'student_exam_reminder';

    protected function casts(): array
    {
        return ['is_active' => 'boolean'];
    }

    /**
     * "7, 3,1" -> [7, 3, 1]: whole days between 1 and 60, no duplicates, largest first.
     *
     * @return array<int, int>
     */
    public static function parseDays(?string $value): array
    {
        $days = collect(explode(',', (string) $value))
            ->map(fn (string $day) => (int) trim($day))
            ->filter(fn (int $day) => $day >= 1 && $day <= 60)
            ->unique()
            ->sortDesc()
            ->values()
            ->all();

        return $days === [] ? [7] : $days;
    }

    /** @return array<int, int> */
    public function days(): array
    {
        return self::parseDays($this->send_days_before);
    }
}
