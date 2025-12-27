# Dokument wymagań produktu (PRD) - Black Swan Grid (GPW)

## 1. Przegląd produktu

Black Swan Grid (GPW) to webowa aplikacja desktopowa (MVP) przeznaczona dla inwestorów detalicznych i traderów krótkoterminowych, umożliwiająca szybkie identyfikowanie i analizowanie nietypowych ruchów cenowych spółek notowanych na GPW. Aplikacja prezentuje interaktywny grid (oś X: daty sesyjne, oś Y: tickery) z oznaczonymi zdarzeniami (np. BLACK_SWAN_UP, BLACK_SWAN_DOWN, VOLATILITY_UP). Kliknięcie w komórkę otwiera panel boczny z pierwszym podsumowaniem AI (pochodzącym z workflow n8n → NocoDB). Dane historyczne i AI summaries pochodzą z NocoDB; autoryzacja użytkowników i logika subskrypcji wykorzystuje Supabase i Stripe. Cache znajduje się wyłącznie po stronie klienta (in-memory + LocalStorage) i jest rewalidowany przy każdym wejściu na stronę (stale-while-revalidate).

## 2. Problem użytkownika

Inwestorzy detaliczni i krótkoterminowi traderzy na GPW mają trudność z szybkim odnajdywaniem i analizą nietypowych zdarzeń cenowych (gwałtowne wzrosty/spadki/zmienność). Dane są rozproszone (wykresy, komunikaty, artykuły), co wydłuża analizę i zwiększa ryzyko przegapienia istotnych informacji. Użytkownik potrzebuje jednego, szybkiego i interaktywnego widoku, który zbiera wystąpienia anomalii historycznie, udostępnia krótkie AI podsumowania i pozwala na szybkie przejście do szczegółów.

## 3. Wymagania funkcjonalne

3.1. Grid interaktywny

- Wyświetla oś X — daty sesyjne; oś Y — tickery (~450 spółek). Domyślnie zakres: ostatni tydzień (5 dni sesyjnych). Użytkownik może zmienić zakres na tydzień, miesiąc, kwartał/rok.
- Komórka reprezentuje zdarzenie (jeśli występuje): kolor wg typu zdarzenia, procent zmiany kursu widoczny w kafelku.
- Grid wirtualizowany (react-window), domyślnie widocznych 10–25 wierszy; lazy-load danych historycznych tylko dla widocznych spółek.
- Filtrowanie tickers (możliwość zapisu preferowanych filtrów w LocalStorage).

  3.2. Panel boczny i pełen widok

- Kliknięcie komórki otwiera boczny panel (33% szerokości) z pierwszym AI summary, datą, typem zdarzenia, percent_change oraz linkami do artykułów.
- Przycisk "więcej" rozwija pełny widok (pełna strona) zawierający wszystkie powiązane artykuły i pozostałe podsumowania AI (może wystąpić wiele dla jednego wystąpienia).
- Każde podsumowanie posiada permalink (parametry: id, symbol, occurrence_date) i jest dostępne tylko dla zalogowanych użytkowników z aktywną subskrypcją lub w okresie trial.

  3.3. Dane i integracja z NocoDB

- Dane odczytywane bezpośrednio z NocoDB (tabele: GPW_historic_data, GPW_symbols, GPW_black_swans, GPW_AI_summary).
- Formularz odpowiedzi/structure: symbol, date (article date), occurrence_date (YYYY-MM-DD), event_type, percent_change, summary, article_sentiment, identified_causes[], predicted_trend_probability, recommended_action, keywords[], source_article_url.
- Aplikacja nie kopiuje danych serwerowo; jedynie prezentuje wyniki i przechowuje dane użytkownika.

  3.4. Autoryzacja i subskrypcje

- Logowanie i rejestracja użytkowników za pomocą Supabase.
- 7-dniowy trial przy rejestracji, pełny dostęp do funkcji MVP w okresie trial.
- Sprawdzenie statusu subskrypcji w middleware (`src/middleware/index.ts`); dostęp do grida i permalinków tylko dla zalogowanych z aktywną subskrypcją/trial.
- Integracja z Stripe do obsługi płatności (miesięczne/roczne subskrypcje); webhooki idempotentne.

  3.5. Client-side cache i strategia rewalidacji

- Cache wyłącznie na urządzeniu użytkownika: in-memory + LocalStorage, prefix `gpw:cache:v1:`.
- Klucze: per-id dla summaries (`gpw:cache:v1:black_swans|id=<id>`) oraz per-view dla grida (`gpw:cache:v1:grid|range=week|symbols=<csv>`).
- Zachowanie: natychmiastowe zwrócenie cache (jeśli dostępne), zawsze rewalidacja przy montażu (stale-while-revalidate). Cache przechowuje metadane updatedAt (ISO) oraz epoch ms.
- Eviction: prosty limit wpisów (sugerowany maxEntries = 200) z LRU metadata; polityka do doprecyzowania.

  3.6. Odporność i UX błędów

- Retry fetch: 3 próby z exponential backoff; po wyczerpaniu prób pokazanie komunikatu i przycisku "Odśwież".
- Brak AI_summary: placeholder w bocznym panelu z możliwością retry i informacją "Brak podsumowania AI — spróbuj później".
- Obsługa błędów sieciowych i zwracanie czytelnych komunikatów użytkownikowi.

  3.7. Dostępność i nawigacja

- Podstawowa dostępność: obsługa klawiatury, aria-label, aria-expanded dla sidebaru, focus management.

  3.8. Permalink i deep linking

- Każde podsumowanie ma permalink `/summary/:id` (może używać composite id+symbol+occurrence_date); przy wejściu niezalogowanego redirect do logowania z returnUrl.

## 4. Granice produktu (co nie wchodzi w MVP)

4.1. Wykluczone funkcje

- Brak możliwości edycji danych lub dodawania notatek przez użytkownika.
- Brak personalizowanych alertów (email/push) i powiadomień.
- Brak integracji z zewnętrznymi API giełdowymi w czasie rzeczywistym (tylko dane historyczne z NocoDB).
- Brak zaawansowanych wizualizacji (wykresy trendów, korelacje między spółkami w MVP).
- Brak wersji mobilnej lub PWA (desktop/web tylko).
- Brak panelu administracyjnego do zarządzania użytkownikami lub danymi.
- Brak rekomendacji inwestycyjnych wykraczających poza summary AI generowane przez n8n.
- Brak implementacji monitoringu/observability (Sentry/Datadog) i server-side cache (Redis) w MVP.

## 5. Historyjki użytkowników

Wszystkie historyjki poniżej posiadają unikalne ID, opis i kryteria akceptacji — tak, aby były testowalne.

US-001
Tytuł: Przegląd grida z domyślnym zakresem
Opis: Jako zalogowany użytkownik chcę zobaczyć grid z danymi za ostatni tydzień, aby szybko zidentyfikować wystąpienia anomalii dla widocznych tickerów.
Kryteria akceptacji:

- Given: użytkownik jest zalogowany i ma aktywną subskrypcję lub trial
- When: otwiera stronę grida
- Then: grid renderuje się i wyświetla domyślnie zakres ostatniego tygodnia
- Then: pierwsze wyświetlenie wykorzystuje dane z LocalStorage/in-memory jeśli dostępne
- Then: niezależnie od cache, aplikacja uruchamia rewalidację danych w tle
- Performance: pierwszy render widoku 1-tygodnia powinien być widoczny w < 1.5s na typowym środowisku testowym

US-002
Tytuł: Zmiana zakresu czasu (tydzień/miesiąc/kwartał)
Opis: Jako użytkownik chcę zmienić zakres czasowy grida na miesiąc lub kwartał, aby przeanalizować dłuższe okresy.
Kryteria akceptacji:

- Given: użytkownik jest na stronie grida
- When: wybiera zakres miesiąc lub kwartał
- Then: grid odświeża widok i wczytuje dane dla wybranego zakresu
- Then: dane są pobierane z cache jeśli istnieją i rewalidowane w tle
- Then: liczba widocznych wierszy pozostaje zgodna z ustawionym widokiem (virtualizacja obsługuje zakres)

US-003
Tytuł: Filtrowanie tickerów i zapis preferencji
Opis: Jako użytkownik chcę filtrować tickery i zapisać preferowane filtry w LocalStorage, aby szybciej wracać do interesujących mnie spółek.
Kryteria akceptacji:

- Given: użytkownik ustawia filtry tickers (np. lista wybranych symboli)
- When: zapisuje ustawienia filtrów
- Then: preferencje są zapisane w LocalStorage pod kluczem gpw:filters:v1
- Then: po odświeżeniu strony preferencje są przywrócone i grid wyświetla wybrane tickery

US-004
Tytuł: Otwarcie sidebaru z AI summary
Opis: Jako użytkownik chcę kliknąć w kafelek zdarzenia i zobaczyć boczny panel z pierwszym AI summary i powiązanymi artykułami.
Kryteria akceptacji:

- Given: w kafelku istnieje zdarzenie
- When: użytkownik kliknie kafelek
- Then: sidebar otwiera się (33% szerokości) i wyświetla: symbol, occurrence_date, typ zdarzenia, percent_change, pierwsze AI summary oraz linki do artykułów
- Then: sidebar ładuje dane natychmiast z cache jeśli dostępne i rewaliduje w tle
- Then: jeśli brak AI summary, pokazuje placeholder i przycisk "Odśwież"

US-005
Tytuł: Rozwinięcie pełnego widoku wydarzenia
Opis: Jako użytkownik chcę przejść do pełnego widoku wydarzenia, aby przeczytać wszystkie AI summaries i artykuły powiązane z tym zdarzeniem.
Kryteria akceptacji:

- Given: sidebar jest otwarty
- When: użytkownik kliknie "więcej"
- Then: aplikacja przechodzi do pełnego widoku (pełna strona) i wyświetla listę wszystkich AI summaries oraz artykułów powiązanych z eventem
- Then: domyślnie pokazany jest pierwszy summary; pozostałe są dostępne i sortowalne (np. po dacie)

US-006
Tytuł: Dostęp do permalinku wydarzenia
Opis: Jako użytkownik chcę mieć permalink do konkretnego AI summary, aby móc go otworzyć bezpośrednio lub udostępnić innym (jeśli mają dostęp).
Kryteria akceptacji:

- Given: istnieje wydarzenie z unikalnym identyfikatorem (id, symbol, occurrence_date)
- When: użytkownik otwiera URL `/summary/:id` będąc zalogowanym
- Then: docelowy sidebar/event jest załadowany
- Given: użytkownik nie jest zalogowany
- When: otwiera permalink
- Then: następuje redirect do strony logowania z parametrem returnUrl; po zalogowaniu użytkownik jest kierowany do docelowego permalinku
- Security: dostęp do permalinku wymaga aktywnej subskrypcji lub trial; w przeciwnym razie użytkownik jest kierowany do strony płatności/bloku

US-007
Tytuł: Rejestracja i 7-dniowy trial
Opis: Jako nowy użytkownik chcę się zarejestrować i otrzymać 7-dniowy trial z pełnym dostępem do funkcji MVP.
Kryteria akceptacji:

- Given: użytkownik rejestruje konto
- When: rejestracja zakończona sukcesem
- Then: status konta zawiera informację o rozpoczętym 7-dniowym trialu i pełnym dostępie
- Then: middleware rozpoznaje trial jako aktywną subskrypcję przez 7 dni

US-008
Tytuł: Logowanie i ochrona zasobów
Opis: Jako zarejestrowany użytkownik chcę się logować i mieć dostęp do grida oraz permalinków tylko jeśli mam aktywną subskrypcję/trial.
Kryteria akceptacji:

- Given: użytkownik próbuje uzyskać dostęp do grida lub permalinku
- When: nie jest zalogowany lub nie ma aktywnej subskrypcji
- Then: przekierowanie do strony logowania lub płatności
- When: jest zalogowany i ma aktywny trial/subskrypcję
- Then: dostęp przyznany

US-009
Tytuł: Zachowanie cache i rewalidacja przy wejściu
Opis: Jako użytkownik chcę, aby aplikacja natychmiast pokazywała zapisane dane z LocalStorage/in-memory, a następnie rewalidowała dane w tle przy wejściu na stronę.
Kryteria akceptacji:

- Given: LocalStorage zawiera dane dla grida lub summary
- When: użytkownik otwiera stronę
- Then: dane z cache wyświetlane natychmiast
- Then: aplikacja wywołuje fetch do NocoDB w tle i aktualizuje cache oraz UI po otrzymaniu świeżych danych

US-010
Tytuł: Retry i komunikacja błędów
Opis: Jako użytkownik chcę widzieć czytelne komunikaty błędów i mieć możliwość ręcznego odświeżenia po wyczerpaniu retry.
Kryteria akceptacji:

- Given: fetch danych nie powiódł się po 3 próbach
- When: użytkownik widzi komunikat błędu w UI
- Then: przycisk "Odśwież" jest dostępny i inicjuje ponowną próbę fetch

US-011
Tytuł: Obsługa pustych komórek
Opis: Jako użytkownik chcę widzieć puste kafelki gdy dla danej spółki nie ma zdarzeń, aby rozpoznać brak aktywności.
Kryteria akceptacji:

- Given: brak zdarzeń dla spółki w danym dniu
- When: grid renderuje kafelki
- Then: kafelek jest pusty/neutralny (bez percent_change) i dobrze widoczny

US-012
Tytuł: Nawigacja klawiaturowa i podstawowa dostępność
Opis: Jako użytkownik korzystający z klawiatury chcę poruszać się po gridzie i otwierać sidebar bez użycia myszy.
Kryteria akceptacji:

- Given: focus na gridzie
- When: użytkownik używa klawiszy strzałek do poruszania się i Enter do otwarcia sidebar
- Then: sidebar otwiera się i fokusuje na pierwszym elemencie treści
- Then: aria-label oraz aria-expanded są obecne dla elementów interaktywnych

US-013
Tytuł: Przypadek: brak AI summary dla wydarzenia
Opis: Jako użytkownik otwierający wydarzenie, które nie ma AI summary chcę zobaczyć jasny placeholder i opcję retry.
Kryteria akceptacji:

- Given: event nie ma powiązanego AI summary
- When: użytkownik otwiera sidebar
- Then: wyświetlany jest komunikat "Brak podsumowania AI — spróbuj później" oraz przycisk "Odśwież"

US-014
Tytuł: Obsługa nieistniejącego permalinku
Opis: Jako użytkownik otwierający permalink do nieistniejącego id chcę otrzymać komunikat o błędzie i możliwość powrotu do grida.
Kryteria akceptacji:

- Given: permalink zawiera nieistniejące id
- When: użytkownik otwiera URL
- Then: aplikacja wyświetla komunikat "Wydarzenie nie znalezione" oraz przycisk "Powrót do grida"

US-015
Tytuł: Udostępnianie permalinku (bez uprawnień)
Opis: Jako użytkownik chcę udostępnić permalink innej osobie, która nie ma dostępu, i aby po otwarciu została poproszona o logowanie/płatność.
Kryteria akceptacji:

- Given: użytkownik wysyła permalink innej osobie
- When: adresat otwiera link i nie ma dostępu
- Then: zostaje przekierowany do logowania z returnUrl, a po zalogowaniu lub opłaceniu subskrypcji zobaczy treść

US-016
Tytuł: Zapisywanie ostatniego widoku
Opis: Jako użytkownik chcę, aby aplikacja zapamiętała ostatni widok (zakres, filtry) i przywróciła go przy ponownym wejściu.
Kryteria akceptacji:

- Given: użytkownik ustawił zakres i filtry
- When: wraca do aplikacji (ta sama przeglądarka)
- Then: aplikacja przywraca zapisany zakres i filtry z LocalStorage

US-017
Tytuł: Logika blokady po wygaśnięciu subskrypcji
Opis: Jako użytkownik, którego subskrypcja wygasła, chcę zostać przekierowany do strony płatności i nie mieć dostępu do grida do czasu odnowienia.
Kryteria akceptacji:

- Given: subskrypcja użytkownika wygasła
- When: próbuje uzyskać dostęp do grida lub permalinku
- Then: zostaje przekierowany do strony płatności z informacją o konieczności odnowienia

US-018
Tytuł: Prefetch minimalnego payloadu dla permalinku
Opis: Jako użytkownik otwierający permalink oczekuję, że minimalny payload (first summary + minimal historic) załaduje się szybko, a reszta treści dopracuje się lazy.
Kryteria akceptacji:

- Given: użytkownik otwiera permalink
- When: strona się ładuje
- Then: first summary i minimalne dane historyczne są dostępne w <= 1.5s (jeśli cache nie blokuje)
- Then: pełna lista artykułów ładuje się asynchronicznie

US-019
Tytuł: Ochrona endpointów API (opcjonalny proxy)
Opis: Jako developer chcę mieć opcję proxy dla NocoDB API z rate limiting, aby zabezpieczyć klucze i kontrolować ruch.
Kryteria akceptacji:

- Given: implementacja proxy
- When: użytkownik wykonuje żądanie przez proxy
- Then: proxy waliduje parametry (zod) i stosuje limit (domyślnie 60 req/min), zwraca 429 z Retry-After przy przekroczeniu
- Then: proxy używa service role key po stronie serwera (bez wycieków)

US-020
Tytuł: Scenariusz skrajny: duża liczba tickers
Opis: Jako użytkownik przeglądający pełną listę 450 tickerów chcę, aby aplikacja pozostała responsywna dzięki wirtualizacji i lazy-load.
Kryteria akceptacji:

- Given: grid zawiera 450 tickerów
- When: użytkownik przewija pionowo
- Then: UI pozostaje responsywny (scroll płynny), ładowanie danych następuje dla widocznych wierszy

## 6. Metryki sukcesu

- Czas pierwszego renderu grida (zakres 1 tydzień): docelowo < 1.5s na typowym środowisku testowym.
- Sidebar success rate: > 99% kliknięć w kafelek powinno otworzyć sidebar i załadować pierwsze summary bez błędów.
- Cache hit rate (client-side) dla powtarzających się sesji: > 80%.
- Error rate przy pobieraniu z NocoDB: < 1% (monitoring/logi).
- Konwersja trial -> paid: metryka biznesowa do zdefiniowania (w PRD zaproponować cel w dalszych iteracjach).
- Dostępność podstawowa: wszystkie interaktywne elementy mają aria-label i obsługę klawiatury.

---

Lista kontrolna po PRD:

- Każdą historię użytkownika można przetestować (kryteria akceptacji opisane w formie Given/When/Then).
- Kryteria akceptacji są konkretne i mierzalne tam, gdzie to możliwe.
- Zawartość historyjek obejmuje scenariusze podstawowe, alternatywne i skrajne (puste kafelki, brak AI summary, nieistniejący permalink, wygaśnięta subskrypcja).
- Uwzględniono wymagania uwierzytelniania i autoryzacji (Supabase, middleware, trial, stripe).
