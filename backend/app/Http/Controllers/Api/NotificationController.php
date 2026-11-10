<?php

namespace App\Http\Controllers\Api;

use App\Models\Notification;
use App\Services\Notifications\ExamReminderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

/** The bell: a user's own notifications. */
class NotificationController extends BaseController
{
    public function __construct(private ExamReminderService $reminders) {}

    public function index(Request $request): JsonResponse
    {
        // The scheduler normally creates the reminders; this keeps the bell fresh even when it is not running.
        if (Cache::add('reminders:last-run', true, 300)) {
            $this->reminders->createDueNotifications();
        }

        $user = $request->user();
        $query = Notification::query()->where('user_id', $user->id);

        return $this->respondSuccess(data: [
            'unread_count' => (clone $query)->whereNull('read_at')->count(),
            'items' => $query->orderByDesc('created_at')->orderByDesc('id')->limit(30)->get()->map(fn (Notification $item) => [
                'id' => $item->id,
                'type' => $item->type,
                'title' => $item->title,
                'body' => $item->body,
                'url' => $item->url,
                'is_read' => $item->read_at !== null,
                'created_at' => $item->created_at?->toISOString(),
            ])->all(),
        ], message: 'Notifications retrieved successfully.');
    }

    public function markRead(Request $request, Notification $notification): JsonResponse
    {
        abort_unless($notification->user_id === $request->user()->id, 404);
        $notification->update(['read_at' => $notification->read_at ?? now()]);

        return $this->respondSuccess(data: null, message: 'Notification marked as read.');
    }

    public function markAllRead(Request $request): JsonResponse
    {
        Notification::query()->where('user_id', $request->user()->id)->whereNull('read_at')->update(['read_at' => now()]);

        return $this->respondSuccess(data: null, message: 'All notifications marked as read.');
    }
}
