# Оновлений Документ проектування: Velder-soft (Expo + Firebase)

## 1. Загальний опис

Універсальний додаток (Mobile + Web) для керування проектами.

- **Працівники:** використовують телефони для перегляду PDF та завантаження фото звітів/проблем.
- **Директор:** використовує ПК для створення проектів, завантаження PDF та контролю робіт.

## 2. Технологічний стек

- **Фронтенд:** React Native (Expo) + Expo Web + TypeScript.
- **Стилізація:** NativeWind (Tailwind для React Native).
- **Бекенд та База (BaaS):** Firebase.
  - **Authentication:** Вхід через Email/Password.
  - **Firestore:** Збереження даних про проекти та звіти.
  - **Storage:** Збереження PDF-файлів та фотографій.

## 3. Структура даних (Firestore)

### Колекція `users`

- `uid`: String
- `name`: String
- `email`: String
- `role`: 'DIRECTOR' | 'EMPLOYEE'

### Колекція `projects`

- `id`: String
- `title`: String
- `description`: String
- `pdfUrl`: String
- `createdAt`: Timestamp
- `createdBy`: String (uid)

### Колекція `service_records`

- `id`: String
- `projectId`: String (ref to projects)
- `title`: String
- `description`: String
- `photos`: Array<String> (urls from Storage)
- `type`: 'WORK_DONE' | 'PROBLEM'
- `createdAt`: Timestamp
- `createdBy`: String (uid)

## 4. Екрани (Screens)

1. **Login:** Вхід у систему.
2. **Dashboard:** Список проектів (різний вигляд для мобілки та ПК).
3. **Project Details:**
   - Перегляд PDF (вбудований viewer).
   - Список фото-звітів.
   - Кнопка "Додати звіт/проблему" (з камерою).
4. **Admin Panel (тільки для ПК):** Створення нових проектів та користувачів.

## 5. Переваги для бюджету

- **Firebase Spark Plan:** 0 грн/міс (до певних лімітів, яких вам вистачить на старті).
- **Hosting:** Firebase Hosting (безкоштовно для веб-версії).
