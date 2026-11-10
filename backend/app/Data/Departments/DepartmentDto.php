<?php

namespace App\Data\Departments;

use Spatie\LaravelData\Data;

class DepartmentDto extends Data
{
    public function __construct(
        public string $name,
        public ?string $code = null,
    ) {}

    public static function rules(): array
    {
        $ignoreId = request()->route('department')?->id ?? request()->route('department');

        return [
            'name' => ['required', 'string', 'max:255', 'unique:departments,name'.($ignoreId ? ','.(is_object($ignoreId) ? $ignoreId->id : $ignoreId) : '')],
            'code' => ['nullable', 'string', 'max:50'],
        ];
    }
}
