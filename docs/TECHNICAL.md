# Dokumentacja Techniczna Velder-soft

Niniejszy dokument zawiera szczegółowe informacje na temat struktury technicznej, użytego stosu technologicznego oraz procesów deweloperskich systemu Velder-soft.

## 🛠 Stos Technologiczny

- **Frontend:** React Native (Expo SDK 54) + Wsparcie Web (React)
- **Język:** TypeScript (Pełna typizacja unknown/interfaces)
- **Backend:** Google Firebase (Firestore, Auth, Storage, Cloud Functions dla Web Push)
- **Stylizacja:** styled-components/native z wsparciem dynamicznego skalowania (FontScale).
- **Ikony:** lucide-react-native
- **Powiadomienia:** expo-notifications + Expo Push API (kanały Android v4, priorytety, godziny ciszy).

## 🏛 Architektura Systemu

### Struktura Danych (Firestore)

- **Hospitals (`hospitals`):** Główna hierarchia projektowa (Szpitale).
- **Departments (`departments`):** Oddziały wewnątrz szpitali з flagą `status`.
- **Projects/Documents (`projects`):** Dokumentacja techniczna (PDF) linkowana do oddziałów.
- **Service (`services`):** System zleceń serwisowych dla gazów medycznych (PENDING / DONE).
- **Documentation (`docs_categories`, `docs_folders`, `docs_files`):** Trójpoziomowa baza wiedzy firmowej.
- **Problem Reports (`reports`):** Zgłoszenia problemów technicznych od pracowników do Dyrekcji.
- **Requests (`requests`):** "Linia do Szefa" — szybkie prośby o materiały lub wsparcie.
- **Vacations (`vacations`):** System wniosków urlopowych z automatycznym monitorowaniem dat.
- **Announcements (`announcements` & `announcement_reads`):** System komunikatów firmowych z śledzeniem odczytu.
- **Users (`users`):** Profile użytkowników z rolami (DIRECTOR/EMPLOYEE) i statusem aktywacji.
- **Settings/Stats (`settings/stats`):** Globalne liczniki dla monitoringu systemu.

### Role i Uprawnienia (RBAC)

System implementuje model Role-Based Access Control (`src/utils/permissions.ts`):

- **DIRECTOR:**
  - Pełne zarządzanie projektami, zadaniami i serwisem.
  - Aktywacja/dezaktywacja kont pracowników.
  - Publikacja ogłoszeń i zarządzanie bazą wiedzy (Docs).
  - Podgląd raportów systemowych i monitoring zajętości zasobów.
- **EMPLOYEE:**
  - Realizacja zadań i zleceń serwisowych (z opcją dodawania zdjęć).
  - Składanie wniosków urlopowych.
  - Zgłaszanie problemów i wysyłanie próśb do dyrekcji.
  - Przeglądanie dokumentacji i ogłoszeń.

### Monitorowanie Stanu Systemu (`src/utils/systemStats.ts`)

Moduł analityczny agregujący dane w czasie rzeczywistym:
- **Database:** Zliczanie dokumentów (limit 5000).
- **Storage:** Monitorowanie liczby plików zdjęć i PDF (limit 1000).
- **Push Stats:** Śledzenie wysłanych powiadomień Firebase.

### Zaawansowany System Powiadomień

- **Kanały Android (v4):**
  - `alerts`: Krytyczne (Serwis, Nowe Zadania), dźwięk `alert.wav`.
  - `reminders`: Osobiste, dźwięk `reminder.wav`, Snooze logic.
  - `done`: Potwierdzenia, dźwięk `done.wav`.
- **Logika Snooze (Przypomnienia):**
  - Akcja `snooze` planuje serię **3 sygnałów** w odstępach **1 minuty**, zaczynając po **5 minutach**.
  - Akcja `dismiss` trwale usuwa rekord z Firestore i anuluje lokalne sygnały.

### Inteligentne Funkcje

- **Voice Assistant (`src/utils/voiceParser.ts`):** Naturalny parsing dat ("jutro o 10", "poniedziałek rano") dla przypomnień.
- **Weekly Cleanup:** Automatyczne usuwanie zakończonych zadań i ich plików co 7 dni.
- **Real-time Sync:** Wykorzystння `onSnapshot` dla natychmiastowych aktualizacji statusів (Urlopy, Badge).

### Interfejs i Responsywność

- **MainLayout:** Obsługuje tryb Desktop (Sidebar) dla Web oraz tryb Mobile (Bottom Tabs + More Menu) dla Android/iOS.
- **Badge System:** Dynamiczne powiadomienia na іkonkach menu (nowe zgłoszenia, oczekujący użytkownicy).

### Inicjalizacja Systemu (`src/utils/initDb.ts`)

Skrypt `initializeNewClientDatabase` konfiguruje:
- Początkowe dokumenty statystyk.
- Domyślne kategorie dokumentacji (Kadry, Techniczne, Normy).
- Powitanie systemowe.

---

© 2026 Velder IT Department. Opracowane przez: Andrii Veremii (D@shuk).
