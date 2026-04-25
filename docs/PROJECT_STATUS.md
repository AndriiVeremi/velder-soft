# Status Projektu: Velder-soft

Poniżej znajduje się szczegółowy przegląd zaimplementowanych funkcji oraz plany na przyszły rozwój systemu.

## ✅ Zrealizowane Funkcje

### 🔐 Autoryzacja i Użytkownicy
- [x] Rejestracja i logowanie (Firebase Auth).
- [x] System ról: `DIRECTOR` oraz `EMPLOYEE`.
- [x] Ekran oczekiwania na akceptację konta przez Dyrektora.
- [x] Zarządzanie pracownikami (aktywacja kont, zmiana ról, usuwanie).
- [x] Profil użytkownika z ustawieniami godzin pracy.

### 📋 Zarządzanie Zadaniami (Tasks)
- [x] Kalendarz zadań.
- [x] Dodawanie zdjęć do zadań (dokumentacja wykonania).
- [x] Mechanizm "Przenoszenia zaległych zadań" na bieżący dzień.
- [x] Gesty swipe do oznaczania zadań jako wykonane.
- [x] Powiadomienia o liczbie zadań na dany dzień.

### 📁 Archiwum Projektów i Serwis
- [x] Struktura: Szpital > Oddział > Dokumentacja.
- [x] Przesyłanie plików PDF z projektami.
- [x] Galeria zdjęć z realizacji (Archiwum prac).
- [x] Rejestr zleceń serwisowych z raportami foto i komentarzami.

### 🏖️ System Urlopowy
- [x] Składanie wniosków o urlop (wybór zakresu dat).
- [x] Podgląd statusu wniosku (Oczekujący / Zaakceptowany / Odrzucony).
- [x] Panel Dyrektora do akceptacji wniosków wszystkich pracowników.

## 🛠️ Stan Techniczny
- [x] **Cross-platform:** Pełne wsparcie dla Web, Android oraz iOS.
- [x] **Refaktoryzacja:** Przejście na `styled-components` w celu unifikacji designu.
- [x] **Typizacja:** Wdrożenie TypeScript dla wszystkich kluczowych modułów.
- [x] **Stabilność:** Rozwiązanie problemów z inicjalizacją Firebase na urządzeniach iOS.

## 🚀 Nadchodzące Funkcje (Backlog)

### 📊 Statystyki i Raporty
- [ ] Generowanie raportów PDF z wykonanych prac serwisowych.
- [ ] Wykresy wydajności pracowników w panelu Dyrektora.

### 💬 Komunikacja
- [ ] Wewnętrzny czat dla pracowników w ramach konkretnego projektu.
- [ ] System powiadomień push dla nowych zleceń serwisowych.

### 🔧 Ulepszenia UX
- [ ] Tryb offline (lokalna baza danych SQL dla zadań).
- [ ] Wielojęzyczność (obecnie system jest w języku polskim).
