<?php

namespace App\Providers;

use App\Contracts\AiQuestionGeneratorContract;
use App\Services\Ai\ClaudeAiQuestionGeneratorAdapter;
use App\Services\Ai\GeminiAiQuestionGeneratorAdapter;
use App\Services\Ai\MockAiQuestionGeneratorAdapter;
use App\Services\Approvals\ApprovalService;
use App\Services\Auth\PermissionService;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // One instance per request so the role/level tables are read once and reused.
        $this->app->scoped(PermissionService::class);
        $this->app->scoped(ApprovalService::class);

        // Real provider when an API key is configured (Claude preferred, then
        // Gemini), mock fallback otherwise — keeps local/demo environments
        // working without any API key.
        $this->app->bind(AiQuestionGeneratorContract::class, function () {
            $anthropicKey = config('services.anthropic.api_key');
            if (is_string($anthropicKey) && $anthropicKey !== '') {
                return new ClaudeAiQuestionGeneratorAdapter($anthropicKey, config('services.anthropic.model'));
            }

            $geminiKey = config('services.gemini.api_key');
            if (is_string($geminiKey) && $geminiKey !== '') {
                return new GeminiAiQuestionGeneratorAdapter($geminiKey, config('services.gemini.model'));
            }

            return new MockAiQuestionGeneratorAdapter();
        });
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        //
    }
}
