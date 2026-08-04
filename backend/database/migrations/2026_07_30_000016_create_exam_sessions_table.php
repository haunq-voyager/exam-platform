<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('exam_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('exam_id')->constrained()->cascadeOnDelete();
            $table->string('title');
            $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
            $table->string('status')->default('draft');
            $table->timestamp('start_at')->nullable();
            $table->timestamp('end_at')->nullable();
            $table->timestamps();

            $table->index(['status', 'start_at']);
            $table->index('exam_id');
            $table->index('created_by');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('exam_sessions');
    }
};
