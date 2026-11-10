<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('majors', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->timestamps();
        });

        // Majors already typed on student accounts, plus a starting list of common ones.
        $names = DB::table('users')->whereNotNull('major')->where('major', '!=', '')->distinct()->pluck('major')->all();
        $defaults = [
            'Công nghệ thông tin', 'Công nghệ phần mềm', 'Khoa học máy tính', 'Hệ thống thông tin', 'Kỹ thuật máy tính',
            'An toàn thông tin', 'Trí tuệ nhân tạo', 'Mạng máy tính và truyền thông dữ liệu', 'Thương mại điện tử',
        ];
        foreach (array_values(array_unique([...$names, ...$defaults])) as $name) {
            DB::table('majors')->insert(['name' => $name, 'created_at' => now(), 'updated_at' => now()]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('majors');
    }
};
