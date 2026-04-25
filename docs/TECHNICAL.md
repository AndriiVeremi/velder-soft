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
Dostęp do danych jest chroniony przez **Firebase Security Rules**. Tylko zalogowani i aktywni pracownicy mogą odczytywać dokumentację. Uprawnienia administracyjne (Rola: `DIRECTOR`) są weryfikowane na poziomie kodu oraz bazy danych przed wykonaniem operacji krytycznych (usuwanie, edycja).

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
