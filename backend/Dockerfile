FROM php:8.4-cli-alpine

RUN apk add --no-cache postgresql-dev libzip-dev icu-dev oniguruma-dev \
    && docker-php-ext-install pdo_pgsql pgsql zip intl mbstring bcmath

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /app

COPY composer.json composer.lock ./
RUN composer install --no-dev --no-interaction --no-scripts --no-progress --prefer-dist

COPY . .
RUN composer dump-autoload --optimize \
    && chmod +x docker/entrypoint.sh

ENV PORT=8000
EXPOSE 8000

ENTRYPOINT ["docker/entrypoint.sh"]
