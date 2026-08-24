<?php

namespace App\Providers;

use App\Contracts\AiQuestionGeneratorContract;
use App\Services\Ai\GeminiAiQuestionGeneratorAdapter;
use App\Services\Ai\MockAiQuestionGeneratorAdapter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // Real provider when GEMINI_API_KEY is configured, mock fallback otherwise
        // (keeps local/demo environments working without any API key).
        $this->app->bind(AiQuestionGeneratorContract::class, function () {
            $apiKey = config('services.gemini.api_key');

            if (is_string($apiKey) && $apiKey !== '') {
                return new GeminiAiQuestionGeneratorAdapter($apiKey, config('services.gemini.model'));
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
