# Architektura Systemu i Design

Dokument ten opisuje strukturę techniczną aplikacji Velder-soft oraz decyzje projektowe dotyczące interfejsu i bazy danych.

## 🏛️ Architektura

Aplikacja oparta jest na frameworku **React Native** z wykorzystaniem ekosystemu **Expo**. Dzięki temu rozwiązaniu utrzymujemy jedną bazę kodu dla trzech platform:
1. **Web:** Renderowany za pomocą `react-native-web`.
2. **iOS:** Natywna aplikacja (testowana przez Expo Go).
3. **Android:** Natywna aplikacja.

### Kluczowe decyzje architektoniczne:
- **Navigation:** Zastosowano `Stack Navigator` z biblioteki `@react-navigation/stack`. Główne ekrany są owinięte w komponent `MainLayout`, który dostarcza Sidebar (na Web) lub Bottom Tabs (na Mobile).
- **State Management:** Wykorzystano `Context API` (AuthContext) do zarządzania stanem zalogowanego użytkownika w całej aplikacji.
- **Data Fetching:** Wykorzystano funkcję `onSnapshot` z Firebase, co zapewnia synchronizację danych w czasie rzeczywistym bez konieczności odświeżania strony.

## 🎨 Design i Stylizacja

### Styled Components
Cała aplikacja korzysta z biblioteki `styled-components`. Pozwala to na:
- **Zmienne Motywu:** Centralny plik `src/config/theme.ts` zawiera paletę kolorów, czcionki i odstępy.
- **Responsywność:** Style dynamicznie reagują na rozmiar okna (isDesktop vs Mobile).
- **Izolacja:** Style są powiązane bezpośrednio z komponentami, co ułatwia konserwację.

### Paleta Kolorów (Motyw Velder)
- **Primary:** `#008744` (Zielony Velder) - akcje, przyciski główne.
- **Secondary:** `#005d2f` - akcenty, hover.
- **Error:** `#d32f2f` - ostrzeżenia, usuwanie.
- **Surface:** `#ffffff` - karty, tła sekcji.
- **Background:** `#f5f5f5` - główne tło aplikacji.

## 💾 Baza Danych (Firebase Firestore)

### Struktura Kolekcji:
- `users`: Dokumenty użytkowników (name, email, role, isActive, settings).
- `tasks`: Zadania (title, date, done, photos[]).
- `projects`: Dokumentacja techniczna (title, hospital, department, pdfUrl).
- `service_records`: Archiwum prac (photoUrl, hospital, department).
- `services`: Zlecenia serwisowe (title, description, status, photos[]).
- `vacations`: Wnioski urlopowe (userId, startDate, endDate, status).
- `reminders`: Prywatne przypomnienia użytkowników.

### Storage (Cloud Storage):
Pliki są zorganizowane w folderach:
- `projects/`: Pliki PDF z dokumentacją.
- `task_photos/`: Zdjęcia do zadań.
- `service/`: Zdjęcia z raportów serwisowych.
- `dept_photos/`: Zdjęcia z archiwum oddziałów.
