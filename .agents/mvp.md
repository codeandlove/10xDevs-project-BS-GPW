### Główny problem

Inwestorzy detaliczni oraz osoby zajmujące się krótkoterminowym handlem na GPW nie mają łatwego sposobu, aby **szybko identyfikować i analizować nietypowe ruchy cenowe** (np. spadki lub wzrosty o kilkanaście procent w ciągu dnia).  
Obecnie dane są rozproszone — trzeba samodzielnie analizować wykresy, newsy branżowe i komunikaty spółek.  
Projekt rozwiązuje ten problem poprzez stworzenie **jednego, interaktywnego miejsca**, które wizualizuje wszystkie historyczne wystąpienia anomalii (tzw. „Black Swan Events”) i pozwala użytkownikowi błyskawicznie zobaczyć:

- kiedy wystąpiło zdarzenie,
- jakiego było typu (wzrost/spadek/zmienność),
- oraz jakie mogły być jego przyczyny na podstawie automatycznej analizy AI artykułów branżowych pochodzących z odrębnego źródła (workflow w n8n który za pomocą AI interpretuje pozyskane informacje i tworzy raport).

Dzięki temu inwestor zyskuje **intuicyjny wgląd w zachowania rynkowe spółek**, co może stanowić podstawę do budowania własnych strategii tradingowych lub oceny ryzyka.

---

### Najmniejszy zestaw funkcjonalności

- **Interaktywny grid (główna funkcja MVP)**:
  - Oś X: daty (dni sesyjne, przewijane w lewo/prawo).
  - Oś Y: tickery spółek (możliwość przewijania i filtrowania po indeksach, np. WIG20, mWIG40, sWIG80).
  - Komórka (kafelek) prezentuje pojedyncze wystąpienie z danymi:
    - kolor powiązany z typem zdarzenia (BLACK_SWAN_UP, BLACK_SWAN_DOWN, VOLATILITY_UP, VOLATILITY_DOWN, BIG_MOVE),
    - procent zmiany kursu.
  - Kliknięcie w komórkę otwiera panel boczny ze szczegółami zdarzenia.
  - Domyślnie grid prezentuje dane z bieżącego tygodnia (ostatnie 5 dni sesyjnych).
  - Użytkownik może zmienić zakres czasowy (tydzień, miesiąc, rok) oraz inne dodatkowe filtry.
- **Panel boczny (AI Summary)**:
  - Skrótowa analiza AI opisująca potencjalne przyczyny ruchu cenowego.
  - Możliwość rozwinięcia panelu na pełen widok i przegląd pozostałych artykułów powiązanych z tym wystąpieniem.
- **Integracja z API (NocoDB)**:
  - Pobieranie danych z tabel:
    - `GPW_historic_data` – dane historyczne notowań,
    - `GPW_symbols` – lista tickerów,
    - `GPW_black_swans` – wystąpienia ekstremalnych zdarzeń,
    - `GPW_AI_summary` – streszczenia AI dla poszczególnych wystąpień.
  - Dane ładowane automatycznie po wejściu na stronę.
- **Autoryzacja i subskrypcja**:
  - Logowanie i rejestracja użytkowników.
  - Integracja z prostym systemem płatności (np. Stripe).
  - Dostęp do aplikacji wyłącznie dla zalogowanych i aktywnych subskrybentów.
  - 7-dniowy dostęp demo dla nowych zalogowanych użytkowników.
- **Minimalny Dashboard użytkownika**:
  - Konfiguracja konta: zmiana hasła, usunięcie konta.
  - Subskrypcja - stan subskrypcji (do kiedy jest ważna)
  - Płatność - umożliwia ze skorzystania z integracji ze stripe do poprowadzenia płatności za miesięczną lub roczną subskrypcje
  - Ekran blokady/blokada konta po upływie terminu opłaty subskrypcji: np po 7 dniowym okresie próbnym, lub miesięcznym/rocznym opłaconym okresie gdy dobiegnie już końca.

---

### Co NIE wchodzi w zakres MVP

- Brak możliwości edycji danych lub dodawania własnych notatek użytkownika.
- Brak personalizowanych alertów, powiadomień e-mail lub push.
- Brak integracji z zewnętrznymi API giełdowymi w czasie rzeczywistym (tylko dane historyczne z NocoDB).
- Brak zaawansowanych wizualizacji (np. wykresy trendów, korelacje między spółkami).
- Brak wersji mobilnej lub PWA (tylko desktop/web).
- Brak panelu administracyjnego do zarządzania użytkownikami lub danymi.
- Brak rekomendacji inwestycyjnych wykraczających poza te wygenerowane przez AI w workflow n8n.

---

### Kryteria sukcesu

- ✅ Użytkownik może intuicyjnie poruszać się po gridzie (poziomo – daty, pionowo – spółki) w lekki i płynny sposób.
- ✅ Kliknięcie w dowolny kafelek otwiera szczegółowy opis AI bez błędów w ładowaniu danych.
- ✅ Grid poprawnie pobiera dane z API NocoDB i aktualizuje się zgodnie z cyklem dobowym lub interakcją na działanie użytkownika.
- ✅ Aplikacja działa płynnie dla zakresu co najmniej 1 tygodnia, 1 miesiąca, 1 roku danych i wczytuje je tylko dla widocznych aktualnie w gridzie spółek.
- ✅ Wczytane dane pozostają w pamięci/kontekście aplikacji aby nie musiały być pobierane przy każdej wizycie.
- ✅ System logowania i subskrypcji działa na podstawie integracji z supabase oraz stripe (użytkownik z aktywną płatnością ma dostęp do grida).
