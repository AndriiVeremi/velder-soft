# Dokumentacja Techniczna Velder-soft

## 🚀 System Błyskawicznych Aktualizacji (OTA)

Dzięki usłudze **Expo Updates**, możesz aktualizować aplikację na telefonach pracowników bez konieczności tworzenia nowego pliku APK.

### Jak wysłać aktualizację:

1. Wprowadź zmiany w kodzie.
2. Zaktualizuj wersję w `app.json` (opcjonalnie).
3. Uruchom komendę:
   ```bash
   npx eas update --branch preview --message "Opis zmian"
   ```
4. Pracownicy otrzymają nową wersję po ponownym uruchomieniu aplikacji.

---

## 🏛 Architektura i UI

### Menu Mobilne (Rule 4+1)

Zaimplementowano hybrydowy system nawigacji:

- Pierwsze 4 elementy z definicji `sections` w `Layout.tsx` są renderowane jako stałe ikony w `BottomTabs`.
- Pozostałe elementy są przenoszone do komponentu `MoreMenuOverlay` (Modal), który jest wywoływany przyciskiem "Menu".

### Obsługa PDF (Cross-platform)

- **Web:** Standardowe `window.open`.
- **Mobile:** Wykorzystano `expo-file-system/legacy` do pobrania pliku do pamięci podręcznej (`cacheDirectory`), a następnie `expo-sharing` do otwarcia w systemowej przeglądarce dokumentów. Zapewnia to ominięcie restrykcji CORS w Firebase Storage.

### Automatyzacja Urlopów

- **Licznik (Countdown):** Obliczany dynamicznie w `useMemo`. Widoczność ograniczona do okna 5-dniowego przed datą `startDate`.
- **Przypomnienia:** Podczas ładowania listy `APPROVED` wniosków, system lokalnie planuje powiadomienia za pomocą `Notifications.scheduleNotificationAsync` z precyzyjним wyliczeniem daty (T-5 i T-1).

---

## 💾 Model Danych (Firestore)

- **users:** profil, role, stan aktywności.
- **tasks:** wspólna pula zadań (płaska struktura).
- **announcements:** komunikaty z real-time snapshot listenerem.
- **vacations:** wnioski z metadanymi `userName` dla łatwego sortowania in-memory.
- **services:** zlecenia z obsługą godzin (`serviceTime`).
