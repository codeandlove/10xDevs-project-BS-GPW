# Dokument wymagań produktu (PRD) - Black Swan Grid (GPW) - MASTER

## Spis treści

1. Przegląd produktu
2. Problem użytkownika
3. Wymagania funkcjonalne
4. Granice produktu (out of scope)
5. Historyjki użytkowników (wszystkie, testowalne)
6. Metryki sukcesu
7. Architektura danych i integracje
8. Cache i strategia rewalidacji
9. Bezpieczeństwo i autoryzacja
10. Testy, E2E i dane testowe
11. Backlog i priorytety implementacyjne
12. Nierozwiązane kwestie i rekomendacje

---

## 1. Przegląd produktu

Black Swan Grid (GPW) to webowa aplikacja desktopowa (MVP) przeznaczona dla inwestorów detalicznych i traderów krótkoterminowych, umożliwiająca szybkie identyfikowanie, przeglądanie i analizowanie historycznych anomalii cenowych spółek notowanych na GPW. Aplikacja prezentuje interaktywny, wirtualizowany grid (oś X: sesyjne daty, oś Y: tickery), gdzie każda komórka odpowiada pojedynczemu wystąpieniu zdarzenia (BLACK_SWAN_UP, BLACK_SWAN_DOWN, VOLATILITY_UP, VOLATILITY_DOWN, BIG_MOVE). Dla każdego zdarzenia aplikacja udostępnia pierwsze AI summary (generowane w workflow n8n → NocoDB) oraz możliwość przejścia do pełnego widoku z listą artykułów i dodatkowymi podsumowaniami.

Dane historyczne i AI summaries pochodzą bezpośrednio z NocoDB (Postgres), autoryzacja i zarządzanie użytkownikami odbywa się przez Supabase, a płatności obsługuje Stripe. Cache jest przechowywany wyłącznie na urządzeniu użytkownika (in-memory + LocalStorage) i rewalidowany przy każdym wejściu na stronę w modelu stale-while-revalidate.

## 2. Problem użytkownika

Inwestorzy detaliczni i krótkoterminowi traderzy nie mają szybkiego i zbiorczego miejsca do identyfikacji oraz wstępnej analizy nietypowych ruchów cenowych (np. kilkunastoprocentowe spadki/wzrosty w ciągu sesji). Obecne rozwiązania wymagają ręcznej analizy wykresów, newsów oraz komunikatów spółek, co jest czasochłonne i ryzykowne. Produkt ma umożliwić szybkie wyszukanie, zwizualizowanie i przegląd pierwszego wnioskowania AI dla zdarzeń, co przyspieszy analizę i decyzje użytkownika.

## 3. Wymagania funkcjonalne

3.1 Grid i interakcja

- Interaktywny grid: oś X = daty sesyjne (domyślnie ostatni tydzień), oś Y = tickery (~450). Zakresy: tydzień, miesiąc, kwartał/rok. (MVP: tydzień/miesiąc/kwartał)
- Widocznych domyślnie 10–25 wierszy; UI musi wspierać płynne przewijanie (virtualizacja).
- Kafelek: kolor wg typu zdarzenia, wyświetlony percent_change; puste kafelki gdy brak zdarzenia.
- Filtrowanie tickers, zapis preferencji filtra w LocalStorage.

  3.2 Sidebar i pełny widok

- Kliknięcie kafelka otwiera sidebar (33% szerokości) z następującymi informacjami: symbol, occurrence_date, typ eventu, percent_change, pierwsze AI summary, article_sentiment, identified_causes, recommended_action, link do źródłowego artykułu.
- Przycisk "więcej" przechodzi do pełnego widoku (pełna strona) z listą wszystkich AI summaries i artykułów dla wydarzenia; domyślnie pokazany jest pierwszy summary.
- Każde AI summary ma permalink i można je otworzyć jako samodzielny URL (dostęp chroniony).

  3.3 Dane i integracja

- Źródło danych: NocoDB API (tabele: GPW_historic_data, GPW_symbols, GPW_black_swans, GPW_AI_summary). Wszystkie URL do artykułów są absolutne i gotowe do renderu.
- Struktura rekordów (przykład): symbol, date (article), occurrence_date (YYYY-MM-DD), event_type, percent_change, summary, article_sentiment, identified_causes[], predicted_trend_probability, recommended_action, keywords[], source_article_url.
- Aplikacja nie duplikuje danych serwerowo — pełna prezentacja z NocoDB on-demand.

  3.4 Autoryzacja i subskrypcje

- Rejestracja i logowanie: Supabase.
- 7-dniowy trial uruchamiany automatycznie po rejestracji; pełny dostęp w okresie trial.
- Dostęp do grida i permalinków: tylko dla zalogowanych z aktywnym trialem/subskrypcją.
- Integracja Stripe (płatności), webhooki idempotentne; frontend pokazuje status subskrypcji.

  3.5 Cache klienta i rewalidacja

- Cache per-id i per-view: prefix `gpw:cache:v1:`; klucze `black_swans|id=<id>` i `grid|range=...|symbols=<csv>`.
- Mechanizm: in-memory + LocalStorage; odczyt natychmiast na mount; zawsze rewalidacja w tle (stale-while-revalidate). Metadane: updatedAt (ISO) + epoch ms.
- Eviction: prosty limit wpisów (sug. maxEntries = 200) z LRU metadata; specyfikacja limitu do potwierdzenia.
- Retry: 3 próby z exponential backoff dla fetchów; po wyczerpaniu pokaż przycisk "Odśwież".

  3.6 UX i dostępność

- Podstawowa dostępność: aria-labely, aria-expanded, obsługa nawigacji klawiaturą (strzałki/Enter do otwarcia sidebaru).
- Brak wymogu pełnego WCAG w MVP, ale podstawowe praktyki muszą być zastosowane.

  3.7 Permalink i deep linking

- Permalink format: `/summary/:id` lub URL parametry `?id=<id>&symbol=<sym>&date=<YYYY-MM-DD>`; przy wejściu niezalogowanego redirect do logowania z returnUrl. Po zalogowaniu powinno nastąpić przekierowanie na docelowy widok.

## 4. Granice produktu (co nie wchodzi w MVP)

- Brak możliwości edycji danych lub dodawania notatek przez użytkowników.
- Brak personalizowanych alertów (email/push) i zaawansowanych powiadomień.
- Brak integracji z rynkowym API w czasie rzeczywistym (tylko NocoDB historyczne dane).
- Brak rozszerzonych wizualizacji (correlation matrices, trend charts) w MVP.
- Brak pełnego panelu administracyjnego do zarządzania danymi/użytkownikami w MVP.
- Brak monitoringu (Sentry/Datadog) i server-side cache (Redis) w MVP — możliwe do dodania w przyszłości.

## 5. Historyjki użytkowników (pełna lista, testowalne)

Wszystkie historyjki ułożone i ponumerowane. Każda ma ID, tytuł, opis i kryteria akceptacji w formacie Given/When/Then.

US-001
Tytuł: Przegląd grida z domyślnym zakresem
Opis: Jako zalogowany użytkownik chcę zobaczyć grid z danymi za ostatni tydzień, aby szybko zidentyfikować wystąpienia anomalii dla widocznych tickerów.
Kryteria akceptacji:

- Given: użytkownik jest zalogowany i ma aktywną subskrypcję lub trial
- When: otwiera stronę grida
- Then: grid renderuje się i wyświetla domyślnie zakres ostatniego tygodnia
- Then: pierwsze wyświetlenie wykorzystuje dane z LocalStorage/in-memory jeśli dostępne
- Then: niezależnie od cache, aplikacja uruchamia rewalidację danych w tle
- Performance: pierwszy render widoku 1-tygodnia powinien być widoczny w < 1.5s

US-002
Tytuł: Zmiana zakresu czasu (tydzień/miesiąc/kwartał)
Opis: Jako użytkownik chcę zmienić zakres czasowy grida na miesiąc lub kwartał, aby przeanalizować dłuższe okresy.
Kryteria akceptacji:

- Given: użytkownik jest na stronie grida
- When: wybiera zakres miesiąc lub kwartał
- Then: grid odświeża widok i wczytuje dane dla wybranego zakresu
- Then: dane są pobierane z cache jeśli istnieją i rewalidowane w tle
- Then: virtualizacja obsługuje zakres i widoczność

US-003
Tytuł: Filtrowanie tickerów i zapis preferencji
Opis: Jako użytkownik chcę filtrować tickery i zapisać preferowane filtry w LocalStorage, aby szybciej wracać do interesujących mnie spółek.
Kryteria akceptacji:

- Given: użytkownik ustawia filtry tickers
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
- Then: domyślnie pokazany jest pierwszy summary; pozostałe są dostępne i sortowalne

US-006
Tytuł: Dostęp do permalinku wydarzenia
Opis: Jako użytkownik chcę mieć permalink do konkretnego AI summary, aby móc go otworzyć bezpośrednio lub udostępnić innym (jeśli mają dostęp).
Kryteria akceptacji:

- Given: istnieje wydarzenie z unikalnym identyfikatorem
- When: użytkownik otwiera URL `/summary/:id` będąc zalogowanym
- Then: docelowy sidebar/event jest załadowany
- Given: użytkownik nie jest zalogowany
- When: otwiera permalink
- Then: redirect do logowania z returnUrl; po zalogowaniu przekierowanie do docelowego permalinku
- Security: dostęp wymaga aktywnej subskrypcji/trial; inaczej redirect do płatności

US-007
Tytuł: Rejestracja i 7-dniowy trial
Opis: Jako nowy użytkownik chcę się zarejestrować i otrzymać 7-dniowy trial z pełnym dostępem do funkcji MVP.
Kryteria akceptacji:

- Given: użytkownik rejestruje konto
- When: rejestracja zakończona sukcesem
- Then: status konta zawiera informację o rozpoczętym 7-dniowym trialu
- Then: middleware rozpoznaje trial jako aktywną subskrypcję przez 7 dni

US-008
Tytuł: Logowanie i ochrona zasobów
Opis: Jako zarejestrowany użytkownik chcę się logować i mieć dostęp do grida oraz permalinków tylko jeśli mam aktywną subskrypcję/trial.
Kryteria akceptacji:

- Given: użytkownik próbuje uzyskać dostęp do grida lub permalinku
- When: nie jest zalogowany lub nie ma aktywnej subskrypcji
- Then: redirect do logowania lub płatności
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
- Konwersja trial -> paid: cel biznesowy do zdefiniowania (sugerować 3-5% w pierwszych miesiącach jako punkt odniesienia).
- Dostępność podstawowa: wszystkie interaktywne elementy mają aria-label i obsługę klawiatury.

## 7. Architektura danych i integracje

7.1 Źródła danych

- NocoDB (Postgres) — główne źródło danych: GPW_historic_data, GPW_symbols, GPW_black_swans, GPW_AI_summary.
- Supabase — uwierzytelnianie i zarządzanie użytkownikami, przechowywanie informacji o subskrypcjach (może być synchronizowane z Stripe).
- Stripe — płatności i webhooki.

  7.2 Format danych (przykład odpowiedzi GPW_AI_summary)
  {
  "symbol": "CPD",
  "date": "2025-05-09 13:55",
  "occurrence_date": "2025-05-23",
  "event_type": "VOLATILITY_UP",
  "percent_change": 16.48,
  "summary": "...",
  "article_sentiment": "neutral",
  "identified_causes": ["..."],
  "predicted_trend_probability": {"further_decline":0.2,"recovery":0.8},
  "recommended_action": {"action":"BUY","justification":"..."},
  "keywords": ["..."],
  "source_article_url": "https://..."
  }

  7.3 API integration notes

- MVP pobiera dane bezpośrednio z NocoDB API z klienta; opcjonalny server-side proxy (low priority) możliwy w przyszłości do ochrony kluczy i kontroli ruchu.
- Walidacja parametrów po stronie klienta i (jeśli proxy) po stronie serwera z zod.

## 8. Cache i strategia rewalidacji

8.1 Klucze cache

- Prefix: gpw:cache:v1:
- Per-summary: gpw:cache:v1:black_swans|id=<id>
- Per-view: gpw:cache:v1:grid|range=<range>|symbols=<csv>

  8.2 Zachowanie

- Odczyt z in-memory (preferowany) -> fallback LocalStorage -> initial UI render
- Zawsze background fetch do NocoDB w celu rewalidacji danych po mount
- Retry: 3 próby z exponential backoff
- Eviction: maxEntries = 200 (sugestia) + LRU metadata; politykę rozmiaru do doprecyzowania

  8.3 Uwagi operacyjne

- Ponieważ n8n publikuje nowe dane codziennie ok. 20:00, aplikacja powinna rewalidować po każdej wizycie; brak serwerowego procesu invalidacji w MVP (cache tylko na kliencie).

## 9. Bezpieczeństwo i autoryzacja

- Wszystkie zasoby grida i permalinki wymagają zalogowania i aktywnej subskrypcji/trial (middleware Supabase).
- Stripe webhooky idempotentne; logika weryfikacji płatności i aktualizacja statusu subskrypcji w Supabase.
- Jeśli wdrożony proxy: używać server-side service role key i chronić go przed wyciekiem.
- PII minimalne; umożliwić usunięcie konta (GDPR-ready).

## 10. Testy, E2E i dane testowe

- E2E framework: Playwright (preferowany).
- Scenariusze E2E: rejestracja -> trial -> grid -> klik w kafelek -> sidebar -> permalink -> logout -> redirect.
- Testy integracyjne: fetch z NocoDB (on-demand). W razie potrzeby utworzyć mock JSON w `scripts/test-data/` dla stabilnych testów.
- Manualne testy UX: przewijanie 450 tickerów, brak AI summary, brak wydarzenia, permalink nieistniejący, wygaśnięta subskrypcja.

## 11. Backlog i priorytety implementacyjne (pierwsze PRy)

Priorytet HIGH (MVP core):

- `src/middleware/index.ts`: session check Supabase + subscription status
- `src/components/hooks/useClientCache.ts` i `src/lib/cache.ts`: in-memory + LocalStorage + revalidate-on-mount + retry + eviction
- `src/components/Grid/*`: react-window implementation, cell rendering, filters
- `src/components/Sidebar/*` + `src/pages/summary/[id].astro`: sidebar + full view + permalink guard
- Auth flows: registration, login, trial logic (Supabase + Stripe hooks)

Priorytet MEDIUM:

- API proxy `src/pages/api/nocodb/*` (opcjonalne)
- Prefetch minimal payload for permalink
- Tests: Playwright E2E basic flows

Priorytet LOW:

- Monitoring (Sentry), server-side cache (Redis), admin panel, rozszerzone wizualizacje

## 12. Nierozwiązane kwestie i rekomendacje

1. Rate limiting i decyzja o server-proxy: rozważyć wprowadzenie proxy w miarę wzrostu ruchu; domyślnie 60 req/min jeśli zaimplementowane.
2. Dokładna polityka eviction (maxEntries i rozmiar w MB): proponować 200 wpisów; do potwierdzenia z zespołem QA.
3. Monitoring/observability: Sentry/Datadog do rozważenia po pierwszym release; MVP bez nich.
4. Możliwość dodania confidence_score w AI summaries (n8n): rekomendowane w roadmapie aby lepiej sortować podsumowania.
5. UX fallback podczas okna aktualizacji n8n (19:00-20:30): użytkownik zrezygnował z wymuszania banneru; aplikacja i tak rewaliduje przy wejściu po workflow.

---

Lista kontrolna po PRD:

- Każdą historię użytkownika można przetestować (kryteria akceptacji opisane w formie Given/When/Then).
- Kryteria akceptacji są konkretne i mierzalne tam, gdzie to możliwe.
- Zawartość historyjek obejmuje scenariusze podstawowe, alternatywne i skrajne (puste kafelki, brak AI summary, nieistniejący permalink, wygaśnięta subskrypcja).
- Uwzględniono wymagania uwierzytelniania i autoryzacji (Supabase, middleware, trial, stripe).
