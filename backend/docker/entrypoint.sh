#!/bin/sh
set -e

if [ ! -f .env ]; then
  cp .env.example .env
fi

if ! grep -q "^APP_KEY=base64" .env 2>/dev/null; then
  php artisan key:generate --force
fi

echo "Waiting for database at ${DB_HOST:-db}:${DB_PORT:-5432}..."
until php artisan db:show > /dev/null 2>&1; do
  sleep 2
done

php artisan migrate --force

USER_COUNT=$(php artisan tinker --execute="echo \App\Models\User::count();" 2>/dev/null | tail -n 1)
if [ "$USER_COUNT" = "0" ]; then
  php artisan db:seed --force
fi

php artisan config:cache
php artisan route:cache

exec php artisan serve --host=0.0.0.0 --port="${PORT:-8000}"
