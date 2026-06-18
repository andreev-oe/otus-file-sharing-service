# FilesModule

Загрузка, хранение (S3/MinIO), скачивание через presigned URL, версионирование, поиск.

## Эндпоинты

Все защищены `JwtAuthGuard`. `GET /files/search` объявлен до `GET /files/:id` — иначе NestJS сопоставил бы `search` как UUID-параметр.

| Метод | URL | Описание |
|---|---|---|
| POST | `/files/upload?folderId=<uuid>` | Загрузить файл (multipart/form-data, поле `file`) |
| GET | `/files?folderId=<uuid>` | Файлы в папке; без `folderId` — файлы в корне |
| GET | `/files/search?q=...` | Поиск по имени файла (ILIKE) |
| GET | `/files/:id` | Метаданные файла |
| GET | `/files/:id/download` | Presigned URL для скачивания |
| GET | `/files/:id/versions` | Список всех версий файла |
| PATCH | `/files/:id` | Переименовать / переместить в другую папку |
| DELETE | `/files/:id` | Мягкое удаление (204) |

## FilesService

### `upload(uploadedById, uploadedFile, folderId?)`
Поток загрузки:
1. Проверяет что файл передан (`BadRequestException` если нет)
2. Валидирует MIME-тип через `validateMimeType()` — HTTP 415 при недопустимом типе
3. Определяет номер версии через `resolveNextVersion()` — если файл с таким именем в той же папке уже существует, инкрементирует; иначе версия = 1
4. Генерирует `fileId = crypto.randomUUID()`, строит ключ S3: `files/{uploadedById}/{fileId}/{originalname}`
5. Загружает буфер в S3 через `StorageService`
6. Сохраняет метаданные в PostgreSQL. Если сохранение падает — удаляет объект из S3 (`StorageService.delete`), после чего пробрасывает исходное исключение (rollback S3 при ошибке DB)

### `findByFolder(folderId, uploadedById)`
Возвращает файлы пользователя в указанной папке. `folderId = null` — файлы в корне. Используется эндпоинтом `GET /files?folderId=:id`.

### `findById(id, uploadedById)`
Ищет файл по `id` + `uploadedById` + `isDeleted = false`. Выбрасывает `NotFoundException` если не найден или принадлежит другому пользователю.

### `getDownloadUrl(id, uploadedById)`
Проверяет наличие URL в Redis (`file:download:{id}`). При попадании в кэш возвращает сразу. При промахе — запрашивает presigned URL у S3 на 1 час, сохраняет в Redis на 50 минут (TTL кэша меньше TTL ссылки, чтобы не отдавать просроченный URL).

### `update(id, uploadedById, dto)`
Переименование и/или перемещение в одном запросе. Обновляет только переданные поля. При изменении `folderId` инвалидирует кэш presigned URL. `folderId: null` перемещает файл в корень.

### `softDelete(id, uploadedById)`
Проверяет владение файлом, ставит `isDeleted = true`, инвалидирует кэш presigned URL.

### `getVersions(id, uploadedById)`
Возвращает все версии файла: записи с тем же `name` + `folderId` + `uploadedById`. Сортировка по `version DESC`.

### `search(uploadedById, query)`
`ILIKE '%query%'` по полю `name`. Возвращает файлы пользователя, совпадающие с запросом.

### `resolveNextVersion(name, folderId, uploadedById)` (private)
Ищет последнюю не удалённую версию файла с совпадающим именем в той же папке. Возвращает `latestVersion + 1` или `1` если версий нет. Использует `IsNull()` из TypeORM вместо `null` напрямую (требование TypeORM `FindOptionsWhere`).

### `validateMimeType(mimeType)` (private)
Сверяет MIME-тип с разрешённым множеством (`ALLOWED_MIME_TYPES`). Покрывает изображения, PDF, архивы, документы Office, текст, видео, аудио.

### `invalidateDownloadUrlCache(fileId)` (private)
Удаляет ключ `file:download:{fileId}` из Redis.

## Кэш в Redis

| Ключ | Значение | TTL |
|---|---|---|
| `file:download:{fileId}` | presigned URL (строка) | 3000 сек (50 мин) |

## Очистка удалённых файлов (CleanupProcessor)

`FilesModule` регистрирует BullMQ-очередь `cleanup` и запускает repeatable job с интервалом 24 часа. При каждом срабатывании `CleanupProcessor.process()`:

1. Выбирает до 100 записей с `isDeleted = true`
2. Удаляет каждый файл из S3 через `StorageService.delete(s3Key)`
3. Физически удаляет запись из таблицы `files`

Размер батча ограничен константой `CLEANUP_BATCH_SIZE = 100` во избежание длительной блокировки воркера.

## Версионирование

Версия привязана к тройке `(name, folderId, uploadedById)`. При переименовании или перемещении файла история версий по старому ключу остаётся в БД. Новые версии после перемещения начинаются с 1 в новом месте.

## Ограничения

- Максимальный размер файла: 100 МБ (настраивается через `MAX_FILE_SIZE_BYTES` в контроллере)
- MIME-тип проверяется по значению из Content-Type заголовка (multer). Для проверки реального содержимого файла нужна библиотека `file-type` (не подключена).
- Доступ к одиночным файлам (`GET/PATCH/DELETE /files/:id`) проверяется через `PermissionsGuard` (уровни VIEW / EDIT / MANAGE). Список (`GET /files`) и загрузка (`POST /files/upload`) проверяют только владельца через `uploadedById`.
