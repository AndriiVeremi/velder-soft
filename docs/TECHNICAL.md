# Dokumentacja Techniczna Velder-soft

Niniejszy dokument zawiera szczegółowe informacje na temat struktury technicznej, użytego stosu technologicznego oraz procesów deweloperskich systemu Velder-soft.

## 🛠 Stos Technologiczny

- **Frontend:** React Native (Expo SDK 54)
- **Język:** TypeScript (Pełna typizacja interfaces/types)
- **Backend:** Firebase (Firestore, Auth, Storage)
- **Stylizacja:** styled-components/native з підтримкою динамічного масштабування шрифтів (FontScale).
- **Ikony:** lucide-react-native
- **Powiadomienia:** expo-notifications + Expo Push API (obsługa kanałów Android, priorytetów oraz godzin ciszy).

## 🏛 Architektura Systemu

### Struktura Danych (Firestore)

System wykorzystuje zoptymalizowaną strukturę hierarchiczną:

- **Hospitals (`hospitals`):** Główny folder projektu.
- **Departments (`departments`):** Podfoldery przypisane do szpitala. Przechowują stan prac (`status`: IN_PROGRESS / COMPLETED).
- **Projects/Documents (`projects`):** Pliki PDF przypisane do konkretnego oddziału.
- **Documentation (`docs_categories`, `docs_folders`, `docs_files`):** Nowy moduł bazy wiedzy z trójpoziomową strukturą: Kategoria -> Folder -> Plik.
- **Requests (`requests`):** System "Linia do Szefa". Dokumenty przechowują stan `PENDING` lub `CONFIRMED`.

### Dynamiczne Skalowanie Interfejsu

Wprowadzono system `FontScale` (1x, 1.2x, 1.4x), który jest zintegrowany z `ThemeContext`.

- **Mechanizm:** Rozmiary шрифтів definiowane są w `src/config/theme.ts` za pomocą funkcji `buildFontSize`.
- **Zasada działania:** Wszystkie komponenty UI korzystają z kluczy `theme.fontSize.fXX`, co pozwala na natychmiastową zmianę rozmiaru w całej aplikacji bez restartu.
- **Persystencja:** Wybrany profil skalowania jest zapisywany lokalnie przez `AsyncStorage`.

### Zaawansowany System Powiadomień

- **Kanały Android:**
  - `Alerts`: Wysoki priorytet, specyficzny sygnał wibracyjny dla zgłoszeń problemów.
  - `Przypomnienia`: Długi wzór wibracji, obsługa interaktywnych kategorii.
- **Tryb Ciszy (Quiet Hours):** Użytkownik może zdefiniować godziny pracy w profilu. Powiadomienia PUSH wysyłane w tych godzinach są automatycznie wyciszane po stronie serwera/klienta.
- **Interaktywne Przypomnienia:** Kategoria `reminder` pozwala na "Uśpienie" (Snooze) powiadomienia na 10 minut bezpośrednio z poziomu paska powiadomień.
- **Daily Reminders:** Automatyczne planowanie lokalnego powiadomienia z podsumowaniem zadań na dany dzień.

### Automatyzacja i Cleanup

- **Weekly Cleanup:** Automatyczne usuwanie zakończonych zadań i powiązanych zdjęć po 7 dniach.
- **Announcement Expiry:** Ogłoszenia oraz znaczniki ich przeczytania (`announcement_reads`) są automatycznie usuwane po 3 dniach w celu zachowania porządku w bazie danych.

### Wspólne Komponenty (Refactoring)

- **TimePicker:** Ustandaryzowany komponent do wyboru czasu pracy i zadań.
- **Upload Utility:** Skonsolidowana logika `pickAndUploadPhoto` z automatyczną obsługą metadanych i błędów.
- **CommonUI:** Współdzielone style dla ModalOverlay i ModalContent zapewniają spójność wizualną.

## 🚀 Deployment i Aktualizacje

### System OTA (Over-The-Air)

Aktualizacje kodu JS są przesyłane natychmiastowo przez kanał `preview`.

- **Komenda:** `npx eas update --branch preview`

---

© 2026 Velder IT Department. Opracowane przez: Andrii Veremii (D@shuk).
