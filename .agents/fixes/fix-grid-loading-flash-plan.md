# Plan Naprawy Bledu - grid-loading-flash

Data utworzenia: 2026-03-04
Tytul bledu: Migotanie gridu podczas ładowania - widoczny skok z małego (week) do dużego widoku
Severity: MEDIUM
Typ bledu: UI

## 1. Podsumowanie wykonawcze

### 1.1. Opis bledu

Po usunięciu logiki "smart initialization" (commit `5d2168f`) grid wyświetla się w dwóch widocznych fazach: najpierw mały widok ograniczony do zakresu tygodnia (4 tickery, 9 kolumn dat), następnie po chwili pojawia się właściwy widok z pełnym zakresem danych (14+ tickerów, wiele kolumn dat). Skok jest wizualnie uderzający i dezorientuje użytkownika.

### 1.2. Root cause

Commit `5d2168f` usunął warunek `(!isInitialized && hasAccess)` z warunku renderowania skeletonu w `GridView.tsx`. Warunek ten blokował wcześniej wyświetlanie gridu aż do zakończenia inicjalizacji (w tamtym czasie: pobranie danych tygodniowych i ustawienie symboli). Po jego usunięciu grid pojawia się natychmiast gdy `isLoading=false && gridResponse !== null`, co następuje przed zakończeniem `resetTimeline` i auto-preload 2 kolejnych chunków. Efektem jest widoczny dwufazowy rendering.

### 1.3. Zakres wpływu

- Dotknięte komponenty/moduły: `GridView.tsx`, `useInfiniteTimeline.ts`
- Dotknięci użytkownicy: wszyscy użytkownicy z aktywną subskrypcją (trial i paid), przy każdym załadowaniu strony z pustym cache
- Dotknięte środowiska: production, staging, development (wszędzie gdzie cache jest zimny)

### 1.4. Priorytet naprawy

HIGH - widoczny przy każdym pierwszym załadowaniu gridu (cold cache), negatywnie wpływa na odbiór aplikacji.

## 2. Szczegolowa analiza bledu

### 2.1. Kroki reprodukcji

1. Wyczyszczenie localStorage (cold cache) lub pierwsze wejście na stronę
2. Zalogowanie użytkownika z aktywnym dostępem
3. Przejście do głównej strony z gridem
4. Obserwacja: widać skeleton → mały grid (4 tickery, 7-9 kolumn) → duży grid (14+ tickerów, 20+ kolumn)

### 2.2. Oczekiwane zachowanie

Skeleton ładowania → od razu pojawia się kompletny, właściwy widok gridu z pełnym zakresem danych (bez widocznego skoku).

### 2.3. Rzeczywiste zachowanie

Skeleton ładowania → mały grid (tylko dane z zakresu `range=week`) → po 50-400ms duży grid z preloadowanymi chunkami.

### 2.4. Root cause analysis

Szczegółowy przepływ renderowania po ostatnich zmianach:

**Faza 1 (skeleton)**:

- `useClientCache` wywołuje `fetchGridData(range="week", ...)` → `isLoading=true`
- `useInfiniteTimeline` inicjalizuje stan z 1 chunkiem `{startDate: today-7, endDate: today, events: [], isInitialized: false}`
- Warunek render: `isLoading=true` → `<GridSkeleton />`

**Faza 2 (MAŁY GRID - BUG)**:

- API zwraca dane `range=week` (4 zdarzenia, 4 tickery)
- `isLoading=false`, `gridResponse = {events: [4 zdarzeń]}`
- Warunek render (po usunięciu `!isInitialized`): `isLoading=false && hasAccess=true && gridResponse !== null` → `timelineState.chunks.length > 0` → **`<VirtualizedGrid>` z 1 chunkiem (7 dni, 4 tickery)**
- Użytkownik WIDZI mały grid

**Faza 3 (DUŻY GRID - właściwy)**:

- useEffect w `GridView` wykrywa: `gridResponse !== lastRef && allEvents.length === 0` → wywołuje `resetTimeline(start, end, events)` → `isInitialized=true`
- Auto-preload w `useInfiniteTimeline` uruchamia się (po 50ms): ładuje chunk[t-1], potem (100ms) chunk[t-2]
- Po 2 dodatkowych fetch'ach: `timelineState.chunks.length = 3`, `allEvents` = 14+ zdarzeń, 14+ tickerów
- Użytkownik WIDZI duży grid

**Lokalizacja usunięcia zabezpieczenia**:

```
// PRZED (commit 5d2168f^):
{isLoading || hasAccess === null || (!isInitialized && hasAccess) || (hasAccess && gridResponse === null) ? (
  <GridSkeleton />

// PO (commit 5d2168f - aktualny kod):
{isLoading || hasAccess === null || (hasAccess && gridResponse === null) ? (
  <GridSkeleton />
```

Usunięty warunek `(!isInitialized && hasAccess)` blokował rendering gridu do momentu zakończenia inicjalizacji. Tamten `isInitialized` był stanem w `GridContext` ustawianym po zakończeniu smart-init. Po usunięciu smart-init, cały mechanizm blokowania zniknął razem z nim.

### 2.5. Analiza zasiegu

#### Komponenty frontend:

- `src/components/grid/GridView.tsx` - warunek renderowania skeletonu (linia ~354), brakujące sprawdzenie stanu inicjalizacji
- `src/hooks/useInfiniteTimeline.ts` - brak eksportowanego stanu `isReady` sygnalizującego zakończenie preloadu

#### Serwisy/hooki:

- `src/hooks/useInfiniteTimeline.ts` - auto-preload logic (linia ~142-170), brak flagi oznaczającej zakończenie preloadu

#### Testy:

- `e2e/grid-rendering.spec.ts` - brak testu sprawdzającego że grid nie ma widocznego skoku przy pierwszym załadowaniu

## 3. Propozycje rozwiazan

### 3.1. Rozwiazanie A (REKOMENDOWANE)

#### Opis:

Dodanie flagi `isReady` do hooka `useInfiniteTimeline`. Flaga jest ustawiana na `true` dopiero po zakończeniu auto-preload (2 dodatkowych chunków). `GridView` blokuje rendering `<VirtualizedGrid>` do czasu `isReady=true`, zamiast pokazywać go po pierwszym arrival `gridResponse`. Obsługa fallbacku: flaga jest ustawiana `true` nawet przy błędzie preloadu (try-finally), aby skeleton nie blokował gridu w nieskończoność.

#### Zakres zmian:

- Frontend: `src/hooks/useInfiniteTimeline.ts` (nowy stan `isReady`, eksportowanie go), `src/components/grid/GridView.tsx` (warunek skeleton)
- Backend: brak
- Database: brak
- Testy: `e2e/grid-rendering.spec.ts` (dodać test braku flash)

#### Zalety:

- Eliminuje flash całkowicie - użytkownik widzi albo skeleton albo kompletny grid
- Fallback przez try-finally - skeleton nigdy nie "zawiśnie"
- Minimalna zmiana (2 pliki, ~15 linii kodu)
- Logika preloadu pozostaje bez zmian
- Nie wymaga zmian w GridContext ani API

#### Wady:

- Skeleton jest widoczny 50-500ms dłużej (czas 2 dodatkowych fetch'ów z API lub z cache)
- W przypadku bardzo wolnego połączenia: skeleton trwa dłużej

#### Effort: S

2-4 godziny: implementacja (1h) + testy manualne (1h) + e2e test (1-2h)

#### Ryzyko regresji: LOW

Zmiana izolowana do 2 plików. Jedynym efektem ubocznym jest dłuższy skeleton - co jest pożądanym zachowaniem.

#### Zgodnosc ze standardami:

- copilot-instructions.md: ✅ - wzorzec useState + useEffect, obsługa error states
- Tech-stack.md: ✅ - React hooks, bez nowych zależności
- Best practices: ✅ - try-finally zapobiega stuck state, flag pattern jest idiomatic React

---

### 3.2. Rozwiazanie B

#### Opis:

Przywrócenie warunku blokującego w `GridView.tsx` z użyciem istniejącej flagi `timelineState.isInitialized`. Skeleton jest widoczny dopiero do momentu wywołania `resetTimeline` (które ustawia `isInitialized=true`). Preload nadal uruchamia się po pierwszym renderze gridu, ale dodatkowe tickery pojawiają się po lewej stronie siatki (użytkownik widzi prawą stronę = today, więc zmiana jest mniej widoczna).

Zmiana skeleton condition:

```typescript
{isLoading || hasAccess === null || (hasAccess && gridResponse === null) || (hasAccess && !timelineState.isInitialized) ? (
```

#### Zakres zmian:

- Frontend: `src/components/grid/GridView.tsx` tylko (1 linia)
- Backend: brak
- Database: brak
- Testy: brak zmian wymaganych

#### Zalety:

- Minimalna zmiana (1 plik, 1 linia)
- Eliminuje skok z malego→dużego przy pierwszym renderze
- Brak nowego stanu

#### Wady:

- Nie eliminuje do końca problemu: po `resetTimeline` grid nadal może skoczyć z 4→14 tickerów podczas preloadu (2 kolejne chunki)
- Skok po preloadzie jest mniejszy wizualnie (dodane kolumny są po lewej, scroll jest na prawej), ale tickery nadal przyrastają
- `timelineState.isInitialized` musi być poprawnie eksportowany z hooka (jest)

#### Effort: XS

<1 godzina: zmiana 1 linii + weryfikacja

#### Ryzyko regresji: LOW

Zmiana 1 linii w warunku renderowania, ograniczona do stanu który już istnieje.

#### Zgodnosc ze standardami:

- copilot-instructions.md: ✅
- Tech-stack.md: ✅
- Best practices: ⚠️ - nie rozwiązuje problemu w pełni (preload nadal powoduje mniejszy skok)

---

### 3.3. Rozwiazanie C

#### Opis:

Zmiana strategii preloadu: zamiast ładować 2 chunki asynchronicznie po inicjalizacji gridu, wykonać preload jako część `resetTimeline` - przed ustawieniem `isInitialized=true`. Preload staje się synchronicznym krokiem inicjalizacji. `isInitialized=true` jest ustawiane dopiero po załadowaniu wszystkich 3 chunków. Grid jest blokowany przez `isInitialized=false`.

#### Zakres zmian:

- Frontend: `src/hooks/useInfiniteTimeline.ts` (refactor `resetTimeline` i auto-preload logic), `src/components/grid/GridView.tsx` (1 linia)
- Backend: brak
- Database: brak

#### Zalety:

- Preload jest atomowo powiązany z inicjalizacją
- Brak need for extra `isReady` state

#### Wady:

- Większy refactor `resetTimeline` - ryzyko regresji
- `resetTimeline` staje się async - trzeba przepisać wszystkich callerów (w `GridView.tsx` jest kilka)
- Callers `resetTimeline`: `handleDateRangeChange`, `handlePresetChange`, symbol/range useEffect - każdy musiałby obsłużyć async
- Wzrost złożoności hooka

#### Effort: M

4-8 godzin: refactor hooka + aktualizacja wszystkich callerów + testy

#### Ryzyko regresji: MEDIUM

Przepisuje kluczowy hook. Callers `resetTimeline` są w GridView w kilku miejscach.

#### Zgodnosc ze standardami:

- copilot-instructions.md: ✅
- Tech-stack.md: ✅
- Best practices: ⚠️ - async callback w useState setter jest niestandardowy wzorzec

---

### 3.4. Rozwiazanie D: range jako viewport (refactor architektoniczny)

#### Opis:

Usunięcie `range=week` jako parametru fetchowania API. Zamiast tego: initial fetch zawsze pobiera stały szeroki zakres (np. 3 tygodnie lub 14 dni jawnych dat). Selektor range staje się kontrolką viewport - zmiana range nie wywołuje API, tylko filtruje/scrolluje widok na już załadowane dane.

#### Kontekst i uzasadnienie (z rozmowy z użytkownikiem):

Użytkownik planuje przebudowanie selektora range tak, żeby był związany z wyświetlaniem załadowanych danych, a nie z faktycznym pobieraniem. Chce zrozumieć skalę tej zmiany przed podjęciem decyzji.

---

#### 3.4.1. Aktualne użycie `range` w projekcie (pełna mapa)

**`range` jako parametr fetch API (do usunięcia w rozwiązaniu D):**

| Plik                    | Rola range                                                  | Do zmiany                     |
| ----------------------- | ----------------------------------------------------------- | ----------------------------- |
| `GridView.tsx:115`      | `cacheKey` zawiera `gridState.range`                        | ✅ Tak                        |
| `GridView.tsx:129`      | `fetcher` → `fetchGridData(range, symbols)`                 | ✅ Tak                        |
| `GridView.tsx:76`       | `initialStartDate` liczony z `gridState.range`              | ✅ Tak                        |
| `GridView.tsx:221`      | `clearTimelineCache(prevRange, hash)` przy zmianie          | ✅ Tak                        |
| `GridView.tsx:307`      | `handlePresetChange` → re-fetch via `handleDateRangeChange` | ✅ Tak                        |
| `api-service.ts:24`     | `fetchGridData(range, ...)` overload                        | ✅ Usunąć                     |
| `api-client.ts:202`     | `API_ENDPOINTS.gridData(range, ...)`                        | ✅ Usunąć                     |
| `api/nocodb/grid.ts:11` | Mode 2,3 (range only / range+end_date)                      | ⚠️ Zostawić (backward compat) |
| `GridContext.tsx:44`    | URL param `?range=week` parsing                             | ⚠️ Zmienić semantykę          |

**`range` jako parametr chunk-calculation (POZOSTAJE w rozwiązaniu D):**

| Plik                        | Rola range                                                 | Do zmiany                |
| --------------------------- | ---------------------------------------------------------- | ------------------------ |
| `useInfiniteTimeline.ts:19` | `range` w `calculateSmartChunkStart` - chunk boundaries    | ❌ Nie - nadal potrzebne |
| `useInfiniteTimeline.ts:21` | `range` w `getChunkCacheKey` - klucz cache chunku          | ❌ Nie                   |
| `timeline-utils.ts:11`      | `getChunkSize(range)` - rozmiar ładowanego chunku          | ❌ Nie                   |
| `timeline-utils.ts:54`      | `calculateSmartChunkStart(date, range)` - smart boundaries | ❌ Nie                   |

**`range` jako parametr symboli (do przemyślenia):**

| Plik                          | Rola range                                        | Do zmiany                   |
| ----------------------------- | ------------------------------------------------- | --------------------------- |
| `useSymbols.ts:27`            | `useSymbols(range)` → `fetchSymbols(?range=week)` | ⚠️ Redundant (już all-time) |
| `AdvancedTickerFilter.tsx:52` | `useSymbols(range)` - event counts                | ⚠️ Zależy od powyższego     |

**Testy E2E używające range jako fetch trigger:**

| Plik                                   | Impakt                                                         |
| -------------------------------------- | -------------------------------------------------------------- | ---------------------------- |
| `e2e/grid-rendering.spec.ts:25`        | `expect(selectedRange).toBe("week")` - sprawdza domyślny range | ⚠️ Semantyczna zmiana        |
| `e2e/grid-filtering.spec.ts`           | `selectRange("month")` - testuje zmianę range                  | ⚠️ Test nadal sensowny       |
| `e2e/grid-trial.spec.ts:52`            | `selectRange("month")`                                         | ⚠️ Semantyczna zmiana        |
| `e2e/grid-paywall.spec.ts:75`          | `selectRange("month")`                                         | ⚠️ Semantyczna zmiana        |
| `e2e/helpers/mock-nocodb.helper.ts:64` | Mock odpowiedzi dla `range=week`                               | ✅ Zmienić na explicit dates |

---

#### 3.4.2. Analiza techniczna: co się musi zmienić

**Strategia initial fetch bez range:**

Opcje dla initial fetch gdy range nie jest parametrem API:

```
Opcja D.1: Zawsze fetchuj stałe explicit dates (np. ostatnie 21 dni)
  + Prostota, brak zależności od range
  - Hardcoded window, może nie pasować do viewport "quarter"

Opcja D.2: Initial fetch = quarter (90 dni), range jako viewport zoom
  + Zawsze dużo danych na start, brak potrzeby preloadu dla week/month
  - Cięższy initial load (90 dni vs 7 dni), ale tylko raz

Opcja D.3: Initial fetch = 2 tygodnie + preload = brak zmiany warstwy API
  + Minimalna zmiana API warstwy
  - Nadal potrzebny preload, viewport "month" musi loadować więcej
```

Najbardziej sensowna dla planowanego refactoru = **D.2**: initial load kwartału (lub 2-3 tygodni), range = viewport zoom. Po zmianie range - scrollować do odpowiedniej pozycji, nie refetchować.

**Mechanizm viewport po zmianie range:**

```
"week"   → scroll do today, pokaż last 7 dni (pozostałe kolumny dostępne przez scroll)
"month"  → scroll do today, pokaż last 30 dni
"quarter"→ pokaż cały załadowany zakres (all loaded chunks)
```

Alternatywnie: "range" może oznaczać chunk-size do preloadu, nie viewport. To zależy od decyzji UX.

---

#### 3.4.3. Pliki do modyfikacji i szacowany effort

**Zmiany wymagane (S-M):**

1. **`src/contexts/GridContext.tsx`** - S (2h)
   - Semantyczna zmiana `range`: z "parametr fetch" na "parametr viewport/chunk"
   - `setRange` nie powoduje refetch - czysta zmiana stanu
   - `clearFilters` nie resetuje startDate/endDate
   - URL params: `?range=week` pozostaje ale zmienia semantykę (viewport, nie fetch trigger)

2. **`src/components/grid/GridView.tsx`** - L (5-8h)
   - Usunięcie `gridState.range` z `cacheKey` (cache key = tylko explicit dates + symbols)
   - Zmiana `initialStartDate`: nie z range, ale z explicit window (np. `today - 14 dni` lub `today - 90 dni`)
   - Zmiana `fetcher`: zawsze `fetchGridData(startDate, endDate, symbols)` (Mode 1 only)
   - Usunięcie `handlePresetChange → handleDateRangeChange` - `handlePresetChange` staje się viewport-only
   - `handlePresetChange`: zmiana range w state (viewport scroll), bez fetch
   - Usunięcie `clearTimelineCache` przy zmianie range (range nie invaliduje cache)
   - Potencjalnie: przekazanie `range` do VirtualizedGrid lub DateRangeSelector dla viewport scroll logic

3. **`src/components/grid/DateRangeSelector.tsx`** - M (2-3h)
   - `onPresetChange` callback zmienia zachowanie: range update → bez fetch, tylko viewport scroll
   - Może potrzebować callbacku do scrollowania VirtualizedGrid do właściwej pozycji

4. **`src/hooks/useInfiniteTimeline.ts`** - S (1-2h)
   - `range` nadal potrzebny do `calculateSmartChunkStart` (chunk boundaries) - bez zmian
   - Zmiana initial state: `initialStartDate` = `today - 14 dni` (stały, nie zależny od range)
   - `getChunkCacheKey` - `range` może pozostać jako hint dla chunk-size

5. **`src/lib/api-service.ts`** - S (1h)
   - Usunięcie/deprecacja overloadu `fetchGridData(range, symbols, endDate)`
   - Pozostaje tylko `fetchGridData(startDate, endDate, symbols)`

6. **`src/lib/api-client.ts`** - XS (30min)
   - Usunięcie/deprecacja `API_ENDPOINTS.gridData(range, ...)` (Mode 3 endpoint builder)
   - `API_ENDPOINTS.gridDataByDateRange` zostaje jako jedyna metoda

7. **`src/pages/api/nocodb/grid.ts`** - XS (opcjonalne, 30min)
   - Mode 2, 3 (range-based) można zostawić dla backward compat lub oznaczyć jako deprecated
   - Frontend przestaje ich używać

8. **`e2e/` testy** - L (4-6h)
   - `e2e/helpers/mock-nocodb.helper.ts` - zmiana interceptowanych URL z `range=week` na explicit dates
   - `e2e/fixtures/nocodb-mock.fixture.ts` - analogicznie
   - `e2e/grid-rendering.spec.ts` - TC-GRID-001 nie weryfikuje range jako default fetch trigger
   - `e2e/grid-filtering.spec.ts` - testy range zmieniają semantykę (viewport, nie fetch)
   - `e2e/pages/components/RangeSelector.ts` - bez zmian (UI component)

9. **Testy jednostkowe** - M (2-3h)
   - `src/lib/api-service.test.ts` - usunięcie testów dla range overloadu
   - `src/lib/api-client.test.ts` - usunięcie testów `range=week`

**Łączny szacunek:**

| Kategoria                           | Effort             |
| ----------------------------------- | ------------------ |
| GridView.tsx (fetch logic)          | 5-8h               |
| GridContext.tsx                     | 2h                 |
| DateRangeSelector + viewport scroll | 2-3h               |
| api-service, api-client             | 1.5h               |
| useInfiniteTimeline                 | 1-2h               |
| E2E testy                           | 4-6h               |
| Unit testy                          | 2-3h               |
| **Łącznie**                         | **~18-25h (L-XL)** |

---

#### 3.4.4. Nowe ryzyka specyficzne dla rozwiązania D

**Ryzyko D.1: Viewport scroll position**

- Po zmianie range na "week" jak scrollować grid do właściwej pozycji?
- VirtualizedGrid ma logikę scroll-to-today przy mount - rozszerzyć o scroll-to-range
- `useEffect` w VirtualizedGrid na zmianę `range` → `scrollToDate(today - rangeDays)`

**Ryzyko D.2: Initial load window za małe dla viewport**

- Jeśli initial window = 14 dni i user przełączy na "quarter" (90 dni) - viewport zaktualizuje się, ale danych sprzed 14 dni nie ma
- Rozwiązanie: initial window ≥ najszerszego viewport (= 90 dni), lub: zmiana "quarter" triggeruje load brakujących danych

**Ryzyko D.3: Cache key collision**

- Stary cache (key = `cache:grid:week:hash`) vs nowy (key = `cache:grid:YYYY-MM-DD:YYYY-MM-DD:hash`)
- Przy deploy: stare cache entries są bezużyteczne, ignorowane automatycznie (inne klucze)

**Ryzyko D.4: Backward compat URL params**

- User otwiera URL `?range=week` zakładkowany ze starego UX
- Po zmiana: `range=week` w URL musi być obsłużone jako viewport hint, nie fetch trigger
- Wymagana migracja/degradacja: parsowanie `range` z URL → viewport state (bez fetch)

---

#### 3.4.5. Zalety i wady rozwiązania D

**Zalety:**

- Eliminuje flash całkowicie i w sposób architektonicznie czysty
- Zmiana zakresu nie generuje extra API call → mniejsze obciążenie serwera
- Lepsze UX: szybka zmiana widoku bez "blanking" ekranu
- Przygotowanie pod przyszłą przebudowę UX selektora range
- Uproszczenie fetch logic: zawsze explicit dates, jedna ścieżka kodu

**Wady:**

- Effort ~18-25h (vs 4-5h dla rozwiązania A)
- Wymaga decyzji UX: co to znaczy "week view" jeśli nie ma własnego API fetch?
- Initial load może być cięższy (3 tygodnie vs 1 tydzień przy first load)
- Infinite scroll semantics się zmienia: chunk boundaries niezależne od "aktywnego viewport"

#### Effort: XL

18-25 godzin: implementacja (14-18h) + testy manualne (2-3h) + e2e/unit tests update (4-6h)

#### Ryzyko regresji: HIGH

Duży refactor dotykający warstwy fetch, kontekstu, komponentów i testów.

---

### 3.5. Rozwiazanie E (WYBRANE - nowa rekomendacja)

#### Opis:

Wyłączenie presetów range (Tydzień/Miesiąc/Kwartał) i pozostawienie tylko pickera dat "od do". Initial load używa zawsze jawnych dat (`start_date + end_date`), nigdy `range=week`. Rozwiązanie E łączone z Rozwiązaniem A (`isReady` flag) eliminuje flash w 100%.

To jest przejściowe rozwiązanie przed przyszłym refactorem architektonicznym (Rozwiązanie D).

#### Pełna mapa zmian

**1. `src/components/grid/DateRangeSelector.tsx`** - S (1-2h)

Usunąć:

- Import `QUICK_PRESETS`, pętlę `.map((preset) => ...)` renderującą przyciski preset
- `DropdownMenuSeparator` między presetami a "Własny zakres..."
- Logikę `getDisplayLabel` opartą na preset name (zostaje tylko format dat)
- `handlePresetSelect` funkcja (staje się zbędna)

Zmienić:

- Dropdown ma teraz tylko 1 pozycję: "Wybierz zakres dat..." (otwiera dialog)
- Lub: przycisk bezpośrednio otwiera dialog (bez dropdown)
- Wyświetlanie: zawsze format `DD.MM - DD.MM.YYYY` (explicit dates, nie nazwa presetu)

Prop `onPresetChange` w interfejsie: usunąć lub oznaczyć `@deprecated`.

**2. `src/components/grid/GridView.tsx`** - M (2-3h)

Usunąć/zmienić:

- `fetcher`: zawsze `fetchGridData(startDate, endDate, symbols)` (Mode 1), nigdy `fetchGridData(range, ...)`
- `cacheKey`: zawsze `cache:grid:${startDate}:${endDate}:${hash}` (nie zawiera `range`)
- `initialStartDate`: stały window zamiast z range → `today - 14 dni`
- `handlePresetChange`: usunąć całą funkcję (lub zamienić na no-op na czas przejścia)
- Prop `onPresetChange` do `DateRangeSelector`: usunąć/zastąpić no-op
- `clearTimelineCache(previousRangeRef.current, ...)`: usunąć efekt (range nie zmienia danych)
- Usunąć `previousRangeRef` i jego `useEffect`

Dodać (z Rozwiązania A):

- `isReady` z `useInfiniteTimeline`
- `|| (hasAccess === true && !isReady)` w warunku skeleton

**3. `src/contexts/GridContext.tsx`** - XS (30min)

- `range` w `GridState` pozostaje (używany przez `useInfiniteTimeline` dla chunk boundaries)
- `setRange` pozostaje ale nie jest już wywołany z UI (presets usunięte)
- Domyślna wartość `range: "week"` może zostać jako hint dla chunk-size w infinite scroll
- `updateUrlParams`: usunąć `params.set("range", state.range)` - nie generować `?range=` w URL
- `getInitialStateFromUrl`: zachować parsowanie `?range=` dla backward compat zakładek

**4. `src/components/grid/GridPageWrapper.tsx`** - XS (15min)

- Usunąć `initialRange` prop z interfejsu i implementacji
- `GridProvider` nie otrzymuje `range` w `initialState` (lub hardcode "week" jako chunk hint)

**5. `src/hooks/useInfiniteTimeline.ts`** - S (1h)

Z Rozwiązania A:

- Dodać `isReady` state
- Ustawić `isReady=true` w `try-finally` po preload
- Resetować `isReady=false` w `resetTimeline`
- Eksportować `isReady`

`range` prop: pozostaje bez zmian - nadal używany przez `calculateSmartChunkStart`

**6. `src/lib/api-service.ts`** - XS (opcjonalne)

- Overload `fetchGridData(range, ...)` może zostać (dla infinite scroll chunk loading)
- Lub: oznaczyć `@deprecated` - nie jest już wywoływany z GridView

**7. `e2e/` testy** - M (2-3h)

| Plik                                    | Zmiana                                                                                 |
| --------------------------------------- | -------------------------------------------------------------------------------------- |
| `e2e/helpers/mock-nocodb.helper.ts`     | Zmiana interceptowanego URL z `range=week` na `start_date=...&end_date=...`            |
| `e2e/fixtures/nocodb-mock.fixture.ts`   | Analogicznie                                                                           |
| `e2e/grid-rendering.spec.ts`            | TC-GRID-001: usunąć expect na `selectedRange === "week"`, test range dropdown behavior |
| `e2e/grid-filtering.spec.ts`            | Testy `selectRange("month")` - usunąć lub zastąpić testem pickera dat                  |
| `e2e/grid-trial.spec.ts`                | Usunąć `selectRange("month")` test lub zastąpić                                        |
| `e2e/pages/components/RangeSelector.ts` | Może stać się `DatePickerSelector` lub zostać jako legacy                              |

**8. Unit testy** - XS (30min)

- `src/lib/api-service.test.ts`: range-based fetch overload tests → oznaczyć lub usunąć
- `src/lib/api-client.test.ts`: `range=week` URL tests → zaktualizować na explicit dates

#### Łączny effort (E + A)

| Plik                                  | Effort         |
| ------------------------------------- | -------------- |
| `DateRangeSelector.tsx`               | 1-2h           |
| `GridView.tsx`                        | 2-3h           |
| `GridContext.tsx`                     | 30min          |
| `GridPageWrapper.tsx`                 | 15min          |
| `useInfiniteTimeline.ts` (Solution A) | 1h             |
| E2E testy                             | 2-3h           |
| Unit testy                            | 30min          |
| **Łącznie**                           | **~8-11h (M)** |

#### Ryzyko regresji: MEDIUM

- Zmiana warstwy fetch i UI (DateRangeSelector) dotyka wielu plików
- Testy E2E wymagają aktualizacji mocków URL
- Zakładki z `?range=week` degradują się gracefully (range parsowany jako chunk hint)

#### Dlaczego E+A a nie samo E?

Samo E (bez A) redukuje flash ale go nie eliminuje:

- Initial fetch zwraca 14 dni → grid renderuje się mały (14 dni, mniej tickerów)
- Po preloadzie grid rośnie do 28+ dni i więcej tickerów → widoczny skok

E+A razem: skeleton blokuje rendering do zakończenia preloadu → użytkownik widzi od razu kompletny grid.

#### Decyzja dot. initial window (14 vs 30 dni):

- **14 dni** (2 tygodnie): mniej danych na start, szybszy initial fetch, preload konieczny
- **30 dni** (1 miesiąc): więcej danych na start, wolniejszy initial fetch, mniejszy przyrost z preloadu

Rekomendacja: **14 dni** + Solution A. Czas preloadu ukryty pod skeleton, UX bez różnicy.

---

## 4. Rekomendacja i uzasadnienie

### 4.1. Wybrane rozwiazanie

**AKTUALNA REKOMENDACJA: E + A**

- **Rozwiązanie E**: Wyłącz presety range, zostaw tylko picker "od do"
- **Rozwiązanie A**: `isReady` flag blokująca rendering do zakończenia preloadu
- Razem: eliminują flash w 100%, usuwają `range=week` jako parametr fetch

**PRZYSZŁY REFACTOR: ROZWIAZANIE D** (architektoniczny, osobny plan)

### 4.2. Uzasadnienie wyboru

**E + A (teraz)**:

- Eliminuje flash całkowicie
- Usuwa `range=week` jako fetch trigger - source problemu
- ~8-11h, ryzyko MEDIUM (akceptowalne)
- Przygotowuje codebase pod przyszły refactor D (range-as-viewport)
- Użytkownik zawsze widzi pełne dane od konkretnej daty do konkretnej daty

**Rozwiązanie D (osobny plan, późniejszy etap)**:

- Pełna przebudowa selektora range jako viewport
- ~18-25h, wymaga decyzji UX
- Po D: `isReady` z Rozwiązania A staje się zbędne (usunąć)

**Co zostaje z rozwiązań A, B, C:**

- A (`isReady`): ✅ implementowane jako część E+A
- B (isReady bez E): ❌ pominięte - E+A jest lepsze
- C (resetTimeline async): ❌ pominięte - zbyt duży refactor
- D (range as viewport): 📋 planowany osobno

## 5. Szczegolowy plan implementacji

> **Etap 1 (ten plan)**: Rozwiązanie E+A - wyłączenie presetów range + flaga `isReady`
> **Etap 2 (osobny plan)**: Rozwiązanie D - refactor architektoniczny range-jako-viewport (planowany, wymaga oddzielnego planu z decyzją UX)

### 5.1. Faza 1: Przygotowanie

- [ ] Branch: `fix/grid-loading-flash`
- [ ] Reprodukcja buga: wyczyścić localStorage, wejść na grid, potwierdzić widoczny skok

### 5.2. Faza 2: Zmiany w kodzie

Kolejność implementacji (od najmniej do najbardziej ryzykownych):

#### Krok 1: `isReady` w `useInfiniteTimeline` (Rozwiązanie A)

Plik: `src/hooks/useInfiniteTimeline.ts`

Zmiany:

1. `const [isReady, setIsReady] = useState(false)` - nowy stan
2. Auto-preload effect: dodać `try-finally` z `setIsReady(true)`
3. `resetTimeline`: dodać `setIsReady(false)` na początku
4. Interfejs `UseInfiniteTimelineReturn`: dodać `isReady: boolean`
5. Return: dodać `isReady`

Kod przed zmianą (auto-preload, linia ~142):

```typescript
hasPreloadedRef.current = true;

const timer1 = setTimeout(() => {
  loadPreviousChunk().then(() => {
    setTimeout(() => {
      loadPreviousChunk();
    }, 100);
  });
}, 50);

return () => clearTimeout(timer1);
```

Kod po zmianie:

```typescript
const [isReady, setIsReady] = useState(false);

// ...w auto-preload useEffect:
hasPreloadedRef.current = true;

const runPreload = async () => {
  try {
    await loadPreviousChunk();
    await loadPreviousChunk();
  } catch {
    // Preload failure non-critical - grid shows with initial chunk
  } finally {
    setIsReady(true);
  }
};

const timer = setTimeout(runPreload, 50);
return () => clearTimeout(timer);
```

Kod przed zmianą (`resetTimeline`):

```typescript
const resetTimeline = useCallback(
  (newStartDate: string, newEndDate: string, newEvents: BlackSwanEventMinimal[]) => {
    const cacheKey = getChunkCacheKey(range, symbols, newStartDate, newEndDate);
    setInCache(cacheKey, newEvents, TIMELINE_CHUNK_TTL);

    setTimelineState({ ... });
    hasPreloadedRef.current = false;
  },
```

Kod po zmianie:

```typescript
const resetTimeline = useCallback(
  (newStartDate: string, newEndDate: string, newEvents: BlackSwanEventMinimal[]) => {
    const cacheKey = getChunkCacheKey(range, symbols, newStartDate, newEndDate);
    setInCache(cacheKey, newEvents, TIMELINE_CHUNK_TTL);

    setIsReady(false); // Reset - preload will set it back to true
    setTimelineState({ ... });
    hasPreloadedRef.current = false;
  },
```

Interfejs po zmianie:

```typescript
interface UseInfiniteTimelineReturn {
  timelineState: TimelineState;
  loadPreviousChunk: () => Promise<void>;
  resetTimeline: (newStartDate: string, newEndDate: string, newEvents: BlackSwanEventMinimal[]) => void;
  allEvents: BlackSwanEventMinimal[];
  allDates: string[];
  isReady: boolean; // NOWE
}
```

---

#### Krok 2: Wyłączenie presetów w `DateRangeSelector` (Rozwiązanie E)

Plik: `src/components/grid/DateRangeSelector.tsx`

Zmiany:

1. Usunąć `QUICK_PRESETS` tablicę (lub zakomentować)
2. Usunąć `.map((preset) => ...)` renderujące `DropdownMenuItem` dla presetów
3. Usunąć `DropdownMenuSeparator` między presetami a "Własny zakres..."
4. Usunąć `handlePresetSelect` funkcję
5. Uprościć `DropdownMenuContent`: pozostawić tylko "Własny zakres..." lub zamienić na bezpośredni trigger
6. Uprościć `getDisplayLabel`: zawsze zwracać format `DD.MM - DD.MM.YYYY` (bez nazw presetów)
7. Prop `onPresetChange` w `DateRangeSelectorProps`: usunąć lub oznaczyć jako opcjonalny `@deprecated`

Wariant uproszczony (bez dropdown - direct trigger):

```typescript
// Zamiast DropdownMenu - bezpośredni przycisk otwierający dialog
<Button
  variant="outline"
  size="sm"
  className="min-w-[160px] justify-between gap-2"
  onClick={() => setIsCustomDialogOpen(true)}
>
  <span className="flex items-center gap-2">
    <Calendar className="h-4 w-4 shrink-0 text-muted-foreground" />
    <span className="truncate">{getDisplayLabel()}</span>
  </span>
  <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
</Button>
```

`getDisplayLabel` - tylko format dat:

```typescript
const getDisplayLabel = () => {
  // Always show explicit date range (no preset names)
  const formatDate = (dateStr: string) => {
    const [, month, day] = dateStr.split("-");
    return `${day}.${month}`;
  };
  const [endYear] = endDate.split("-");
  return `${formatDate(startDate)} - ${formatDate(endDate)}.${endYear}`;
};
```

---

#### Krok 3: Zmiana initial fetch i warunku skeleton w `GridView` (Rozwiązanie E+A)

Plik: `src/components/grid/GridView.tsx`

**Zmiana 1**: `initialStartDate` - stały window 14 dni:

```typescript
// PRZED:
const initialStartDate = useMemo(() => {
  if (gridState.startDate) return gridState.startDate;
  const daysBack = gridState.range === "week" ? 7 : gridState.range === "month" ? 30 : 90;
  const start = new Date();
  start.setDate(start.getDate() - daysBack);
  return start.toISOString().split("T")[0];
}, [gridState.startDate, gridState.range]);

// PO:
const INITIAL_WINDOW_DAYS = 14; // Fixed initial window (not range-dependent)
const initialStartDate = useMemo(() => {
  if (gridState.startDate) return gridState.startDate;
  const start = new Date();
  start.setDate(start.getDate() - INITIAL_WINDOW_DAYS);
  return start.toISOString().split("T")[0];
}, [gridState.startDate]);
```

**Zmiana 2**: `cacheKey` - zawsze explicit dates:

```typescript
// PRZED:
const cacheKey = useMemo(() => {
  if (gridState.startDate && gridState.endDate) {
    return `cache:grid:${gridState.startDate}:${gridState.endDate}:${hashSymbols(gridState.symbols)}`;
  }
  return `cache:grid:${gridState.range}:${hashSymbols(gridState.symbols)}`;
}, [gridState.startDate, gridState.endDate, gridState.range, gridState.symbols]);

// PO:
const cacheKey = useMemo(
  () => `cache:grid:${initialStartDate}:${initialEndDate}:${hashSymbols(gridState.symbols)}`,
  [initialStartDate, initialEndDate, gridState.symbols]
);
```

**Zmiana 3**: `fetcher` - zawsze Mode 1 (explicit dates):

```typescript
// PRZED:
const fetcher = useCallback(() => {
  if (!shouldFetch) return Promise.resolve(null);
  if (gridState.startDate && gridState.endDate) {
    return fetchGridData(gridState.startDate, gridState.endDate, gridState.symbols);
  }
  return fetchGridData(gridState.range, gridState.symbols, undefined);
}, [shouldFetch, gridState.startDate, gridState.endDate, gridState.range, gridState.symbols]);

// PO:
const fetcher = useCallback(
  () => (shouldFetch ? fetchGridData(initialStartDate, initialEndDate, gridState.symbols) : Promise.resolve(null)),
  [shouldFetch, initialStartDate, initialEndDate, gridState.symbols]
);
```

**Zmiana 4**: Destrukturyzacja `isReady` z `useInfiniteTimeline`:

```typescript
// PRZED:
const { timelineState, loadPreviousChunk, resetTimeline, allEvents, allDates } = useInfiniteTimeline({

// PO:
const { timelineState, loadPreviousChunk, resetTimeline, allEvents, allDates, isReady } = useInfiniteTimeline({
```

**Zmiana 5**: Warunek skeleton - dodać `!isReady`:

```typescript
// PRZED:
{isLoading || hasAccess === null || (hasAccess && gridResponse === null) ? (

// PO:
{isLoading || hasAccess === null || (hasAccess && gridResponse === null) || (hasAccess === true && !isReady) ? (
```

**Zmiana 6**: Usunąć `handlePresetChange` i `clearTimelineCache` efekt:

```typescript
// USUNĄĆ: handlePresetChange function (cała funkcja, linia ~307)
// USUNĄĆ: useEffect clearTimelineCache (linia ~221-228)
// USUNĄĆ: previousRangeRef i jego useEffect
```

**Zmiana 7**: Prop `onPresetChange` do `DateRangeSelector` - usunąć lub zastąpić no-op:

```typescript
// PRZED:
<DateRangeSelector
  currentRange={gridState.range}
  startDate={initialStartDate}
  endDate={initialEndDate}
  onPresetChange={handlePresetChange}
  onCustomRangeChange={handleDateRangeChange}
/>

// PO:
<DateRangeSelector
  startDate={initialStartDate}
  endDate={initialEndDate}
  onCustomRangeChange={handleDateRangeChange}
/>
```

---

#### Krok 4: Usunięcie `initialRange` z `GridPageWrapper`

Plik: `src/components/grid/GridPageWrapper.tsx`

```typescript
// USUNĄĆ: initialRange prop z interfejsu i implementacji
// GridProvider initialState: usunąć `range` lub hardcode "week" jako chunk hint
```

---

#### Krok 5: URL params w `GridContext`

Plik: `src/contexts/GridContext.tsx`

Usunąć generowanie `?range=` w URL (zostawić parsowanie dla backward compat zakładek):

```typescript
// W updateUrlParams - usunąć:
if (state.range) params.set("range", state.range);

// W getInitialStateFromUrl - zostawić dla backward compat:
range: (params.get("range") as DateRange) || "week", // zachowane jako chunk-size hint
```

---

### 5.3. Faza 3: Aktualizacja testów E2E

Plik: `e2e/helpers/mock-nocodb.helper.ts` - zmiana interceptowanego URL:

```typescript
// PRZED:
range: "week",

// PO: intercept explicit dates
// Zaktualizować mock aby odpowiadał na URL z start_date + end_date
```

Plik: `e2e/grid-rendering.spec.ts` - usunąć test domyślnego range:

```typescript
// USUNĄĆ lub ZMIENIĆ:
// test("TC-GRID-001: Grid renders with default range"... expect selectedRange === "week")
// Zastąpić testem że grid renderuje się z datami (explicit dates visible in UI)
```

Testy z `selectRange("month")`: zastąpić testem pickera dat lub usunąć.

### 5.4. Faza 4: Weryfikacja edge case

Sprawdzić wywołania `handleDateRangeChange` po usunięciu `handlePresetChange`:

- `handleDateRangeChange` wywoływana przez `onCustomRangeChange` w DateRangeSelector → ok
- `handlePresetChange` wywoływana tylko przez selektor presetów (który usuwamy) → ok do usunięcia

Sprawdzić czy `range` w `GridContext` jest używany gdzieś indziej po zmianie:

- `AdvancedTickerFilter`: `range={gridState.range}` → `useSymbols(range)` → event counts
  - Symbol event counts są all-time (nie range-specific) - można przekazać `undefined` zamiast range
  - Lub: zostawić `range` jako hint dla useSymbols (minimalna zmiana)

## 6. Plan weryfikacji i testowania

### 6.1. Unit tests

- [ ] `useInfiniteTimeline`: `isReady` starts as `false`
- [ ] `useInfiniteTimeline`: `isReady` becomes `true` after preload completes
- [ ] `useInfiniteTimeline`: `isReady` becomes `true` even when preload throws
- [ ] `useInfiniteTimeline`: `isReady` resets to `false` when `resetTimeline` is called
- [ ] `api-service.ts`: wywołania z explicit dates (nie range) - zaktualizować testy mocka

### 6.2. Manual testing checklist

- [ ] Wyczyszczenie localStorage → wejście na grid → brak widocznego skoku
- [ ] Grid wyświetla się z kompletną listą tickerów od razu po załadowaniu
- [ ] Skeleton ładowania jest widoczny podczas initial fetch + preload
- [ ] Przycisk dat (DateRangeSelector) otwiera picker "od do" bezpośrednio (brak presetów)
- [ ] Zmiana zakresu przez picker "od do": skeleton → grid z nowym zakresem (bez skoku)
- [ ] Zmiana tickerów: skeleton → grid z nowymi danymi (bez skoku)
- [ ] Błąd sieci podczas preloadu: grid mimo to się wyświetla (fallback try-finally działa)
- [ ] Cache hit (ciepły cache): grid pojawia się szybko
- [ ] URL nie zawiera `?range=week` po załadowaniu (zawiera `?start_date=...&end_date=...` lub czyste URL)
- [ ] Zakładka z `?range=week` otwiera się gracefully (fallback na default dates)

### 6.3. Regression testing

- [ ] Infinite scroll (ładowanie starszych chunków) nadal działa
- [ ] Keyboard navigation (Arrow keys, Enter) nadal działa po załadowaniu
- [ ] Minimap (Nawiguj) wyświetla poprawną liczbę zdarzeń po załadowaniu
- [ ] Filtrowanie tickerów nie powoduje regresu (resetTimeline + isReady cycle)
- [ ] Picker "od do" zapisuje daty w URL i przywraca je po odświeżeniu
- [ ] BlurredDemoGrid (użytkownicy bez dostępu) - bez regresji

## 7. Analiza ryzyka i mitigation

### 7.1. Zidentyfikowane ryzyka

#### Ryzyko 1: Preload zawiesza się (infinite loading)

- Severity: HIGH
- Prawdopodobienstwo: LOW
- Wpływ: Użytkownik widzi skeleton w nieskończoność
- Mitigation: `try-finally` w preload gwarantuje `setIsReady(true)` nawet przy exception

#### Ryzyko 2: Drugi `loadPreviousChunk()` wywoływany gdy `isLoadingBackward=true`

- Severity: MEDIUM
- Prawdopodobienstwo: MEDIUM
- Wpływ: Drugi chunk nie ładuje się (funkcja zwraca wcześnie jeśli `isLoadingBackward`)
- Mitigation: Sprawdzić czy `loadPreviousChunk` jest awaitable i respektuje stan. Jeśli drugi call jest ignorowany, `isReady` i tak zostanie ustawiony przez finally. Alternatywnie: odczekać na zmianę `isLoadingBackward` przed drugim wywołaniem

#### Ryzyko 3: Dłuższy czas do pierwszego widoku gridu

- Severity: LOW
- Prawdopodobienstwo: HIGH
- Wpływ: Użytkownik czeka 100-500ms dłużej (czas 2 dodatkowych fetch'ów)
- Mitigation: Czas preloadu to głównie czas sieciowy (~100-200ms/chunk przy szybkim API); przy ciepłym cache (<50ms), efekt jest pomijalny

### 7.2. Rollback plan

1. Wycofać zmiany w `useInfiniteTimeline.ts`: usunąć stan `isReady`, przywrócić oryginalny auto-preload
2. Wycofać zmianę 1 linii w `GridView.tsx`: usunąć `|| (hasAccess === true && !isReady)` z warunku
3. Alternatywnie: `git revert` commit naprawy

### 7.3. Monitoring post-deployment

- Obserwować czas do first contentful paint gridu w DevTools
- Sprawdzić czy minimap pokazuje poprawną liczbę zdarzeń przy pierwszym renderze
- Zweryfikować że nie ma nowych error boundary activations w logach

## 8. Zgodnosc ze standardami

### 8.1. Copilot-instructions.md compliance

- React patterns: ✅ - useState, useEffect, useCallback, try-finally
- Astro patterns: ✅ - brak zmian w Astro warstwie
- Accessibility (ARIA, WCAG): ✅ - skeleton nadal wyświetlany podczas ładowania (poprawne dla screen readerów)
- TypeScript best practices: ✅ - typowany interfejs hooka
- Testing patterns: ✅ - e2e test z Playwright, Page Object pattern

### 8.2. Security checklist

- [ ] Input validation - nie dotyczy
- [ ] Authorization - nie dotyczy (zmiana UI)
- [ ] Secrets management - nie dotyczy

### 8.3. Performance checklist

- [ ] Skeleton widoczny podczas ładowania - ✅ (skeleton trwa do zakończenia preloadu)
- [ ] Brak unnecessary re-renders - ✅ (`isReady` zmienia się tylko 2x: false→true w preload, true→false w reset)
- [ ] Code splitting - nie dotyczy

### 8.4. Accessibility checklist (dla UI)

- [ ] ARIA attributes - ✅ skeleton ma właściwe role
- [ ] Keyboard navigation - ✅ VirtualizedGrid dostępny po załadowaniu
- [ ] Focus management - ✅ bez zmian

## 9. Timeline i effort estimation

### 9.1. Estymacja czasu (Rozwiązanie E+A)

| Zadanie                                                | Czas           |
| ------------------------------------------------------ | -------------- |
| `useInfiniteTimeline.ts` - `isReady` (Krok 1)          | 1h             |
| `DateRangeSelector.tsx` - usunięcie presetów (Krok 2)  | 1-2h           |
| `GridView.tsx` - fetch/cache/skeleton/cleanup (Krok 3) | 2-3h           |
| `GridPageWrapper.tsx` + `GridContext.tsx` (Krok 4-5)   | 1h             |
| E2E testy - mock URL + test update                     | 2-3h           |
| Unit testy                                             | 30min          |
| Testowanie manualne                                    | 1h             |
| Code review                                            | 1h             |
| **Łącznie**                                            | **~9-12h (M)** |

## 10. Załączniki

### 10.1. Dotknięte pliki (lista pełna)

```
src/hooks/useInfiniteTimeline.ts
src/components/grid/GridView.tsx
e2e/grid-rendering.spec.ts (nowy test)
```

### 10.2. Referencje

- Commit który wprowadził bug: `5d2168f` (feature-remove-smart-initialization)
- Zmieniony warunek: `GridView.tsx` linia ~354
- Usunięty warunek: `(!isInitialized && hasAccess)` - blokował grid do zakończenia smart-init
- Hook do modyfikacji: `src/hooks/useInfiniteTimeline.ts` - auto-preload effect linia ~142

### 10.3. Sekwencja renderowania (diagram przepływu)

```
PRZED BUGIEM (smart-init era):
  skeleton → [smart-init fetches week data, sets symbols] → grid (kompletny)

AKTUALNIE (bug):
  skeleton → [API week returns] → MAŁY GRID (4 tickery) → [resetTimeline + preload] → DUŻY GRID (14+ tickerów)

PO NAPRAWIE - Etap 1 (rozwiązanie E+A):
  skeleton → [API explicit 14 dni + resetTimeline + preload (isReady=true)] → DUŻY GRID
  (skeleton blokuje do isReady=true, presety usunięte, fetch = explicit dates always)
  Zmiana zakresu przez picker: skeleton → [API nowe daty + preload] → GRID z nowym zakresem

PO REFACTORZE - Etap 2 (rozwiązanie D):
  skeleton → [API explicit dates (np. 90 dni)] → GRID (od razu kompletny)
  zmiana range = scroll viewport, brak dodatkowego fetch
```

### 10.4. Zakres pliku po etapach

Po Etapie 1 (Rozwiązanie A):

- `useInfiniteTimeline.ts`: dodany `isReady` state
- `GridView.tsx`: 1 dodana linia w warunku skeleton

Po Etapie 2 (Rozwiązanie D) - pliki do modyfikacji:

- `GridContext.tsx`, `GridView.tsx`, `DateRangeSelector.tsx`
- `useInfiniteTimeline.ts` (aktualizacja initial window)
- `api-service.ts`, `api-client.ts` (usunięcie range overloadu)
- `e2e/**` (mock URL update, test semantics update)
- Usunięcie `isReady` z Etapu 1 (staje się zbędne)
