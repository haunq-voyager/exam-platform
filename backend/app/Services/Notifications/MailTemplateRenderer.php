<?php

namespace App\Services\Notifications;

use App\Models\MailTemplate;

/**
 * Turns an admin-edited template into an email: `{{placeholders}}` are replaced (values are HTML-escaped), then the
 * body is placed in a fixed responsive layout with the template's accent colour, button and footer.
 */
class MailTemplateRenderer
{
    /** Placeholders offered to administrators: [description, sample value used by the preview]. */
    public const PLACEHOLDERS = [
        'student_name' => ['Họ tên thí sinh', 'Nguyễn Văn An'],
        'exam_title' => ['Tên kỳ thi', 'Kiểm tra giữa kỳ - Công nghệ Web'],
        'exam_code' => ['Mã kỳ thi', 'KT2611-0042'],
        'start_time' => ['Giờ bắt đầu', '08:00 15/11/2026'],
        'end_time' => ['Giờ kết thúc', '10:00 15/11/2026'],
        'duration' => ['Thời gian làm bài (phút)', '45'],
        'question_count' => ['Số câu hỏi', '40'],
        'max_attempts' => ['Số lần được thi', '1'],
        'days_left' => ['Số ngày còn lại', '7'],
        'proctoring_note' => ['Thông tin giám sát', 'Có giám sát bằng camera, cảnh báo tối đa 3 lần'],
        'department_name' => ['Khoa', 'Công nghệ thông tin'],
        'exam_url' => ['Đường dẫn vào kỳ thi', 'http://localhost:3000/student-exams/42'],
        'app_name' => ['Tên hệ thống', 'ExamHub'],
    ];

    /** @return array<string, string> placeholder => sample value */
    public static function samples(): array
    {
        return array_map(fn (array $item) => $item[1], self::PLACEHOLDERS);
    }

    /**
     * @param  array{subject: string, body_html: string, button_label: string, accent_color: string, footer_text: ?string}  $template
     * @param  array<string, string>  $variables
     * @return array{subject: string, html: string}
     */
    public function render(array $template, array $variables, ?string $buttonUrl = null): array
    {
        $subject = trim(preg_replace('/\s+/', ' ', $this->fill($template['subject'], $variables, false)) ?? '');
        $body = $this->fill($template['body_html'], $variables, true);
        $footer = $this->fill((string) ($template['footer_text'] ?? ''), $variables, true);

        return [
            'subject' => $subject,
            'html' => $this->layout($subject, $body, $footer, $template, $buttonUrl ?? ($variables['exam_url'] ?? null), $variables['app_name'] ?? (string) config('app.name')),
        ];
    }

    /** @return array{subject: string, html: string} */
    public function renderModel(MailTemplate $template, array $variables, ?string $buttonUrl = null): array
    {
        return $this->render($template->only(['subject', 'body_html', 'button_label', 'accent_color', 'footer_text']), $variables, $buttonUrl);
    }

    private function fill(string $text, array $variables, bool $escape): string
    {
        return preg_replace_callback('/\{\{\s*([a-z_]+)\s*\}\}/', function (array $match) use ($variables, $escape) {
            if (! array_key_exists($match[1], $variables)) {
                return $match[0]; // an unknown placeholder stays visible so the author notices it
            }

            return $escape ? e((string) $variables[$match[1]]) : (string) $variables[$match[1]];
        }, $text) ?? $text;
    }

    private function layout(string $subject, string $body, string $footer, array $template, ?string $url, string $appName): string
    {
        $accent = preg_match('/^#[0-9a-fA-F]{6}$/', $template['accent_color'] ?? '') ? $template['accent_color'] : '#2563eb';
        $button = $url && trim((string) $template['button_label']) !== ''
            ? '<p style="margin:24px 0 8px"><a href="'.e($url).'" style="display:inline-block;background:'.$accent.';color:#ffffff;text-decoration:none;font-weight:700;padding:12px 24px;border-radius:8px">'.e($template['button_label']).'</a></p>'
              .'<p style="margin:0;font-size:12px;color:#64748b">Nếu nút không bấm được, mở liên kết: <a href="'.e($url).'" style="color:'.$accent.'">'.e($url).'</a></p>'
            : '';
        $footerHtml = $footer !== '' ? '<p style="margin:0;font-size:12px;color:#64748b">'.nl2br($footer, false).'</p>' : '';

        return '<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'.e($subject).'</title></head>'
            .'<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:#0f172a">'
            .'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 12px"><tr><td align="center">'
            .'<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0">'
            .'<tr><td style="background:'.$accent.';padding:18px 28px;color:#ffffff;font-size:20px;font-weight:700">'.e($appName).'</td></tr>'
            .'<tr><td style="padding:28px;font-size:15px;line-height:1.6">'.$body.$button.'</td></tr>'
            .'<tr><td style="padding:16px 28px;background:#f8fafc;border-top:1px solid #e2e8f0">'.$footerHtml.'</td></tr>'
            .'</table></td></tr></table></body></html>';
    }
}
