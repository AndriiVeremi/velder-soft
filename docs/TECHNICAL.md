# Dokumentacja Techniczna Velder-soft

Niniejszy dokument zawiera szczegółowe informacje na temat struktury technicznej, użytego stosu technologicznego oraz procesów deweloperskich systemu Velder-soft.

## 🛠 Stos Technologiczny

- **Frontend:** React Native (Expo SDK 54)
- **Język:** TypeScript (Pełna typizacja interfaces/types)
- **Backend:** Firebase (Firestore, Auth, Storage)
- **Stylizacja:** styled-components/native
- **Ikony:** lucide-react-native
- **Powiadomienia:** expo-notifications + Expo Push API

## 🏛 Architektura Systemu

### Struktura Danych (Firestore)

System wykorzystuje zoptymalizowaną strukturę hierarchiczną dla projektów:

- **Hospitals (`hospitals`):** Główny folder projektu.
- **Departments (`departments`):** Podfoldery przypisane do szpitala. Przechowują stan prac (`status`: IN_PROGRESS / COMPLETED).
- **Projects/Documents (`projects`):** Pliki PDF przypisane do konkretnego oddziału. Obsługują metadane `contentType: application/pdf` dla poprawnego wyświetlania w przeglądarkach.
- **Requests (`requests`):** System "Linia do Szefa". Dokumenty przechowują stan `PENDING` lub `CONFIRMED`.

### System Powiadomień i Sygnalizacji

- **Kanały Android (Alerts):** Specjalny kanał o wysokim priorytecie zapewniający dźwięk i wibrację dla krytycznych zdarzeń.
- **Linia do Szefa:** Real-time monitoring nowych zgłoszeń z natychmiastowym powiadomieniem dźwiękowym dla Dyrektora.
- **Ogłoszenia:** Powiadomienia dźwiękowe dla pracowników przy publikacji nowych komunikatów.
- **Optimistic UI:** Natychmiastowe znikanie potwierdzonych elementów z interfejsu przed zakończeniem operacji sieciowej.

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
