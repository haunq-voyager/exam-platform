<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('exam_attempts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('exam_id')->constrained()->cascadeOnDelete();
            $table->foreignId('student_id')->constrained('users')->cascadeOnDelete();
            $table->string('status')->default('in_progress');
            $table->timestamp('started_at');
            $table->timestamp('submitted_at')->nullable();
            $table->decimal('score', 6, 2)->nullable();
            $table->decimal('total_points', 6, 2)->nullable();
            $table->timestamps();

            $table->index(['exam_id', 'student_id']);
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('exam_attempts');
    }
};
