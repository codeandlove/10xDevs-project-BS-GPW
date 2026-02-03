# Plan Implementacji Feature - Advanced Ticker Selector

Data utworzenia: 2026-02-01
Tytul feature: Rozszerzony Wybór Tickerów dla Black Swan Grid
Typ: Full Feature (UI/UX + Business Logic + Integration)
Priorytet: HIGH

## 1. Podsumowanie wykonawcze

### 1.1. Opis funkcjonalnosci

Rozbudowa systemu filtrowania tickerów w Black Swan Grid o dynamiczne pobieranie wszystkich aktywnych tickerów GPW (~460) z tabeli GPW_Symbols w NocoDB, zaawansowaną wyszukiwarkę (symbol, label, name), predefinowane indeksy GPW (WIG20, mWIG40, sWIG80, WIGGry) oraz smart inicjalizację pokazującą tickery z wydarzeniami z ostatnich 7 dni z fallbackiem do WIG20.

### 1.2. Value proposition

Użytkownicy zyskują:
- Pełny dostęp do wszystkich ~460 spółek GPW (obecnie tylko 8 hardcoded)
- Szybkie wyszukiwanie tickerów po symbolu, skróconej i pełnej nazwie w czasie rzeczywistym
- Możliwość wyboru całych indeksów jednym kliknięciem (WIG20, mWIG40, etc.)
- Automatyczne pokazanie "żywych danych" - tickery które miały wydarzenia w ostatnim tygodniu
- Zwiększenie engagement i redukcja churn dzięki lepszej dostępności danych

Biznes zyskuje:
- Zwiększony engagement (+15% expected)
- Redukcja churn (-5% expected)
- Competitive advantage (lepsze filtry niż konkurencja)
- Upsell opportunity (premium feature)

### 1.3. Zakres wpływu

Nowe komponenty/moduły:
- `src/config/gpw-indices.ts` - konfiguracja indeksów GPW
- `src/hooks/useSymbols.ts` - hook do pobierania i cache symbols
- `src/components/grid/AdvancedTickerFilter.tsx` - główny modal z filtrem
- `src/components/grid/TickerSearchInput.tsx` - input wyszukiwarki
- `src/components/grid/TickerList.tsx` - wirtualizowana lista tickerów
- `src/pages/api/nocodb/symbols.ts` - endpoint do pobierania symbols

Modyfikowane komponenty/moduły:
- `src/components/grid/GridView.tsx` - smart initialization logic
- `src/types/nocodb.types.ts` - nowe typy (GPWSymbol, SymbolsResponse)
- `src/lib/nocodb-client.ts` - metoda querySymbols()
- `src/services/nocodb.service.ts` - metoda getActiveSymbols()
- `src/lib/cache.ts` - funkcja hashSymbols()
- `.env.example` - nowa zmienna NOCODB_TABLE_GPW_SYMBOLS

Grupa docelowa uzytkownikow: Wszyscy zalogowani użytkownicy z aktywną subskrypcją/trial
Dotknięte srodowiska: development, staging, production

### 1.4. Priorytet i MVP scope

HIGH - Feature unlock'uje pełny potencjał aplikacji (dostęp do wszystkich 460 spółek GPW zamiast 8)

MVP (must-have):
- Dynamiczne pobieranie wszystkich aktywnych tickerów z GPW_Symbols
- Wyszukiwarka tickerów (search po symbol, label, name)
- Smart inicjalizacja (tickery z eventami z ostatnich 7 dni + WIG20 fallback)
- Modal z virtual scroll dla performance
- Przyciski "Zaznacz wszystkie" / "Odznacz wszystkie"
- Predefinowane indeksy GPW (WIG20, mWIG40, sWIG80, WIGGry)
- Cache optimization (hash dla długich symbol arrays)

Nice-to-have (moze byc dodane pozniej):
- Ticker favorites (zapisywanie ulubionych tickerów)
- Advanced filters (sektor, kapitalizacja rynkowa)
- Periodic auto-update indeksów z GPW API
- Fuzzy search (Fuse.js)
- Export wybranych tickerów (CSV/JSON)

## 2. Szczegolowa analiza wymagan

### 2.1. Wymagania funkcjonalne

1. System musi pobierać wszystkie aktywne tickery (~460) z tabeli GPW_Symbols w NocoDB - MUST
2. Wyszukiwarka musi filtrować tickery w czasie rzeczywistym (<50ms) po symbolu, label i nazwie - MUST
3. Smart inicjalizacja musi pokazywać tickery z eventami z ostatnich 7 dni lub WIG20 jako fallback - MUST
4. Modal filtra musi obsługiwać 460 tickerów z płynnym scrollowaniem (60 FPS) - MUST
5. Użytkownik musi móc wybrać cały indeks GPW jednym kliknięciem (WIG20, mWIG40, etc.) - MUST
6. Przyciski "Zaznacz wszystkie" i "Odznacz wszystkie" muszą być dostępne - MUST
7. Cache key dla długich list symboli musi być zoptymalizowany (hash MD5) - MUST
8. Preferencje filtrów muszą być zapisywane w LocalStorage - SHOULD
9. Grid musi odświeżać się automatycznie po zmianie wybranych tickerów - MUST
10. System musi obsługiwać edge case: 0 eventów w ostatnim tygodniu (fallback WIG20) - MUST
11. System musi obsługiwać edge case: brak tickerów w GPW_Symbols (komunikat błędu) - MUST
12. API endpoint /api/nocodb/symbols musi być chroniony autoryzacją - MUST

### 2.2. Wymagania niefunkcjonalne

Performance:
- Modal open time < 300ms (z cache)
- Search filtering < 50ms dla 460 tickerów
- Virtual scroll >= 55 FPS przy przewijaniu
- Smart init < 2s (fetch + render)
- Cache hit rate > 80% dla symbols (24h TTL)

Security:
- Endpoint /api/nocodb/symbols wymaga authorization (Supabase session)
- Endpoint wymaga aktywnej subskrypcji/trial
- Rate limiting: 60 requests/min/user
- Input validation (zod) dla query params
- Brak wycieków NocoDB API token (server-side proxy)

Accessibility:
- Keyboard navigation (Tab, Enter, Escape) w modalu
- aria-label dla wszystkich interaktywnych elementów
- aria-expanded dla modal state
- Focus management (auto-focus na search input przy otwarciu)
- Screen reader compatible (semantic HTML)

SEO: N/A (aplikacja za paywall)

Compatibility:
- Przeglądarki: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- Mobile/Desktop: Desktop primarily (mobile view pokazuje komunikat - zgodnie z MVP)
- Screen sizes: 1280x720 minimum (desktop)

### 2.3. User stories i use cases

#### User Story 1: Przegląd grida z smart inicjalizacją

Jako zalogowany użytkownik
Chce zobaczyć grid z tickerami które miały wydarzenia w ostatnim tygodniu
Aby od razu widzieć "żywe dane" i aktualną aktywność rynkową

Acceptance Criteria:
- [ ] Grid pokazuje tickery z eventami z ostatnich 7 dni przy pierwszym wejściu
- [ ] Jeśli < 2 eventy w ostatnim tygodniu, pokazuje WIG20 (20 tickerów)
- [ ] Filter button pokazuje badge z liczbą zaznaczonych tickerów
- [ ] Grid ładuje się w < 2s

#### User Story 2: Wyszukiwanie tickera

Jako użytkownik
Chce wyszukać konkretny ticker po symbolu lub nazwie
Aby szybko znaleźć interesującą mnie spółkę

Acceptance Criteria:
- [ ] Otworzenie modalu filtra przez kliknięcie przycisku "Tickery"
- [ ] Input wyszukiwarki jest auto-focused
- [ ] Wpisanie "PKN" filtruje listę w czasie rzeczywistym (<50ms)
- [ ] Wyniki są sortowane: exact match symbol > exact match label > alfabetycznie
- [ ] Wpisanie "orlen" znajduje PKN Orlen (search po nazwie)
- [ ] Przycisk X czyści wyszukiwanie

#### User Story 3: Wybór indeksu WIG20

Jako użytkownik
Chce wybrać wszystkie spółki z WIG20 jednym kliknięciem
Aby szybko analizować najpopularniejsze spółki

Acceptance Criteria:
- [ ] Dropdown "Indeksy GPW" jest widoczny w modalu
- [ ] Wybór "WIG20" automatycznie zaznacza wszystkie 20 symboli
- [ ] Grid odświeża się i pokazuje eventy dla WIG20
- [ ] Filter button pokazuje badge "20"

#### User Story 4: Zaznaczenie wszystkich tickerów

Jako użytkownik
Chce zaznaczyć wszystkie dostępne tickery
Aby zobaczyć pełny obraz rynku GPW

Acceptance Criteria:
- [ ] Przycisk "Zaznacz wszystkie" jest widoczny
- [ ] Kliknięcie zaznacza wszystkie widoczne tickery (po filtrze search)
- [ ] Jeśli search jest pusty, zaznacza wszystkie 460 tickerów
- [ ] Grid odświeża się z wszystkimi zaznaczonymi tickerami
- [ ] Performance pozostaje płynny (virtual scroll)

#### User Story 5: Edge case - brak eventów

Jako użytkownik wchodzący na grid w spokojnym tygodniu
Chce zobaczyć jakieś dane nawet jeśli nie było eventów
Aby nie widzieć pustego grida

Acceptance Criteria:
- [ ] System wykrywa < 2 eventy w ostatnich 7 dniach
- [ ] Automatycznie zaznacza WIG20 (20 symboli)
- [ ] Grid pokazuje eventy dla WIG20 z ostatniego tygodnia
- [ ] Użytkownik widzi informację o fallbacku (opcjonalnie)

### 2.4. Edge cases i scenariusze alternatywne

Edge case 1: Brak tickerów w GPW_Symbols table
- Opis: Tabela GPW_Symbols jest pusta lub nie istnieje
- Oczekiwane zachowanie: Pokazać komunikat błędu "Brak dostępnych tickerów. Skontaktuj się z administratorem." + przycisk "Odśwież"

Edge case 2: Network error podczas pobierania symbols
- Opis: Fetch do /api/nocodb/symbols fails po 3 retry
- Oczekiwane zachowanie: Pokazać cached symbols jeśli dostępne, komunikat błędu + przycisk "Spróbuj ponownie"

Edge case 3: 0 eventów w ostatnich 7 dniach
- Opis: Bardzo spokojny tydzień na giełdzie
- Oczekiwane zachowanie: Smart init wybiera WIG20, pokazuje ich eventy (mogą być z wcześniejszych dat)

Edge case 4: Wszystkie 460 tickerów zaznaczone
- Opis: Użytkownik zaznaczył wszystko
- Oczekiwane zachowanie: Backend API zwraca max 1000 eventów (obecny limit), grid pokazuje z virtual scroll, wszystko działa płynnie

Edge case 5: Search query nie pasuje do żadnego tickera
- Opis: Użytkownik wpisał "XYZ123"
- Oczekiwane zachowanie: Pokazać "Brak wyników dla 'XYZ123'" w liście tickerów

Edge case 6: Wygasła subskrypcja podczas używania filtra
- Opis: Trial/subskrypcja wygasła podczas sesji
- Oczekiwane zachowanie: Następny fetch do API zwróci 403, redirect do checkout z returnUrl

Error scenario 1: Rate limit exceeded
- Co sie dzieje: Użytkownik otworzył modal 61 razy w minucie
- Oczekiwane zachowanie: API zwraca 429, pokazać komunikat "Zbyt wiele żądań. Spróbuj za 60 sekund." + timer

Error scenario 2: Invalid response z API
- Co sie dzieje: API zwraca malformed JSON lub nieoczekiwane dane
- Oczekiwane zachowanie: Catch error, pokazać cached data jeśli dostępne, komunikat "Błąd ładowania danych"

### 2.5. Integracje i zaleznosci

#### Wewnetrzne zaleznosci:

- GridView.tsx - główny komponent grida, wymaga modyfikacji dla smart init
  - Interface: setSymbols(symbols: string[]) z GridContext
  
- useClientCache.ts - istniejący hook cache
  - Interface: useClientCache(key, fetchFn, options) - używany przez useSymbols

- nocodb-client.ts - client do komunikacji z NocoDB API
  - Interface: queryRecords<T>(tableId, queryBuilder) - rozszerzenie o querySymbols()

- GridContext - context zarządzający stanem grida
  - Interface: gridState.symbols, setSymbols() - używane przez AdvancedTickerFilter

#### External APIs / Third-party services:

- NocoDB API - tabela GPW_Symbols
  - Endpoint: GET /api/v2/tables/{GPW_SYMBOLS_TABLE_ID}/records
  - Query params: where=(active,eq,true), sort=symbol, limit=1000
  - Response: NocoDBResponse<NocoDBSymbolRecord>

- Supabase Auth - autoryzacja endpoint
  - Middleware: getAuthUid() sprawdza session
  - Subscription check: sprawdza subscription_status i trial_expires_at

#### Zaleznosci od innych features:

- Cache system musi być gotowy przed tym feature (już istnieje - useClientCache)
- GridContext musi wspierać symbols array (już wspiera)
- Supabase middleware musi działać dla nowego endpoint /api/nocodb/symbols
- Virtual scroll (react-window) musi być zainstalowany (już jest w VirtualizedGrid)

## 3. Architektura i design

### 3.1. Diagram architektury

```
[User] -> [AdvancedTickerFilter Modal]
              |
              v
          [TickerSearchInput] (search query)
              |
              v
          [useSymbols hook] -> fetch /api/nocodb/symbols
              |                     |
              v                     v
          [in-memory cache]     [API endpoint]
          [LocalStorage]            |
              |                     v
              v                 [NocoDBService.getActiveSymbols()]
          [searchSymbols()]         |
              |                     v
              v                 [NocoDB API - GPW_Symbols table]
          [TickerList] (virtual scroll)
              |
              v
          [User selects tickers]
              |
              v
          [onChange(selected[])] -> GridContext.setSymbols()
              |
              v
          [GridView re-fetches] -> /api/nocodb/grid?symbols=...
              |
              v
          [Grid updates with new events]
```

### 3.2. Flow danych

Smart Initialization Flow:
1. Użytkownik wchodzi na /grid
2. GridView useEffect wykrywa mount i hasAccess === true
3. Wywołuje smartInitialization():
   - Fetch events z ostatnich 7 dni BEZ filtra ticker (symbols undefined)
   - Ekstraktuj unique symbols z eventów
   - Jeśli events.length >= 2: setSymbols(uniqueSymbols)
   - Jeśli events.length < 2: setSymbols(WIG20_SYMBOLS)
4. GridContext aktualizuje symbols
5. Grid re-fetchuje dane z nowymi symbolami
6. UI pokazuje grid z wybranymi tickerami

Filter Modal Flow:
1. Użytkownik kliknie przycisk "Tickery"
2. AdvancedTickerFilter modal opens
3. useSymbols hook:
   - Sprawdza cache (gpw:cache:v1:symbols)
   - Jeśli hit: zwraca cached symbols natychmiast
   - Background fetch do /api/nocodb/symbols (revalidate)
   - Update cache + UI po otrzymaniu fresh data
4. User wpisuje search query "PKN"
5. searchSymbols() filtruje w czasie rzeczywistym
6. TickerList (virtual scroll) pokazuje tylko matching results
7. User zaznacza PKN checkbox
8. onChange callback aktualizuje selected array
9. User klika "Zastosuj"
10. Modal closes, onChange wywołuje setSymbols(newSelected)
11. GridView re-fetchuje grid data z nowymi symbolami
12. Grid updates

Index Selection Flow:
1. User otwiera modal
2. Wybiera "WIG20" z dropdown
3. handleSelectIndex():
   - Pobiera WIG20_SYMBOLS z config
   - Merge z obecnie selected: new Set([...selected, ...WIG20_SYMBOLS])
   - onChange([...combined])
4. UI update: wszystkie WIG20 tickery są checked
5. User klika "Zastosuj"
6. Grid re-fetches z WIG20 symbolami

### 3.3. Model danych

#### Nowe typy/interfejsy:

```typescript
// src/types/nocodb.types.ts

/**
 * GPW Symbol (ticker) z tabeli GPW_Symbols
 */
interface GPWSymbol {
  symbol: string;      // "11B"
  label: string;       // "11BIT"
  name: string;        // "11 Bit Studios SA"
  active: boolean;     // true
}

/**
 * NocoDB raw symbol record
 */
interface NocoDBSymbolRecord {
  Id: string | number;
  CreatedAt?: string;
  UpdatedAt?: string | null;
  symbol: string;
  label: string;
  name: string;
  active: boolean;
}

/**
 * Symbols API response
 */
interface SymbolsResponse {
  symbols: GPWSymbol[];
  total_count: number;
  cached_at: string; // ISO timestamp
}

/**
 * GPW Index configuration
 */
interface GPWIndex {
  id: string;
  name: string;
  description: string;
  symbols: string[];
}
```

#### Nowe tabele w bazie danych:

Tabela GPW_Symbols już istnieje w NocoDB (zgodnie z PRD), struktura:

```
GPW_Symbols:
- Id: UUID/number (primary key)
- symbol: string (np. "11B")
- label: string (np. "11BIT")
- name: string (np. "11 Bit Studios SA")
- active: boolean (czy ticker jest aktywny)
- CreatedAt: timestamp
- UpdatedAt: timestamp
```

Brak potrzeby migracji - tabela już istnieje.

#### Modyfikacje istniejacych struktur:

Brak modyfikacji w istniejących tabelach. Tylko nowe typy TypeScript.

### 3.4. Komponenty i moduły

#### Nowe komponenty:

- `src/components/grid/AdvancedTickerFilter.tsx` - główny modal z filtrem
  - Odpowiedzialność: Zarządzanie stanem modalu, selected symbols, integracja z useSymbols, search, index selection
  - Props: selected: string[], onChange: (selected: string[]) => void
  - State: isOpen, searchQuery, selectedIndex
  - UI: Dialog (shadcn), TickerSearchInput, Select dla indeksów, TickerList, action buttons

- `src/components/grid/TickerSearchInput.tsx` - input wyszukiwarki
  - Odpowiedzialność: Input z ikoną search, clear button
  - Props: value: string, onChange: (value: string) => void
  - UI: Input (shadcn), Search icon, X button

- `src/components/grid/TickerList.tsx` - wirtualizowana lista
  - Odpowiedzialność: Virtual scroll lista tickerów z checkboxami
  - Props: symbols: GPWSymbol[], selected: Set<string>, onToggle: (symbol: string) => void, height: number
  - Library: react-window (FixedSizeList)
  - Performance: tylko widoczne elementy renderowane

#### Modyfikowane komponenty:

- `src/components/grid/GridView.tsx` - smart init logic
  - Dodane: useEffect dla smartInitialization
  - Dodane: isInitializing state
  - Zmienione: AVAILABLE_SYMBOLS usunięte, używa WIG20_SYMBOLS z config
  - Zmienione: cache key używa hashSymbols() dla długich arrays
  - Zmienione: TickerFilter replaced by AdvancedTickerFilter

#### Nowe serwisy/hooki:

- `src/hooks/useSymbols.ts` - custom hook do symbols
  - Funkcje: useSymbols(), searchSymbols()
  - Odpowiedzialność: Fetch symbols z cache, search filtering logic
  - Dependencies: useClientCache
  - Cache key: gpw:cache:v1:symbols, TTL: 24h

#### Nowe utilities:

- `src/lib/cache.ts` - (modyfikacja) dodać hashSymbols()
  - Funkcja: hashSymbols(symbols: string[]): string
  - Odpowiedzialność: MD5 hash dla długich symbol arrays w cache keys
  - Logic: jeśli <= 5 symboli, join; jeśli > 5, MD5 hash (pierwsze 8 znaków)

#### Nowe konfiguracje:

- `src/config/gpw-indices.ts` - definicje indeksów GPW
  - Exports: WIG20_SYMBOLS, MWIG40_SYMBOLS, SWIG80_SYMBOLS, WIGGRY_SYMBOLS
  - Exports: GPW_INDICES object (Record<string, GPWIndex>)
  - Funkcje: getIndexById(), getAllIndices()

#### Nowe API endpoints:

- `GET /api/nocodb/symbols` - pobiera active symbols
  - Opis: Zwraca wszystkie aktywne tickery z GPW_Symbols
  - Auth: Wymaga Supabase session + active subscription/trial
  - Rate limit: 60 req/min/user
  - Cache: Server response header: Cache-Control: private, max-age=86400
  - Response: SymbolsResponse (symbols[], total_count, cached_at)
  - Error codes: 401 (unauthorized), 403 (no subscription), 429 (rate limit), 500 (server error)

## 4. Propozycje podejsc architektonicznych

### 4.1. Podejscie A (REKOMENDOWANE) - Modal z Virtual Scroll + Smart Init

#### Opis:

Implementacja modalowego filtra z pełną wirtualizacją (react-window), search w czasie rzeczywistym, predefinowanymi indeksami GPW i smart inicjalizacją pokazującą tickery z eventami z ostatnich 7 dni lub WIG20 fallback. Cache 24h dla symbols, hash MD5 dla długich symbol arrays w grid cache keys. Wszystkie dane z GPW_Symbols pobierane dynamicznie z NocoDB.

#### Architektura:

Komponenty:
- AdvancedTickerFilter (modal container + state management)
- TickerSearchInput (controlled input + icons)
- TickerList (virtual scroll z react-window, checkboxes)
- useSymbols hook (fetch + cache + search logic)

Flow:
1. User mount GridView → smartInitialization fetch events → select symbols
2. User clicks filter → modal opens → useSymbols fetches from cache/API
3. User searches/selects → real-time filtering → checkbox state
4. User applies → setSymbols() → grid re-fetch → UI update

State management:
- GridContext: symbols[] (currently selected)
- Modal local: isOpen, searchQuery, selectedIndex
- useSymbols: cached symbols, isLoading, error

Cache strategy:
- Symbols: 24h TTL, key: gpw:cache:v1:symbols
- Grid: 5min TTL, key: gpw:cache:v1:grid|range=week|symbols=<hash>
- Hash: MD5 dla > 5 symboli (pierwsze 8 znaków)

#### Zakres zmian:

Nowe pliki (13):
1. src/config/gpw-indices.ts
2. src/hooks/useSymbols.ts
3. src/components/grid/AdvancedTickerFilter.tsx
4. src/components/grid/TickerSearchInput.tsx
5. src/components/grid/TickerList.tsx
6. src/pages/api/nocodb/symbols.ts
7. e2e/grid-ticker-selector.spec.ts
8. src/test/hooks/useSymbols.test.ts

Modyfikowane pliki (7):
1. .env.example - +NOCODB_TABLE_GPW_SYMBOLS
2. src/types/nocodb.types.ts - +GPWSymbol, SymbolsResponse, NocoDBSymbolRecord
3. src/lib/nocodb-client.ts - +querySymbols() method, +GPW_SYMBOLS w NOCODB_TABLES
4. src/services/nocodb.service.ts - +getActiveSymbols() method, +transformSymbol()
5. src/lib/cache.ts - +hashSymbols() function
6. src/components/grid/GridView.tsx - smart init, AdvancedTickerFilter, hash cache key
7. e2e/grid.spec.ts - update ticker filter test cases

Nowe dependencies: BRAK (react-window już jest w projekcie)

Database migrations: BRAK (GPW_Symbols już istnieje)

Testy:
- Unit: searchSymbols(), hashSymbols() (2 test suites, ~15 test cases)
- E2E: 7 scenarios (smart init, search, select all, index selection, etc.)

#### Zalety:

- Performance: Virtual scroll zapewnia płynny UX przy 460 tickerach (60 FPS)
- UX: Modal daje więcej przestrzeni niż dropdown, lepszy layout
- Smart init: User widzi od razu "żywe dane" z kontekstem
- Scalability: Łatwo dodać nowe indeksy (tylko config update)
- Cache optimization: Hash prevents LocalStorage quota issues
- Maintenance: Czysta separacja concerns (hook, components, config)
- Testability: Każdy komponent łatwo testować w izolacji

#### Wady:

- Complexity: Więcej komponentów niż simple dropdown (ale lepszy UX)
- Initial setup: Wymaga utworzenia GPW_Symbols table data (~4h one-time)
- Bundle size: +~5KB (modal + virtual scroll components) - akceptowalne

#### Effort: M (Medium - 3-5 dni)

Breakdown:
- Day 1: Backend (types, client, service, endpoint) - 6h
- Day 2: Hooks + base components (useSymbols, SearchInput, TickerList) - 8h
- Day 3: Main component + integration (AdvancedTickerFilter, GridView mods) - 8h
- Day 4: Smart init logic + edge cases - 6h
- Day 5: Tests (unit + E2E) + polish - 8h

Total: ~36h (4.5 dni roboczych dla 1 senior developer)

#### Zlozonosc: MEDIUM

Uzasadnienie:
- Moderate architecture changes (6 nowych komponentów, 7 modyfikacji)
- Dobrze znane patterns (modal, virtual scroll, cache, hooks)
- Integracja z istniejącym GridContext (już działa)
- Edge cases są przewidywalne (brak eventów, network errors)
- Brak nowych external dependencies

#### Impact na system: MEDIUM

Uzasadnienie:
- GridView - MEDIUM impact (smart init logic, cache key change)
- Cache system - LOW impact (tylko nowa funkcja helper)
- NocoDB integration - LOW impact (nowy endpoint, istniejący pattern)
- GridContext - LOW impact (już wspiera symbols array)
- Inne komponenty - ZERO impact (izolowana funkcjonalność)

Potencjalne ryzyka:
- Performance przy 460 tickerach: MITIGATED (virtual scroll)
- Cache quota: MITIGATED (hash dla długich arrays)
- Smart init failures: MITIGATED (fallback do WIG20)

#### Zgodnosc ze standardami:

Copilot-instructions.md: ✅
- React functional components z hooks
- React.memo() dla TickerList row component
- Virtual scroll (react-window) dla performance
- useCallback dla event handlers (onToggle)
- useMemo dla filtered symbols
- Accessibility (aria-label, keyboard navigation)

Tech-stack.md: ✅
- Astro endpoints dla API routes
- React components z client:load
- TypeScript strict mode
- Tailwind dla styling
- shadcn/ui components (Dialog, Input, Checkbox, Select)

Best practices: ✅
- DRY: Reusable hook (useSymbols), sharable config (gpw-indices)
- Separation of concerns: Logic (hook) vs Presentation (components)
- Error handling: Try-catch, graceful degradation, retry logic
- Performance: Virtual scroll, memoization, cache optimization
- Testing: Unit + E2E coverage

### 4.2. Podejscie B - Simple Dropdown z Pagination

#### Opis:

Rozbudowa obecnego TickerFilter o server-side pagination (load more) i basic search bez virtual scroll. Brak smart init - user zawsze startuje z pustym gridem i musi ręcznie wybrać tickery. Modal zastąpiony rozszerzonym dropdownem z scrollem i pagination buttons.

#### Architektura:

Komponenty:
- EnhancedTickerFilter (rozszerzona wersja obecnego TickerFilter)
- Basic search input w dropdownie
- Load more button (pagination)
- Fetch symbols paginated (50 per page)

Flow:
1. User clicks filter → dropdown opens → fetch first 50 symbols
2. User scrolls → clicks "Load more" → fetch next 50
3. User searches → debounced fetch z query param
4. User selects → onChange → grid re-fetch

#### Zakres zmian:

Nowe pliki (4):
1. src/pages/api/nocodb/symbols.ts (z pagination)
2. src/hooks/useSymbolsPaginated.ts
3. src/components/grid/EnhancedTickerFilter.tsx
4. e2e/enhanced-ticker-filter.spec.ts

Modyfikowane pliki (3):
1. src/types/nocodb.types.ts
2. src/lib/nocodb-client.ts
3. src/components/grid/GridView.tsx (replace filter)

#### Zalety:

- Prostszy kod (mniej komponentów)
- Mniejszy initial bundle (brak modalu, brak virtual scroll)
- Mniejszy effort (S - 2-3 dni)

#### Wady:

- Gorszy UX: Pagination jest annoying dla 460 items
- Brak smart init: User zawsze startuje z pustym gridem
- Performance: 460 checkboxów bez virtual scroll może spowalniać
- Scalability: Trudno dodać indeksy GPW (brak miejsca w dropdownie)
- Maintenance: Mieszanie concerns w jednym komponencie

#### Effort: S (Small - 2-3 dni)

#### Zlozonosc: LOW

#### Impact na system: LOW

#### Zgodnosc ze standardami:

Copilot-instructions.md: ⚠️
- Performance concerns (brak virtual scroll)
- Accessibility OK
- React patterns OK

Tech-stack.md: ✅

Best practices: ⚠️
- UX issues (pagination dla 460 items)

### 4.3. Podejscie C - Hybrid: Grouped Dropdown + Modal for Search

#### Opis:

Dropdown pokazuje tylko predefined indeksy (WIG20, mWIG40, etc.) jako główne opcje. Dla custom selection, user klika "Zaawansowane..." co otwiera modal z pełną listą i search. Smart init wybiera WIG20 domyślnie (bez fetch eventów).

#### Architektura:

Komponenty:
- IndexDropdown (pokazuje tylko indeksy)
- AdvancedSearchModal (modal z full list + search)
- Separate flows dla quick selection vs advanced

#### Zalety:

- Quick access do indeksów (1 click)
- Advanced users mają pełną kontrolę (modal)
- Mniejszy initial load (indeksy są hardcoded)

#### Wady:

- Brak smart init (user nie widzi "żywych danych")
- Two separate UX flows (może być confusing)
- Więcej kodu niż Podejście A (2 separate components)
- Trudniej maintainować (2 ścieżki)

#### Effort: M (Medium - 3-4 dni)

#### Zlozonosc: MEDIUM

#### Impact na system: MEDIUM

#### Zgodnosc ze standardami: ✅

## 5. Rekomendacja i uzasadnienie

### 5.1. Wybrane podejscie

PODEJSCIE A - Modal z Virtual Scroll + Smart Init

### 5.2. Uzasadnienie wyboru

Najlepiej realizuje wymagania biznesowe poprzez:
- Smart init pokazuje użytkownikowi "żywe dane" od razu przy wejściu - zwiększa engagement
- Pełny dostęp do wszystkich 460 tickerów bez pagination - lepsza UX
- Quick access do indeksów GPW (WIG20, etc.) - productivity boost
- Search w czasie rzeczywistym - intuitive UX

Skaluje sie w przyszlosci:
- Łatwo dodać nowe indeksy (tylko config update w gpw-indices.ts)
- Możliwość rozbudowy o favorites, recent, custom groups
- Architecture wspiera future enhancements (ticker metadata, sectors)

Jest zgodne ze standardami projektu i architektura:
- React functional components + hooks (zgodne z copilot-instructions)
- Virtual scroll pattern już używany w VirtualizedGrid
- Cache strategy spójna z istniejącym useClientCache
- shadcn/ui components (Dialog, Input, Checkbox)
- TypeScript strict mode

Minimalizuje zlozonosc i technical debt:
- Clean separation of concerns (hook, components, config)
- Reusable patterns (virtual scroll, modal, search)
- Testable architecture (unit + E2E)
- No new external dependencies (react-window już jest)

Optymalizuje user experience:
- Smart init - user widzi dane od razu (value proposition)
- Modal daje więcej przestrzeni niż dropdown (better readability)
- Virtual scroll - smooth performance przy 460 items
- Real-time search - instant feedback (<50ms)
- One-click index selection - productivity

Optymalizuje performance:
- Virtual scroll zapewnia 60 FPS przy przewijaniu
- Cache 24h dla symbols (rzadko się zmieniają)
- Hash optimization dla cache keys (prevents quota issues)
- Smart init minimalizuje initial load (tylko selected symbols)
- Memoization (useMemo, useCallback) prevents unnecessary re-renders

## 6. Szczegolowy plan implementacji

### 6.1. Faza 1: Przygotowanie  
- Utworzenie brancha: feature/advanced-ticker-selector
- Weryfikacja że tabela GPW_Symbols istnieje w NocoDB i zawiera ok 460 rekordów
- Dodanie NOCODB_TABLE_GPW_SYMBOLS do .env
- Weryfikacja że react-window jest zainstalowany  
- Przygotowanie list WIG20, mWIG40, sWIG80, WIGGry

### 6.2. Faza 2: Backend - Types & API Layer

Kroki implementacji:

1. Rozszerzenie types (src/types/nocodb.types.ts)
   - Dodać interfejsy: GPWSymbol, NocoDBSymbolRecord, SymbolsResponse, GPWIndex
   - Export wszystkich nowych typów

2. NocoDB Client extension (src/lib/nocodb-client.ts)
   - Dodać GPW_SYMBOLS do NOCODB_TABLES
   - Dodać metodę querySymbols() wykorzystującą queryRecords<NocoDBSymbolRecord>()

3. NocoDB Service extension (src/services/nocodb.service.ts)
   - Dodać helper transformSymbol() do mapowania NocoDBSymbolRecord -> GPWSymbol
   - Dodać metodę getActiveSymbols() zwracającą SymbolsResponse
   - Query: where active=true, sort by symbol, limit 1000

4. API Endpoint (src/pages/api/nocodb/symbols.ts)
   - Implementacja GET endpoint z auth check (Supabase session)
   - Subscription validation (active lub trial)
   - Rate limiting (60 req/min/user)
   - Cache headers (private, max-age=86400)
   - Error handling (401, 403, 429, 500)

5. Cache helper (src/lib/cache.ts)
   - Dodać funkcję hashSymbols(symbols: string[]): string
   - Logic: jeśli <=5 symboli -> join(','), jeśli >5 -> MD5 hash (8 chars)

6. Config GPW indices (src/config/gpw-indices.ts)
   - Definicje stałych: WIG20_SYMBOLS, MWIG40_SYMBOLS, SWIG80_SYMBOLS, WIGGRY_SYMBOLS
   - Export GPW_INDICES object (Record<string, GPWIndex>)
   - Helper functions: getIndexById(), getAllIndices()

### 6.3. Faza 3: Frontend Components

Kroki implementacji:

7. Hook useSymbols (src/hooks/useSymbols.ts)
   - Hook useSymbols() wykorzystujący useClientCache
   - Funkcja searchSymbols(query, symbols) z priorytetowym sortowaniem
   - Cache key: gpw:cache:v1:symbols, TTL: 24h

8. TickerSearchInput (src/components/grid/TickerSearchInput.tsx)
   - Input z ikoną Search (lucide-react)
   - Clear button (X icon) widoczny gdy value !== ""
   - Props: value, onChange

9. TickerList (src/components/grid/TickerList.tsx)
   - Virtual scroll z react-window (FixedSizeList)
   - Row component z Checkbox i labels (symbol, label, name)
   - Props: symbols, selected (Set), onToggle, height

10. AdvancedTickerFilter (src/components/grid/AdvancedTickerFilter.tsx)
    - Dialog (shadcn/ui) z modal behavior
    - State: isOpen, searchQuery, selectedIndex
    - Integracja useSymbols hook
    - TickerSearchInput + Select (indices) + action buttons
    - Dwie sekcje z TickerList: zaznaczone + wszystkie (filtered)
    - Handlers: handleToggle, handleSelectAll, handleDeselectAll, handleSelectIndex

### 6.4. Faza 4: Integration & Testing

11. GridView integration (src/components/grid/GridView.tsx)
    - Import WIG20_SYMBOLS, hashSymbols, AdvancedTickerFilter
    - Usunięcie AVAILABLE_SYMBOLS hardcoded
    - State isInitializing
    - useEffect smartInitialization: fetch events -> extract symbols -> fallback WIG20
    - Zmiana cache key: hashSymbols(gridState.symbols)
    - Podmiana TickerFilter -> AdvancedTickerFilter

12. Tests
    - Unit: src/test/hooks/useSymbols.test.ts (searchSymbols scenarios)
    - Unit: src/lib/cache.test.ts (hashSymbols scenarios)
    - E2E: e2e/grid-ticker-selector.spec.ts (7 test cases)
    - Update: e2e/grid.spec.ts (ticker filter test cases)

## 7. Plan weryfikacji i testowania

### 7.1. Unit tests checklist
- Funkcje searchSymbols() i hashSymbols() mają testy
- Edge cases są pokryte
- Code coverage > 80% dla nowego kodu

### 7.2. E2E tests checklist  
- TC-TICKER-001: Smart init z eventami
- TC-TICKER-002: Fallback do WIG20
- TC-TICKER-003: Search tickers
- TC-TICKER-004: Select index WIG20
- TC-TICKER-005: Select all tickers
- TC-TICKER-006: Deselect all tickers  
- TC-TICKER-007: Virtual scroll performance

### 7.3. Manual testing checklist
- Funkcjonalność działa zgodnie z acceptance criteria
- UI jest responsywne
- Testowanie dostępności (keyboard navigation)
- Testowanie performance (460 tickerów, scroll 60 FPS)

## 8. Analiza ryzyka i mitigation

### 8.1. Zidentyfikowane ryzyka

Ryzyko 1: Tabela GPW_Symbols nie istnieje lub jest pusta
- Severity: HIGH
- Prawdopodobieństwo: MEDIUM
- Wpływ: Feature nie działa
- Mitigation: Weryfikacja przed deploy, utworzenie tabeli i załadowanie danych
- Contingency plan: Fallback do hardcoded WIG20 jeśli fetch fails

Ryzyko 2: 460 tickerów spowalnia modal
- Severity: MEDIUM
- Prawdopodobieństwo: LOW  
- Wpływ: Gorsze UX
- Mitigation: Virtual scroll (react-window) zapewnia 60 FPS
- Contingency plan: Performance test przed deploy

Ryzyko 3: Hash collisions w cache keys
- Severity: LOW
- Prawdopodobieństwo: LOW
- Wpływ: Użytkownik zobaczy cached dane dla innej kombinacji
- Mitigation: MD5 8 chars - kolizje bardzo rzadkie, cache TTL 5min auto-refresh
- Contingency plan: Użytkownik może ręcznie odświeżyć

Ryzyko 4: Smart init failuje (network error)
- Severity: MEDIUM  
- Prawdopodobieństwo: LOW
- Wpływ: Grid nie pokazuje danych
- Mitigation: Catch block z fallback do WIG20
- Contingency plan: Retry button + error message

### 8.2. Technical debt i trade-offs

Trade-off 1: Indeksy GPW hardcoded vs fetch z API
- Decyzja: Hardcoded w config
- Uzasadnienie: Indeksy rzadko się zmieniają, prostsze maintenance
- Future: Periodic update z GPW API (P2)

Trade-off 2: Client-side tylko cache vs server-side Redis
- Decyzja: Tylko client-side w MVP
- Uzasadnienie: Wystarczające dla MVP, mniej complexity
- Future: Redis cache dla symbols (P2)

### 8.3. Rollback plan

1. Revert feature branch merge
2. Deploy poprzednia wersja z hardcoded 8 symboli  
3. Komunikat użytkownikom o tymczasowej niedostępności pełnej listy
4. Debug i fix issues
5. Re-deploy po naprawie

### 8.4. Monitoring i observability

Po wdrożeniu monitorować:
- Adoption rate: % użytkowników używających nowego filtra
- Search usage: % użytkowników używających wyszukiwarki
- Index selection: która opcja najpopularniejsza
- Performance: modal open time, search response time
- Error rate: failed fetches do /api/nocodb/symbols
- Cache hit rate: % requestów obsłużonych z cache

## 9. Zgodnosc ze standardami

### 9.1. Copilot-instructions.md compliance

React patterns: ✅
- Functional components z hooks
- React.memo() dla TickerList row
- Virtual scroll (react-window) dla performance
- useCallback i useMemo dla optymalizacji

Accessibility: ✅  
- aria-label na wszystkich interactive elements
- Keyboard navigation (Tab, Enter, Escape)
- Focus management w modalu
- Semantic HTML

TypeScript: ✅
- Strict mode
- Wszystkie typy zdefiniowane
- Brak any

Testing: ✅
- Unit tests (searchSymbols, hashSymbols)
- E2E tests (Playwright - 7 scenarios)

Styling: ✅
- Tailwind CSS
- shadcn/ui components

### 9.2. Tech-stack.md compliance

Framework/library compatibility: ✅
- Astro endpoints dla API
- React components z client:load  
- TypeScript
- shadcn/ui (już używane)
- react-window (już używane)

New dependencies: ✅ BRAK
- Wszystkie potrzebne biblioteki już zainstalowane

### 9.3. Security checklist

- Input validation - walidacja query params w API endpoint
- Authorization - Supabase session check w middleware
- Authentication - wymaga zalogowania
- Rate limiting - 60 req/min/user w endpoint
- Secrets management - NOCODB_API_TOKEN server-side only
- Data privacy - brak PII w cache

### 9.4. Performance checklist

- Bundle size impact - +ok 5KB (akceptowalne)
- Code splitting - AdvancedTickerFilter lazy load
- Rendering optimization - React.memo, useMemo, useCallback
- Loading states - skeleton loaders
- Error boundaries - graceful error handling  
- Caching strategy - 24h dla symbols, 5min dla grid
- Virtual scroll - tylko widoczne elementy

### 9.5. Accessibility checklist

- ARIA attributes - aria-label, aria-expanded, aria-controls
- Keyboard navigation - Tab, Enter, Escape, Arrow keys
- Focus management - auto-focus na search input
- Semantic HTML - button, input, dialog
- Color contrast - min 4.5:1 (Tailwind defaults)
- Screen reader testing - podstawowa kompatybilność

## 10. Dokumentacja

### 10.1. Changelog entry

```markdown
### Added

- [Advanced Ticker Selector] Pełny dostęp do wszystkich ~460 tickerów GPW z dynamicznym pobieraniem z NocoDB
- [Advanced Ticker Selector] Wyszukiwarka tickerów w czasie rzeczywistym (symbol, label, name)
- [Advanced Ticker Selector] Predefinowane indeksy GPW (WIG20, mWIG40, sWIG80, WIGGry) z one-click selection
- [Advanced Ticker Selector] Smart inicjalizacja pokazująca tickery z wydarzeniami z ostatnich 7 dni
- [Advanced Ticker Selector] Modal z virtual scroll dla płynnej performance przy 460 tickerach
```

### 10.2. README update

Brak zmian w README - feature jest internal dla zalogowanych użytkowników

### 10.3. Dokumentacja techniczna

Architecture decisions:
- Modal z virtual scroll wybrany dla lepszego UX przy dużej liczbie tickerów
- Smart init implementowany aby pokazać "żywe dane" użytkownikowi od razu
- Hash MD5 używany dla długich symbol arrays w cache keys aby uniknąć quota issues
- Indeksy GPW hardcoded w config dla prostszego maintenance

API documentation:
- GET /api/nocodb/symbols - zwraca wszystkie aktywne symbole z GPW_Symbols
- Wymaga autoryzacji i aktywnej subskrypcji
- Rate limit: 60 req/min/user
- Response: SymbolsResponse (symbols[], total_count, cached_at)

## 11. Timeline i effort estimation

### 11.1. Estymacja czasu

- Analiza i design: 4 godziny (DONE)
- Implementacja backend (types, client, service, endpoint): 6 godzin
- Implementacja hooks i utilities: 4 godziny
- Implementacja komponentów UI: 8 godzin  
- Integration z GridView (smart init): 4 godziny
- Testy unit: 4 godziny
- Testy E2E: 4 godziny
- Code review: 4 godziny
- Bug fixes post-review: 4 godziny
- Documentation: 2 godziny

Łącznie: 44 godziny (5.5 dni roboczych)

### 11.2. Zaleznosci i blokery

Blokujące przed startem:
- Tabela GPW_Symbols musi istnieć w NocoDB z danymi
- ENV variable NOCODB_TABLE_GPW_SYMBOLS musi być ustawiony
- Weryfikacja list WIG20, mWIG40, sWIG80 (czy aktualne)

Blokowane przez ten feature:
- Brak - feature jest niezależny

External dependencies:
- Brak - wszystkie biblioteki już zainstalowane

### 11.3. Sugerowany timeline

- Analysis & Planning complete: 2026-02-01 (DONE)
- Development start: 2026-02-03
- Backend complete: 2026-02-03 EOD
- Frontend components complete: 2026-02-04 EOD
- Integration complete: 2026-02-05 EOD  
- Tests complete: 2026-02-06 EOD
- Code review: 2026-02-07
- Fixes & polish: 2026-02-07 EOD
- Deployment to staging: 2026-02-10
- QA on staging: 2026-02-10-11
- Deployment to production: 2026-02-12
- Post-launch monitoring: 2026-02-12-19 (1 tydzień)

### 11.4. Milestones

- Milestone 1: Backend API ready - 2026-02-03
- Milestone 2: UI components ready - 2026-02-05  
- Milestone 3: Feature complete + tests - 2026-02-06
- Milestone 4: Production deployment - 2026-02-12

## 12. Załączniki

### 12.1. Pliki do utworzenia (lista pelna)

```
src/config/gpw-indices.ts
src/hooks/useSymbols.ts
src/components/grid/AdvancedTickerFilter.tsx
src/components/grid/TickerSearchInput.tsx
src/components/grid/TickerList.tsx
src/pages/api/nocodb/symbols.ts
e2e/grid-ticker-selector.spec.ts
src/test/hooks/useSymbols.test.ts
```

### 12.2. Pliki do modyfikacji (lista pelna)

```
.env.example
src/types/nocodb.types.ts
src/lib/nocodb-client.ts
src/services/nocodb.service.ts
src/lib/cache.ts
src/components/grid/GridView.tsx
e2e/grid.spec.ts
```

### 12.3. Referencje

Related PRD sections:
- US-003: Filtrowanie tickerów i zapis preferencji
- Wymagania funkcjonalne 3.1: Grid i interakcja
- Cache i strategia rewalidacji (sekcja 8)

Design inspirations:
- Trading platforms: TradingView, Bloomberg Terminal (ticker search)
- Figma: Layer search modal (good UX reference)

### 12.4. Konfiguracja indeksów GPW

WIG20 (20 tickerów):
11B, ALE, CCC, CDR, CPS, DNP, JSW, KGH, KRU, LPP, LTS, MBK, OPL, PEO, PGE, PKN, PKO, PZU, SPL, TPE

mWIG40: (do uzupełnienia przed deploy - weryfikacja z GPW)
sWIG80: (do uzupełnienia przed deploy - weryfikacja z GPW)

WIGGry (6 tickerów):
11B, CDR, CIG, PCF, PLG, TEN

### 12.5. Kluczowe code snippets

Przykładowe implementacje kluczowych funkcji:

```typescript
// src/hooks/useSymbols.ts - searchSymbols()
export function searchSymbols(query: string, symbols: GPWSymbol[]): GPWSymbol[] {
  if (!query || query.trim() === "") return symbols;
  
  const lowerQuery = query.toLowerCase().trim();
  
  return symbols
    .filter(s =>
      s.symbol.toLowerCase().includes(lowerQuery) ||
      s.label.toLowerCase().includes(lowerQuery) ||
      s.name.toLowerCase().includes(lowerQuery)
    )
    .sort((a, b) => {
      // Priority: exact match symbol > exact match label > alphabetical
      const aSymbolMatch = a.symbol.toLowerCase() === lowerQuery;
      const bSymbolMatch = b.symbol.toLowerCase() === lowerQuery;
      if (aSymbolMatch && !bSymbolMatch) return -1;
      if (!aSymbolMatch && bSymbolMatch) return 1;
      
      const aLabelMatch = a.label.toLowerCase() === lowerQuery;
      const bLabelMatch = b.label.toLowerCase() === lowerQuery;
      if (aLabelMatch && !bLabelMatch) return -1;
      if (!aLabelMatch && bLabelMatch) return 1;
      
      return a.symbol.localeCompare(b.symbol);
    });
}

// src/lib/cache.ts - hashSymbols()
import { createHash } from 'crypto';

export function hashSymbols(symbols: string[]): string {
  if (symbols.length === 0) return 'all';
  if (symbols.length <= 5) return symbols.sort().join(',');
  
  const sorted = symbols.sort().join(',');
  const hash = createHash('md5').update(sorted).digest('hex');
  return hash.substring(0, 8);
}

// src/components/grid/GridView.tsx - smartInitialization
useEffect(() => {
  async function smartInitialization() {
    if (!hasAccess) return;
    
    try {
      setIsInitializing(true);
      const recentEvents = await fetchGridData("week", undefined);
      const uniqueSymbols = [...new Set(recentEvents.events.map(e => e.symbol))];
      
      if (recentEvents.events.length >= 2) {
        setSymbols(uniqueSymbols);
      } else {
        setSymbols([...WIG20_SYMBOLS]);
      }
    } catch (err) {
      console.error("Smart initialization error:", err);
      setSymbols([...WIG20_SYMBOLS]);
    } finally {
      setIsInitializing(false);
    }
  }
  
  if (hasAccess === true && isInitializing) {
    smartInitialization();
  }
}, [hasAccess, isInitializing, setSymbols]);
```

---

KONIEC PLANU

Data utworzenia: 2026-02-01
Status: READY FOR APPROVAL
Next step: Stakeholder review + approval
Estimated start: 2026-02-03
Estimated completion: 2026-02-12
