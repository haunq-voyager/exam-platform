<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('proctoring_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('attempt_id')->constrained('exam_attempts')->cascadeOnDelete();
            $table->boolean('camera_enabled')->default(true);
            $table->timestamp('started_at');
            $table->timestamp('ended_at')->nullable();
            $table->unsignedInteger('risk_score')->default(0);
            $table->timestamps();

            $table->index('attempt_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('proctoring_sessions');
    }
};
