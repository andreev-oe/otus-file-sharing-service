# NotificationsModule

Отправка email-уведомлений об @упоминаниях в заметках.

## Архитектура

Модуль не имеет контроллера и эндпоинтов — только внутренняя логика. Подписывается на инфраструктурный `EventBus`, не импортирует `NotesModule` и `UsersModule` напрямую.

Доступ к таблице `users` организован через `TypeOrmModule.forFeature([User])` — аналогично тому, как `PermissionsModule` регистрирует `GroupMember`. Это не нарушает изоляцию модулей: импортируется сущность (TypeScript-класс), а не бизнес-модуль.

## NotificationsService

Реализует `OnModuleInit` / `OnModuleDestroy`. При инициализации подписывается на `EventBus.usersMentioned`.

### Обработка события `usersMentioned`

```
{ mentionedUsernames: string[], authorId: string, noteId: string }
```

1. Загружает автора и всех упомянутых пользователей одним `Promise.all`:
   - `userRepository.find({ where: { username: In(mentionedUsernames) } })`
   - `userRepository.findOne({ where: { id: authorId } })`
2. Пропускает пользователей, где `user.id === authorId` — автор не получает уведомление о своём упоминании.
3. Для каждого оставшегося пользователя вызывает `MailService.sendMentionNotification()`.
4. Неизвестные `username` (нет в БД) молча игнорируются.

Если список упоминаний пустой или автор не найден — завершается без отправки.

## MailService (`src/infrastructure/mail/`)

Оборачивает `nodemailer`. При ошибке SMTP логирует через Winston и не пробрасывает исключение — отправка писем не должна ломать основной флоу (создание/редактирование заметки).

### `sendMentionNotification(toEmail, toName, authorName, noteId)`

Отправляет письмо с темой `«{authorName} упомянул вас в заметке»` и телом в plain-text + HTML.

## Конфигурация

Читается из `smtp.config.ts` через `@nestjs/config`:

| Переменная | Описание | Дефолт |
|---|---|---|
| `SMTP_HOST` | SMTP-сервер | `localhost` |
| `SMTP_PORT` | Порт | `587` |
| `SMTP_USER` | Логин | — |
| `SMTP_PASS` | Пароль | — |
| `SMTP_FROM` | Адрес отправителя | `noreply@fileshare.pro` |

## User.username

Для работы упоминаний у каждого пользователя должен быть уникальный `username` (3–32 символа, `[a-zA-Z0-9_]`). Поле добавлено миграцией `1750245000000-AddUserUsername` — существующие записи получают `username` из email-префикса (`alice@...` → `alice`). При регистрации `username` обязателен.
