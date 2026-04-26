# Dokumentacja Techniczna Velder-soft

Niniejszy dokument zawiera szczegółowe informacje na temat struktury technicznej, użytego stosu technologicznego oraz procesów deweloperskich systemu Velder-soft.

## 🛠 Stos Technologiczny

- **Frontend:** React Native (Expo SDK 51/52)
- **Język:** TypeScript (ścisła typizacja)
- **Backend:** Firebase (Firestore, Auth, Storage)
- **Stylizacja:** styled-components/native
- **Ikony:** lucide-react-native
- **Powiadomienia:** expo-notifications + Expo Push API

## 🏛 Architektura Systemu

### Bezpieczeństwo i Walidacja

System stosuje wielowarstwową ochronę:

- **Server-side Security Rules:** Dostęp do Firestore i Storage jest blokowany na poziomie serwera. Role (DIRECTOR/EMPLOYEE) są weryfikowane przy każdej operacji zapisu/odczytu.
- **XSS Protection:** Walidacja protokołów URL (`https://`) dla zewnętrznych dokumentów PDF.
- **Data Privacy:** Pracownicy mają dostęp tylko do swoich zadań, wniosków i ogólnych zasobów firmy.

### System Powiadomień Push

- **Token Management:** Przy każdym logowaniu aplikacja automatycznie rejestruje `pushToken` urządzenia w profilu użytkownika.
- **Automatyzacja:**
  - Nowe ogłoszenie -> Push do wszystkich pracowników.
  - Nowe zgłoszenie problemu/urlopu -> Push do wszystkich osób z rolą DIRECTOR.
  - Decyzja urlopowa -> Push do konkretnego pracownika.

### Zarządzanie Zadaniami i Zasobami

- **Zadania Ogólne (`ALL`):** Wsparcie dla zadań niewymagających konkretnego wykonawcy, widocznych dla całego zespołu.
- **Auto-Cleanup:** Mechanizm automatycznego usuwania zgłoszeń problemów (Firestore + Storage) po upływie 7 dni od utworzenia w celu optymalizacji kosztów utrzymania.

### Adaptacyjność i UI (Cross-platform)
- **Android Fixes:** Pełne wsparcie dla trybu "Edge-to-Edge", obsługa systemowych przycisków nawigacyjnych oraz inteligentne unikanie klawiatury (`KeyboardAvoidingView`).
- **Web/Safari:** Specjalne poprawki renderowania obrazów (CORS Fix, `backgroundImage`) oraz elastyczne układy dla przeglądarek mobilnych.

### System Motywów (Themes)
System wykorzystuje `styled-components` oraz `ThemeContext` do dynamicznego zarządzania wyglądem:
- **Tryb Jasny (Light Mode):** Zoptymalizowany pod kątem pracy w biurze i przy dużym nasłonecznieniu. Wykorzystuje firmową zieleń Velder na białym tle.
- **Tryb Ciemny (Dark Mode):** Zaprojektowany do pracy w warunkach słabego oświetlenia. Wykorzystuje głębokie odcienie szarości i czerni z neonowymi akcentami zieleni dla zachowania wysokiej czytelności.
- **Dynamiczne Komponenty:** Kalendarze, mapy i wykresy automatycznie zmieniają paletę barw bez konieczności odświeżania aplikacji.
- **Zasada Kontrastu:** Wszystkie kolory zostały dobrane zgodnie ze standardami dostępności (Accessibility), eliminując problem "czarnego tekstu na ciemnym tle".

## 🚀 Deployment i Aktualizacje

### System OTA (Over-The-Air)

Aktualizacje kodu JS są przesyłane natychmiastowo przez kanał `preview`.

- **Komenda:** `npx eas update --branch preview`

### Budowa plików natywnych (EAS Build)

- **Android (APK):** Konfiguracja profilu `preview` generuje bezpośredni plik instalacyjny APK z obsługą kanałów aktualizacji.

---

© 2026 Velder IT Department. Opracowane przez: Andrii Veremii (D@shuk).
