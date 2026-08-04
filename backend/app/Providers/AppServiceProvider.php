<?php

namespace App\Providers;

use App\Contracts\AiQuestionGeneratorContract;
use App\Services\Ai\MockAiQuestionGeneratorAdapter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // Mock provider for now — swap to an OpenAI/Gemini adapter later via this binding only.
        $this->app->bind(AiQuestionGeneratorContract::class, MockAiQuestionGeneratorAdapter::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        //
    }
}
