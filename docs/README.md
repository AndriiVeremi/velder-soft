# Velder-soft: System Zarządzania Projektami

Profesjonalna aplikacja wieloplatformowa (Mobile + Web) dla firmy **Velder**, stworzona w celu automatyzacji kontroli projektów inżynieryjnych i serwisowych.

## 🛠 Stos Technologiczny

- **Frontend:** React Native (Expo SDK 54) + TypeScript.
- **Web:** React Native for Web (ujednolicony kod dla komputerów i smartfonów).
- **Backend (BaaS):** Firebase (Authentication, Firestore Database, Cloud Storage).
- **Stylizacja:** Styled-components (design adaptacyjny, wsparcie dla trybu ciemnego/jasnego).
- **Ikony:** Lucide-react-native.
- **Powiadomienia:** Expo Notifications (lokalne przypomnienia).

## 🌟 Kluczowe Funkcje

- **Zarządzanie Zadaniami:** Tworzenie, edycja i monitorowanie zadań z możliwością dokumentacji fotograficznej.
- **Archiwum Projektów:** Przechowywanie dokumentacji technicznej (PDF) oraz zdjęć z obiektów.
- **Serwis i Konserwacja:** Rejestrowanie prac serwisowych, raporty fotograficzne z komentarzami.
- **Zarządzanie Pracownikami:** Kontrola dostępu (Rola: Dyrektor / Pracownik), aktywacja kont.
- **System Urlopowy:** Składanie i akceptacja wniosków o urlop.
- **Powiadomienia i Przypomnienia:** Osobisty system przypomnień z integracją systemową.

## 🚀 Szybki Start

1. **Sklonuj repozytorium.**
2. **Skonfiguruj środowisko:**
   - Skopiuj `.env.example` do `.env`.
   - Wprowadź klucze swojego projektu Firebase.
3. **Zainstaluj zależności:**
   ```bash
   npm install
   ```
4. **Uruchom projekt:**
   - **Wersja Web (PC):** `npm run web`
   - **Wersja Mobilna:** `npx expo start` (zeskanuj kod QR w aplikacji Expo Go).

## 🔑 Zarządzanie Rolami

Aplikacja obsługuje dwie główne role: `DIRECTOR` (Administrator) oraz `EMPLOYEE` (Pracownik).

- **Dyrektor:** Ma pełny dostęp do zarządzania użytkownikami, projektami i akceptacji urlopów.
- **Pracownik:** Może przeglądać projekty, wykonywać przypisane zadania i składać wnioski.

Aby nadać uprawnienia Dyrektora, należy zmienić pole `role` na `"DIRECTOR"` w dokumencie użytkownika w kolekcji `users` w konsoli Firebase.

---

## 📁 Struktura Projektu

- `src/config`: Konfiguracja Firebase oraz motywu graficznego (Theme).
- `src/context`: Zarządzanie stanem autoryzacji (AuthContext).
- `src/screens`: Ekrany aplikacji (Dashboard, Tasks, Service itp.).
- `src/components`: Komponenty wielokrotnego użytku (Layout, UI elements).
- `src/utils`: Funkcje pomocnicze (Powiadomienia, formatowanie dat).
- `docs/`: Szczegółowa dokumentacja techniczna.
