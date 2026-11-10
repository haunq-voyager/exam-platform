<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // In-app notifications (the bell). `dedupe_key` makes every reminder fire once per person.
        Schema::create('notifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('type', 50);
            $table->string('title');
            $table->text('body')->nullable();
            // Canonical web path ("/dashboard/approvals"); the web app turns it into the URL of the user's role.
            $table->string('url')->nullable();
            $table->json('data')->nullable();
            $table->string('dedupe_key', 120)->nullable();
            $table->timestamp('read_at')->nullable();
            // Set when the notification is also an email: pending -> sent | failed.
            $table->string('email_status', 10)->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'dedupe_key']);
            $table->index(['user_id', 'read_at', 'created_at']);
            $table->index('email_status');
        });

        // Email templates editable by administrators.
        Schema::create('mail_templates', function (Blueprint $table) {
            $table->id();
            $table->string('key', 50)->unique();
            $table->string('name');
            $table->string('description')->nullable();
            $table->string('subject');
            $table->text('body_html');
            $table->string('button_label', 60);
            $table->string('accent_color', 7)->default('#2563eb');
            $table->text('footer_text')->nullable();
            $table->boolean('is_active')->default(true);
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        foreach (require database_path('mail-template-defaults.php') as $key => $template) {
            // `send_days_before` is added by a later migration, so it is not inserted here.
            DB::table('mail_templates')->insert(['key' => $key, ...array_diff_key($template, ['send_days_before' => true]), 'created_at' => now(), 'updated_at' => now()]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('mail_templates');
        Schema::dropIfExists('notifications');
    }
};
