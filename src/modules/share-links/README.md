# ShareLinksModule

Публичные ссылки для доступа к файлам без авторизации. Поддерживают срок действия, защиту паролем и лимит скачиваний.

## Эндпоинты

| Метод | URL | Auth | Описание |
|---|---|---|---|
| POST | `/share-links` | JWT | Создать ссылку |
| GET | `/share-links/:token?password=...` | — | Получить файл по ссылке |
| DELETE | `/share-links/:id` | JWT | Деактивировать ссылку |

`GET` — публичный эндпоинт, доступен без токена. Пароль передаётся query-параметром `password`.

## ShareLinksService

### `create(createdById, dto)`
Вычисляет `expiresAt = now + ttlSeconds` если `ttlSeconds` передан. Хэширует пароль через bcrypt если `password` передан. Сохраняет ссылку. Если `fileId` не существует — FK-нарушение конвертируется в `BadRequestException`.

### `findByToken(token, password?)`
Последовательно проверяет:
1. Ссылка существует и `isActive = true` → иначе `NotFoundException`
2. `expiresAt` не в прошлом → иначе `GoneException` (410)
3. `downloadCount < maxDownloads` (если лимит задан) → иначе `GoneException` (410)
4. Пароль совпадает с `passwordHash` (если пароль задан) → иначе `UnauthorizedException`

После успешной проверки инкрементирует `downloadCount` через `repository.increment` и возвращает ссылку с загруженной релацией `file`.

### `deactivate(id, userId)`
Проверяет существование ссылки и авторство (`createdById`). Устанавливает `isActive = false`. Ссылка остаётся в базе (мягкая деактивация).

## Сущность ShareLink

| Поле | Тип | Описание |
|---|---|---|
| `token` | uuid | PK, используется как публичный токен в URL |
| `fileId` | string | FK на `files.id` |
| `createdById` | string | FK на `users.id` |
| `expiresAt` | timestamptz \| null | Срок действия; `null` — бессрочная |
| `passwordHash` | string \| null | bcrypt-хэш пароля; `null` — без пароля |
| `maxDownloads` | int \| null | Лимит скачиваний; `null` — без лимита |
| `downloadCount` | int | Счётчик обращений, начинается с 0 |
| `isActive` | bool | `false` после деактивации |
| `createdAt` | timestamp | |

## Поведение при ошибках

| Ситуация | HTTP |
|---|---|
| Ссылка не найдена или деактивирована | 404 |
| Срок действия истёк | 410 Gone |
| Лимит скачиваний исчерпан | 410 Gone |
| Пароль не передан, но требуется | 401 |
| Неверный пароль | 401 |
| Попытка деактивировать чужую ссылку | 403 |
