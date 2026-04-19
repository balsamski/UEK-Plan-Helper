# 📅 UEK Plan Helper

Proste rozszerzenie do przeglądarki Chrome, które ułatwia korzystanie z planu zajęć Uniwersytetu Ekonomicznego w Krakowie (system Apollo). Pozwala na szybkie filtrowanie zajęć po sali, przedmiocie lub grupie, automatycznie obsługując przy tym skomplikowaną strukturę tabeli (uwagi, przeniesienia zajęć).

## 🚀 Instrukcja instalacji (Lokalna)

Ponieważ dodatek jest w wersji deweloperskiej, instaluje się go bezpośrednio z plików na komputerze:

1. **Pobierz pliki**: Upewnij się, że masz wszystkie pliki rozszerzenia w jednym folderze (np. `uek-plan-helper`). Powinny się tam znajdować:
   - `manifest.json`
   - `content.js`
   - `style.css`

2. **Otwórz menedżer rozszerzeń**:
   - Uruchom przeglądarkę Google Chrome.
   - W pasku adresu wpisz: `chrome://extensions/` i naciśnij Enter.

3. **Włącz Tryb Programisty**:
   - W prawym górnym rogu ekranu przesuń suwak przy napisie **Tryb programisty** (Developer mode) w pozycję aktywną.

4. **Załaduj dodatek**:
   - Kliknij przycisk **Załaduj rozpakowane** (Load unpacked), który pojawi się po lewej stronie.
   - W oknie wyboru folderu znajdź i wybierz folder, w którym zapisałeś pliki dodatku.

5. **Gotowe!**: Dodatek powinien pojawić się na liście Twoich rozszerzeń. Teraz wejdź na stronę swojego planu na UEK, a nad tabelą zobaczysz panel wyszukiwania.

## 🛠️ Funkcje
* **Dynamiczne filtrowanie**: Wpisz numer sali (np. "117"), nazwę przedmiotu lub kod grupy, aby natychmiast ukryć pozostałe wiersze.
* **Inteligentne grupowanie**: Dodatek rozumie strukturę tabeli UEK – filtrując zajęcia, nie gubi przypisanych do nich "uwag" (np. informacji o grupach dziekańskich).
* **Czysty interfejs**: Minimalistyczny panel, który nie zasłania treści planu.

## 💡 Jak aktualizować?
Jeśli wprowadzisz zmiany w kodzie (np. w pliku `content.js`), wróć do strony `chrome://extensions/` i kliknij **ikonę odświeżania** (zakręcona strzałka) na kafelku dodatku, a następnie odśwież stronę z planem zajęć.

---
*Projekt stworzony na potrzeby ułatwienia życia studentom UEK.*