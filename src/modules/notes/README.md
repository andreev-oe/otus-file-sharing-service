# NotesModule

Текстовые заметки к файлам с поддержкой `@mentions`, полнотекстовым поиском, пагинацией и контролем авторства.

## Эндпоинты

Все защищены `JwtAuthGuard`. Автор определяется по `CurrentUser` из JWT.

| Метод | URL | Описание |
|---|---|---|
| POST | `/notes` | Создать заметку к файлу |
| GET | `/notes/search?q=...` | Полнотекстовый поиск по содержимому заметок автора |
| GET | `/notes/file/:fileId?page=1&limit=20` | Список заметок файла (пагинация) |
| PATCH | `/notes/:id` | Обновить содержимое заметки (только автор) |
| DELETE | `/notes/:id` | Удалить заметку (только автор, 204) |

`GET /notes/search` объявлен до `GET /notes/file/:fileId` — иначе NestJS сопоставил бы `search` как параметр маршрута.

## NotesService

### `create(authorId, dto)`
Создаёт заметку: сохраняет `fileId`, `authorId`, `content`, автоматически извлекает `mentions` из контента через `extractMentions()`. Если `fileId` не существует — TypeORM выбросит FK-ошибку (`23503`), которая перехватывается и конвертируется в `BadRequestException`.

### `findByFile(fileId, page, limit)`
Возвращает `{ data: Note[], total: number }`. Сортировка по `createdAt DESC`. Пагинация: `skip = (page - 1) * limit`, `take = limit`. Заметки файла видны всем аутентифицированным пользователям без ограничения по `authorId`.

### `search(authorId, query)`
Полнотекстовый поиск по `content` среди заметок автора. Использует PostgreSQL FTS:
- `to_tsvector('simple', content)` — токенизирует текст заметки
- `plainto_tsquery('simple', query)` — разбирает запрос пользователя, несколько слов объединяются через AND
- Результаты упорядочены по `ts_rank` — наиболее релевантные первыми

Конфигурация `simple` не применяет стемминг — корректно работает для любого языка. Поиск ускоряется GIN-индексом `notes_content_fts_idx` (миграция `1750244800000-AddNotesFtsIndex`).

### `update(id, authorId, dto)`
Делегирует проверку авторства в `findOwnedOrFail()`. Обновляет `content` и пересчитывает `mentions`.

### `remove(id, authorId)`
Делегирует проверку авторства в `findOwnedOrFail()`. Выполняет жёсткое удаление.

### `findOwnedOrFail(id, authorId)` (private)
Ищет заметку по `id`. `NotFoundException` если не найдена, `ForbiddenException` если `note.authorId !== authorId`.

### `extractMentions(content)` (private)
Извлекает уникальные логины из строки по паттерну `/@(\w+)/g`. Результат дедуплицируется через `Set`.

## Сущность Note

| Поле | Тип | Описание |
|---|---|---|
| `id` | uuid | PK |
| `fileId` | string | FK на `files.id` |
| `authorId` | string | FK на `users.id` |
| `content` | text | Текст заметки |
| `mentions` | text[] | Упомянутые логины (денормализованный кэш из `content`) |
| `createdAt` | timestamp | |
| `updatedAt` | timestamp | |

## Полнотекстовый поиск

FTS быстрее `ILIKE` на больших объёмах: вместо посимвольного сканирования таблицы используется инвертированный GIN-индекс.

GIN-индекс `notes_content_fts_idx` создаётся миграцией:
```sql
CREATE INDEX notes_content_fts_idx ON notes USING GIN (to_tsvector('simple', content));
```

Применяется автоматически при старте приложения (`migrationsRun: true`).

## Mentions

Логины хранятся как PostgreSQL-массив `text[]`. Извлекаются из `content` при каждом `create` и `update`. `mentions` — денормализованный кэш: источником истины остаётся `content`.

Пример: `"Отличный файл, @alice и @bob!"` → `mentions: ["alice", "bob"]`.
