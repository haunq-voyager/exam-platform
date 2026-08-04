<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('proctoring_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('session_id')->constrained('proctoring_sessions')->cascadeOnDelete();
            $table->string('event_type');
            $table->string('severity');
            $table->timestamp('occurred_at');
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->index(['session_id', 'event_type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('proctoring_events');
    }
};
