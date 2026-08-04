<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ai_generations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('teacher_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('subject_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('topic_id')->nullable()->constrained()->nullOnDelete();
            $table->text('prompt');
            $table->string('model');
            $table->unsignedInteger('question_count');
            $table->string('difficulty')->nullable();
            $table->string('status')->default('pending');
            $table->json('raw_response')->nullable();
            $table->timestamps();

            $table->index(['teacher_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_generations');
    }
};
