<?php

namespace App\Http\Controllers\Api;

use App\Models\MailTemplate;
use App\Services\Notifications\MailTemplateRenderer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;

/** Administrators edit the emails the system sends: subject, body (HTML with {{placeholders}}), colour, button, footer. */
class MailTemplateController extends BaseController
{
    public function __construct(private MailTemplateRenderer $renderer) {}

    public function index(): JsonResponse
    {
        return $this->respondSuccess(data: [
            'templates' => MailTemplate::query()->orderBy('id')->get()->map(fn (MailTemplate $template) => $this->present($template))->all(),
            'placeholders' => collect(MailTemplateRenderer::PLACEHOLDERS)->map(fn (array $item, string $key) => ['key' => $key, 'label' => $item[0], 'sample' => $item[1]])->values()->all(),
        ], message: 'Mail templates retrieved successfully.');
    }

    public function update(Request $request, MailTemplate $mailTemplate): JsonResponse
    {
        $mailTemplate->update([...$this->validated($request), 'updated_by' => $request->user()->id]);

        return $this->respondSuccess(data: $this->present($mailTemplate->refresh()), message: 'Mail template updated successfully.');
    }

    /** Renders the template with sample data (and the unsaved edits, when sent) for the live preview. */
    public function preview(Request $request, MailTemplate $mailTemplate): JsonResponse
    {
        $draft = $request->hasAny(['subject', 'body_html']) ? $this->validated($request) : $mailTemplate->only(['subject', 'body_html', 'button_label', 'accent_color', 'footer_text']);
        $rendered = $this->renderer->render($draft, MailTemplateRenderer::samples());

        return $this->respondSuccess(data: $rendered, message: 'Preview rendered successfully.');
    }

    /** Sends the (possibly unsaved) template with sample data to the administrator's own email. */
    public function sendTest(Request $request, MailTemplate $mailTemplate): JsonResponse
    {
        $user = $request->user();
        $draft = $request->hasAny(['subject', 'body_html']) ? $this->validated($request) : $mailTemplate->only(['subject', 'body_html', 'button_label', 'accent_color', 'footer_text']);
        ['subject' => $subject, 'html' => $html] = $this->renderer->render($draft, [...MailTemplateRenderer::samples(), 'student_name' => $user->name, 'app_name' => (string) config('app.name')]);

        Mail::html($html, fn ($message) => $message->to($user->email, $user->name)->subject('[Gửi thử] '.$subject));

        return $this->respondSuccess(data: ['to' => $user->email], message: 'Test email sent successfully.');
    }

    /** Back to the default wording and look. */
    public function reset(Request $request, MailTemplate $mailTemplate): JsonResponse
    {
        $default = require database_path('mail-template-defaults.php');
        abort_unless(isset($default[$mailTemplate->key]), 404);
        $mailTemplate->update([...$default[$mailTemplate->key], 'updated_by' => $request->user()->id]);

        return $this->respondSuccess(data: $this->present($mailTemplate->refresh()), message: 'Mail template reset successfully.');
    }

    /** @return array<string, mixed> */
    private function validated(Request $request): array
    {
        $data = $request->validate([
            'subject' => ['required', 'string', 'max:255'],
            'body_html' => ['required', 'string', 'max:20000'],
            'button_label' => ['nullable', 'string', 'max:60'],
            'accent_color' => ['required', 'regex:/^#[0-9a-fA-F]{6}$/'],
            'footer_text' => ['nullable', 'string', 'max:2000'],
            'is_active' => ['sometimes', 'boolean'],
            'send_days_before' => ['sometimes', 'string', 'max:40', 'regex:/^\s*\d{1,2}(\s*,\s*\d{1,2}){0,4}\s*$/', function (string $attribute, mixed $value, \Closure $fail) {
                foreach (explode(',', (string) $value) as $day) {
                    if ((int) trim($day) < 1 || (int) trim($day) > 60) {
                        $fail('Mỗi mốc phải từ 1 đến 60 ngày.');
                    }
                }
            }],
        ]);
        $data['button_label'] = $data['button_label'] ?? ''; // an empty label means "no button"
        if (isset($data['send_days_before'])) {
            $data['send_days_before'] = implode(',', MailTemplate::parseDays($data['send_days_before']));
        }

        return $data;
    }

    /** @return array<string, mixed> */
    private function present(MailTemplate $template): array
    {
        return [
            'id' => $template->id,
            'key' => $template->key,
            'name' => $template->name,
            'description' => $template->description,
            'subject' => $template->subject,
            'body_html' => $template->body_html,
            'button_label' => $template->button_label,
            'accent_color' => $template->accent_color,
            'footer_text' => $template->footer_text,
            'is_active' => $template->is_active,
            'send_days_before' => $template->send_days_before,
            'updated_at' => $template->updated_at?->toISOString(),
        ];
    }
}
