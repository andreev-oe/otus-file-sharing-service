# UsersModule

Профиль пользователя, обновление данных, загрузка аватара.

## Эндпоинты

Все защищены `JwtAuthGuard`. Текущий пользователь определяется по `CurrentUser` из JWT.

| Метод | URL | Описание |
|---|---|---|
| GET | `/users/me` | Профиль текущего пользователя (включает `avatarUrl`) |
| PATCH | `/users/me` | Обновить имя / bio |
| POST | `/users/me/avatar` | Загрузить аватар (multipart/form-data, поле `file`) |

## UsersService

### `create(email, password, name)`
Проверяет уникальность email — `ConflictException` при дублировании. Хэширует пароль через bcrypt (`BCRYPT_SALT_ROUNDS = 10`). Используется только из `AuthService`.

### `findById(id)`
Ищет пользователя по `id`. `NotFoundException` если не найден.

### `findByEmail(email)`
Возвращает `User | null`. Используется в `AuthService` при логине.

### `update(id, dto)`
Обновляет `name` и/или `bio`. Поля опциональны — передаются только те, что нужно изменить.

### `uploadAvatar(id, file)`
Строит S3-ключ: `avatars/{id}/{timestamp}-{originalname}`. Загружает файл через `StorageService`. Получает постоянный публичный URL через `StorageService.getPublicUrl()` и сохраняет его в `avatarUrl`. Возвращает обновлённого пользователя. Если `userRepository.update` падает — удаляет только что загруженный файл из S3 (rollback S3 при ошибке DB).

## Сущность User

| Поле | Тип | Описание |
|---|---|---|
| `id` | uuid | PK |
| `email` | string | Уникальный, используется для входа |
| `passwordHash` | string | Исключён из сериализации (`@Exclude`) |
| `name` | string | Отображаемое имя |
| `bio` | string \| null | Описание профиля |
| `avatarUrl` | string \| null | Публичный URL аватара (`{s3endpoint}/{bucket}/avatars/{id}/...`) |
| `role` | UserRole | `user` или `admin` |
| `createdAt` | timestamp | |
| `updatedAt` | timestamp | |

## Аватар

Публичный URL сохраняется в `avatarUrl` при загрузке и возвращается в теле `GET /users/me`. Дополнительных запросов не нужно.

В отличие от файлов, аватары не требуют контроля доступа — S3-бакет должен разрешать публичное чтение для префикса `avatars/`.
