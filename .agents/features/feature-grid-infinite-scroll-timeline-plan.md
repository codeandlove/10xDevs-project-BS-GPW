# Plan Implementacji Feature - Grid Infinite Scroll Timeline

Data utworzenia: 2026-02-18
Tytuł feature: Infinite Scroll wstecz w osi czasu z dynamicznym zakresem dat
Typ: Full Feature (UI/UX + Business Logic + API Integration)
Priorytet: HIGH

## 1. Podsumowanie wykonawcze

### 1.1. Opis funkcjonalności

Implementacja infinite scroll w osi poziomej (horizontal) dla Black Swan Grid, umożliwiająca przewijanie wstecz w czasie bez limitu i dynamiczne doładowywanie historycznych dat oraz wydarzeń (lazy loading). Obecnie widoki tydzień/miesiąc/kwartał pokazują statyczny zakres dat od dziś wstecz. Po implementacji użytkownik będzie mógł przewijać grid w lewo (wstecz w czasie) i system automatycznie załaduje kolejne okresy historyczne przed najstarszą widoczną datą.

Dodatkowo, wprowadzenie zaawansowanego selektora zakresu dat (date range picker) z kalendarzem dropdown, który synchronizuje się ze stanem scrollowania i pozwala na ręczne ustawienie zakresu "od-do".

Kluczowe elementy:

- **Infinite scroll wstecz**: Przewijanie w lewo (do najstarszej daty) trigggeruje lazy loading kolejnego "chunka" dat
- **Chunk size matching range**: Tydzień = 7 dni, Miesiąc = 30 dni, Kwartał = 90 dni per chunk
- **Threshold-based trigger**: Ładowanie rozpoczyna się gdy scroll osiągnie 15% od lewej krawędzi
- **Skeleton columns loading**: 3-5 skeleton kolumn po lewej stronie podczas ładowania
- **No limit history**: Brak limitu cofania się w czasie - użytkownik może sięgnąć dowolnie daleko wstecz
- **State persistence**: Zachowanie pozycji scroll i załadowanych dat przy nawigacji w ramach sesji (nie reset przy zmianie filtrów symboli/eventTypes jeśli zakres dat się nie zmienia)
- **Advanced Date Range Picker**: Dropdown z kalendarzem umożliwiający ręczne ustawienie "od-do", synchronizujący się ze stanem scrollowania
- **Refactored API**: Endpoint `/api/nocodb/grid` przyjmuje `start_date` i `end_date` zamiast `range` + `end_date`
- **Improved GridSkeleton**: Skeleton odpowiadający rzeczywistej strukturze gridu (100% width/height, sticky columns)

### 1.2. Value proposition

Użytkownicy zyskują:

- **Nielimitowany dostęp do historii**: Analiza zdarzeń sięgająca dowolnie daleko wstecz bez klikania "poprzednia strona"
- **Płynne UX**: Smooth scrolling bez "page jumps" - naturalna eksploracja danych jak w Google Maps
- **Elastyczny zakres**: Możliwość ustawienia dowolnego zakresu dat (np. 2024-01-01 do 2024-06-30) zamiast sztywnych presetów
- **Wizualna synchronizacja**: Date range picker aktualizuje się automatycznie podczas scrollowania
- **Analityczna swoboda**: Power users mogą ładować dane z wielu kwartałów i analizować trendy długoterminowe
- **Lepsza orientacja**: Skeleton columns pokazują gdzie ładują się dane, brak "pustego gridu"

Biznes zyskuje:

- **Głębsza eksploracja danych**: Użytkownicy spędzają więcej czasu analizując historyczne zdarzenia (+20% session time expected)
- **Redukcja frustracji**: Koniec z pytaniami "dlaczego widzę tylko 7/30/90 dni?" (-15% support tickets expected)
- **Professional feature**: Infinite scroll + date range picker to standard w profesjonalnych narzędziach analitycznych
- **Better data utility**: Subskrybenci widzą pełną wartość danych historycznych = wyższa retencja
- **Competitive advantage**: Większość konkurencji ma paginowane gridy - my oferujemy seamless experience
- **API flexibility**: Refactored endpoint pozwala na przyszłe features (custom reports, exports)

### 1.3. Zakres wpływu

**Nowe komponenty/moduły:**

- `src/types/grid-timeline.types.ts` - typy dla infinite scroll (TimelineState, ChunkMetadata, LoadingBoundary)
- `src/hooks/useInfiniteTimeline.ts` - hook zarządzający stanem infinite scroll (loadedChunks, boundaries, trigger detection)
- `src/hooks/useTimelineScroll.ts` - hook obsługujący scroll detection i threshold calculation
- `src/components/grid/SkeletonColumns.tsx` - skeleton dla doładowywanych kolumn (3-5 columns)
- `src/components/grid/AdvancedDateRangePicker.tsx` - nowy picker z kalendarzem dropdown i synchronizacją
- `src/lib/timeline-utils.ts` - utility functions (calculateChunkDates, mergeEventChunks, getScrollThreshold)

**Modyfikowane komponenty/moduły:**

- `src/types/nocodb.types.ts` - zmiana `DateRange` z `"week" | "month" | "quarter"` na union + custom ranges
- `src/components/grid/VirtualizedGrid.tsx` - integracja infinite scroll, skeleton columns, scroll listeners
- `src/components/grid/GridView.tsx` - zarządzanie timeline state, fetching logic
- `src/components/ui/skeleton.tsx` - refactor `GridSkeleton` aby odpowiadał rzeczywistej strukturze gridu
- `src/contexts/GridContext.tsx` - dodanie `startDate` i `endDate` do GridState, synchronizacja z URL
- `src/lib/ui-utils.ts` - modyfikacja `getDatesInRange` aby przyjmowała custom start/end dates
- `src/lib/api-service.ts` - zmiana `fetchGridData` signature (startDate, endDate zamiast range)
- `src/pages/api/nocodb/grid.ts` - refactor endpoint aby przyjmował `start_date` i `end_date`
- `src/services/nocodb.service.ts` - zmiana `getGridEvents` signature i logiki

**Nowe testy:**

- `src/lib/__tests__/timeline-utils.test.ts` - unit testy dla chunk calculation
- `src/hooks/__tests__/useInfiniteTimeline.test.ts` - hook logic tests
- `e2e/grid-infinite-scroll.spec.ts` - E2E testy dla infinite scroll flows
- `e2e/advanced-date-picker.spec.ts` - E2E testy dla date range picker

**Grupa docelowa użytkowników:** Wszyscy zalogowani użytkownicy z dostępem do premium gridu (hasAccess === true)

**Dotknięte środowiska:** development, staging, production (API changes require deployment)

### 1.4. Priorytet i MVP scope

**HIGH** - Feature znacząco poprawia UX i rozwiązuje kluczowe ograniczenie produktu (brak dostępu do pełnej historii)

**MVP (must-have):**

- Infinite scroll wstecz w osi poziomej z lazy loading
- Threshold 15% od lewej krawędzi triggering load
- Chunk size = 1x range (7/30/90 dni)
- Skeleton columns (3-5) podczas ładowania
- Brak limitu historycznego (użytkownik może cofać się w nieskończoność)
- State persistence w ramach sesji (nie reset przy zmianie filtrów jeśli zakres dat stały)
- Refactored API endpoint (`start_date`, `end_date`)
- Advanced Date Range Picker z kalendarzem dropdown
- Synchronizacja date picker ↔ scroll state
- Improved GridSkeleton (100% layout, sticky columns)
- URL synchronization dla start_date i end_date

**Nice-to-have (może być dodane później):**

- Infinite scroll w przód (future dates - jeśli potrzebne)
- Chunk size optimization (load większe chunki jeśli użytkownik scrolluje szybko)
- Preload adjacent chunks (predictive loading)
- Virtualized chunk management (unload distant chunks aby oszczędzić pamięć)
- Loading progress indicator (% loaded)
- "Jump to date" feature w date picker
- Keyboard shortcuts (Home/End do najstarszej/najnowszej daty)
- Export visible range to CSV
- Bookmarking date ranges

## 2. Szczegółowa analiza wymagań

### 2.1. Wymagania funkcjonalne

**Infinite Scroll:**

1. **[MUST]** System musi wykrywać scroll position w kontenerze gridu i triggerować ładowanie gdy scrollLeft osiągnie 15% od początku (lewej krawędzi)
2. **[MUST]** Podczas ładowania system musi wyświetlić 3-5 skeleton columns po lewej stronie gridu
3. **[MUST]** System musi ładować chunk danych o rozmiarze odpowiadającym aktualnemu range (7/30/90 dni)
4. **[MUST]** Nowo załadowane daty muszą być dodane PRZED najstarszą aktualnie widoczną datą
5. **[MUST]** Po załadowaniu nowych dat scroll position musi być automatycznie skorygowana aby użytkownik pozostał w tej samej wizualnej pozycji (prevent jump)
6. **[MUST]** System nie może mieć limitu historycznego - użytkownik może cofać się dowolnie daleko
7. **[MUST]** System musi obsłużyć edge case: brak danych w załadowanym chunku (puste okresy historyczne)
8. **[MUST]** System musi zapobiec duplicate loading (debounce, loading state)
9. **[MUST]** System musi wyświetlić error state jeśli fetch fails (z retry button)
10. **[MUST]** Przy zmianie range (week → month) lub filtrów eventTypes system NIE resetuje zakresu dat jeśli użytkownik już scrollował

**Date Range Picker:**

11. **[MUST]** Advanced Date Range Picker musi zawierać dropdown z kalendarzem (date inputs + calendar widget)
12. **[MUST]** Picker musi pozwolić na wybór "od" i "do" w formacie YYYY-MM-DD
13. **[MUST]** Picker musi walidować: od < do, maksymalny zakres (opcjonalnie), przyszłe daty niedozwolone
14. **[MUST]** Po wyborze zakresu grid musi załadować dane dla tego zakresu i scrollować do najnowszej daty
15. **[MUST]** Podczas scrollowania picker musi aktualizować wyświetlany zakres (widoczna najstarsza i najnowsza data)
16. **[MUST]** Picker musi nadal wspierać quick presets (Tydzień, Miesiąc, Kwartał) jako skróty
17. **[MUST]** Wybrany zakres musi być zapisany w URL params (`?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD`)
18. **[SHOULD]** Picker musi wizualnie wskazać aktualnie widoczny zakres vs załadowany zakres

**API & Backend:**

19. **[MUST]** Endpoint `/api/nocodb/grid` musi przyjmować `start_date` i `end_date` query params
20. **[MUST]** Endpoint musi zwracać wszystkie events w zadanym zakresie (backward compatible z symbolami filter)
21. **[MUST]** Endpoint musi walidować start_date < end_date
22. **[MUST]** `range` param może pozostać jako opcjonalny alias (jeśli brak start/end, kalkuluj z range)
23. **[MUST]** API musi obsłużyć duże zakresy (np. 1 rok = 365 dni) bez timeout (limit 10000 records)

**Skeleton & Loading:**

24. **[MUST]** `GridSkeleton` musi odpowiadać strukturze rzeczywistego gridu (sticky header, sticky left column, virtualized cells)
25. **[MUST]** `SkeletonColumns` musi renderować 3-5 kolumn z tym samym stylingiem co header dates
26. **[MUST]** Skeleton musi mieć animation (pulse/shimmer)
27. **[SHOULD]** Loading state musi być subtelny (nie blokować całego gridu)

### 2.2. Wymagania niefunkcjonalne

**Performance:**

- Chunk loading time < 500ms dla 30 dni × 100 symboli
- Scroll detection < 16ms (60 FPS)
- GridSkeleton render < 50ms
- Scroll position adjustment < 100ms (imperceptible to user)
- Memory usage: max 50MB dla 1 roku danych w gridzie
- Virtualization musi zapobiec memory leaks (unload old chunks jeśli >1000 columns)

**Accessibility:**

- Skeleton columns muszą mieć aria-label="Ładowanie historycznych dat"
- Loading indicator musi być announowalny przez screen readers
- Date range picker musi być keyboard accessible (Tab, Enter, Escape)
- Error state musi być focusable i mieć clear error message

**Browser compatibility:**

- Intersection Observer API support (for scroll detection) - Chrome 58+, Firefox 55+, Safari 12.1+
- Fallback do scroll event listeners dla starszych przeglądarek

**Responsiveness:**

- Desktop (>=1024px): Skeleton 5 columns, date picker inline w filters
- Tablet (768-1023px): Skeleton 3 columns, date picker inline
- Mobile (<768px): 
  - ✅ Infinite scroll ENABLED (pełna funkcjonalność)
  - Skeleton 3 columns
  - Date picker modal/drawer
  - Ten sam chunk size co desktop (7/30/90)
  - Brak limitu chunków (monitoring performance w production)
  - Warning toast po załadowaniu 10+ chunków: "Załadowano dużo danych - wydajność może spaść"

**Usability:**

- Smooth scroll behavior (no jumps)
- Visual feedback podczas loading (skeleton + optional progress)
- Clear error messages przy fetch failures
- Preserve user context (scroll position) po refresh (URL params)
- Intuitive date picker UX (calendar widget, validation errors inline)

### 2.3. Ograniczenia techniczne

**Ograniczenia Virtual Scroller:**

- `@tanstack/react-virtual` nie wspiera natywnie infinite scroll - musimy zaimplementować custom logic
- Konieczna synchronizacja między `columnVirtualizer.getTotalSize()` a rzeczywistą liczbą załadowanych dat
- Po dodaniu nowych kolumn trzeba przeliczyć virtual scroll offset aby uniknąć jump

**Ograniczenia API:**

- NocoDB może mieć limit 10000 records per query - musimy obsłużyć pagination jeśli zakres >10000 events
- Rate limiting: 60 requests/minute - chunk loading musi być debounced/throttled
- Endpoint response time rośnie liniowo z zakresem dat - konieczne monitorowanie performance

**Ograniczenia przeglądarki:**

- Canvas/DOM memory limit - przy >5000 columns możliwe performance degradation
- Scroll container max width może mieć limit w niektórych przeglądarkach (rare, ale może wystąpić)

**Trade-offs:**

- **Elastic API endpoint**: Zachowanie `range` param daje elastyczność - można używać presetów (quick wins) lub explicit dates (infinite scroll). Slight complexity increase w endpoint logic, ale znacząco lepsza DX i backward compatibility.
- **No infinite scroll forward**: Skupiamy się na history (backward), forward scroll do "dzisiaj" może być dodany później
- **No chunk unloading**: MVP nie usuwa starych chunków z pamięci - może być problem przy scrollowaniu przez wiele lat
- **Simplified chunk strategy**: Chunk size = 1x range (nie optymalizujemy na podstawie scroll velocity)
- **Three-mode endpoint**: Więcej complexity w endpoint logic, ale daje future-proof flexibility (rolling windows, dynamic anchors)

### 2.4. Decyzje projektowe

**Wszystkie decyzje podjęte:**

1. ~~Czy mamy limit cofania w historii?~~ → ✅ **Brak limitu (infinite)**
2. ~~Chunk size?~~ → ✅ **1:1 z range (7/30/90)**
3. ~~State persistence przy zmianie filtrów?~~ → ✅ **TAK - preserve jeśli zakres dat się nie zmienia**
4. ~~Skeleton design?~~ → ✅ **Skeleton columns + refactored GridSkeleton**
5. ~~API backward compatibility?~~ → ✅ **ROZWIĄZANE - elastic endpoint z 3 trybami**
6. ~~Mobile infinite scroll?~~ → ✅ **WŁĄCZONE BEZ LIMITU** (monitoring w production)
7. ~~Max date range validation?~~ → ✅ **BRAK LIMITU** (tylko start < end, no future dates)
8. ~~Chunk unloading?~~ → ✅ **FUTURE ENHANCEMENT** (nie w MVP scope)

**Zidentyfikowane ryzyka:**

| Ryzyko | Prawdopodobieństwo | Wpływ | Mitygacja |
|--------|-------------------|-------|-----------|
| Performance degradation przy >2000 columns | MEDIUM | HIGH | Implement chunk unloading, monitor memory usage, warn user at 1000+ cols |
| Jump effect po dodaniu kolumn | HIGH | MEDIUM | Precyzyjny scroll adjustment calculation, extensive testing |
| Race conditions przy szybkim scrollowaniu | MEDIUM | HIGH | Debounce, loading flag, request cancellation |
| API timeout przy dużych zakresach | LOW | HIGH | Backend optimization, pagination fallback, increase timeout |
| Date picker complexity | MEDIUM | MEDIUM | Use proven library (react-datepicker?), extensive validation tests |
| URL sync conflicts | MEDIUM | MEDIUM | Atomic state updates, careful URL param serialization |
| GridSkeleton mismatch z VirtualizedGrid | MEDIUM | LOW | Shared config object (GRID_CONFIG), visual regression tests |

## 3. Architektura i design

### 3.1. Diagramy przepływu

**3.1.1. User Flow - Infinite Scroll Backward**

```
┌─────────────────────────────────────────────────────────────────┐
│                     USER: Scrolluje grid w lewo                  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
                    ┌────────────────────┐
                    │ useTimelineScroll  │
                    │ detectuje scroll   │
                    │ position <= 15%    │
                    └─────────┬──────────┘
                              │
                              ▼
                         [Threshold    ]───NO──▶ (continue)
                         [  osiągnięty?]
                              │ YES
                              ▼
                    ┌────────────────────┐
                    │ useInfiniteTimeline│
                    │ sprawdza loading   │
                    │ flag               │
                    └─────────┬──────────┘
                              │
                         [Loading=true?]───YES──▶ (skip, prevent duplicate)
                              │ NO
                              ▼
                    ┌────────────────────┐
                    │ Set loading=true   │
                    │ Show skeleton cols │
                    └─────────┬──────────┘
                              │
                              ▼
                    ┌────────────────────────┐
                    │ Calculate chunk dates  │
                    │ (oldestDate - chunkSize)│
                    └─────────┬──────────────┘
                              │
                              ▼
                    ┌────────────────────┐
                    │ fetchGridData(     │
                    │   startDate,       │
                    │   endDate,         │
                    │   symbols          │
                    │ )                  │
                    └─────────┬──────────┘
                              │
                    ┌─────────▼──────────┐
                    │  API Response      │
                    └─────────┬──────────┘
                              │
                         [Success?]───NO──▶ Show error, retry button
                              │ YES
                              ▼
                    ┌────────────────────┐
                    │ Merge new events   │
                    │ with existing      │
                    └─────────┬──────────┘
                              │
                              ▼
                    ┌────────────────────┐
                    │ Prepend new dates  │
                    │ to dates array     │
                    └─────────┬──────────┘
                              │
                              ▼
                    ┌────────────────────────┐
                    │ Calculate scroll offset│
                    │ adjustment (prevent    │
                    │ visual jump)           │
                    └─────────┬──────────────┘
                              │
                              ▼
                    ┌────────────────────┐
                    │ Update virtualized │
                    │ grid (re-measure)  │
                    └─────────┬──────────┘
                              │
                              ▼
                    ┌────────────────────┐
                    │ Set loading=false  │
                    │ Hide skeleton      │
                    └─────────┬──────────┘
                              │
                              ▼
                    ┌────────────────────┐
                    │ Update date range  │
                    │ picker display     │
                    └────────────────────┘
```

**3.1.2. User Flow - Date Range Picker Selection**

```
┌─────────────────────────────────────────────────────────────────┐
│          USER: Otwiera Advanced Date Range Picker                │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
                    ┌────────────────────┐
                    │ Show dropdown with │
                    │ calendar + inputs  │
                    └─────────┬──────────┘
                              │
                              ▼
                    ┌────────────────────┐
                    │ USER: Wybiera      │
                    │ start_date (od)    │
                    └─────────┬──────────┘
                              │
                              ▼
                    ┌────────────────────┐
                    │ USER: Wybiera      │
                    │ end_date (do)      │
                    └─────────┬──────────┘
                              │
                              ▼
                    ┌────────────────────┐
                    │ Validate range:    │
                    │ - od < do?         │
                    │ - od < today?      │
                    │ - max range limit? │
                    └─────────┬──────────┘
                              │
                         [Valid?]───NO──▶ Show inline error
                              │ YES
                              ▼
                    ┌────────────────────┐
                    │ Update GridContext │
                    │ startDate, endDate │
                    └─────────┬──────────┘
                              │
                              ▼
                    ┌────────────────────┐
                    │ Update URL params  │
                    │ ?start_date=...    │
                    │ &end_date=...      │
                    └─────────┬──────────┘
                              │
                              ▼
                    ┌────────────────────┐
                    │ Reset loaded       │
                    │ chunks state       │
                    └─────────┬──────────┘
                              │
                              ▼
                    ┌────────────────────┐
                    │ fetchGridData(     │
                    │   startDate,       │
                    │   endDate,         │
                    │   symbols          │
                    │ )                  │
                    └─────────┬──────────┘
                              │
                              ▼
                    ┌────────────────────┐
                    │ Render grid with   │
                    │ new date range     │
                    └─────────┬──────────┘
                              │
                              ▼
                    ┌────────────────────┐
                    │ Scroll to newest   │
                    │ date (right edge)  │
                    └────────────────────┘
```

### 3.2. Diagramy architektoniczne

**3.2.1. Component Architecture**

```
┌──────────────────────────────────────────────────────────────────────┐
│                          GridPageWrapper                              │
│                       (Astro island root)                             │
└────────────────────────────┬─────────────────────────────────────────┘
                             │
                             ▼
                    ┌────────────────────┐
                    │   GridProvider     │
                    │  (GridContext)     │
                    │                    │
                    │  State:            │
                    │  - startDate       │
                    │  - endDate         │
                    │  - range (alias)   │
                    │  - symbols         │
                    │  - eventTypes      │
                    └─────────┬──────────┘
                              │
                              ▼
                    ┌────────────────────┐
                    │     GridView       │
                    │                    │
                    │ - useInfiniteTimeline
                    │ - fetchGridData    │
                    │ - merge events     │
                    └─────────┬──────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
              ▼               ▼               ▼
    ┌─────────────┐  ┌──────────────┐  ┌──────────────┐
    │AdvancedDate │  │ VirtualizedGrid│ │SkeletonColumns│
    │RangePicker  │  │                │  │              │
    │             │  │ - useTimeline  │  │(prepended to │
    │- Calendar   │  │   Scroll       │  │ dates array) │
    │- Validation │  │- Scroll detect │  │              │
    │- Sync state │  │- Threshold calc│  │              │
    └─────────────┘  └────────┬───────┘  └──────────────┘
                              │
                              ▼
                    ┌────────────────────┐
                    │   GridCell         │
                    │ (memoized)         │
                    └────────────────────┘
```

**3.2.2. Data Flow**

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │ 1. User scrolls / picks date range
       ▼
┌─────────────────────────────┐
│  useInfiniteTimeline hook   │
│                             │
│ State:                      │
│ - loadedChunks: Chunk[]     │
│ - oldestDate: string        │
│ - newestDate: string        │
│ - isLoading: boolean        │
│ - error: Error | null       │
└──────────┬──────────────────┘
           │ 2. Trigger fetch
           ▼
┌─────────────────────────────┐
│   fetchGridData(            │
│     startDate,              │
│     endDate,                │
│     symbols                 │
│   )                         │
└──────────┬──────────────────┘
           │ 3. HTTP GET
           ▼
┌─────────────────────────────┐
│ /api/nocodb/grid            │
│                             │
│ Params:                     │
│ - start_date=YYYY-MM-DD     │
│ - end_date=YYYY-MM-DD       │
│ - symbols=ABC,XYZ (optional)│
└──────────┬──────────────────┘
           │ 4. Query NocoDB
           ▼
┌─────────────────────────────┐
│   NocoDBService             │
│                             │
│ getGridEvents(              │
│   startDate,                │
│   endDate,                  │
│   symbols                   │
│ )                           │
└──────────┬──────────────────┘
           │ 5. NocoDB API call
           ▼
┌─────────────────────────────┐
│   NocoDB Database           │
│                             │
│ Table: black_swan_events    │
│ Filter:                     │
│ WHERE occurrence_date       │
│   BETWEEN start AND end     │
└──────────┬──────────────────┘
           │ 6. Return records
           ▼
┌─────────────────────────────┐
│   GridResponse              │
│                             │
│ {                           │
│   events: BlackSwanEvent[], │
│   total_count: number       │
│ }                           │
└──────────┬──────────────────┘
           │ 7. Transform & merge
           ▼
┌─────────────────────────────┐
│   useInfiniteTimeline       │
│                             │
│ - Merge new events          │
│ - Prepend dates             │
│ - Update chunks metadata    │
└──────────┬──────────────────┘
           │ 8. Re-render
           ▼
┌─────────────────────────────┐
│   VirtualizedGrid           │
│                             │
│ - Virtualize expanded dates │
│ - Adjust scroll offset      │
│ - Render cells              │
└─────────────────────────────┘
```

### 3.3. State management

**3.3.1. GridContext Extensions**

```typescript
// src/contexts/GridContext.tsx

interface GridState {
  // Existing
  range: DateRange; // Może pozostać jako alias dla backward compatibility
  symbols: string[];
  eventTypes: EventType[];
  eventId?: string;
  sortField: "date" | "percent_change" | "symbol";
  sortDirection: "asc" | "desc";
  
  // NEW
  startDate: string; // YYYY-MM-DD - najstarsza data w zakresie
  endDate: string;   // YYYY-MM-DD - najnowsza data (zazwyczaj dzisiaj lub wybrana)
}

interface GridContextValue {
  // Existing
  gridState: GridState;
  setRange: (range: DateRange) => void;
  setSymbols: (symbols: string[]) => void;
  setEventTypes: (types: EventType[]) => void;
  setSort: (sort: { field: "date" | "percent_change" | "symbol"; direction: "asc" | "desc" }) => void;
  setEventId: (eventId: string | undefined) => void;
  clearFilters: () => void;
  
  // NEW
  setDateRange: (startDate: string, endDate: string) => void;
  // Helper: setRange może automatycznie kalkulować startDate/endDate z range
}
```

**3.3.2. Infinite Timeline State**

```typescript
// src/hooks/useInfiniteTimeline.ts

interface Chunk {
  id: string; // `${startDate}_${endDate}`
  startDate: string;
  endDate: string;
  events: BlackSwanEventMinimal[];
  loadedAt: number; // timestamp
}

interface TimelineState {
  chunks: Chunk[];
  oldestLoadedDate: string; // Najstarsza data across all chunks
  newestLoadedDate: string; // Najnowsza data across all chunks
  isLoadingBackward: boolean;
  error: Error | null;
}

// Hook returns
interface UseInfiniteTimelineReturn {
  timelineState: TimelineState;
  loadPreviousChunk: () => Promise<void>;
  resetTimeline: () => void;
  allEvents: BlackSwanEventMinimal[]; // Merged from all chunks
  allDates: string[]; // Merged unique dates sorted
}
```

### 3.4. Komponenty i moduły

**3.4.1. Nowe pliki**

```
src/
├── types/
│   └── grid-timeline.types.ts         # Typy dla infinite scroll
│
├── hooks/
│   ├── useInfiniteTimeline.ts         # Zarządzanie chunks i loading
│   └── useTimelineScroll.ts           # Scroll detection logic
│
├── components/
│   └── grid/
│       ├── SkeletonColumns.tsx        # Skeleton dla loading columns
│       └── AdvancedDateRangePicker.tsx # Nowy picker z kalendarzem
│
└── lib/
    └── timeline-utils.ts              # Helper functions
```

**3.4.2. Modyfikowane pliki**

```
src/
├── types/
│   └── nocodb.types.ts                # DateRange type extension
│
├── contexts/
│   └── GridContext.tsx                # startDate, endDate state
│
├── components/
│   ├── grid/
│   │   ├── VirtualizedGrid.tsx        # Infinite scroll integration
│   │   └── GridView.tsx               # Timeline hook integration
│   └── ui/
│       └── skeleton.tsx               # GridSkeleton refactor
│
├── lib/
│   ├── ui-utils.ts                    # getDatesInRange refactor
│   └── api-service.ts                 # fetchGridData signature change
│
├── services/
│   └── nocodb.service.ts              # getGridEvents refactor
│
└── pages/
    └── api/
        └── nocodb/
            └── grid.ts                # Endpoint refactor (start_date, end_date)
```

**3.4.3. Component Responsibilities**

| Komponent | Odpowiedzialności |
|-----------|------------------|
| `useInfiniteTimeline` | Zarządzanie chunks, triggering loads, merging events, state persistence |
| `useTimelineScroll` | Detekowanie scroll position, threshold calculation, debouncing |
| `SkeletonColumns` | Renderowanie 3-5 skeleton columns z styling jak header dates |
| `AdvancedDateRangePicker` | Calendar widget, validation, synchronizacja ze scroll state |
| `VirtualizedGrid` | Integracja infinite scroll hooks, skeleton columns rendering, scroll offset adjustment |
| `GridView` | Orchestration - fetching, timeline state management, error handling |
| `timeline-utils.ts` | calculateChunkDates, mergeEventChunks, getScrollThreshold, adjustScrollOffset |

### 3.5. API changes

**3.5.1. Endpoint signature - Elastic approach**

Endpoint wspiera **3 tryby działania** z priorytetyzacją parametrów:

**Tryb 1: Explicit date range (HIGHEST PRIORITY)**
```typescript
GET /api/nocodb/grid?start_date=2026-01-01&end_date=2026-02-18&symbols=ABC,XYZ
// Używa dokładnie podanych dat (infinite scroll, custom range picker)
```

**Tryb 2: Range with custom end_date (MEDIUM PRIORITY)**
```typescript
GET /api/nocodb/grid?range=week&end_date=2026-02-10&symbols=ABC,XYZ
// Kalkuluje start_date = end_date - 7 dni
// Użycie: Legacy code, preset selection z custom anchor date
```

**Tryb 3: Range only (BACKWARD COMPATIBLE)**
```typescript
GET /api/nocodb/grid?range=week&symbols=ABC,XYZ
// Kalkuluje: end_date = today, start_date = today - 7 dni
// Użycie: Domyślne zachowanie, quick presets
```

**Logika priorytetów:**
```typescript
if (start_date && end_date) {
  // Tryb 1: Use explicit dates
  return { startDate: start_date, endDate: end_date };
} else if (range && end_date) {
  // Tryb 2: Calculate start_date from range + end_date
  const chunkSize = getChunkSize(range);
  const start = new Date(end_date);
  start.setDate(start.getDate() - chunkSize);
  return { startDate: start.toISOString().split("T")[0], endDate: end_date };
} else if (range) {
  // Tryb 3: Calculate both from range (today as anchor)
  const today = new Date();
  const chunkSize = getChunkSize(range);
  const start = new Date(today);
  start.setDate(start.getDate() - chunkSize);
  return { startDate: start.toISOString().split("T")[0], endDate: today.toISOString().split("T")[0] };
} else {
  throw new Error("Must provide either (start_date+end_date) OR range");
}
```

**3.5.2. Query params validation**

```typescript
// src/lib/nocodb-validation.ts

export const GridQuerySchema = z.object({
  // Date range params (flexible)
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  
  // Range param (preserved for presets and legacy)
  range: z.enum(["week", "month", "quarter"]).optional(),
  
  // Existing
  symbols: z.string().optional(),
}).refine(
  (data) => {
    // Must have at least ONE of:
    // 1. Both start_date + end_date
    // 2. range (with optional end_date)
    const hasExplicitRange = data.start_date && data.end_date;
    const hasRange = data.range;
    return hasExplicitRange || hasRange;
  },
  { message: "Must provide either (start_date + end_date) OR range" }
).refine(
  (data) => {
    // If both start_date and end_date provided, validate order
    if (data.start_date && data.end_date) {
      return new Date(data.start_date) < new Date(data.end_date);
    }
    return true;
  },
  { message: "start_date must be before end_date" }
).refine(
  (data) => {
    // If start_date provided without end_date (invalid)
    if (data.start_date && !data.end_date) {
      return false;
    }
    // If end_date provided without start_date, range must be present
    if (data.end_date && !data.start_date) {
      return !!data.range;
    }
    return true;
  },
  { message: "start_date requires end_date, or use range with optional end_date" }
);
```

**3.5.3. Use cases mapping**

| Use Case | Params | Behavior |
|----------|--------|----------|
| Infinite scroll load chunk | `start_date` + `end_date` + `symbols` | Explicit date range |
| Custom date picker | `start_date` + `end_date` + `symbols` | Explicit date range |
| Quick preset (Tydzień) | `range=week` + `symbols` | Calculate from today |
| Quick preset with anchor | `range=week` + `end_date=2026-02-10` | Calculate start from anchor |
| Legacy code | `range=month` + `end_date` (optional) | Backward compatible |
| Future: Rolling window | `range=week` + `end_date=latest_event_date` | Dynamic anchor |

## 4. Szczegółowy plan implementacji

### Faza 0: Przygotowanie i setup (0.5 dnia)

**Zadania:**
1. ✅ Checkpoint 1: Doprecyzowanie wymagań (COMPLETED)
2. ✅ Analiza istniejącego kodu (COMPLETED)
3. Utworzenie feature branch: `feature/grid-infinite-scroll-timeline`
4. Przegląd dokumentacji `@tanstack/react-virtual` (potential pitfalls)

**Deliverables:**
- Feature branch ready
- Notes dokumentujące potential issues

---

### Faza 1: Type system & utilities (1 dzień)

#### Krok 1.1: Rozszerzenie typów

**Plik**: `src/types/grid-timeline.types.ts` (nowy)

```typescript
import type { BlackSwanEventMinimal } from "./nocodb.types";

/**
 * Chunk of timeline data (loaded period)
 */
export interface TimelineChunk {
  id: string; // `${startDate}_${endDate}`
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  events: BlackSwanEventMinimal[];
  loadedAt: number; // timestamp for cache invalidation
}

/**
 * Loading boundary (threshold point)
 */
export interface LoadingBoundary {
  threshold: number; // Scroll position that triggers load (in pixels)
  direction: "backward" | "forward"; // Which direction
}

/**
 * Timeline state
 */
export interface TimelineState {
  chunks: TimelineChunk[];
  oldestLoadedDate: string;
  newestLoadedDate: string;
  isLoadingBackward: boolean;
  isLoadingForward: boolean; // Future use
  error: Error | null;
}

/**
 * Chunk metadata
 */
export interface ChunkMetadata {
  totalEvents: number;
  dateRange: { start: string; end: string };
  symbolCount: number;
}
```

**Plik**: `src/types/nocodb.types.ts` (modyfikacja)

```typescript
// PRZED
export type DateRange = "week" | "month" | "quarter";

// PO
export type DateRange = 
  | "week" 
  | "month" 
  | "quarter"
  | `custom:${string}:${string}`; // Format: custom:YYYY-MM-DD:YYYY-MM-DD

// Helper type guard
export function isCustomDateRange(range: DateRange): boolean {
  return range.startsWith("custom:");
}

export function parseCustomDateRange(range: DateRange): { startDate: string; endDate: string } | null {
  if (!isCustomDateRange(range)) return null;
  const parts = range.split(":");
  if (parts.length !== 3) return null;
  return { startDate: parts[1], endDate: parts[2] };
}
```

#### Krok 1.2: Timeline utilities

**Plik**: `src/lib/timeline-utils.ts` (nowy)

```typescript
import type { TimelineChunk, ChunkMetadata } from "@/types/grid-timeline.types";
import type { BlackSwanEventMinimal, DateRange } from "@/types/nocodb.types";

/**
 * Calculate chunk size in days based on range
 */
export function getChunkSize(range: DateRange): number {
  switch (range) {
    case "week":
      return 7;
    case "month":
      return 30;
    case "quarter":
      return 90;
    default:
      // Custom range - return 30 as default chunk
      return 30;
  }
}

/**
 * Calculate previous chunk date range
 * @param oldestDate - Current oldest date in timeline
 * @param chunkSize - Size of chunk in days
 * @returns { startDate, endDate } for the previous chunk
 */
export function calculatePreviousChunk(
  oldestDate: string,
  chunkSize: number
): { startDate: string; endDate: string } {
  const oldest = new Date(oldestDate);
  
  // endDate = oldestDate - 1 day
  const endDate = new Date(oldest);
  endDate.setDate(endDate.getDate() - 1);
  
  // startDate = endDate - chunkSize days
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - chunkSize + 1);
  
  return {
    startDate: startDate.toISOString().split("T")[0],
    endDate: endDate.toISOString().split("T")[0],
  };
}

/**
 * Merge events from multiple chunks, removing duplicates
 */
export function mergeEventChunks(chunks: TimelineChunk[]): BlackSwanEventMinimal[] {
  const eventMap = new Map<string, BlackSwanEventMinimal>();
  
  chunks.forEach((chunk) => {
    chunk.events.forEach((event) => {
      const key = `${event.symbol}-${event.occurrence_date}`;
      if (!eventMap.has(key)) {
        eventMap.set(key, event);
      }
    });
  });
  
  return Array.from(eventMap.values());
}

/**
 * Get all unique dates from chunks, sorted oldest to newest
 */
export function getAllDatesFromChunks(chunks: TimelineChunk[]): string[] {
  const dateSet = new Set<string>();
  
  chunks.forEach((chunk) => {
    const chunkStart = new Date(chunk.startDate);
    const chunkEnd = new Date(chunk.endDate);
    
    for (let d = new Date(chunkStart); d <= chunkEnd; d.setDate(d.getDate() + 1)) {
      dateSet.add(d.toISOString().split("T")[0]);
    }
  });
  
  return Array.from(dateSet).sort();
}

/**
 * Calculate scroll threshold (15% from left edge)
 */
export function getScrollThreshold(scrollWidth: number): number {
  return scrollWidth * 0.15;
}

/**
 * Calculate scroll offset adjustment to prevent visual jump
 * When prepending columns, we need to adjust scrollLeft to keep same visual position
 */
export function calculateScrollAdjustment(
  previousColumnCount: number,
  newColumnCount: number,
  columnWidth: number
): number {
  const addedColumns = newColumnCount - previousColumnCount;
  return addedColumns * columnWidth;
}

/**
 * Get chunk metadata
 */
export function getChunkMetadata(chunk: TimelineChunk): ChunkMetadata {
  const symbolSet = new Set(chunk.events.map((e) => e.symbol));
  
  return {
    totalEvents: chunk.events.length,
    dateRange: { start: chunk.startDate, end: chunk.endDate },
    symbolCount: symbolSet.size,
  };
}
```

**Testy**: `src/lib/__tests__/timeline-utils.test.ts`

```typescript
import { describe, it, expect } from "vitest";
import {
  getChunkSize,
  calculatePreviousChunk,
  mergeEventChunks,
  getAllDatesFromChunks,
  calculateScrollAdjustment,
} from "../timeline-utils";

describe("timeline-utils", () => {
  describe("getChunkSize", () => {
    it("should return correct chunk sizes", () => {
      expect(getChunkSize("week")).toBe(7);
      expect(getChunkSize("month")).toBe(30);
      expect(getChunkSize("quarter")).toBe(90);
    });
  });

  describe("calculatePreviousChunk", () => {
    it("should calculate previous week chunk", () => {
      const result = calculatePreviousChunk("2026-02-18", 7);
      expect(result).toEqual({
        startDate: "2026-02-11",
        endDate: "2026-02-17",
      });
    });

    it("should handle month boundaries", () => {
      const result = calculatePreviousChunk("2026-02-01", 7);
      expect(result).toEqual({
        startDate: "2026-01-25",
        endDate: "2026-01-31",
      });
    });
  });

  describe("mergeEventChunks", () => {
    it("should merge events from multiple chunks without duplicates", () => {
      const chunks = [
        {
          id: "1",
          startDate: "2026-01-01",
          endDate: "2026-01-07",
          events: [
            { id: "1", symbol: "ABC", occurrence_date: "2026-01-05", event_type: "BLACK_SWAN_UP", percent_change: 5, has_summary: true },
          ],
          loadedAt: Date.now(),
        },
        {
          id: "2",
          startDate: "2026-01-08",
          endDate: "2026-01-14",
          events: [
            { id: "2", symbol: "XYZ", occurrence_date: "2026-01-10", event_type: "BLACK_SWAN_DOWN", percent_change: -5, has_summary: true },
            { id: "1", symbol: "ABC", occurrence_date: "2026-01-05", event_type: "BLACK_SWAN_UP", percent_change: 5, has_summary: true }, // Duplicate
          ],
          loadedAt: Date.now(),
        },
      ];

      const merged = mergeEventChunks(chunks);
      expect(merged).toHaveLength(2);
      expect(merged.map((e) => e.id)).toContain("1");
      expect(merged.map((e) => e.id)).toContain("2");
    });
  });

  describe("calculateScrollAdjustment", () => {
    it("should calculate correct scroll offset", () => {
      const adjustment = calculateScrollAdjustment(10, 17, 140);
      expect(adjustment).toBe(7 * 140); // 980px
    });
  });
});
```

**Deliverables:**
- ✅ Type definitions
- ✅ Utility functions
- ✅ Unit tests (>90% coverage)

---

### Faza 2: Hooks implementation (2 dni)

#### Krok 2.1: useTimelineScroll hook

**Plik**: `src/hooks/useTimelineScroll.ts` (nowy)

```typescript
import { useEffect, useState, useRef, useCallback } from "react";
import { getScrollThreshold } from "@/lib/timeline-utils";

interface UseTimelineScrollProps {
  scrollElement: HTMLElement | null;
  isLoading: boolean;
  onThresholdReached: () => void;
}

interface UseTimelineScrollReturn {
  scrollLeft: number;
  scrollWidth: number;
  thresholdReached: boolean;
}

/**
 * Hook to detect scroll position and trigger loading at threshold
 */
export function useTimelineScroll({
  scrollElement,
  isLoading,
  onThresholdReached,
}: UseTimelineScrollProps): UseTimelineScrollReturn {
  const [scrollLeft, setScrollLeft] = useState(0);
  const [scrollWidth, setScrollWidth] = useState(0);
  const [thresholdReached, setThresholdReached] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const handleScroll = useCallback(() => {
    if (!scrollElement || isLoading) return;

    const currentScrollLeft = scrollElement.scrollLeft;
    const currentScrollWidth = scrollElement.scrollWidth;
    const threshold = getScrollThreshold(currentScrollWidth);

    setScrollLeft(currentScrollLeft);
    setScrollWidth(currentScrollWidth);

    // Check if threshold reached (15% from left)
    if (currentScrollLeft <= threshold && !thresholdReached) {
      setThresholdReached(true);
      
      // Debounce to prevent multiple triggers
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        onThresholdReached();
        setThresholdReached(false);
      }, 300);
    }
  }, [scrollElement, isLoading, thresholdReached, onThresholdReached]);

  useEffect(() => {
    if (!scrollElement) return;

    scrollElement.addEventListener("scroll", handleScroll, { passive: true });
    
    // Initial check
    handleScroll();

    return () => {
      scrollElement.removeEventListener("scroll", handleScroll);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [scrollElement, handleScroll]);

  return { scrollLeft, scrollWidth, thresholdReached };
}
```

#### Krok 2.2: useInfiniteTimeline hook

**Plik**: `src/hooks/useInfiniteTimeline.ts` (nowy)

```typescript
import { useState, useCallback, useMemo } from "react";
import type { TimelineState, TimelineChunk } from "@/types/grid-timeline.types";
import type { BlackSwanEventMinimal, DateRange } from "@/types/nocodb.types";
import {
  calculatePreviousChunk,
  mergeEventChunks,
  getAllDatesFromChunks,
  getChunkSize,
} from "@/lib/timeline-utils";
import { fetchGridData } from "@/lib/api-service";

interface UseInfiniteTimelineProps {
  range: DateRange;
  symbols: string[];
  initialStartDate: string;
  initialEndDate: string;
  initialEvents: BlackSwanEventMinimal[];
}

interface UseInfiniteTimelineReturn {
  timelineState: TimelineState;
  loadPreviousChunk: () => Promise<void>;
  resetTimeline: (newStartDate: string, newEndDate: string) => void;
  allEvents: BlackSwanEventMinimal[];
  allDates: string[];
}

export function useInfiniteTimeline({
  range,
  symbols,
  initialStartDate,
  initialEndDate,
  initialEvents,
}: UseInfiniteTimelineProps): UseInfiniteTimelineReturn {
  const [timelineState, setTimelineState] = useState<TimelineState>(() => ({
    chunks: [
      {
        id: `${initialStartDate}_${initialEndDate}`,
        startDate: initialStartDate,
        endDate: initialEndDate,
        events: initialEvents,
        loadedAt: Date.now(),
      },
    ],
    oldestLoadedDate: initialStartDate,
    newestLoadedDate: initialEndDate,
    isLoadingBackward: false,
    isLoadingForward: false,
    error: null,
  }));

  /**
   * Load previous chunk (backward in time)
   */
  const loadPreviousChunk = useCallback(async () => {
    if (timelineState.isLoadingBackward) {
      console.log("[useInfiniteTimeline] Already loading, skipping");
      return;
    }

    setTimelineState((prev) => ({ ...prev, isLoadingBackward: true, error: null }));

    try {
      const chunkSize = getChunkSize(range);
      const { startDate, endDate } = calculatePreviousChunk(
        timelineState.oldestLoadedDate,
        chunkSize
      );

      console.log(`[useInfiniteTimeline] Loading chunk: ${startDate} to ${endDate}`);

      const response = await fetchGridData(startDate, endDate, symbols);

      const newChunk: TimelineChunk = {
        id: `${startDate}_${endDate}`,
        startDate,
        endDate,
        events: response.events,
        loadedAt: Date.now(),
      };

      setTimelineState((prev) => ({
        ...prev,
        chunks: [newChunk, ...prev.chunks], // Prepend
        oldestLoadedDate: startDate,
        isLoadingBackward: false,
      }));

      console.log(`[useInfiniteTimeline] Loaded ${response.events.length} events`);
    } catch (error) {
      console.error("[useInfiniteTimeline] Failed to load chunk:", error);
      setTimelineState((prev) => ({
        ...prev,
        isLoadingBackward: false,
        error: error as Error,
      }));
    }
  }, [range, symbols, timelineState.oldestLoadedDate, timelineState.isLoadingBackward]);

  /**
   * Reset timeline (e.g., when date range picker changes)
   */
  const resetTimeline = useCallback((newStartDate: string, newEndDate: string) => {
    console.log(`[useInfiniteTimeline] Resetting timeline: ${newStartDate} to ${newEndDate}`);
    setTimelineState({
      chunks: [],
      oldestLoadedDate: newStartDate,
      newestLoadedDate: newEndDate,
      isLoadingBackward: false,
      isLoadingForward: false,
      error: null,
    });
  }, []);

  /**
   * Memoized merged events
   */
  const allEvents = useMemo(() => {
    return mergeEventChunks(timelineState.chunks);
  }, [timelineState.chunks]);

  /**
   * Memoized all dates
   */
  const allDates = useMemo(() => {
    return getAllDatesFromChunks(timelineState.chunks);
  }, [timelineState.chunks]);

  return {
    timelineState,
    loadPreviousChunk,
    resetTimeline,
    allEvents,
    allDates,
  };
}
```

**Testy**: `src/hooks/__tests__/useInfiniteTimeline.test.ts`

```typescript
import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useInfiniteTimeline } from "../useInfiniteTimeline";
import * as apiService from "@/lib/api-service";

vi.mock("@/lib/api-service");

describe("useInfiniteTimeline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should initialize with initial chunk", () => {
    const { result } = renderHook(() =>
      useInfiniteTimeline({
        range: "week",
        symbols: ["ABC"],
        initialStartDate: "2026-02-11",
        initialEndDate: "2026-02-18",
        initialEvents: [],
      })
    );

    expect(result.current.timelineState.chunks).toHaveLength(1);
    expect(result.current.timelineState.oldestLoadedDate).toBe("2026-02-11");
    expect(result.current.timelineState.newestLoadedDate).toBe("2026-02-18");
  });

  it("should load previous chunk on loadPreviousChunk call", async () => {
    vi.mocked(apiService.fetchGridData).mockResolvedValue({
      events: [
        {
          id: "1",
          symbol: "ABC",
          occurrence_date: "2026-02-05",
          event_type: "BLACK_SWAN_UP",
          percent_change: 5,
          has_summary: true,
        },
      ],
    });

    const { result } = renderHook(() =>
      useInfiniteTimeline({
        range: "week",
        symbols: ["ABC"],
        initialStartDate: "2026-02-11",
        initialEndDate: "2026-02-18",
        initialEvents: [],
      })
    );

    await act(async () => {
      await result.current.loadPreviousChunk();
    });

    await waitFor(() => {
      expect(result.current.timelineState.chunks).toHaveLength(2);
      expect(result.current.timelineState.oldestLoadedDate).toBe("2026-02-04");
    });
  });

  it("should prevent duplicate loading", async () => {
    const { result } = renderHook(() =>
      useInfiniteTimeline({
        range: "week",
        symbols: ["ABC"],
        initialStartDate: "2026-02-11",
        initialEndDate: "2026-02-18",
        initialEvents: [],
      })
    );

    act(() => {
      result.current.loadPreviousChunk();
      result.current.loadPreviousChunk(); // Second call should be ignored
    });

    expect(apiService.fetchGridData).toHaveBeenCalledTimes(1);
  });
});
```

**Deliverables:**
- ✅ useTimelineScroll hook
- ✅ useInfiniteTimeline hook
- ✅ Hook tests

---

### Faza 3: Component implementation (2 dni)

#### Krok 3.1: SkeletonColumns component

**Plik**: `src/components/grid/SkeletonColumns.tsx` (nowy)

```typescript
/**
 * Skeleton Columns Component
 * Shows loading state for infinite scroll (prepended columns)
 */

import React from "react";

interface SkeletonColumnsProps {
  count?: number; // Number of skeleton columns (default: 5)
  columnWidth: number; // Width per column (matches grid config)
}

export function SkeletonColumns({ count = 5, columnWidth }: SkeletonColumnsProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={`skeleton-col-${i}`}
          className="flex h-full shrink-0 flex-col items-center justify-center border-r bg-gray-50 px-2 py-2 md:px-4 md:py-3"
          style={{ width: `${columnWidth}px` }}
          role="status"
          aria-label="Ładowanie historycznych dat"
        >
          {/* Weekday skeleton */}
          <div className="mb-1 h-3 w-8 animate-pulse rounded bg-gray-300 md:h-4 md:w-10" />
          
          {/* Date skeleton */}
          <div className="h-2 w-12 animate-pulse rounded bg-gray-200 md:h-3 md:w-16" />
        </div>
      ))}
    </>
  );
}
```

#### Krok 3.2: Refactor GridSkeleton

**Plik**: `src/components/ui/skeleton.tsx` (modyfikacja)

```typescript
// ...existing Skeleton component...

function GridSkeleton() {
  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-lg border">
      {/* Header row (sticky) */}
      <div className="sticky top-0 z-20 flex min-h-[64px] border-b bg-white md:min-h-[72px]">
        {/* Symbol column header */}
        <div className="flex h-full w-20 shrink-0 items-center border-r bg-gray-50 px-2 py-2 md:w-32 md:px-4 md:py-3">
          <div className="h-4 w-12 animate-pulse rounded bg-gray-300 md:h-5 md:w-16" />
        </div>

        {/* Date columns headers */}
        <div className="flex flex-1 overflow-x-hidden">
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={`header-skeleton-${i}`}
              className="flex h-full w-24 shrink-0 flex-col items-center justify-center border-r px-2 py-2 md:w-36 md:px-4 md:py-3"
            >
              <div className="mb-1 h-3 w-8 animate-pulse rounded bg-gray-300 md:h-4 md:w-10" />
              <div className="h-2 w-12 animate-pulse rounded bg-gray-200 md:h-3 md:w-16" />
            </div>
          ))}
        </div>
      </div>

      {/* Body rows */}
      <div className="flex-1 overflow-auto">
        {Array.from({ length: 8 }).map((_, rowIndex) => (
          <div key={`row-skeleton-${rowIndex}`} className="flex h-16 border-b md:h-20">
            {/* Symbol cell */}
            <div className="flex h-full w-20 shrink-0 items-center border-r bg-gray-50 px-2 py-2 md:w-32 md:px-4 md:py-3">
              <div className="h-4 w-12 animate-pulse rounded bg-gray-300 md:h-5 md:w-16" />
            </div>

            {/* Data cells */}
            {Array.from({ length: 7 }).map((_, colIndex) => (
              <div
                key={`cell-skeleton-${rowIndex}-${colIndex}`}
                className="flex h-full w-24 shrink-0 items-center justify-center border-r md:w-36"
              >
                <div className="h-3 w-8 animate-pulse rounded bg-gray-200 md:h-4 md:w-10" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export { Skeleton, GridSkeleton };
```

#### Krok 3.3: AdvancedDateRangePicker component

**Plik**: `src/components/grid/AdvancedDateRangePicker.tsx` (nowy)

```typescript
/**
 * Advanced Date Range Picker Component
 * Allows custom date range selection with calendar dropdown
 * Synchronizes with grid scroll state
 */

import { useState, useEffect } from "react";
import type { DateRange } from "@/types/nocodb.types";
import { Button } from "@/components/ui/button";

interface AdvancedDateRangePickerProps {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  visibleStartDate?: string; // Currently visible oldest date (from scroll)
  visibleEndDate?: string; // Currently visible newest date (from scroll)
  onDateRangeChange: (startDate: string, endDate: string) => void;
  onPresetChange?: (preset: DateRange) => void;
}

const QUICK_PRESETS: { label: string; value: DateRange }[] = [
  { label: "Tydzień", value: "week" },
  { label: "Miesiąc", value: "month" },
  { label: "Kwartał", value: "quarter" },
];

export function AdvancedDateRangePicker({
  startDate,
  endDate,
  visibleStartDate,
  visibleEndDate,
  onDateRangeChange,
  onPresetChange,
}: AdvancedDateRangePickerProps) {
  const [isCustom, setIsCustom] = useState(false);
  const [fromDate, setFromDate] = useState(startDate);
  const [toDate, setToDate] = useState(endDate);
  const [error, setError] = useState<string | null>(null);

  // Sync local state with props
  useEffect(() => {
    setFromDate(startDate);
    setToDate(endDate);
  }, [startDate, endDate]);

  const handlePresetClick = (preset: DateRange) => {
    setIsCustom(false);
    setError(null);
    if (onPresetChange) {
      onPresetChange(preset);
    }
  };

  const handleCustomToggle = () => {
    setIsCustom(!isCustom);
    setError(null);
  };

  const handleCustomApply = () => {
    // Validation
    if (!fromDate || !toDate) {
      setError("Proszę wybrać obie daty");
      return;
    }

    const from = new Date(fromDate);
    const to = new Date(toDate);

    if (from >= to) {
      setError("Data 'od' musi być wcześniejsza niż data 'do'");
      return;
    }

    const today = new Date();
    if (to > today) {
      setError("Data 'do' nie może być w przyszłości");
      return;
    }

    // No max range validation - user can select any date range
    // Performance/throttling handled server-side if needed

    setError(null);
    onDateRangeChange(fromDate, toDate);
    setIsCustom(false);
  };

  return (
    <div className="space-y-4">
      {/* Quick Presets */}
      <div className="flex flex-wrap gap-2">
        {QUICK_PRESETS.map((preset) => (
          <Button
            key={preset.value}
            onClick={() => handlePresetClick(preset.value)}
            variant="outline"
            size="sm"
          >
            {preset.label}
          </Button>
        ))}
        <Button onClick={handleCustomToggle} variant={isCustom ? "default" : "outline"} size="sm">
          {isCustom ? "Ukryj własny zakres" : "Własny zakres"}
        </Button>
      </div>

      {/* Visible range indicator (if scrolling) */}
      {visibleStartDate && visibleEndDate && (
        <div className="rounded-md bg-blue-50 border border-blue-200 px-3 py-2 text-sm">
          <p className="text-blue-800">
            <span className="font-medium">Widoczny zakres:</span> {visibleStartDate} do {visibleEndDate}
          </p>
          {(visibleStartDate !== startDate || visibleEndDate !== endDate) && (
            <p className="text-blue-600 text-xs mt-1">
              <span className="font-medium">Załadowany zakres:</span> {startDate} do {endDate}
            </p>
          )}
        </div>
      )}

      {/* Custom Date Range */}
      {isCustom && (
        <div className="rounded-lg border bg-gray-50 p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="from-date" className="block text-sm font-medium text-gray-700 mb-1">
                Od:
              </label>
              <input
                id="from-date"
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                max={new Date().toISOString().split("T")[0]}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label htmlFor="to-date" className="block text-sm font-medium text-gray-700 mb-1">
                Do:
              </label>
              <input
                id="to-date"
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                max={new Date().toISOString().split("T")[0]}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <Button onClick={handleCustomApply} size="sm" className="w-full">
            Zastosuj zakres
          </Button>
        </div>
      )}
    </div>
  );
}
```

**Deliverables:**
- ✅ SkeletonColumns component
- ✅ Refactored GridSkeleton
- ✅ AdvancedDateRangePicker component

---

### Faza 4: Integration with VirtualizedGrid (1.5 dnia)

#### Krok 4.1: Modyfikacja VirtualizedGrid

**Plik**: `src/components/grid/VirtualizedGrid.tsx` (modyfikacja)

**Zmiany:**

1. Przyjmowanie `allDates` zamiast generowania z `getDatesInRange`
2. Integracja `SkeletonColumns` w headerze i body
3. Scroll offset adjustment po prepend kolumn
4. Expose scroll event dla `useTimelineScroll`

```typescript
// ...existing imports...
import { SkeletonColumns } from "./SkeletonColumns";

interface VirtualizedGridProps {
  events: BlackSwanEventMinimal[];
  allDates: string[]; // NEW: Pre-calculated dates from timeline
  range: DateRange;
  onCellClick: (eventId: string) => void;
  selectedEventId?: string;
  selectedSymbols?: string[];
  sortField?: "date" | "percent_change" | "symbol";
  sortDirection?: "asc" | "desc";
  isLoadingBackward?: boolean; // NEW: Loading state
  onScrollElement?: (element: HTMLDivElement | null) => void; // NEW: Expose scroll element
}

export function VirtualizedGrid({
  events,
  allDates, // Use prop instead of generating
  range,
  onCellClick,
  selectedEventId,
  selectedSymbols,
  sortField = "symbol",
  sortDirection = "asc",
  isLoadingBackward = false,
  onScrollElement,
}: VirtualizedGridProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const headerScrollRef = useRef<HTMLDivElement>(null);
  const breakpoint = useBreakpoint();
  const config = GRID_CONFIG[breakpoint];
  const previousDateCount = useRef(allDates.length);

  // ...existing keyboard navigation state...

  // Expose scroll element to parent
  useEffect(() => {
    if (onScrollElement) {
      onScrollElement(parentRef.current);
    }
  }, [onScrollElement]);

  // ...existing scroll synchronization...

  // Group events by symbol and date
  const { symbols, dates, eventsBySymbolAndDate } = useMemo(() => {
    // Use allDates from props
    const datesInRange = allDates;
    const symbolsSet = new Set<string>();
    const eventMap = new Map<string, BlackSwanEventMinimal>();

    // ...existing event grouping logic...

    return {
      symbols: finalSymbols,
      dates: datesInRange,
      eventsBySymbolAndDate: eventMap,
    };
  }, [events, allDates, selectedSymbols, sortField, sortDirection]);

  // Row virtualizer (symbols)
  const rowVirtualizer = useVirtualizer({
    count: symbols.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => config.rowHeight,
    overscan: 3,
  });

  // Column virtualizer (dates)
  const columnVirtualizer = useVirtualizer({
    horizontal: true,
    count: dates.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => config.colWidth,
    overscan: 5,
  });

  // Adjust scroll position when columns prepended
  useEffect(() => {
    const currentDateCount = dates.length;
    const previousCount = previousDateCount.current;

    if (currentDateCount > previousCount && parentRef.current) {
      const addedColumns = currentDateCount - previousCount;
      const adjustment = addedColumns * config.colWidth;

      console.log(`[VirtualizedGrid] Adjusting scroll by ${adjustment}px (${addedColumns} columns added)`);

      // Adjust scrollLeft to maintain visual position
      parentRef.current.scrollLeft += adjustment;
    }

    previousDateCount.current = currentDateCount;
  }, [dates.length, config.colWidth]);

  // ...existing handlers...

  return (
    <>
      <div className="flex h-full w-full flex-col rounded-lg border" role="grid" aria-label="Black Swan Events Grid">
        {/* Header row with dates (sticky) */}
        <div className="sticky top-0 z-20 flex min-h-[64px] border-b bg-white md:min-h-[72px]" role="row">
          {/* Top-left corner */}
          <div
            className="sticky left-0 z-30 flex shrink-0 items-center border-r bg-gray-50 px-2 py-2 md:px-4 md:py-3"
            role="columnheader"
            style={{ width: `${config.symbolWidth}px` }}
          >
            <span className="text-xs font-semibold text-gray-700 md:text-sm">Symbol</span>
          </div>

          {/* Scrollable dates container */}
          <div ref={headerScrollRef} className="flex flex-1 items-stretch overflow-x-hidden">
            <div
              className="relative flex"
              style={{
                width: `${columnVirtualizer.getTotalSize()}px`,
              }}
            >
              {/* Skeleton columns (if loading) */}
              {isLoadingBackward && (
                <div className="absolute left-0 top-0 flex h-full z-10">
                  <SkeletonColumns count={5} columnWidth={config.colWidth} />
                </div>
              )}

              {/* Actual date columns */}
              {columnVirtualizer.getVirtualItems().map((virtualColumn) => {
                const date = dates[virtualColumn.index];
                const dateIsWeekend = isWeekend(date);
                const dateIsToday = isToday(date);
                return (
                  <div
                    key={virtualColumn.key}
                    role="columnheader"
                    className={`absolute left-0 top-0 flex h-full flex-col items-center justify-center border-r px-1 py-1 md:px-2 md:py-2 ${
                      dateIsWeekend ? "bg-gray-100/80" : ""
                    } ${dateIsToday ? "bg-blue-50/50 ring-2 ring-inset ring-blue-300" : ""}`}
                    style={{
                      width: `${virtualColumn.size}px`,
                      transform: `translateX(${virtualColumn.start}px)`,
                    }}
                  >
                    {/* Weekday name */}
                    <span
                      className={`text-[11px] font-bold md:text-xs ${dateIsWeekend ? "text-gray-500" : "text-gray-700"}`}
                    >
                      {getWeekdayShort(date)}
                    </span>
                    {/* Date */}
                    <span
                      className={`mt-0.5 text-[9px] font-medium md:text-[10px] ${dateIsWeekend ? "text-gray-400" : "text-gray-600"}`}
                    >
                      {date}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Scrollable body */}
        <div ref={parentRef} className="flex-1 overflow-auto rounded-b-lg">
          <div
            className="relative"
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: `${columnVirtualizer.getTotalSize() + config.symbolWidth}px`,
            }}
          >
            {/* ...existing row rendering with cells... */}
          </div>
        </div>
      </div>

      {/* Minimap */}
      <GridMinimap events={events} symbols={symbols} dates={dates} gridScrollElement={gridScrollElement} />
    </>
  );
}
```

**Deliverables:**
- ✅ Modified VirtualizedGrid with infinite scroll support
- ✅ Scroll offset adjustment logic
- ✅ SkeletonColumns integration

---

### Faza 5: GridView orchestration (1 dzień)

#### Krok 5.1: Modyfikacja GridView

**Plik**: `src/components/grid/GridView.tsx` (modyfikacja)

```typescript
// ...existing imports...
import { useInfiniteTimeline } from "@/hooks/useInfiniteTimeline";
import { useTimelineScroll } from "@/hooks/useTimelineScroll";
import { AdvancedDateRangePicker } from "./AdvancedDateRangePicker";

export function GridView() {
  const { gridState, setRange, setSymbols, setEventTypes, setEventId, setDateRange } = useGrid();
  const { hasAccess, isInitialized, setIsInitialized } = useAuth();
  const isMobile = useIsMobile();
  const [scrollElement, setScrollElement] = useState<HTMLDivElement | null>(null);

  // Calculate initial date range
  const today = new Date().toISOString().split("T")[0];
  const initialStartDate = useMemo(() => {
    if (gridState.startDate) return gridState.startDate;
    
    // Calculate from range
    const daysBack = gridState.range === "week" ? 7 : gridState.range === "month" ? 30 : 90;
    const start = new Date();
    start.setDate(start.getDate() - daysBack);
    return start.toISOString().split("T")[0];
  }, [gridState.startDate, gridState.range]);

  const initialEndDate = gridState.endDate || today;

  // Fetch initial data
  const shouldFetch = hasAccess === true;
  const fetcher = useCallback(() => {
    return shouldFetch
      ? fetchGridData(initialStartDate, initialEndDate, gridState.symbols)
      : Promise.resolve(null);
  }, [shouldFetch, initialStartDate, initialEndDate, gridState.symbols]);

  const cacheKey = `cache:grid:${initialStartDate}:${initialEndDate}:${hashSymbols(gridState.symbols)}`;

  const {
    data: gridResponse,
    isLoading,
    error,
    refetch,
  } = useClientCache(cacheKey, fetcher, { ttl: shouldFetch ? 5 * 60 * 1000 : 0 });

  // Infinite timeline hook
  const {
    timelineState,
    loadPreviousChunk,
    resetTimeline,
    allEvents,
    allDates,
  } = useInfiniteTimeline({
    range: gridState.range,
    symbols: gridState.symbols,
    initialStartDate,
    initialEndDate,
    initialEvents: gridResponse?.events || [],
  });

  // Scroll detection hook
  const { thresholdReached } = useTimelineScroll({
    scrollElement,
    isLoading: timelineState.isLoadingBackward,
    onThresholdReached: loadPreviousChunk,
  });

  // Mobile performance warning
  useEffect(() => {
    if (isMobile && timelineState.chunks.length >= 10) {
      // Show toast warning (implementation depends on your toast library)
      console.warn("[GridView] Mobile: 10+ chunks loaded - performance may degrade");
      // TODO: Implement toast notification
      // toast.warning("Załadowano dużo danych - wydajność może spaść");
    }
  }, [isMobile, timelineState.chunks.length]);

  // Filter events by event types
  let filteredEvents = allEvents;
  if (gridState.eventTypes && gridState.eventTypes.length > 0) {
    filteredEvents = filteredEvents.filter((event) => gridState.eventTypes?.includes(event.event_type));
  }

  // Sort events
  if (gridState.sortField && gridState.sortDirection && gridState.sortField !== "symbol") {
    filteredEvents = [...filteredEvents].sort((a, b) => {
      if (gridState.sortField === "date") {
        const comparison = a.occurrence_date.localeCompare(b.occurrence_date);
        return gridState.sortDirection === "asc" ? comparison : -comparison;
      } else if (gridState.sortField === "percent_change") {
        return gridState.sortDirection === "asc"
          ? a.percent_change - b.percent_change
          : b.percent_change - a.percent_change;
      }
      return 0;
    });
  }

  // Handle date range change from picker
  const handleDateRangeChange = useCallback(
    (startDate: string, endDate: string) => {
      console.log(`[GridView] Date range changed: ${startDate} to ${endDate}`);
      setDateRange(startDate, endDate);
      resetTimeline(startDate, endDate);
      refetch();
    },
    [setDateRange, resetTimeline, refetch]
  );

  // Handle preset change
  const handlePresetChange = useCallback(
    (preset: DateRange) => {
      setRange(preset);
      // Calculate new dates
      const daysBack = preset === "week" ? 7 : preset === "month" ? 30 : 90;
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - daysBack);
      
      const startDate = start.toISOString().split("T")[0];
      const endDate = end.toISOString().split("T")[0];
      
      handleDateRangeChange(startDate, endDate);
    },
    [setRange, handleDateRangeChange]
  );

  // ...existing cell click handler...

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      {/* Filters Section */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          {/* Advanced Date Range Picker */}
          <AdvancedDateRangePicker
            startDate={initialStartDate}
            endDate={initialEndDate}
            visibleStartDate={allDates[0]}
            visibleEndDate={allDates[allDates.length - 1]}
            onDateRangeChange={handleDateRangeChange}
            onPresetChange={handlePresetChange}
          />

          {/* Existing filters */}
          <TickerFilter />
          <EventTypeFilter />
          <SortOptions />
          <ClearFiltersButton />
        </div>
      </div>

      {/* Grid Section */}
      <div className="relative min-h-0 flex-1">
        {isLoading ? (
          <GridSkeleton />
        ) : !hasAccess ? (
          isMobile ? <MobileAccessBlock /> : <BlurredDemoGrid range={gridState.range} />
        ) : filteredEvents.length > 0 || timelineState.chunks.length > 0 ? (
          <VirtualizedGrid
            events={filteredEvents}
            allDates={allDates}
            range={gridState.range}
            onCellClick={handleCellClick}
            selectedEventId={gridState.eventId}
            selectedSymbols={gridState.symbols}
            sortField={gridState.sortField}
            sortDirection={gridState.sortDirection}
            isLoadingBackward={timelineState.isLoadingBackward}
            onScrollElement={setScrollElement}
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <p className="text-gray-500">Brak wydarzeń w wybranym zakresie.</p>
          </div>
        )}

        {/* Error state */}
        {timelineState.error && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 shadow-lg">
            <p className="text-sm font-medium text-red-800">Błąd ładowania danych</p>
            <button
              onClick={() => loadPreviousChunk()}
              className="mt-2 text-sm text-red-600 underline hover:text-red-700"
            >
              Spróbuj ponownie
            </button>
          </div>
        )}
      </div>

      {/* Summary Sidebar */}
      {gridState.eventId && (
        <SummarySidebar eventId={gridState.eventId} onClose={() => setEventId(undefined)} />
      )}
    </div>
  );
}
```

**Deliverables:**
- ✅ GridView with infinite timeline integration
- ✅ Date range picker integration
- ✅ Error handling UI

---

### Faza 6: API & Backend changes (1 dzień)

#### Krok 6.1: Rozszerzenie GridContext

**Plik**: `src/contexts/GridContext.tsx` (modyfikacja)

```typescript
// Add to GridState interface
interface GridState {
  // ...existing fields...
  startDate?: string; // NEW
  endDate?: string; // NEW
}

// Add to GridContextValue
interface GridContextValue {
  // ...existing methods...
  setDateRange: (startDate: string, endDate: string) => void; // NEW
}

// In getInitialStateFromUrl
function getInitialStateFromUrl(): GridState {
  // ...existing params...
  
  const startDateParam = urlParams.get("start_date");
  const endDateParam = urlParams.get("end_date");
  
  return {
    // ...existing fields...
    startDate: startDateParam || undefined,
    endDate: endDateParam || undefined,
  };
}

// In updateUrlParams
function updateUrlParams(state: Partial<GridState>): void {
  // ...existing params...
  
  if (state.startDate) {
    params.set("start_date", state.startDate);
  } else {
    params.delete("start_date");
  }
  
  if (state.endDate) {
    params.set("end_date", state.endDate);
  } else {
    params.delete("end_date");
  }
  
  // ...rest of function...
}

// Add setDateRange method
export function GridProvider({ children, initialState }: GridProviderProps) {
  // ...existing state...
  
  const setDateRange = useCallback((startDate: string, endDate: string) => {
    setGridState((prev) => ({ ...prev, startDate, endDate }));
  }, []);
  
  const value: GridContextValue = {
    // ...existing fields...
    setDateRange,
  };
  
  // ...rest of component...
}
```

#### Krok 6.2: Rozszerzenie api-service

**Plik**: `src/lib/api-service.ts` (modyfikacja)

```typescript
/**
 * Fetch grid data - EXPLICIT DATE RANGE
 * Primary method for infinite scroll and custom date picker
 */
export async function fetchGridData(
  startDate: string,
  endDate: string,
  symbols: string[] = []
): Promise<GridResponse> {
  const symbolsParam = symbols.length > 0 ? symbols.join(",") : undefined;
  const url = API_ENDPOINTS.gridDataByDateRange(startDate, endDate, symbolsParam);
  return apiClient.get<GridResponse>(url);
}

/**
 * Fetch grid data - RANGE BASED (PRESERVED)
 * Used for quick presets and legacy code
 * @param range - "week" | "month" | "quarter"
 * @param symbols - Optional array of ticker symbols
 * @param endDate - Optional anchor date (defaults to today)
 */
export async function fetchGridDataByRange(
  range: DateRange,
  symbols: string[] = [],
  endDate?: string
): Promise<GridResponse> {
  const symbolsParam = symbols.length > 0 ? symbols.join(",") : undefined;
  const url = API_ENDPOINTS.gridDataByRange(range, symbolsParam, endDate);
  return apiClient.get<GridResponse>(url);
}

// In api-client.ts, update endpoint builders
export const API_ENDPOINTS = {
  // ...existing endpoints...
  
  /**
   * Grid data by explicit date range
   */
  gridDataByDateRange: (startDate: string, endDate: string, symbols?: string) => {
    const params = new URLSearchParams({ 
      start_date: startDate, 
      end_date: endDate 
    });
    if (symbols) params.append("symbols", symbols);
    return `/api/nocodb/grid?${params}`;
  },
  
  /**
   * Grid data by range (preserved for presets)
   */
  gridDataByRange: (range: DateRange, symbols?: string, endDate?: string) => {
    const params = new URLSearchParams({ range });
    if (symbols) params.append("symbols", symbols);
    if (endDate) params.append("end_date", endDate);
    return `/api/nocodb/grid?${params}`;
  },
};
```

#### Krok 6.3: Refactor endpoint

**Plik**: `src/pages/api/nocodb/grid.ts` (modyfikacja)

```typescript
/**
 * GET /api/nocodb/grid
 *
 * Flexible endpoint supporting 3 modes:
 * 1. Explicit range: start_date + end_date
 * 2. Range with anchor: range + end_date
 * 3. Range only: range (calculates from today)
 */
export const GET: APIRoute = async ({ request, locals }) => {
  const { supabase } = locals;

  try {
    const uid = await getAuthUid(supabase);
    if (!uid) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    // Rate limiting
    const rateLimitResult = await checkRateLimit(uid, "api:grid");
    if (!rateLimitResult.allowed) {
      return new Response(JSON.stringify({ error: "Too many requests" }), {
        status: 429,
        headers: getRateLimitHeaders(rateLimitResult),
      });
    }

    // Parse query params
    const url = new URL(request.url);
    const rawParams = {
      start_date: url.searchParams.get("start_date"),
      end_date: url.searchParams.get("end_date"),
      range: url.searchParams.get("range") as DateRange | null,
      symbols: url.searchParams.get("symbols"),
    };

    // Determine date range using priority logic
    let startDate: string;
    let endDate: string;

    if (rawParams.start_date && rawParams.end_date) {
      // MODE 1: Explicit date range (HIGHEST PRIORITY)
      console.log("[API /grid] Mode 1: Explicit date range");
      startDate = rawParams.start_date;
      endDate = rawParams.end_date;
    } else if (rawParams.range && rawParams.end_date) {
      // MODE 2: Range with custom end_date anchor
      console.log("[API /grid] Mode 2: Range with anchor date");
      const chunkSize = getChunkSizeFromRange(rawParams.range);
      const end = new Date(rawParams.end_date);
      const start = new Date(end);
      start.setDate(start.getDate() - chunkSize);
      
      startDate = start.toISOString().split("T")[0];
      endDate = rawParams.end_date;
    } else if (rawParams.range) {
      // MODE 3: Range only (backward compatible)
      console.log("[API /grid] Mode 3: Range only (today anchor)");
      const chunkSize = getChunkSizeFromRange(rawParams.range);
      const today = new Date();
      const start = new Date(today);
      start.setDate(start.getDate() - chunkSize);
      
      startDate = start.toISOString().split("T")[0];
      endDate = today.toISOString().split("T")[0];
    } else {
      return new Response(
        JSON.stringify({ 
          error: "Must provide either (start_date + end_date) OR range",
          examples: [
            "?start_date=2026-01-01&end_date=2026-02-18",
            "?range=week&end_date=2026-02-18",
            "?range=week"
          ]
        }),
        { status: 400 }
      );
    }

    // Validate dates
    const validatedParams = GridQuerySchema.parse({
      start_date: startDate,
      end_date: endDate,
      range: rawParams.range,
      symbols: rawParams.symbols,
    });

    // Parse symbols
    const symbols = validatedParams.symbols
      ? validatedParams.symbols.split(",").filter(Boolean)
      : undefined;

    // Fetch from NocoDB
    const nocoClient = new NocoDBClient();
    const nocoService = new NocoDBService(nocoClient);

    const gridData = await nocoService.getGridEvents(
      startDate,
      endDate,
      symbols
    );

    return new Response(JSON.stringify(gridData), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...getRateLimitHeaders(rateLimitResult),
      },
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return new Response(
        JSON.stringify({
          error: "Invalid query parameters",
          details: error.errors,
        }),
        { status: 400 }
      );
    }

    console.error("[API /grid] Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500 }
    );
  }
};

/**
 * Helper: Get chunk size from range
 */
function getChunkSizeFromRange(range: DateRange): number {
  switch (range) {
    case "week":
      return 7;
    case "month":
      return 30;
    case "quarter":
      return 90;
    default:
      return 7;
  }
}
```

#### Krok 6.4: Refactor NocoDBService

**Plik**: `src/services/nocodb.service.ts` (modyfikacja)

```typescript
/**
 * Get grid events with date range
 * UPDATED: Now accepts startDate and endDate directly
 */
async getGridEvents(
  startDate: string,
  endDate: string,
  symbols?: string[]
): Promise<GridResponse> {
  // Build query with date filters
  const queryBuilder = new NocoDBQueryBuilder()
    .where("occurrence_date", "gte", startDate, "exactDate")
    .where("occurrence_date", "lte", endDate, "exactDate")
    .sort("occurrence_date", true) // DESC - newest first
    .limit(10000); // Increased limit for large date ranges

  // Add symbols filter if provided
  if (symbols && symbols.length > 0) {
    queryBuilder.whereIn("symbol", symbols);
  }

  // Fetch events
  let eventsResponse;
  let needsMemoryFiltering = false;

  try {
    eventsResponse = await this.client.queryRecords<NocoDBEventRecord>(
      NOCODB_TABLES.BLACK_SWANS,
      queryBuilder
    );
  } catch (err) {
    // Fallback to memory filtering if needed
    if (err && typeof err === "object" && "statusCode" in err && (err as { statusCode: number }).statusCode === 422) {
      needsMemoryFiltering = true;
      
      const fallbackQuery = new NocoDBQueryBuilder().sort("occurrence_date", true).limit(15000);
      if (symbols && symbols.length > 0) {
        fallbackQuery.whereIn("symbol", symbols);
      }
      
      eventsResponse = await this.client.queryRecords<NocoDBEventRecord>(
        NOCODB_TABLES.BLACK_SWANS,
        fallbackQuery
      );
    } else {
      throw err;
    }
  }

  // Filter by date in memory if needed
  let filteredRecords = eventsResponse.list;
  if (needsMemoryFiltering) {
    filteredRecords = filteredRecords.filter((record) => {
      return record.occurrence_date >= startDate && record.occurrence_date <= endDate;
    });
  }

  // ...rest of transformation logic...
  
  return {
    events: minimalEvents,
    total_count: filteredRecords.length,
  };
}
```

**Deliverables:**
- ✅ API endpoint refactored
- ✅ GridContext extended
- ✅ NocoDBService updated
- ✅ Backward compatibility maintained

---

### Faza 7: Testing (2 dni)

#### Krok 7.1: Unit tests

**Timeline utils tests** (rozszerzone w Krok 1.2)

**Hook tests** (rozszerzone w Krok 2.2)

#### Krok 7.2: E2E tests

**Plik**: `e2e/grid-infinite-scroll.spec.ts` (nowy)

```typescript
import { test, expect } from "./fixtures";
import { GridPage } from "./pages/GridPage";

test.describe("Grid - Infinite Scroll Timeline", () => {
  test("TC-INFINITE-001: Load previous chunk on scroll left", async ({ page }) => {
    const gridPage = new GridPage(page);
    await gridPage.goto();
    await gridPage.waitForGridReady();

    // Get initial date range
    const initialOldestDate = await page.locator('[role="columnheader"]').first().textContent();

    // Scroll to left edge
    await page.evaluate(() => {
      const gridBody = document.querySelector('[role="grid"] > div:last-child');
      if (gridBody) {
        gridBody.scrollLeft = 0;
      }
    });

    // Wait for skeleton columns
    await expect(page.locator('[aria-label="Ładowanie historycznych dat"]')).toBeVisible({ timeout: 5000 });

    // Wait for new data to load
    await page.waitForTimeout(2000);

    // Verify oldest date changed
    const newOldestDate = await page.locator('[role="columnheader"]').first().textContent();
    expect(newOldestDate).not.toBe(initialOldestDate);
  });

  test("TC-INFINITE-002: Prevent duplicate loading", async ({ page }) => {
    const gridPage = new GridPage(page);
    await gridPage.goto();
    await gridPage.waitForGridReady();

    // Scroll rapidly to left
    await page.evaluate(() => {
      const gridBody = document.querySelector('[role="grid"] > div:last-child');
      if (gridBody) {
        for (let i = 0; i < 5; i++) {
          gridBody.scrollLeft = 0;
        }
      }
    });

    // Should only see one set of skeleton columns
    const skeletonCount = await page.locator('[aria-label="Ładowanie historycznych dat"]').count();
    expect(skeletonCount).toBeLessThanOrEqual(1);
  });

  test("TC-INFINITE-003: Maintain scroll position after loading", async ({ page }) => {
    const gridPage = new GridPage(page);
    await gridPage.goto();
    await gridPage.waitForGridReady();

    // Scroll to 10% from left
    const initialScrollPos = await page.evaluate(() => {
      const gridBody = document.querySelector('[role="grid"] > div:last-child') as HTMLElement;
      if (gridBody) {
        gridBody.scrollLeft = gridBody.scrollWidth * 0.1;
        return gridBody.scrollLeft;
      }
      return 0;
    });

    // Trigger load
    await page.evaluate(() => {
      const gridBody = document.querySelector('[role="grid"] > div:last-child') as HTMLElement;
      if (gridBody) {
        gridBody.scrollLeft = 0;
      }
    });

    // Wait for load
    await page.waitForTimeout(2000);

    // Verify user is still viewing similar content (not jumped)
    const finalScrollPos = await page.evaluate(() => {
      const gridBody = document.querySelector('[role="grid"] > div:last-child') as HTMLElement;
      return gridBody ? gridBody.scrollLeft : 0;
    });

    // Should have scrolled right (adjustment applied)
    expect(finalScrollPos).toBeGreaterThan(initialScrollPos);
  });
});
```

**Plik**: `e2e/advanced-date-picker.spec.ts` (nowy)

```typescript
import { test, expect } from "./fixtures";
import { GridPage } from "./pages/GridPage";

test.describe("Advanced Date Range Picker", () => {
  test("TC-PICKER-001: Select custom date range", async ({ page }) => {
    const gridPage = new GridPage(page);
    await gridPage.goto();

    // Open custom range
    await page.click('button:has-text("Własny zakres")');

    // Fill dates
    await page.fill('input[id="from-date"]', "2026-01-01");
    await page.fill('input[id="to-date"]', "2026-01-31");

    // Apply
    await page.click('button:has-text("Zastosuj zakres")');

    // Wait for grid reload
    await gridPage.waitForGridReady();

    // Verify URL params
    expect(page.url()).toContain("start_date=2026-01-01");
    expect(page.url()).toContain("end_date=2026-01-31");
  });

  test("TC-PICKER-002: Validate invalid date range", async ({ page }) => {
    const gridPage = new GridPage(page);
    await gridPage.goto();

    // Open custom range
    await page.click('button:has-text("Własny zakres")');

    // Fill invalid dates (from > to)
    await page.fill('input[id="from-date"]', "2026-01-31");
    await page.fill('input[id="to-date"]', "2026-01-01");

    // Try to apply
    await page.click('button:has-text("Zastosuj zakres")');

    // Should show error
    await expect(page.locator('text=Data \'od\' musi być wcześniejsza niż data \'do\'')).toBeVisible();
  });

  test("TC-PICKER-003: Visible range indicator updates on scroll", async ({ page }) => {
    const gridPage = new GridPage(page);
    await gridPage.goto();
    await gridPage.waitForGridReady();

    // Scroll left to trigger load
    await page.evaluate(() => {
      const gridBody = document.querySelector('[role="grid"] > div:last-child') as HTMLElement;
      if (gridBody) gridBody.scrollLeft = 0;
    });

    await page.waitForTimeout(2000);

    // Verify visible range indicator shows
    await expect(page.locator('text=Widoczny zakres:')).toBeVisible();
  });
});
```

**Deliverables:**
- ✅ E2E tests dla infinite scroll
- ✅ E2E tests dla date picker
- ✅ All tests passing

---

### Faza 8: Documentation & Cleanup (0.5 dnia)

#### Krok 8.1: Update documentation

**Plik**: `docs/FEATURE_INFINITE_SCROLL_TIMELINE.md` (nowy)

```markdown
# Feature Documentation: Infinite Scroll Timeline

## Overview
Infinite horizontal scroll dla Black Swan Grid z dynamicznym date range selection.

## Architecture
- **Hooks**: useInfiniteTimeline, useTimelineScroll
- **Components**: SkeletonColumns, AdvancedDateRangePicker
- **API**: /api/nocodb/grid with start_date & end_date params

## Usage

### For Developers
```typescript
// Use in GridView
const { allEvents, allDates, loadPreviousChunk } = useInfiniteTimeline({
  range: "week",
  symbols: ["ABC"],
  initialStartDate: "2026-01-01",
  initialEndDate: "2026-02-18",
  initialEvents: [],
});
```

### For Users
1. Scroll grid to left edge (15% threshold)
2. Skeleton columns appear
3. Previous period loads automatically
4. Scroll position adjusts to maintain context

## Configuration
- Chunk size: 7/30/90 days (matches range)
- Threshold: 15% from left edge
- Max date range (picker): 730 days (2 years)
- No history limit: infinite backward scroll

## Performance
- Chunk load: <500ms (30 days × 100 symbols)
- Scroll detection: <16ms (60 FPS)
- Memory: ~50MB for 1 year data

## Testing
- Unit: timeline-utils, hooks
- E2E: grid-infinite-scroll.spec.ts, advanced-date-picker.spec.ts

## Troubleshooting
- **Jump effect**: Check scroll adjustment calculation
- **Duplicate loads**: Verify debounce logic
- **Memory issues**: Implement chunk unloading (future)
```

#### Krok 8.2: Code cleanup

- Remove console.logs (or wrap in debug flag)
- Format all files with Prettier
- Run ESLint and fix warnings
- Update CHANGELOG.md

**Deliverables:**
- ✅ Feature documentation
- ✅ Code cleaned up
- ✅ CHANGELOG updated

---

## 5. Deployment plan

### 5.1. Pre-deployment checklist

- [ ] All unit tests passing (`npm run test`)
- [ ] All E2E tests passing (`npm run test:e2e`)
- [ ] No TypeScript errors (`npm run build`)
- [ ] No ESLint warnings (`npm run lint`)
- [ ] Feature tested locally (manual QA)
- [ ] Feature tested in staging environment
- [ ] API endpoint tested with Postman/Thunder Client
- [ ] Performance benchmarks acceptable (<500ms chunk load)
- [ ] Database query performance checked (NocoDB dashboard)

### 5.2. Deployment steps

**Development → Staging:**

1. Merge feature branch to `develop`
2. Deploy to staging: `git push origin develop`
3. Run smoke tests on staging
4. Verify API endpoint: `curl https://staging.app/api/nocodb/grid?start_date=2026-01-01&end_date=2026-02-18`
5. Test infinite scroll manually (mobile + desktop)
6. Check error monitoring (Sentry/logs)

**Staging → Production:**

1. Create release PR: `develop` → `main`
2. Code review (at least 1 approval)
3. Merge to `main`
4. Deploy to production: `git push origin main`
5. Monitor API response times (first 1 hour)
6. Monitor error rates (Sentry dashboard)
7. Verify cache behavior (Redis/localStorage)
8. Test on production with test account

### 5.3. Rollback plan

**If critical bugs detected:**

1. **Immediate**: Revert merge commit on `main`
2. **Deploy**: Previous stable version
3. **Investigate**: Debug in staging with production data snapshot
4. **Fix**: Apply hotfix to feature branch
5. **Re-deploy**: After thorough testing

**Feature flags (optional future enhancement):**

```typescript
// In GridView.tsx
const ENABLE_INFINITE_SCROLL = import.meta.env.PUBLIC_FEATURE_INFINITE_SCROLL === "true";

{ENABLE_INFINITE_SCROLL ? (
  <VirtualizedGrid with infinite scroll />
) : (
  <VirtualizedGrid legacy mode />
)}
```

### 5.4. Monitoring

**Metrics to track (first week):**

- API endpoint `/api/nocodb/grid` response time (P50, P95, P99)
- Error rate for infinite scroll loads
- Client-side memory usage (Chrome DevTools profiling)
  - **Desktop**: threshold 150MB
  - **Mobile**: threshold 100MB (CRITICAL - monitoring for chunk unloading need)
- User engagement: avg chunks loaded per session
  - **Desktop**: expected avg 3-5 chunks
  - **Mobile**: expected avg 2-4 chunks (monitor if >10 common)
- Date picker usage: % users using custom range vs presets
- Scroll depth: how far back users go (analytics event)
- **Mobile-specific**:
  - Performance degradation after N chunks (measure FPS drop)
  - Crash rate correlation with chunks loaded
  - Warning toast display frequency (10+ chunks)

**Success criteria:**

- API response time P95 < 800ms
- Error rate < 1%
- No memory leaks (stable memory after 10+ chunks loaded)
- **Mobile**: Memory stable <100MB for 5 chunks, <150MB for 10 chunks
- User engagement +15% (time spent in grid)
- Support tickets re: date range <= 5 in first week
- **Mobile**: No increase in crash rate vs baseline

---

## 6. Risk mitigation

### 6.1. High-priority risks

**Ryzyko 1: Performance degradation przy >2000 columns**

- **Mitygacja**: 
  - Implement monitoring on chunk load count
  - Add warning toast at 1000 columns: "Załadowałeś wiele danych - wydajność może spaść"
  - Future: Implement chunk unloading (remove chunks >500 columns away from viewport)

**Ryzyko 2: Jump effect po dodaniu kolumn**

- **Mitygacja**:
  - Extensive unit tests dla `calculateScrollAdjustment`
  - Manual QA z różnymi chunk sizes
  - Log scroll adjustments w dev mode
  - Future: Use IntersectionObserver API dla precyzyjniejszego tracking

**Ryzyko 3: Race conditions przy szybkim scrollowaniu**

- **Mitygacja**:
  - Debounce na 300ms w `useTimelineScroll`
  - Loading flag w `useInfiniteTimeline` zapobiega duplicate requests
  - Implement request cancellation (AbortController)

### 6.2. Medium-priority risks

**Ryzyko 4: API timeout przy dużych zakresach**

- **Mitygacja**:
  - Backend query optimization (NocoDB indexes)
  - Increase server timeout z 30s → 60s
  - Client-side timeout handling + retry logic

**Ryzyko 5: Date picker complexity**

- **Mitygacja**:
  - Use native HTML `<input type="date">` dla lepszej kompatybilności
  - Extensive validation tests
  - Inline error messages dla lepszego UX

**Ryzyko 6: URL sync conflicts**

- **Mitygacja**:
  - Atomic state updates w GridContext
  - Careful URL param serialization (encodeURIComponent)
  - Test browser back/forward navigation

---

## 7. Future enhancements

Poza scope MVP, ale warte rozważenia w przyszłości:

1. **Chunk unloading (WYSOKI PRIORYTET)**: Usuwanie distant chunks z pamięci (memory optimization)
   - Implementacja: chunks >1000 columns od viewport są unloadowane
   - Re-fetch z cache/API przy scroll back
   - Monitoring trigger: users loading >10 chunks OR memory >100MB
2. **Infinite scroll forward**: Ładowanie przyszłych dat (jeśli API ma dane forecast)
3. **Predictive loading**: Preload adjacent chunks na podstawie scroll velocity
4. **Jump to date**: Feature w date picker - kliknięcie daty scrolluje grid do tej pozycji
5. **Keyboard shortcuts**: Home (newest date), End (oldest loaded), Ctrl+Left/Right (prev/next chunk)
6. **Export visible range**: Eksport danych z aktualnie widocznego zakresu do CSV/Excel
7. **Bookmarking ranges**: Zapisywanie ulubionych zakresów dat (np. "Q4 2025 Analysis")
8. **Heatmap overlay**: Wizualizacja gęstości wydarzeń w mini-mapie jako gradient
9. **Chunk size optimization**: Dynamiczny chunk size na podstawie scroll velocity
10. **Rolling window analysis**: Wykorzystanie Mode 2 endpoint (`range` + `end_date`) do:
    - Week-over-week comparison z przesuwającym się anchor
    - Month-to-date analysis (anchor = last day of previous month)
    - Quarter-end reporting (anchor = Q-end dates)
11. **Dynamic anchor presets**: Quick presets jak:
    - "Last complete week" (anchor = last Sunday)
    - "Last trading day" (anchor = most recent market close)
    - "Pre-event period" (anchor = event date - N days)
12. **Smart performance throttling**: Automatic chunk size reduction na mobile jeśli memory usage >80MB

---

## 8. Success metrics

### 8.1. Technical metrics

- [ ] API response time P95 < 800ms
- [ ] Client memory stable after 10+ chunks (<100MB)
- [ ] Zero critical bugs in first week
- [ ] All E2E tests passing (100%)
- [ ] TypeScript strict mode compliant
- [ ] Lighthouse performance score >85

### 8.2. User metrics

- [ ] Avg chunks loaded per session: >2 (users exploring history)
- [ ] Time spent in grid: +15% vs previous month
- [ ] Date picker usage: >30% users try custom range
- [ ] Scroll depth: avg 3 chunks backward
- [ ] Bounce rate from grid: -10%
- [ ] Support tickets re: date range: <5 in week 1

### 8.3. Business metrics

- [ ] User retention (week 2): +5%
- [ ] Feature adoption: >60% active users use infinite scroll within 2 weeks
- [ ] NPS score: +2 points (due to improved data access)
- [ ] Revenue impact: neutral or positive (no churn due to feature)

---

## 9. Dependencies & Prerequisites

### 9.1. Technical dependencies

- [x] `@tanstack/react-virtual` installed
- [x] NocoDB API accessible
- [x] GridContext implemented
- [x] VirtualizedGrid working
- [ ] API endpoint support dla `start_date` & `end_date` params (to be implemented)

### 9.2. Team dependencies

- **Backend**: Ensure NocoDB performance dla large date ranges
- **QA**: Manual testing na różnych devices (mobile, tablet, desktop)
- **DevOps**: Monitor API response times, setup alerts
- **Product**: Review date picker UX, approve design

### 9.3. External dependencies

- NocoDB instance availability >99.9%
- Supabase Auth working (dla access control)
- Redis/cache layer (dla API response caching)

---

## 10. Post-launch activities

### Week 1 (po deployment):

- [ ] Daily monitoring API response times
- [ ] Check error logs dla infinite scroll failures
- [ ] Gather user feedback (in-app surveys, support tickets)
- [ ] Hot fix critical bugs jeśli występują

### Week 2-4:

- [ ] Analyze usage metrics (chunks loaded, date picker usage)
- [ ] Optimize chunk size jeśli potrzebne
- [ ] Plan future enhancements (chunk unloading, predictive loading)
- [ ] Write blog post / docs dla users

### Month 2:

- [ ] Retrospective meeting z teamem
- [ ] Evaluate success metrics vs goals
- [ ] Plan next iteration (future enhancements)
- [ ] Share learnings across teams

---

## 11. Finalne decyzje

### ✅ ZATWIERDZONE

1. **Mobile infinite scroll**: ✅ **WŁĄCZONE BEZ LIMITU**
   - Pełny infinite scroll na mobile (<768px)
   - Ten sam chunk size co desktop (7/30/90 dni zależnie od range)
   - Brak limitu liczby chunków
   - Monitoring performance w production (pierwsze 2 tygodnie)

2. **Max date range validation w date picker**: ✅ **BRAK LIMITU**
   - Użytkownik może wybrać dowolny zakres dat
   - Brak górnego limitu (np. 2 lata)
   - Walidacja tylko: start_date < end_date, brak przyszłych dat
   - API/performance handling: Server-side będzie odpowiedzialny za throttling jeśli potrzebne

3. **Chunk unloading (memory optimization)**: ✅ **FUTURE ENHANCEMENT**
   - **Co to znaczy**: Gdy użytkownik załaduje wiele chunków (np. 20 chunków = 600 dni dla month range), stare chunki daleko od viewportu powinny być usunięte z pamięci aby zapobiec memory leaks
   - **Dlaczego nie w MVP**: Dodaje complexity (~200 LOC), wymaga sophisticated viewport tracking
   - **Kiedy dodać**: Po MVP, jeśli monitoring pokaże że users ładują >10 chunków i memory usage >100MB
   - **Jak będzie działać**: Chunks >1000 columns od viewportu są unloadowane, przy scroll back są re-fetchowane z cache/API

4. **Loading indicator style**: ✅ **SKELETON COLUMNS**
   - Najbardziej informative
   - Consistent z GridSkeleton
   - 3-5 kolumn podczas loading

5. **API backward compatibility**: ✅ **ELASTIC ENDPOINT (3 TRYBY)**
   - Mode 1: explicit dates
   - Mode 2: range + anchor
   - Mode 3: range only

---

## 12. Appendix

### 12.1. Alternative approaches considered

**Podejście 1: Pagination zamiast infinite scroll**
- **Pros**: Prostszy implementation, lepsza performance control
- **Cons**: Gorszy UX, wymaga klikania "poprzednia strona"
- **Verdict**: Odrzucone - infinite scroll lepszy UX

**Podejście 2: Załadowanie wszystkich danych upfront (no lazy loading)**
- **Pros**: Brak loading states, instant scroll
- **Cons**: Bardzo wolny initial load (>5s), memory issues
- **Verdict**: Odrzucone - nieakceptowalna initial load time

**Podejście 3: Virtual scrolling z window-based loading (nie chunks)**
- **Pros**: Bardziej granular control
- **Cons**: Skomplikowany implementation, trudniejszy cache management
- **Verdict**: Odrzucone - chunk-based approach prostszy i wystarczający

### 12.2. Related features

- **Grid Minimap Navigation** (zaimplementowany) - synergy z infinite scroll (minimap pokazuje załadowane chunks)
- **Grid Filtering** (zaimplementowany) - infinite scroll zachowuje filtrowanie
- **Grid Sorting** (zaimplementowany) - sorting działa na załadowanych danych

### 12.3. Elastic API Endpoint - Design rationale

**Dlaczego zachowujemy `range` param zamiast wymuszać `start_date`/`end_date`?**

**Zalety elastic approach:**

1. **Backward compatibility**: Legacy code nie wymaga refactoru - nadal działa `?range=week`
2. **Quick presets simplicity**: RangeSelector może używać prostego `range` zamiast kalkulować daty
3. **Future flexibility**: Mode 2 (`range` + `end_date`) otwiera drzwi do features jak:
   - Rolling windows (anchor = last event date, nie today)
   - Dynamic ranges (anchor = user-defined pivot point)
   - Time-based analysis (compare week-over-week with shifting anchor)
4. **Better DX**: Deweloperzy mogą wybrać API style który pasuje do use case:
   - Infinite scroll: explicit dates (full control)
   - Presets: range (convenience)
   - Hybrid: range + anchor (flexibility)
5. **Reduced migration risk**: Stopniowe adoption - nie musimy refaktorować wszystkiego od razu
6. **Testing convenience**: Łatwiejsze testowanie z `range=week` niż z kalkulowanymi datami

**Trade-off:**

- Endpoint logic +30 LOC (3 tryby)
- Validation schema +15 LOC (więcej refine rules)
- **Total complexity**: ~45 LOC, ale eliminuje potrzebę refaktoru 10+ komponentów

**Verdict**: Elastic approach wins - flexibility > minimal complexity increase

### 12.4. References

- [React Virtual docs](https://tanstack.com/virtual/latest/docs/introduction)
- [Intersection Observer API](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API)
- [Infinite Scroll Best Practices](https://www.smashingmagazine.com/2022/03/infinite-scroll-best-practices/)
- [Date Picker Accessibility](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/examples/datepicker-dialog/)

---

**Plan gotowy do implementacji - wszystkie decyzje podjęte ✅**

Start implementation: Faza 0 - Feature branch setup

