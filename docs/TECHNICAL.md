# Dokumentacja Techniczna Velder-soft

Niniejszy dokument zawiera szczegółowe informacje na temat struktury technicznej, użytego stosu technologicznego oraz procesów deweloperskich systemu Velder-soft.

## 🛠 Stos Technologiczny

Aplikacja została zbudowana w oparciu o najnowocześniejsze technologie JavaScript, zapewniające wysoką wydajność i łatwość skalowania.

### Core Frontend

- **Framework:** React Native (Expo SDK 54) – umożliwia współdzielenie 95% kodu między wersją Web a aplikacjami natywnymi.
- **Język:** TypeScript – zapewnia silne typowanie, co minimalizuje błędy w fazie produkcji.
- **Nawigacja:** `@react-navigation/stack` – stabilny system przejść między ekranami.
- **Stylizacja:** `styled-components/native` – architektura CSS-in-JS dla pełnej izolacji stylów i wsparcia motywów (Theming).

### Backend as a Service (Firebase)

- **Firebase Auth:** Bezpieczny system uwierzytelniania użytkowników (Email/Password).
- **Cloud Firestore:** NoSQL-owa baza danych działająca w czasie rzeczywistym (Real-time syncing).
- **Cloud Storage:** Przechowywanie dokumentacji technicznej (PDF) oraz zdjęć z obiektów (JPG).
- **Hosting:** Firebase Hosting dla stabilnej wersji przeglądarkowej.

### Narzędzia i Biblioteki

- **Powiadomienia:** `expo-notifications` – obsługa lokalnych alertów oraz systemowych powiadomień Push.
- **Ikony:** `lucide-react-native` – zestaw lekkich, wektorowych ikon.
- **Data/Czas:** `date-fns` – nowoczesna biblioteka do manipulacji czasem.
- **Media:** `expo-image-picker`, `expo-media-library` – integracja z aparatem i galerią telefonu.

---

## 🏛 Architektura Systemu

### Synchronizacja Real-time

Aplikacja wykorzystuje mechanizm `onSnapshot` z Firebase SDK. Każda zmiana w bazie danych (np. nowe zadanie dodane przez Dyrektora) jest natychmiastowo odzwierciedlana na urządzeniach wszystkich pracowników bez konieczności odświeżania aplikacji.

### Hybrydowy Interfejs (Web/Mobile)

System dynamicznie wykrywa typ urządzenia:

- **Desktop:** Renderuje stały Sidebar z podziałem na sekcje logiczne.
- **Mobile:** Przełącza się na system "Rule 4+1" (cztery główne ikony + modalne menu "Więcej"), optymalizując przestrzeń roboczą.

### Bezpieczeństwo Danych

System stosuje wielowarstwową architekturę bezpieczeństwa:

- **Server-side Security Rules:** Dostęp do bazy Firestore i Storage jest kontrolowany przez rygorystyczne reguły serwerowe. Uniemożliwia to nieautoryzowaną modyfikację danych (np. zmianę roli użytkownika lub usunięcie cudzych plików) nawet przy obejściu interfejsu klienta.
- **Walidacja URL (XSS Protection):** Wszystkie zewnętrzne linki (np. do plików PDF) przechodzą proces walidacji protokołu (`https://`), co eliminuje ryzyko ataków typu Cross-Site Scripting.
- **Rola DIRECTOR:** Uprawnienia administracyjne są weryfikowane bezpośrednio na serwerze Firebase przed każdą operacją zapisu.

### Mechanizmy Automatyzacji i Zarządzania Miejscem

- **Auto-Cleanup (Zgłoszenia):** Aplikacja posiada wbudowaną logikę "klient-serwer" do usuwania przeterminowanych danych. Zgłoszenia problemów wraz z załącznikami (zdjęcia/wideo) są automatycznie usuwane z bazy i magazynu po upływie 7 dni od utworzenia.
- **Zadania Ogólne:** System wspiera zadania przypisane do grupy `ALL`. Są one widoczne dla wszystkich aktywnych pracowników, co optymalizuje proces przydzielania prac niewymagających konkretnego wykonawcy.

---

## 🚀 Deployment i Aktualizacje

### System OTA (Over-The-Air)

Aplikacja posiada wbudowaną usługę `expo-updates`. Pozwala ona na przesyłanie poprawek kodu bezpośrednio na telefony użytkowników z pominięciem sklepów App Store / Google Play.

- **Komenda aktualizacji:** `npx eas update --branch preview`

### Budowa plików natywnych (EAS Build)

Zbiórka plików instalacyjnych odbywa się w odizolowanym środowisku chmurowym Expo:

- **Android (APK):** `npx eas-cli build -p android --profile preview`
- **Web (Deploy):** `npm run deploy:web`

### Standardy Jakości

Projekt utrzymuje wysoką jakość kodu poprzez:

- **Linting:** Rygorystyczne reguły ESLint eliminujące nieużywane zmienne i błędy typowania.
- **Formatting:** Automatyczne formatowanie kodu za pomocą Prettier.
- **Keyboard Handling:** Użycie `KeyboardAvoidingView` oraz `softwareKeyboardLayoutMode: "resize"` dla poprawnego działania formularzy na Androidzie.

---

© 2026 Velder IT Department.
