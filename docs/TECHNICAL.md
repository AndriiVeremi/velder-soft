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

- **Hospitals (`hospitals`):** Główna hierarchia projektowa.
- **Departments (`departments`):** Podfoldery z flagą `status`.
- **Projects/Documents (`projects`):** Pliki PDF w Storage, linkowane w Firestore.
- **Documentation (`docs_categories`, `docs_folders`, `docs_files`):** Trójpoziomowa baza wiedzy.
- **Requests (`requests`):** "Linia do Szefa" (PENDING / CONFIRMED).
- **Vacations (`vacations`):** System wniosków urlopowych z automatycznym monitorowaniem dat.
- **Announcements (`announcements` & `announcement_reads`):** System komunikatów firmowych z śledzeniem odczytu.
- **Settings/Stats (`settings/stats`):** Globalne liczniki dla monitoringu systemu.

### Monitorowanie Stanu Systemu (`src/utils/systemStats.ts`)

Wprowadzono moduł analityczny dla Dyrekcji, który w czasie rzeczywistym agreguje dane:
- **Database:** Zliczanie dokumentów w kluczowych kolekcjach (Tasks, Services, Projects) względem limitu 5000 dok.
- **Storage:** Liczba plików zdjęć i PDF względem limitu 1000 plików.
- **Push Stats:** Monitorowanie liczby wysłanych powiadomień przez Firebase (limit 2 mln).

### Zaawansowany System Powiadomień

- **Kanały Android (v4 Migration):** System automatycznie czyści stare kanały i rejestruje:
  - `alerts`: Priorytet MAX, dźwięk `alert.wav`.
  - `reminders`: Priorytet MAX, dźwięk `reminder.wav`, długie wibracje.
  - `done`: Priorytet DEFAULT, dźwięk `done.wav`.
- **Interaktywna Logika Snooze:**
  - Akcja `snooze` planuje serię **3 sygnałów** w odstępach **1 minuty**, zaczynając po **5 minutach** od akcji.
  - Akcja `dismiss` trwale usuwa przypomnienie z bazy Firestore i anuluje wszystkie zaplanowane sygnały lokalne.
- **Tryb Ciszy (Quiet Hours):** Logika `isQuietHours` sprawdza zakres godzin użytkownika przed wysyłką Push przez Cloud Functions lub API Expo.

### Inteligentne Rozpoznawanie Mowy (Speech-to-Text)

- **Voice Parser (`src/utils/voiceParser.ts`):** 
  - Rozpoznaje frazy relatywne: "jutro", "pojutrze", "dziś", "w poniedziałek".
  - Wykrywa godziny w formatach: "o 12", "14:30", "rano" (9:00), "wieczorem" (19:00).
  - Wspiera zarówno platformy mobilne, jak i Web (poprzez `useVoiceRecognition`).

### Moduł Urlopowy (Smart Vacations)

- **Automatyczne Lokalne Przypomnienia:** Ekran `VacationsScreen.tsx` po stronie pracownika automatycznie planuje natywne powiadomienia:
  - **T-5 dni:** "Urlop za 5 dni! 🏖️"
  - **T-1 dzień:** "Urlop już jutro! ☀️"
- **Real-time Sync:** Wykorzystanie `onSnapshot` zapewnia, że pracownik widzi zmianę statusu wniosku (Zatwierdzony/Odrzucony) natychmiast po decyzji Dyrektora.

### Automatyzacja i Cleanup (`src/utils/cleanup.ts`)

- **Weekly Cleanup:** Co tydzień system usuwa zakończone zadania oraz ich fizyczne pliki ze Storage.
- **Announcement Expiry:** Usunięcie rekordów `announcement_reads` po 3 dniach od ogłoszenia.

---

© 2026 Velder IT Department. Opracowane przez: Andrii Veremii (D@shuk).
