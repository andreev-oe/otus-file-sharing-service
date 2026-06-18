# PermissionsModule

Управление доступом к файлам и папкам. Поддерживает выдачу прав отдельным пользователям и группам.

## Эндпоинты

Все защищены `JwtAuthGuard`.

| Метод | URL | Описание |
|---|---|---|
| POST | `/permissions` | Выдать или обновить разрешение |
| DELETE | `/permissions/:id` | Отозвать разрешение (204) |

## PermissionsService

### `grant(dto)`
Upsert: если разрешение для той же пары `(subjectType, subjectId, resourceType, resourceId)` уже существует — обновляет уровень. Иначе создаёт новую запись. Это позволяет повышать и понижать права без предварительного отзыва. После сохранения инвалидирует все кэшированные записи для изменённого ресурса (паттерн `perm:{resourceType}:{resourceId}:*`).

### `revoke(id)`
Удаляет разрешение по `id`. `NotFoundException` если не найдено. После удаления инвалидирует кэш ресурса.

### `check(userId, groupIds, resourceType, resourceId, required)`
Низкоуровневая проверка без кэша: принимает уже известные `groupIds`. Делегирует в `resolveHighestLevel()`, сравнивает наивысший уровень с `required` по шкале `VIEW < COMMENT < EDIT < MANAGE`. Возвращает `true` если наивысший ≥ требуемого.

### `checkForUser(userId, resourceType, resourceId, required)`
Высокоуровневая обёртка для guard-ов. Проверяет кэш Redis — если попадание, сразу сравнивает с `required`. При промахе запрашивает `groupId` пользователя из `group_members`, вызывает `resolveHighestLevel()`, кэширует наивысший уровень (или `none`) на 5 минут. Это единственное место, где `PermissionsModule` читает данные из чужой таблицы — через свой собственный `Repository<GroupMember>`, зарегистрированный локально.

## Сущность Permission

| Поле | Тип | Описание |
|---|---|---|
| `id` | uuid | PK |
| `subjectType` | SubjectType | `user` или `group` |
| `subjectId` | string | ID пользователя или группы |
| `resourceType` | ResourceType | `file` или `folder` |
| `resourceId` | string | ID файла или папки |
| `permission` | PermissionLevel | Уровень доступа |
| `createdAt` | timestamp | Время выдачи |

## Уровни доступа (PermissionLevel)

| Уровень | Описание |
|---|---|
| `VIEW` | Просмотр ресурса |
| `COMMENT` | Просмотр + добавление заметок |
| `EDIT` | Просмотр + редактирование содержимого |
| `MANAGE` | Полный контроль, включая выдачу прав другим |

Уровни упорядочены: `VIEW < COMMENT < EDIT < MANAGE`. Проверка `check` принимает любой уровень ≥ требуемого.

## PermissionsGuard

Глобальный guard, зарегистрированный через `APP_GUARD` в `AppModule`. Активируется только на эндпоинтах, помеченных декоратором `@RequirePermission(resourceType, level, paramName?)`. Если декоратора нет — пропускает запрос.

Логика:
1. Читает метаданные из `@RequirePermission`
2. Берёт `request.user.id` (установлен `JwtAuthGuard`)
3. Читает `request.params[paramName]` как `resourceId` (по умолчанию `paramName = 'id'`)
4. Вызывает `checkForUser()` — при отказе бросает `ForbiddenException`

Декоратор `@RequirePermission` живёт в `src/common/decorators/require-permission.decorator.ts`.

### Покрытые эндпоинты

| Модуль | Эндпоинт | Требуемый уровень |
|---|---|---|
| Files | `GET /files/:id` | VIEW |
| Files | `GET /files/:id/download` | VIEW |
| Files | `GET /files/:id/versions` | VIEW |
| Files | `PATCH /files/:id` | EDIT |
| Files | `DELETE /files/:id` | MANAGE |
| Folders | `GET /folders/:id/children` | VIEW |
| Folders | `PATCH /folders/:id` | EDIT |
| Folders | `DELETE /folders/:id` | MANAGE |

## Кэш в Redis

| Ключ | Значение | TTL |
|---|---|---|
| `perm:{resourceType}:{resourceId}:{userId}` | Наивысший уровень доступа (`VIEW`/`COMMENT`/`EDIT`/`MANAGE`) или `none` | 300 сек (5 мин) |

Одна запись покрывает проверку любого уровня для пары ресурс+пользователь. Инвалидируется по паттерну `perm:{resourceType}:{resourceId}:*` при `grant` и `revoke` — сбрасывает кэш всех пользователей для данного ресурса.

## Архитектурное решение

`PermissionsModule` регистрирует `TypeOrmModule.forFeature([Permission, GroupMember])` — это единственный способ дать `checkForUser()` доступ к `group_members` без импорта `GroupsModule`. Guard зарегистрирован глобально, поэтому не требует импорта `PermissionsModule` в каждый бизнес-модуль.
