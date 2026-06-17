# ReportsModule

Асинхронная генерация отчётов через очередь BullMQ. Поддерживает три типа отчётов и два формата вывода.

## Эндпоинты

Все защищены `JwtAuthGuard`.

| Метод | URL | Описание |
|---|---|---|
| POST | `/reports` | Поставить задачу в очередь, вернуть `{ jobId }` |
| GET | `/reports/:jobId/status` | Статус и прогресс задачи |
| GET | `/reports/:jobId/download` | Presigned URL готового отчёта (только после завершения) |

## Жизненный цикл задачи

```
POST /reports → { jobId }
        ↓
GET /reports/:jobId/status → { status: "active", progress: 50 }
        ↓
GET /reports/:jobId/status → { status: "completed", progress: 100 }
        ↓
GET /reports/:jobId/download → { url: "https://..." }
```

Статусы BullMQ: `waiting` → `active` → `completed` / `failed`.

## Типы отчётов (ReportType)

| Тип | subjectId | Содержимое |
|---|---|---|
| `user` | ID пользователя | Все файлы пользователя |
| `folder` | ID папки | Файлы в папке и всех вложенных папках |
| `group` | ID группы | Участники группы с ролями |

Параметры `from` / `to` (ISO date string) фильтруют по `createdAt`. Для `group` фильтрация не применяется.

## Форматы (ReportFormat)

| Формат | MIME | Описание |
|---|---|---|
| `csv` | `text/csv` | Таблица с заголовками через `fast-csv` |
| `pdf` | `application/pdf` | Структурированный документ через `pdfkit` |

## ReportsService

### `enqueue(userId, dto)`
Добавляет задачу в очередь `reports` через `Queue.add('generate', jobData)`. Возвращает `{ jobId: string }`.

### `getStatus(jobId)`
Получает задачу из очереди. `NotFoundException` если не найдена. Возвращает `{ status, progress }` где `progress` — число 0–100.

### `getDownloadUrl(jobId)`
Проверяет что задача завершена (`status === 'completed'`), иначе `BadRequestException`. Читает `s3Key` из `job.returnvalue` и генерирует presigned URL на 1 час.

## ReportsProcessor (`src/jobs/reports.processor.ts`)

Обрабатывает задачи из очереди `reports`. Обновляет прогресс на каждом шаге (10 → 50 → 80 → 100).

Для запросов к БД использует `EntityManager` (инжектируется через `@InjectEntityManager()`) — без импорта репозиториев из других модулей.

### Сбор данных по типам

**USER** — файлы пользователя (`File.uploadedById = subjectId`).
Колонки: `id`, `name`, `mimeType`, `size`, `folderId`, `version`, `uploadedAt`.

**FOLDER** — файлы в папке и всех потомках.
Потомки находятся через `path LIKE '{folder.path}/%'` (материализованные пути из FoldersModule).
Колонки: `id`, `name`, `mimeType`, `size`, `uploadedById`, `version`, `uploadedAt`.

**GROUP** — участники группы с данными пользователя.
Колонки: `userId`, `name`, `email`, `role`, `joinedAt`.

### Генерация файлов

**CSV** — через `fast-csv` stream API: заголовки берутся из ключей первой строки.

**PDF** — через `pdfkit`: заголовок с типом отчёта и датой генерации, затем строки в виде `ключ: значение` разделённые горизонтальной чертой.

Готовый файл загружается в S3 по пути `reports/{userId}/{jobId}.{format}` и путь возвращается как результат задачи (`job.returnvalue.s3Key`).

## Архитектурное решение

`ReportsProcessor` читает данные из таблиц `files`, `folders`, `group_members` через `EntityManager` с entity-class references — без инжекции репозиториев из `FilesModule`, `FoldersModule`, `GroupsModule`. Это сохраняет изоляцию модулей аналогично подходу в `PermissionsModule`.
