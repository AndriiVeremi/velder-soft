# Dokumentacja Techniczna Velder-soft

Dokument przeznaczony dla programistów i administratorów systemu.

## 🛠 Stos Technologiczny

- **Framework:** React Native (Expo SDK 54).
- **Język:** TypeScript (Typowanie statyczne).
- **Baza Danych:** Firebase Firestore (Baza dokumentowa NoSQL).
- **Pliki:** Firebase Cloud Storage (PDF, JPG).
- **Uwierzytelnianie:** Firebase Auth.
- **Stylizacja:** `styled-components/native`.
- **Ikony:** `lucide-react-native`.

## 🏛 Architektura Aplikacji

Aplikacja korzysta z modelu **BaaS** (Backend as a Service), co eliminuje potrzebę utrzymywania oddzielnego serwera API.

### Nawigacja

Zastosowano `@react-navigation/stack`. Główne ekrany są owinięte w komponent `MainLayout`, który dynamicznie przełącza się między Sidebar (Desktop) a Bottom Tabs (Mobile).

### Logika Powiadomień (Snooze System)

Przy tworzeniu przypomnienia system planuje 3 powiadomienia lokalne z unikalnymi ID: `${docId}_0`, `${docId}_1`, `${docId}_2` w odstępach 5-minutowych. Akcja użytkownika na dowolnym z nich anuluje pozostałe za pomocą `cancelScheduledNotificationAsync`.

### Optymalizacja Danych

- Wszystkie subskrypcje Firestore są automatycznie zamykane w `cleanup` funkcji `useEffect`.
- Sortowanie danych odbywa się po stronie klienta (in-memory), aby uniknąć konieczności tworzenia złożonych indeksów w Firestore.

## 💾 Struktura Bazy Danych

- **users:** `id, name, email, role, isActive, notificationStart, notificationEnd`
- **tasks:** `id, title, description, date, time, done, photos[]`
- **announcements:** `id, text, authorName, createdAt`
- **vacations:** `id, userId, userName, startDate, endDate, status`
- **services:** `id, title, description, status, photos[], serviceDate, serviceTime`

---

## 💎 Jakość Kodu i Standardy

W projekcie stosujemy automatyczne narzędzia do utrzymania czystości kodu:

### Linting (ESLint)

Sprawdza błędy w logice React, React Native oraz TypeScript.

### Formatowanie (Prettier)

Dba o jednolity styl kodu (spacje, cudzysłowy itp.).
