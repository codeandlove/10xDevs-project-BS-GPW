# Plan Naprawy Błędów - ticker-grid-issues

Data utworzenia: 2026-03-04
Tytul bledu: Niepoprawny widok gridu dla tickerów z 0 zdarzeniami + błędne liczniki w filtrach + brak sortowania
Severity: HIGH
Typ bledu: Business Logic + UI

---

## 1. Podsumowanie wykonawcze

### 1.1. Opis bledu

Trzy odrębne problemy w obszarze filtrowania tickerów i renderowania gridu:

1. Gdy wybrany jest ticker z 0 zdarzeniami w bieżącym zakresie dat, grid wyświetla komunikat "Brak zdarzeń" zamiast pustego wiersza tickera. Grid nie ładuje też historycznych chunków, przez co użytkownik nie może przewinąć wstecz do dat z historycznymi zdarzeniami.
2. W filtrach tickerów licznik wystąpień (`eventCount`) pokazuje 0 dla większości spółek, bo liczy tylko zdarzenia w bieżącym zakresie dat (max 90 dni wstecz), ignorując całą historię.
3. Brak możliwości sortowania listy tickerów w filtrach (A-Z, Z-A, rosnąco/malejąco wg liczby zdarzeń).

### 1.2. Root cause

BUG 1 - Dwa efekty w `GridView.tsx` (linie 155 i 177) blokują wywołanie `resetTimeline` warunkiem `gridResponse.events.length > 0`. Gdy ticker ma 0 zdarzeń, timeline nigdy nie jest inicjalizowany z poprawnymi datami. Warunek renderowania gridu (linia 365) przy 0 zdarzeniach i niezresetowanym timeline pokazuje komunikat błędu. Dodatkowo `useInfiniteTimeline.ts` linia 150 blokuje auto-preload gdy `initialEvents.length === 0`, więc historyczne chunki nie są wczytywane.
BUG 2 - Metoda `getEventCountsBySymbol` w `nocodb.service.ts` (linia 422) używa `calculateDateRange(today, range)` do obliczenia zakresu dat. Dla `range=week` to ostatnie 7 dni, dla `quarter` - 90 dni. Ticker LPP miał ostatnie zdarzenie np. 2 lata temu, więc `eventCount=0`.
FEATURE - `AdvancedTickerFilter.tsx` nie ma stanu sortowania listy.

### 1.3. Zakres wpływu

- Dotknięte komponenty/moduły: `GridView.tsx`, `useInfiniteTimeline.ts`, `nocodb.service.ts`, `symbols.ts`, `useSymbols.ts`, `AdvancedTickerFilter.tsx`
- Dotknięci użytkownicy: wszyscy użytkownicy premium i trial
- Dotknięte środowiska: production, staging, development

### 1.4. Priorytet naprawy

## HIGH - BUG 1 i BUG 2 wpływają bezpośrednio na użyteczność głównej funkcji aplikacji.

## 2. Szczegółowa analiza błędów

### 2.1. BUG 1 - Root cause analysis

Lokalizacja #1: `src/components/grid/GridView.tsx` linia 155
Kod problematyczny:

```typescript
if (gridResponse && gridResponse.events.length > 0 && allEvents.length === 0 && !timelineState.isLoadingBackward) {
  resetTimeline(initialStartDate, initialEndDate, gridResponse.events);
}
```

Warunek `gridResponse.events.length > 0` powoduje, że `resetTimeline` nie jest wywołany gdy ticker ma 0 zdarzeń.
Lokalizacja #2: `src/components/grid/GridView.tsx` linia 177
Kod problematyczny:

```typescript
if ((symbolsChanged || rangeChanged) && gridResponse && gridResponse.events.length > 0) {
  resetTimeline(initialStartDate, initialEndDate, gridResponse.events);
```

To samo - przy zmianie symbolu reset jest blokowany gdy nowy ticker ma 0 zdarzeń.
Lokalizacja #3: `src/components/grid/GridView.tsx` linia 365
Kod problematyczny:

```typescript
} : events.length > 0 || timelineState.chunks.length > 0 ? (
```

VirtualizedGrid powinien być renderowany gdy timeline jest zainicjowany (`timelineState.chunks.length > 0`), niezależnie od `events.length`.
Lokalizacja #4: `src/hooks/useInfiniteTimeline.ts` linia 150
Kod problematyczny:

```typescript
if (
  hasPreloadedRef.current ||
  timelineState.isLoadingBackward ||
  timelineState.chunks.length > 1 ||
  initialEvents.length === 0 // blokuje auto-preload
) {
  return;
}
```

### 2.2. BUG 2 - Root cause analysis

Lokalizacja: `src/services/nocodb.service.ts` linia 422-436
Kod problematyczny:

```typescript
private async getEventCountsBySymbol(range: DateRange): Promise<Map<string, number>> {
  const today = new Date().toISOString().split("T")[0];
  const { startDate, endDate } = calculateDateRange(today, range);  // filtr daty: max 90 dni wstecz
  const eventsResponse = await this.getGridEvents(startDate, endDate);
  // ...
}
```

---

## 3. Analiza zasiegu

### Komponenty frontend:

- `src/components/grid/GridView.tsx` - 3 miejsca, ~15 linii
- `src/components/grid/AdvancedTickerFilter.tsx` - dodanie sortMode + UI (~50 linii)

### Hooki:

- `src/hooks/useInfiniteTimeline.ts` - 1 warunek
- `src/hooks/useSymbols.ts` - zmiana cache key + TTL

### Serwisy:

- `src/services/nocodb.service.ts` - nowa metoda `getAllTimeEventCounts`, zmiana wywołania

### Backend/API:

- `src/pages/api/nocodb/symbols.ts` - zmiana Cache-Control TTL

### Testy:

- `e2e/grid-filtering-advanced.spec.ts` - nowe przypadki testowe

---

## 4. Propozycje rozwiązań

### 4.1. Rozwiązanie A (REKOMENDOWANE)

#### Opis:

Minimalne naprawy każdego problemu oddzielnie. BUG 1: usunięcie warunków `events.length > 0` z efektów resetTimeline + warunek renderowania + auto-preload fix. BUG 2: nowa metoda `getAllTimeEventCounts` w serwisie bez filtra daty, dłuższy TTL cache. FEATURE: `sortMode` state w `AdvancedTickerFilter`.

#### Zakres zmian:

- Frontend: `GridView.tsx`, `AdvancedTickerFilter.tsx`
- Hooki: `useInfiniteTimeline.ts`, `useSymbols.ts`
- Backend: `nocodb.service.ts`, `symbols.ts`
- Testy: `e2e/grid-filtering-advanced.spec.ts`

#### Zalety:

- Minimalne ryzyko regresji - zmiany izolowane
- Nie wymaga zmian w typach ani schemacie API
- Alltime counts z długim TTL (30 min) - rzadkie fetch'e

#### Wady:

- `getEventCountsBySymbol` staje się zbędna (private, można usunąć)
- Alltime query może być wolna jeśli NocoDB ma >50k rekordów

#### Effort: S (2-4 godziny)

#### Ryzyko regresji: LOW

---

### 4.2. Rozwiązanie B

#### Opis:

Dedykowany endpoint `/api/nocodb/symbols/counts` zwracający alltime event counts, osobny hook `useAllTimeCounts`, integracja w `AdvancedTickerFilter` jako overlay.

#### Zalety:

- Czyste separation of concerns
- Alltime counts cache z TTL 1h+

#### Wady:

- Dwa API calls przy otwarciu filtrów
- Więcej nowych plików

#### Effort: M (4-6 godzin)

#### Ryzyko regresji: LOW

---

### 4.3. Rozwiązanie C

#### Opis:

`DateRange` union rozszerzony o `"alltime"`. Obsługa w całym stosie.

#### Wady:

- Zmiana publicznego typu unii - ryzyko regresji
- Największy effort

#### Effort: M-L (6-10 godzin)

#### Ryzyko regresji: MEDIUM

---

## 5. Rekomendacja

### 5.1. Wybrane rozwiązanie

ROZWIĄZANIE A

### 5.2. Uzasadnienie

## Najniższy effort przy pełnym adresowaniu 3 problemów. BUG 1 fix jest czysto izolowany w efektach `GridView` i jednym warunku w `useInfiniteTimeline`. BUG 2 fix w serwisie nie wymaga zmian w typach ani API signature. FEATURE sortowania jest czystą zmianą UI.

## 6. Szczegółowy plan implementacji

### 6.1. Krok 1 - Usunięcie warunku `events.length > 0` z efektu re-initialize

Plik: `src/components/grid/GridView.tsx`
Kod przed zmianą:

```typescript
// Re-initialize timeline when gridResponse loads (fixes timing issue with hasAccess)
useEffect(() => {
  if (gridResponse && gridResponse.events.length > 0 && allEvents.length === 0 && !timelineState.isLoadingBackward) {
    resetTimeline(initialStartDate, initialEndDate, gridResponse.events);
  }
}, [gridResponse, initialStartDate, initialEndDate, resetTimeline, allEvents.length, timelineState.isLoadingBackward]);
```

Kod po zmianie:

```typescript
// Track last gridResponse we initialized from to prevent re-running on every render
const lastInitializedResponseRef = useRef<typeof gridResponse>(null);
// Re-initialize timeline when gridResponse loads (fixes timing issue with hasAccess)
// Note: gridResponse.events may be empty (ticker with no events in current range) -
// we still need to reset timeline so the empty ticker row is visible and historical
// chunks can be loaded by scrolling left.
useEffect(() => {
  if (
    gridResponse &&
    gridResponse !== lastInitializedResponseRef.current &&
    allEvents.length === 0 &&
    !timelineState.isLoadingBackward
  ) {
    lastInitializedResponseRef.current = gridResponse;
    resetTimeline(initialStartDate, initialEndDate, gridResponse.events);
  }
}, [gridResponse, initialStartDate, initialEndDate, resetTimeline, allEvents.length, timelineState.isLoadingBackward]);
```

Uzasadnienie: Ref-based guard zapobiega wielokrotnemu wywołaniu resetTimeline dla tego samego gridResponse. Usunięcie `events.length > 0` pozwala na inicjalizację timeline z pustą tablicą zdarzeń.

### 6.2. Krok 2 - Usunięcie warunku z efektu symbol/range change

Plik: `src/components/grid/GridView.tsx`
Kod przed zmianą:

```typescript
useEffect(() => {
  const symbolsChanged = prevSymbolsKeyRef.current !== symbolsKey;
  const rangeChanged = prevRangeRef.current !== gridState.range;
  if ((symbolsChanged || rangeChanged) && gridResponse && gridResponse.events.length > 0) {
    resetTimeline(initialStartDate, initialEndDate, gridResponse.events);
    prevSymbolsKeyRef.current = symbolsKey;
    prevRangeRef.current = gridState.range;
  }
}, [symbolsKey, gridState.range, gridResponse, initialStartDate, initialEndDate, resetTimeline]);
```

Kod po zmianie:

```typescript
useEffect(() => {
  const symbolsChanged = prevSymbolsKeyRef.current !== symbolsKey;
  const rangeChanged = prevRangeRef.current !== gridState.range;
  // Reset timeline regardless of event count - tickers with 0 events still need
  // a valid timeline so the empty row is shown and historical chunks can be loaded.
  if ((symbolsChanged || rangeChanged) && gridResponse) {
    resetTimeline(initialStartDate, initialEndDate, gridResponse.events);
    prevSymbolsKeyRef.current = symbolsKey;
    prevRangeRef.current = gridState.range;
  }
}, [symbolsKey, gridState.range, gridResponse, initialStartDate, initialEndDate, resetTimeline]);
```

### 6.3. Krok 3 - Poprawka warunku renderowania VirtualizedGrid

Plik: `src/components/grid/GridView.tsx`
Kod przed zmianą:

```typescript
} : events.length > 0 || timelineState.chunks.length > 0 ? (
  <VirtualizedGrid
```

Kod po zmianie:

```typescript
} : timelineState.chunks.length > 0 ? (
  <VirtualizedGrid
```

Uzasadnienie: Grid powinien być widoczny gdy timeline jest zainicjowany, niezależnie od liczby zdarzeń. VirtualizedGrid renderuje wiersze tickerów z `selectedSymbols` - pusty ticker = pusty wiersz.

### 6.4. Krok 4 - Naprawa auto-preload w useInfiniteTimeline

Plik: `src/hooks/useInfiniteTimeline.ts`
Kod przed zmianą:

```typescript
useEffect(() => {
  // Only run once, only if we have initial events loaded
  if (
    hasPreloadedRef.current ||
    timelineState.isLoadingBackward ||
    timelineState.chunks.length > 1 ||
    initialEvents.length === 0
  ) {
    return;
  }
  // ...
}, [loadPreviousChunk, timelineState.isLoadingBackward, timelineState.chunks.length, initialEvents.length]);
```

Kod po zmianie:

```typescript
useEffect(() => {
  // Only run once per timeline reset.
  // initialEvents may be empty (ticker with no events in current range) -
  // we still want to preload historical chunks so the user can scroll left
  // to find dates with events.
  if (hasPreloadedRef.current || timelineState.isLoadingBackward || timelineState.chunks.length > 1) {
    return;
  }
  // ...
}, [loadPreviousChunk, timelineState.isLoadingBackward, timelineState.chunks.length]);
```

### 6.5. Krok 5 - Alltime event counts w serwisie

Plik: `src/services/nocodb.service.ts`
Zmiana w metodzie `getActiveSymbols` - zamiast `getEventCountsBySymbol(range)` wywołujemy `getAllTimeEventCounts()`:
Kod przed zmianą:

```typescript
// If range provided, aggregate event counts per symbol
if (range) {
  const eventCounts = await this.getEventCountsBySymbol(range);
  symbols = symbols.map((symbol) => ({
    ...symbol,
    eventCount: eventCounts.get(symbol.symbol) ?? 0,
  }));
}
```

Kod po zmianie:

```typescript
// If range provided, aggregate ALL-TIME event counts per symbol.
// We intentionally ignore the specific range value - users need all-time
// occurrence counts in the ticker filter, not just current window counts.
// Range-based counts show 0 for tickers with only historical events (e.g. LPP).
if (range) {
  const eventCounts = await this.getAllTimeEventCounts();
  symbols = symbols.map((symbol) => ({
    ...symbol,
    eventCount: eventCounts.get(symbol.symbol) ?? 0,
  }));
}
```

Nowa metoda (po `getEventCountsBySymbol`):

```typescript
/**
 * Get all-time event counts per symbol (no date filter)
 * @returns Map of symbol -> total event count across all history
 */
private async getAllTimeEventCounts(): Promise<Map<string, number>> {
  // Fetch ALL events without date filter
  const queryBuilder = new NocoDBQueryBuilder()
    .sort("occurrence_date", true)
    .limit(50000);
  const eventsResponse = await this.client.queryRecords<NocoDBEventRecord>(
    NOCODB_TABLES.BLACK_SWANS,
    queryBuilder
  );
  const counts = new Map<string, number>();
  eventsResponse.list.forEach((event) => {
    counts.set(event.symbol, (counts.get(event.symbol) ?? 0) + 1);
  });
  return counts;
}
```

### 6.6. Krok 6 - Cache key i TTL w useSymbols

Plik: `src/hooks/useSymbols.ts`
Kod przed zmianą:

```typescript
const SYMBOLS_WITH_COUNTS_TTL = 5 * 60 * 1000; // 5 minutes
export function useSymbols(range?: DateRange) {
  const cacheKey = range ? `${SYMBOLS_CACHE_KEY_BASE}:${range}` : SYMBOLS_CACHE_KEY_BASE;
  const ttl = range ? SYMBOLS_WITH_COUNTS_TTL : SYMBOLS_TTL;
```

Kod po zmianie:

```typescript
const SYMBOLS_WITH_COUNTS_TTL = 30 * 60 * 1000; // 30 minutes (all-time counts change rarely)
export function useSymbols(range?: DateRange) {
  // All-time counts are independent of specific range value - single cache key for all ranges.
  // Without this, week/month/quarter would each trigger a separate identical fetch.
  const cacheKey = range ? `${SYMBOLS_CACHE_KEY_BASE}:alltime` : SYMBOLS_CACHE_KEY_BASE;
  const ttl = range ? SYMBOLS_WITH_COUNTS_TTL : SYMBOLS_TTL;
```

### 6.7. Krok 7 - Cache-Control w API

Plik: `src/pages/api/nocodb/symbols.ts`
Kod przed zmianą:

```typescript
"Cache-Control": range ? "private, max-age=300" : "private, max-age=86400",
```

Kod po zmianie:

```typescript
// All-time event counts change rarely - 30 min TTL is safe
"Cache-Control": range ? "private, max-age=1800" : "private, max-age=86400",
```

### 6.8. Krok 8 - Sortowanie w AdvancedTickerFilter

Plik: `src/components/grid/AdvancedTickerFilter.tsx`
Nowy typ (przed komponentem):

```typescript
type TickerSortMode = "name-asc" | "name-desc" | "count-asc" | "count-desc";
```

Nowy state wewnątrz komponentu (po `searchQuery`):

```typescript
const [sortMode, setSortMode] = useState<TickerSortMode>("name-asc");
```

Zmiana `filteredSymbols` useMemo:

```typescript
const filteredSymbols = useMemo(() => {
  const searched = searchSymbols(searchQuery, symbols);
  return [...searched].sort((a, b) => {
    switch (sortMode) {
      case "name-asc":
        return (a.symbol ?? "").localeCompare(b.symbol ?? "");
      case "name-desc":
        return (b.symbol ?? "").localeCompare(a.symbol ?? "");
      case "count-asc":
        return (a.eventCount ?? 0) - (b.eventCount ?? 0);
      case "count-desc":
        return (b.eventCount ?? 0) - (a.eventCount ?? 0);
      default:
        return 0;
    }
  });
}, [searchQuery, symbols, sortMode]);
```

UI sortowania - dodać w `renderContent()` po bloku "Selected Count":

```typescript
{/* Sort Controls */}
<div className="flex items-center gap-1" role="group" aria-label="Sortowanie listy tickerów">
  <span className="mr-1 text-xs text-muted-foreground">Sortuj:</span>
  {(["name-asc", "name-desc", "count-desc", "count-asc"] as const).map((mode) => {
    const labels: Record<TickerSortMode, string> = {
      "name-asc": "A-Z",
      "name-desc": "Z-A",
      "count-desc": "9→1",
      "count-asc": "1→9",
    };
    const ariaLabels: Record<TickerSortMode, string> = {
      "name-asc": "Sortuj A-Z",
      "name-desc": "Sortuj Z-A",
      "count-desc": "Sortuj malejąco wg zdarzeń",
      "count-asc": "Sortuj rosnąco wg zdarzeń",
    };
    const isCountMode = mode.startsWith("count");
    const countsAvailable = symbols.some((s) => s.eventCount !== undefined);
    return (
      <Button
        key={mode}
        variant={sortMode === mode ? "secondary" : "ghost"}
        size="sm"
        onClick={() => setSortMode(mode)}
        className="h-7 px-2 text-xs"
        aria-label={ariaLabels[mode]}
        title={ariaLabels[mode]}
        disabled={isCountMode && !countsAvailable}
      >
        {labels[mode]}
      </Button>
    );
  })}
</div>
```

---

## 7. Plan weryfikacji i testowania

### 7.1. Manual testing checklist

- [ ] Wybierz ticker z 0 zdarzeniami w week view -> grid pokazuje pusty wiersz tickera, nie "Brak zdarzeń"
- [ ] Przewiń w lewo (historycznie) -> nowe chunki ładują się i pokazują zdarzenia historyczne
- [ ] Zmień range z week na month przy tickerze z 0 zdarzeniami -> grid nadal pokazuje ticker
- [ ] Otwórz filtry -> LPP i inne spółki z historią mają eventCount > 0
- [ ] Sortuj Z-A -> lista odwrócona alfabetycznie
- [ ] Sortuj 9->1 -> spółki z największą liczbą zdarzeń na górze
- [ ] Sortuj 1->9 -> spółki z najmniejszą liczbą zdarzeń na górze
- [ ] Regresja: ticker z > 0 zdarzeniami działa poprawnie
- [ ] Regresja: infinite scroll przy normalnym tickerze nadal działa

### 7.2. Regression testing

- [ ] Normal flow: ticker z > 0 zdarzeniami, zmiana range -> grid aktualizuje się
- [ ] Cache: powrót do tego samego tickera -> dane cached
- [ ] Infinite scroll: przewijanie wstecz przy tickerze z zdarzeniami
- [ ] Zmiana z tickera 0->niezerowe zdarzenia -> grid aktualizuje się prawidłowo
- [ ] Mobile BottomSheet: filtry działają tak samo jak dialog desktop

---

## 8. Analiza ryzyka

### 8.1. Ryzyko 1: Nadmiarowe wywołania resetTimeline

- Severity: MEDIUM
- Prawdopodobieństwo: MEDIUM
- Wpływ: Migotanie gridu, wielokrotne re-rendery
- Mitigation: `lastInitializedResponseRef` w kroku 1 - guard na referencję gridResponse

### 8.2. Ryzyko 2: Koszt zapytania alltime do NocoDB

- Severity: LOW
- Prawdopodobieństwo: LOW
- Wpływ: Wolne otwieranie dialogu filtrów przy pierwszym otwarciu
- Mitigation: TTL 30 minut - max raz na 30 min. Limit 50000 rekordów.

### 8.3. Ryzyko 3: Auto-preload 2 chunków przy każdym resetTimeline

- Severity: LOW
- Prawdopodobieństwo: LOW
- Wpływ: 2 dodatkowe API calls przy zmianie tickera
- Mitigation: `hasPreloadedRef.current` guard odpala preload tylko raz per reset

### 8.4. Rollback plan

1. Cofnąć zmiany w `GridView.tsx` - przywrócić `events.length > 0` w obu efektach i w warunku renderowania
2. Cofnąć zmianę w `useInfiniteTimeline.ts` - dodać `initialEvents.length === 0` z powrotem
3. Cofnąć `getAllTimeEventCounts` w serwisie - przywrócić `getEventCountsBySymbol(range)`
4. Cofnąć cache key i TTL w `useSymbols.ts`
5. Cofnąć `Cache-Control` w `symbols.ts`

---

## 9. Załączniki

### 9.1. Dotknięte pliki

```
src/components/grid/GridView.tsx
src/components/grid/AdvancedTickerFilter.tsx
src/hooks/useInfiniteTimeline.ts
src/hooks/useSymbols.ts
src/services/nocodb.service.ts
src/pages/api/nocodb/symbols.ts
e2e/grid-filtering-advanced.spec.ts
```

### 9.2. Pliki NIE wymagające zmian

```
src/components/grid/TickerList.tsx
src/types/nocodb.types.ts
src/lib/nocodb-validation.ts
src/components/grid/VirtualizedGrid.tsx
```
