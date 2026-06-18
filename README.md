# File Sharing Service

Сервис обмена файлами на NestJS + TypeScript + PostgreSQL + Redis + MinIO.

## Запуск

```bash
cp .env.example .env
docker compose up -d
```

Swagger UI доступен по адресу `http://localhost:3000/api/docs`.

## Переменные окружения

Все переменные описаны в `.env.example`. Обязательные группы:

| Группа | Переменные |
|---|---|
| Приложение | `PORT`, `NODE_ENV` |
| PostgreSQL | `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME` |
| Redis | `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` |
| JWT | `JWT_SECRET`, `JWT_ACCESS_EXPIRES_IN_SECONDS`, `JWT_REFRESH_EXPIRES_IN_SECONDS` |
| S3 / MinIO | `S3_ENDPOINT`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_BUCKET` |
| Rate limiting | `THROTTLE_TTL_MS`, `THROTTLE_LIMIT` |

## AppModule — глобальная обвязка

### Конфигурация (`ConfigModule`)

`ConfigModule.forRoot({ isGlobal: true })` — модуль доступен во всём приложении без повторного импорта. Конфиги вынесены в отдельные фабрики (`src/config/`): `appConfig`, `databaseConfig`, `jwtConfig`, `redisConfig`, `s3Config`, `throttlerConfig`. Каждая фабрика читает переменные окружения и предоставляет типизированный объект через `ConfigType<typeof ...>`.

### База данных (`TypeOrmModule`)

`synchronize: false` — автоматическая синхронизация схемы отключена во всех окружениях. Вместо неё используются миграции. `migrationsRun: true` — при каждом старте приложения TypeORM автоматически применяет все ещё не применённые миграции из `dist/migrations/`.

### Rate limiting (`ThrottlerModule`)

Глобальный `ThrottlerGuard` зарегистрирован через `APP_GUARD` — защищает все эндпоинты без дополнительных декораторов. Лимиты читаются из переменных окружения (`THROTTLE_TTL_MS`, `THROTTLE_LIMIT`).

### Логирование (`WinstonModule`)

`nest-winston` заменяет встроенный NestJS Logger. Формат зависит от `NODE_ENV`:
- `production` — JSON с полем `timestamp` (удобно для log-агрегаторов)
- остальные — цветной человекочитаемый вывод

`app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER))` в `main.ts` перенаправляет все внутренние логи фреймворка в Winston.

### Глобальные провайдеры

| Токен | Класс | Назначение |
|---|---|---|
| `APP_FILTER` | `HttpExceptionFilter` | Перехватывает `HttpException`: `warn` для 4xx, `error` для 5xx — с методом, URL и статусом |
| `APP_GUARD` | `ThrottlerGuard` | Rate limiting на все маршруты |
| `APP_GUARD` | `PermissionsGuard` | Проверяет `@RequirePermission(...)` — если декоратора нет, пропускает запрос |
| `APP_INTERCEPTOR` | `LoggingInterceptor` | Логирует каждый успешный HTTP-запрос: метод, URL, время ответа |

### Безопасность (`main.ts`)

- `helmet()` — выставляет защитные HTTP-заголовки (CSP, HSTS, X-Frame-Options и др.)
- `ValidationPipe({ whitelist: true, transform: true })` — отбрасывает неизвестные поля из DTO, автоматически приводит типы
- `ClassSerializerInterceptor` — применяет `@Exclude()` и `@Expose()` из `class-transformer` при сериализации ответов

## Миграции

```bash
# Сгенерировать миграцию по diff между entities и схемой БД
npm run migration:generate -- src/migrations/ИмяМиграции

# Применить вручную
npm run migration:run

# Откатить последнюю
npm run migration:revert
```

CLI-команды используют `src/data-source.ts` — отдельный `DataSource` для TypeORM CLI, независимый от NestJS DI-контейнера.

## Модули

| Модуль | README |
|---|---|
| Auth | [src/modules/auth/README.md](src/modules/auth/README.md) |
| Users | [src/modules/users/README.md](src/modules/users/README.md) |
| Files | [src/modules/files/README.md](src/modules/files/README.md) |
| Folders | [src/modules/folders/README.md](src/modules/folders/README.md) |
| Notes | [src/modules/notes/README.md](src/modules/notes/README.md) |
| Groups | [src/modules/groups/README.md](src/modules/groups/README.md) |
| Permissions | [src/modules/permissions/README.md](src/modules/permissions/README.md) |
| Share Links | [src/modules/share-links/README.md](src/modules/share-links/README.md) |
| Reports | [src/modules/reports/README.md](src/modules/reports/README.md) |
