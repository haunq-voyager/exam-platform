<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ai_generated_questions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('generation_id')->constrained('ai_generations')->cascadeOnDelete();
            $table->text('question_text');
            $table->json('options');
            $table->json('correct_answer');
            $table->text('explanation')->nullable();
            $table->string('difficulty');
            $table->string('status')->default('pending');
            $table->foreignId('approved_question_id')->nullable()->constrained('questions')->nullOnDelete();
            $table->timestamps();

            $table->index(['generation_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_generated_questions');
    }
};
