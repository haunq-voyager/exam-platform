<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('approval_levels', function (Blueprint $table) {
            $table->id();
            $table->unsignedSmallInteger('position');
            $table->string('name');
            // Role allowed to approve at this level.
            $table->string('role');
            // department: the approver must belong to the session's department; global: any user with the role.
            $table->string('scope')->default('department');
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index('position');
        });

        DB::table('approval_levels')->insert([
            'position' => 1,
            'name' => 'Trưởng khoa duyệt',
            'role' => 'department_head',
            'scope' => 'department',
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        Schema::table('exam_sessions', function (Blueprint $table) {
            // draft (being prepared) | pending (waiting for an approver) | approved | rejected (sent back)
            $table->string('approval_status')->default('draft');
            $table->unsignedSmallInteger('approval_position')->nullable();
            $table->timestamp('approval_submitted_at')->nullable();
            $table->timestamp('approved_at')->nullable();
        });

        // Sessions that existed before approvals were introduced keep working.
        DB::table('exam_sessions')->update(['approval_status' => 'approved', 'approved_at' => now()]);

        Schema::create('exam_session_approvals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('exam_session_id')->constrained()->cascadeOnDelete();
            $table->foreignId('level_id')->nullable()->constrained('approval_levels')->nullOnDelete();
            $table->unsignedSmallInteger('level_position')->nullable();
            // Snapshot, so the history stays readable after levels are renamed or removed.
            $table->string('level_name')->nullable();
            // submitted | approved | rejected | withdrawn | reset | auto_approved
            $table->string('action');
            $table->foreignId('actor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->text('comment')->nullable();
            $table->timestamps();

            $table->index(['exam_session_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('exam_session_approvals');

        Schema::table('exam_sessions', function (Blueprint $table) {
            $table->dropColumn(['approval_status', 'approval_position', 'approval_submitted_at', 'approved_at']);
        });

        Schema::dropIfExists('approval_levels');
    }
};
