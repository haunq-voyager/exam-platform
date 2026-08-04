<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('questions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('topic_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
            $table->text('question_text');
            $table->string('question_type');
            $table->json('options');
            $table->json('correct_answer');
            $table->text('explanation')->nullable();
            $table->string('difficulty');
            $table->string('status')->default('approved');
            $table->string('source')->default('manual');
            $table->timestamps();
            $table->softDeletes();

            $table->index(['topic_id', 'status', 'difficulty']);
            $table->index('created_by');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('questions');
    }
};
