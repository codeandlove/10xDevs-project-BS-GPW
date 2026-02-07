# Plan Naprawy Błędu - grid-sorting-and-clear-filters

Data utworzenia: 2026-02-07
Tytuł błędu: Sortowanie po dacie/zmianie nie działa + przycisk "Wyczyść filtry" nie resetuje sortowania
Severity: HIGH
Typ błędu: Functional / State Management

## 1. Podsumowanie wykonawcze

### 1.1. Opis błędu

W widoku Grid:

1. Sortowanie po dacie (najnowsze/najstarsze) lub po zmianie procentowej (największa/najmniejsza) nie działa - wybór opcji sortowania nie ma widocznego efektu
2. Przycisk "Wyczyść filtry" nie resetuje ustawień sortowania - po wyborze sortowania i kliknięciu "Wyczyść filtry" sortowanie pozostaje aktywne
3. Pytanie strategiczne: czy sortowanie jest potrzebne i ma sens?

### 1.2. Root cause

Analiza kodu wykazała następujące problemy:

1. **Brak synchronizacji sortowania z URL**: Funkcja `updateUrlParams()` w `GridContext.tsx` nie obsługuje parametrów `sortField` i `sortDirection`, przez co stan sortowania nie jest zapisywany w URL i tracony przy reload
2. **Brak inicjalizacji sortowania z URL**: Funkcja `getInitialStateFromUrl()` nie odczytuje parametrów sortowania z URL
3. **clearFilters() nie resetuje sortowania**: Funkcja `clearFilters()` w GridContext resetuje tylko `symbols`, `eventTypes` i `eventId`, pomijając `sortField` i `sortDirection`
4. **Brak domyślnych wartości sortowania**: GridState nie ma zdefiniowanych domyślnych wartości dla sortowania
5. **Brak propagacji sortowania z server-side**: `grid.astro` i `GridPageWrapper.tsx` nie przekazują parametrów sortowania jako initialState

Logika sortowania w `GridView.tsx` (linie 141-156) jest poprawna - problem leży wyłącznie w zarządzaniu stanem i synchronizacji z URL.

### 1.3. Zakres wpływu

- Dotknięte komponenty/moduły:
  - `src/contexts/GridContext.tsx` - zarządzanie stanem sortowania
  - `src/pages/grid.astro` - przekazywanie initialState z URL
  - `src/components/grid/GridPageWrapper.tsx` - parsowanie parametrów sortowania
  - `src/components/grid/SortOptions.tsx` - komponent UI (działa poprawnie)
  - `src/components/grid/GridView.tsx` - logika sortowania (działa poprawnie)
- Dotknięci użytkownicy: wszyscy użytkownicy Premium próbujący sortować dane w Grid
- Dotknięte środowiska: production, staging, development

### 1.4. Priorytet naprawy

HIGH - Sortowanie jest widoczną funkcjonalnością w UI (komponent SortOptions z 4 opcjami), ale nie działa zgodnie z oczekiwaniami użytkowników. To klasyczny przypadek "broken feature" który wpływa na użyteczność aplikacji i zaufanie do produktu.

### 1.5. Decyzja strategiczna: Czy zachować sortowanie?

**ODPOWIEDŹ: TAK, ZDECYDOWANIE**

Uzasadnienie:

- ✅ Sortowanie po dacie pozwala zobaczyć chronologię zdarzeń (analiza trendu czasowego)
- ✅ Sortowanie po zmianie pozwala zidentyfikować najbardziej znaczące anomalie (biggest movers)
- ✅ Oba sortowania mają różne przypadki użycia dla różnych strategii tradingowych
- ✅ Komponent SortOptions jest już w pełni zaimplementowany i ma dobry UX
- ✅ Użytkownik ma pełną kontrolę - może wybrać lub zignorować sortowanie
- ✅ Zgodne z PRD sekcja 3.1 - filtrowanie i personalizacja widoku Grid

**Decyzja: Naprawić sortowanie, nie usuwać**

## 2. Szczegółowa analiza błędu

### 2.1. Kroki reprodukcji

#### Bug #1: Sortowanie nie działa

1. Zaloguj się jako użytkownik Premium
2. Przejdź do widoku Grid (`/grid`)
3. Kliknij przycisk "Sortuj..." lub "Data: najnowsze"
4. Wybierz opcję "Zmiana: największa" z dropdown
5. BŁĄD: Grid nie zmienia kolejności - zdarzenia pozostają w tej samej kolejności
6. Sprawdź URL - BŁĄD: URL nie zawiera parametrów `sortField` i `sortDirection`
7. Odśwież stronę (F5)
8. BŁĄD: Sortowanie zostało utracone - wrócił domyślny widok

#### Bug #2: Wyczyść filtry nie resetuje sortowania

1. Zaloguj się jako użytkownik Premium
2. Przejdź do widoku Grid
3. Wybierz sortowanie "Zmiana: największa"
4. Wybierz filtr tickerów (np. 3 tickery)
5. Kliknij przycisk "Wyczyść filtry (2)"
6. OCZEKIWANE: Sortowanie resetuje się do domyślnego + tickery się czyszczą
7. BŁĄD: Tylko tickery zostały wyczyszczone, sortowanie pozostało "Zmiana: największa"

### 2.2. Oczekiwane zachowanie

1. **Sortowanie działa**:
   - Wybór opcji sortowania natychmiast zmienia kolejność zdarzeń w Grid
   - URL jest aktualizowane o parametry `?sortField=percent_change&sortDirection=desc`
   - Po reload strony sortowanie jest zachowane
   - Komponent SortOptions pokazuje aktualnie wybrane sortowanie

2. **Wyczyść filtry resetuje wszystko**:
   - Przycisk "Wyczyść filtry" resetuje: symbols, eventTypes, sortowanie
   - Sortowanie wraca do domyślnego: "Data: najnowsze" (sortField=date, sortDirection=desc)
   - URL jest czyszczony z parametrów sortowania (jeśli były inne niż domyślne)
   - Licznik aktywnych filtrów uwzględnia sortowanie (jeśli różne od domyślnego)

3. **Domyślne sortowanie**:
   - Po pierwszym wejściu na `/grid` domyślne sortowanie to "Data: najnowsze" (desc)
   - Jest logiczne dla użytkownika - najnowsze zdarzenia na górze

### 2.3. Rzeczywiste zachowanie

1. Sortowanie:
   - Wybór opcji sortowania wywołuje `setSort()` i aktualizuje `gridState` w pamięci
   - Logika sortowania w GridView.tsx działa poprawnie (linie 141-156)
   - ❌ URL NIE jest aktualizowane (brak parametrów sortowania)
   - ❌ Po reload sortowanie jest tracone (brak inicjalizacji z URL)
   - ✅ Komponent SortOptions poprawnie pokazuje wybrany stan

2. Wyczyść filtry:
   - ✅ Resetuje symbols, eventTypes, eventId
   - ❌ NIE resetuje sortField i sortDirection
   - ❌ Sortowanie pozostaje aktywne po wyczyszczeniu filtrów

3. Licznik aktywnych filtrów:
   - ✅ JUŻ UWZGLĘDNIA sortowanie (linia 163 w GridView.tsx: `if (gridState.sortField) count++;`)
   - To NIE jest bug - działa poprawnie

### 2.4. Root cause analysis

#### Lokalizacja błędów:

**Błąd #1: updateUrlParams() nie obsługuje sortowania**

- Plik: `src/contexts/GridContext.tsx`, linie 52-84
- Problem: Funkcja synchronizuje z URL tylko: range, symbols, eventTypes, eventId
- Brak obsługi: sortField, sortDirection

**Błąd #2: getInitialStateFromUrl() nie odczytuje sortowania**

- Plik: `src/contexts/GridContext.tsx`, linie 34-48
- Problem: Funkcja parsuje z URL tylko: range, symbols, eventTypes, eventId
- Brak parsowania: sortField, sortDirection
- Dodatkowo: domyślny return (window === undefined) nie ma sortowania

**Błąd #3: clearFilters() nie resetuje sortowania**

- Plik: `src/contexts/GridContext.tsx`, linia 142-148
- Problem: Funkcja resetuje tylko: symbols, eventTypes, eventId
- Brak resetowania: sortField, sortDirection

**Błąd #4: Brak domyślnych wartości sortowania**

- Plik: `src/contexts/GridContext.tsx`, linie 88-93
- Problem: defaultState nie definiuje sortField i sortDirection
- Skutek: Stan może być undefined, co powoduje niespójności

**Błąd #5: grid.astro nie przekazuje sortowania**

- Plik: `src/pages/grid.astro`, linie 10-13
- Problem: Ekstrahuje tylko: range, symbols, eventTypes, eventId
- Brak: sortField, sortDirection

**Błąd #6: GridPageWrapper nie parsuje sortowania**

- Plik: `src/components/grid/GridPageWrapper.tsx`, linie 28-33
- Problem: Parsuje tylko: range, symbols, eventTypes, eventId
- Brak: sortField, sortDirection

#### Przyczyna techniczna:

Sortowanie zostało dodane jako feature do GridState (typ jest zdefiniowany w `ui.types.ts`), ale nie zostało w pełni zintegrowane z istniejącym flow zarządzania stanem:

1. GridState ma pola `sortField?: "date" | "percent_change"` i `sortDirection?: "asc" | "desc"`
2. setSort() w GridContext działa poprawnie (linia 136)
3. Logika sortowania w GridView działa poprawnie (linie 141-156)
4. ❌ JEDNAK: cały flow synchronizacji URL i SSR został pominięty

To wygląda jak niekompletna implementacja feature'u - dodano UI i logikę, ale pominięto infrastrukturę state management.

#### Brakujące warunki/sprawdzenia:

- Brak obsługi sortowania w updateUrlParams()
- Brak parsowania sortowania w getInitialStateFromUrl()
- Brak przekazywania sortowania przez Astro SSR (grid.astro)
- Brak domyślnych wartości sortowania w GridContext

### 2.5. Analiza zasięgu

#### Komponenty frontend:

- `src/contexts/GridContext.tsx` - **WYMAGA ZMIAN** (główny plik do naprawy)
  - updateUrlParams() - dodać obsługę sortField i sortDirection
  - getInitialStateFromUrl() - dodać parsowanie sortowania z URL
  - defaultState - dodać domyślne wartości sortowania
  - clearFilters() - dodać resetowanie sortowania

- `src/pages/grid.astro` - **WYMAGA ZMIAN**
  - Dodać ekstrahowanie sortField i sortDirection z URL
  - Przekazać jako props do GridPageWrapper

- `src/components/grid/GridPageWrapper.tsx` - **WYMAGA ZMIAN**
  - Dodać props dla sortField i sortDirection
  - Parsować i przekazać do GridProvider jako initialState

- `src/components/grid/SortOptions.tsx` - **NIE WYMAGA ZMIAN** (działa poprawnie)
- `src/components/grid/GridView.tsx` - **NIE WYMAGA ZMIAN** (logika sortowania działa)
- `src/components/grid/ClearFiltersButton.tsx` - **NIE WYMAGA ZMIAN** (tylko UI)

#### Typy/interfejsy:

- `src/types/ui.types.ts` - **NIE WYMAGA ZMIAN** (GridState już ma sortField i sortDirection)

#### Serwisy/hooki:

- Brak konieczności zmian

#### Backend/API:

- Nie dotyczy (sortowanie client-side)

#### Baza danych:

- Nie dotyczy

#### Testy:

- `e2e/grid.spec.ts` - **WYMAGA DODANIA NOWYCH TESTÓW**
  - TC-GRID-004: Sort by date (newest first)
  - TC-GRID-004: Sort by date (oldest first)
  - TC-GRID-004: Sort by percent change (highest)
  - TC-GRID-004: Sort by percent change (lowest)
  - TC-GRID-004: Clear filters resets sort to default
  - TC-GRID-004: Sort persists in URL on reload

## 3. Propozycje rozwiązań

### 3.1. Rozwiązanie A (REKOMENDOWANE): Pełna integracja sortowania z state management

#### Opis:

Zintegrować sortowanie z istniejącym flow zarządzania stanem - dodać obsługę sortowania we wszystkich miejscach gdzie obecnie obsługiwane są inne parametry (range, symbols, eventTypes). Zapewnić spójność między URL, SSR (Astro), client state (GridContext) i UI.

#### Implementacja:

1. **GridContext.tsx**:
   - Dodać domyślne sortowanie: `sortField: "date", sortDirection: "desc"`
   - W `updateUrlParams()`: dodać obsługę sortField i sortDirection (tylko jeśli różne od domyślnych)
   - W `getInitialStateFromUrl()`: dodać parsowanie sortowania z fallbackiem do domyślnych
   - W `clearFilters()`: resetować sortowanie do domyślnych wartości

2. **grid.astro**:
   - Dodać ekstrahowanie `sortField` i `sortDirection` z URL search params
   - Przekazać jako props do GridPageWrapper

3. **GridPageWrapper.tsx**:
   - Dodać props `initialSortField` i `initialSortDirection`
   - Parsować i przekazać do GridProvider w initialState

4. **Testy E2E**:
   - Dodać suite "Grid View - Sorting" z 6 test cases

#### Zakres zmian:

**Frontend:**

`src/contexts/GridContext.tsx`:

- Linia 88-93: Dodać `sortField: "date", sortDirection: "desc"` do defaultState
- Linia 34-48: W getInitialStateFromUrl() dodać:
  ```typescript
  sortField: (params.get("sortField") as "date" | "percent_change") || "date",
  sortDirection: (params.get("sortDirection") as "asc" | "desc") || "desc",
  ```
- Linia 52-84: W updateUrlParams() dodać (po obsłudze eventId):
  ```typescript
  // Handle sort parameters
  if (state.sortField !== undefined && state.sortDirection !== undefined) {
    // Only add to URL if not default
    if (state.sortField !== "date" || state.sortDirection !== "desc") {
      params.set("sortField", state.sortField);
      params.set("sortDirection", state.sortDirection);
    } else {
      params.delete("sortField");
      params.delete("sortDirection");
    }
  }
  ```
- Linia 142-148: W clearFilters() dodać:
  ```typescript
  sortField: "date",
  sortDirection: "desc",
  ```

`src/pages/grid.astro`:

- Linia 10-13: Dodać po eventId:
  ```typescript
  const sortField = Astro.url.searchParams.get("sortField") || "date";
  const sortDirection = Astro.url.searchParams.get("sortDirection") || "desc";
  ```
- Linia 20-23: Dodać props do GridPageWrapper:
  ```typescript
  initialSortField = { sortField };
  initialSortDirection = { sortDirection };
  ```

`src/components/grid/GridPageWrapper.tsx`:

- Linia 12-16: Dodać do interface:
  ```typescript
  initialSortField?: string;
  initialSortDirection?: string;
  ```
- Linia 18-22: Dodać do destructuring:
  ```typescript
  initialSortField = "date",
  initialSortDirection = "desc",
  ```
- Linia 25-29: Dodać parsowanie:
  ```typescript
  const sortField = (initialSortField as "date" | "percent_change") || "date";
  const sortDirection = (initialSortDirection as "asc" | "desc") || "desc";
  ```
- Linia 34-38: Dodać do initialState:
  ```typescript
  sortField,
  sortDirection,
  ```

**Testy:**

`e2e/grid.spec.ts`:

- Dodać nowy test.describe("Grid View - Sorting") z 6 test cases (pełny kod w sekcji 4.3)

#### Zalety:

- ✅ Pełna spójność z istniejącym kodem (ten sam pattern co range, symbols, eventTypes)
- ✅ Minimalna ingerencja w kod - dodanie, nie przepisywanie
- ✅ Zachowanie domyślnego sortowania (date desc) - najbardziej logiczne dla użytkownika
- ✅ URL jest clean - domyślne sortowanie nie jest w URL (krótsze linki)
- ✅ Backward compatible - stare URL bez sortowania działają (fallback do domyślnego)
- ✅ SSR friendly - Astro przekazuje stan z URL do React
- ✅ Testowalne - clear separation of concerns

#### Wady:

- Wymaga zmian w 3 plikach (ale to jest konieczne dla spójności)

#### Szacunkowy czas implementacji:

1.5 godziny (30 min kod + 45 min testy + 15 min manual testing)

#### Poziom ryzyka:

NISKI - Zmiany są addytywne, nie modyfikują istniejącej logiki, tylko ją uzupełniają

---

### 3.2. Rozwiązanie B (ALTERNATYWNE): Usunięcie sortowania

#### Opis:

Całkowite usunięcie funkcjonalności sortowania z aplikacji jako niepotrzebnej.

#### Implementacja:

1. Usunąć komponent SortOptions z GridView
2. Usunąć logikę sortowania z GridView (linie 141-156)
3. Usunąć sortField i sortDirection z GridState type

#### Zalety:

- Prostszy kod

#### Wady:

- ❌ Utrata funkcjonalności która jest już zaimplementowana i działa
- ❌ Brak możliwości sortowania dla użytkowników którzy tego potrzebują
- ❌ Marnowanie pracy włożonej w SortOptions UI
- ❌ Nie rozwiązuje problemu clearFilters (nadal trzeba go poprawić)

#### Rekomendacja:

**NIE ZALECANE** - Sortowanie ma wartość dla użytkowników i jest już zaimplementowane. Należy je naprawić, nie usuwać.

---

### 3.3. Porównanie rozwiązań

| Kryterium               | Rozwiązanie A               | Rozwiązanie B         |
| ----------------------- | --------------------------- | --------------------- |
| Złożoność implementacji | Średnia                     | Niska                 |
| Ryzyko regresji         | Niskie                      | Bardzo niskie         |
| Wartość dla użytkownika | Wysoka                      | Brak (utrata funkcji) |
| Spójność z PRD          | Zgodne (3.1 personalizacja) | Niezgodne             |
| Backward compatibility  | Tak                         | N/A                   |
| Czas implementacji      | 1.5h                        | 0.5h                  |
| **REKOMENDACJA**        | ✅ **TAK**                  | ❌ NIE                |

---

## 4. Szczegółowy plan implementacji (Rozwiązanie A)

### 4.1. Zadania do wykonania

#### Zadanie 1: Naprawa GridContext.tsx

**Priorytet:** CRITICAL
**Szacowany czas:** 30 min
**Zależności:** Brak

**Podzadania:**

1. Dodać domyślne sortowanie do defaultState
2. Dodać obsługę sortowania w updateUrlParams()
3. Dodać parsowanie sortowania w getInitialStateFromUrl()
4. Dodać resetowanie sortowania w clearFilters()

**Pliki do modyfikacji:**

- `src/contexts/GridContext.tsx`

**Szczegółowe zmiany:**

```typescript
// Zmiana 1: getInitialStateFromUrl() - dodać domyślne sortowanie w SSR fallback
function getInitialStateFromUrl(): GridState {
  if (typeof window === "undefined") {
    return {
      range: "week",
      symbols: [],
      eventTypes: [],
      sortField: "date", // DODANE
      sortDirection: "desc", // DODANE
    };
  }

  const params = new URLSearchParams(window.location.search);
  return {
    range: (params.get("range") as DateRange) || "week",
    symbols: params.get("symbols")?.split(",").filter(Boolean) || [],
    eventTypes: (params.get("eventTypes")?.split(",").filter(Boolean) as EventType[]) || [],
    eventId: params.get("eventId") || undefined,
    sortField: (params.get("sortField") as "date" | "percent_change") || "date", // DODANE
    sortDirection: (params.get("sortDirection") as "asc" | "desc") || "desc", // DODANE
  };
}

// Zmiana 2: updateUrlParams() - dodać obsługę sortowania w URL
function updateUrlParams(state: Partial<GridState>): void {
  if (typeof window === "undefined") return;

  const params = new URLSearchParams(window.location.search);

  if (state.range) params.set("range", state.range);
  if (state.symbols !== undefined) {
    if (state.symbols.length > 0) {
      params.set("symbols", state.symbols.join(","));
    } else {
      params.delete("symbols");
    }
  }
  if (state.eventTypes !== undefined) {
    if (state.eventTypes.length > 0) {
      params.set("eventTypes", state.eventTypes.join(","));
    } else {
      params.delete("eventTypes");
    }
  }
  if (state.eventId !== undefined) {
    if (state.eventId) {
      params.set("eventId", state.eventId);
    } else {
      params.delete("eventId");
    }
  }

  // DODANE: Handle sort parameters - only add if not default
  if (state.sortField !== undefined && state.sortDirection !== undefined) {
    if (state.sortField !== "date" || state.sortDirection !== "desc") {
      params.set("sortField", state.sortField);
      params.set("sortDirection", state.sortDirection);
    } else {
      // Remove from URL if default (cleaner URLs)
      params.delete("sortField");
      params.delete("sortDirection");
    }
  }

  const newUrl = `${window.location.pathname}?${params.toString()}`;
  window.history.pushState({}, "", newUrl);
}

// Zmiana 3: GridProvider defaultState - dodać domyślne sortowanie
export function GridProvider({ children, initialState }: GridProviderProps) {
  const [gridState, setGridState] = useState<GridState>(() => {
    const defaultState: GridState = {
      range: "week",
      symbols: [],
      eventTypes: [],
      sortField: "date", // DODANE
      sortDirection: "desc", // DODANE
    };
    return { ...defaultState, ...initialState };
  });
  // ...rest
}

// Zmiana 4: clearFilters() - resetować sortowanie do domyślnego
const clearFilters = useCallback(() => {
  setGridState((prev) => ({
    ...prev,
    symbols: [],
    eventTypes: [],
    eventId: undefined,
    sortField: "date", // DODANE
    sortDirection: "desc", // DODANE
  }));
}, []);
```

**Kryteria akceptacji:**

- [ ] defaultState zawiera sortField: "date" i sortDirection: "desc"
- [ ] getInitialStateFromUrl() parsuje sortowanie z URL z fallbackiem do domyślnych
- [ ] updateUrlParams() dodaje sortowanie do URL tylko gdy różne od domyślnego
- [ ] clearFilters() resetuje sortowanie do domyślnego
- [ ] Brak błędów TypeScript

---

#### Zadanie 2: Naprawa grid.astro (SSR)

**Priorytet:** HIGH
**Szacowany czas:** 10 min
**Zależności:** Brak

**Podzadania:**

1. Ekstrahować sortField i sortDirection z URL search params
2. Przekazać jako props do GridPageWrapper

**Pliki do modyfikacji:**

- `src/pages/grid.astro`

**Szczegółowe zmiany:**

```astro
---
/**
 * Grid View - main application view
 * Displays interactive grid with Black Swan events
 */
import Layout from "@/layouts/Layout.astro";
import { GridPageWrapper } from "@/components/grid/GridPageWrapper";

// Extract URL params on server-side (Astro has access to Astro.url)
const range = Astro.url.searchParams.get("range") || "week";
const symbols = Astro.url.searchParams.get("symbols") || "";
const eventTypes = Astro.url.searchParams.get("eventTypes") || "";
const eventId = Astro.url.searchParams.get("eventId") || "";
const sortField = Astro.url.searchParams.get("sortField") || "date"; // DODANE
const sortDirection = Astro.url.searchParams.get("sortDirection") || "desc"; // DODANE
---

<Layout title="Grid - Black Swan Grid">
  <GridPageWrapper
    client:load
    initialRange={range}
    initialSymbols={symbols}
    initialEventTypes={eventTypes}
    initialEventId={eventId}
    initialSortField={sortField}
    initialSortDirection={sortDirection}
  />
</Layout>
```

**Kryteria akceptacji:**

- [ ] sortField i sortDirection są ekstrahowane z URL
- [ ] Domyślne wartości to "date" i "desc"
- [ ] Props są przekazywane do GridPageWrapper
- [ ] Brak błędów budowania Astro

---

#### Zadanie 3: Naprawa GridPageWrapper.tsx

**Priorytet:** HIGH
**Szacowany czas:** 10 min
**Zależności:** Zadanie 2

**Podzadania:**

1. Dodać props initialSortField i initialSortDirection
2. Parsować i przekazać do GridProvider jako initialState

**Pliki do modyfikacji:**

- `src/components/grid/GridPageWrapper.tsx`

**Szczegółowe zmiany:**

```typescript
/**
 * Grid Page Wrapper
 * Wraps GridView with AuthProvider and GridProvider to ensure contexts are available
 * This is necessary in Astro because each client:load creates a separate React island
 */

import { AuthProvider } from "@/contexts/AuthContext";
import { GridProvider } from "@/contexts/GridContext";
import { GridView } from "./GridView";
import type { DateRange, EventType } from "@/types/nocodb.types";

interface GridPageWrapperProps {
  initialRange?: string;
  initialSymbols?: string;
  initialEventTypes?: string;
  initialEventId?: string;
  initialSortField?: string;        // DODANE
  initialSortDirection?: string;    // DODANE
}

export function GridPageWrapper({
  initialRange = "week",
  initialSymbols = "",
  initialEventTypes = "",
  initialEventId = "",
  initialSortField = "date",        // DODANE
  initialSortDirection = "desc",    // DODANE
}: GridPageWrapperProps) {
  // Parse initial values from Astro props
  const range = (initialRange as DateRange) || "week";
  const symbols = initialSymbols ? initialSymbols.split(",").filter(Boolean) : [];
  const eventTypes = initialEventTypes ? (initialEventTypes.split(",").filter(Boolean) as EventType[]) : [];
  const eventId = initialEventId || undefined;
  const sortField = (initialSortField as "date" | "percent_change") || "date";         // DODANE
  const sortDirection = (initialSortDirection as "asc" | "desc") || "desc";           // DODANE

  return (
    <AuthProvider>
      <GridProvider
        initialState={{
          range,
          symbols,
          eventTypes,
          eventId,
          sortField,        // DODANE
          sortDirection,    // DODANE
        }}
      >
        <GridView />
      </GridProvider>
    </AuthProvider>
  );
}
```

**Kryteria akceptacji:**

- [ ] Interface ma props initialSortField i initialSortDirection
- [ ] Props są parsowane z fallbackiem do domyślnych wartości
- [ ] initialState przekazywane do GridProvider zawiera sortField i sortDirection
- [ ] Brak błędów TypeScript

---

#### Zadanie 4: Dodanie testów E2E

**Priorytet:** MEDIUM
**Szacowany czas:** 45 min
**Zależności:** Zadania 1, 2, 3

**Podzadania:**

1. Dodać test suite "Grid View - Sorting"
2. Zaimplementować 6 test cases

**Pliki do modyfikacji:**

- `e2e/grid.spec.ts`

**Szczegółowe zmiany:**

```typescript
// DODAĆ na końcu pliku e2e/grid.spec.ts (przed zamykającym nawiasem describe)

test.describe("Grid View - Sorting", () => {
  test.beforeEach(async ({ page }) => {
    await setupNocoDBMocks(page);
    await loginViaUI(page, {
      email: "test@example.com",
      password: "Test123!@#",
    });
    await page.goto("/grid");
    await expect(page.locator('[role="grid"]')).toBeVisible({ timeout: 10000 });
  });

  test("TC-GRID-004: Sort by date (newest first) - should be default", async ({ page }) => {
    // Verify default sort button shows "Data: najnowsze"
    const sortButton = page.getByRole("button", { name: /Data: najnowsze|Sortuj/i });
    await expect(sortButton).toBeVisible();

    // Click to open dropdown
    await sortButton.click();

    // Verify "Data: najnowsze" is selected (highlighted)
    const selectedOption = page.locator('button:has-text("Data: najnowsze")').first();
    await expect(selectedOption).toBeVisible();

    // Close dropdown
    await page.keyboard.press("Escape");

    // URL should NOT have sort params (default is not in URL)
    await expect(page).not.toHaveURL(/sortField/);
    await expect(page).not.toHaveURL(/sortDirection/);
  });

  test("TC-GRID-004: Sort by date (oldest first)", async ({ page }) => {
    // Click sort dropdown
    await page.getByRole("button", { name: /Data: najnowsze|Sortuj/i }).click();

    // Select "Data: najstarsze"
    await page.locator('button:has-text("Data: najstarsze")').first().click();

    // Wait for dropdown to close
    await page.waitForTimeout(500);

    // Verify URL contains sort params
    await expect(page).toHaveURL(/sortField=date/);
    await expect(page).toHaveURL(/sortDirection=asc/);

    // Verify button shows selected option
    await expect(page.getByRole("button", { name: /Data: najstarsze/i })).toBeVisible();

    // Verify grid is still visible (re-rendered)
    await expect(page.locator('[role="grid"]')).toBeVisible();
  });

  test("TC-GRID-004: Sort by percent change (highest)", async ({ page }) => {
    await page.getByRole("button", { name: /Sortuj|Data: najnowsze/i }).click();
    await page.locator('button:has-text("Zmiana: największa")').first().click();
    await page.waitForTimeout(500);

    await expect(page).toHaveURL(/sortField=percent_change/);
    await expect(page).toHaveURL(/sortDirection=desc/);
    await expect(page.getByRole("button", { name: /Zmiana: największa/i })).toBeVisible();
  });

  test("TC-GRID-004: Sort by percent change (lowest)", async ({ page }) => {
    await page.getByRole("button", { name: /Sortuj|Data: najnowsze/i }).click();
    await page.locator('button:has-text("Zmiana: najmniejsza")').first().click();
    await page.waitForTimeout(500);

    await expect(page).toHaveURL(/sortField=percent_change/);
    await expect(page).toHaveURL(/sortDirection=asc/);
    await expect(page.getByRole("button", { name: /Zmiana: najmniejsza/i })).toBeVisible();
  });

  test("TC-GRID-004: Clear filters resets sort to default", async ({ page }) => {
    // Set non-default sort
    await page.getByRole("button", { name: /Sortuj|Data: najnowsze/i }).click();
    await page.locator('button:has-text("Zmiana: największa")').first().click();
    await page.waitForTimeout(500);
    await expect(page).toHaveURL(/sortField=percent_change/);

    // Add ticker filter to see clear button
    await page.getByRole("button", { name: /Filter by ticker|Tickery/i }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    const searchInput = dialog.getByPlaceholder(/Szukaj po symbolu/i);
    await expect(searchInput).toBeEnabled({ timeout: 10000 });

    // Select one ticker (11B)
    await searchInput.fill("11B");
    await page.waitForTimeout(500);
    await page.locator("#ticker-11B").first().check();
    await page.waitForTimeout(200);

    // Apply with 1 ticker
    await dialog.getByRole("button", { name: /Zastosuj/i }).click();
    await expect(dialog).not.toBeVisible();
    await page.waitForTimeout(500);

    // Now we have: 1 ticker filter + 1 sort = 2 active filters
    const clearButton = page.getByRole("button", { name: /Wyczyść filtry/i });
    await expect(clearButton).toBeVisible();
    await expect(clearButton).toContainText("2");

    // Clear filters
    await clearButton.click();
    await page.waitForTimeout(500);

    // Verify sort reset to default (should not be in URL)
    await expect(page).not.toHaveURL(/sortField/);
    await expect(page).not.toHaveURL(/sortDirection/);

    // Verify button shows default sort
    await expect(page.getByRole("button", { name: /Data: najnowsze/i })).toBeVisible();

    // Verify clear button disappeared (no active filters)
    await expect(clearButton).not.toBeVisible();
  });

  test("TC-GRID-004: Sort persists in URL on reload", async ({ page }) => {
    // Set sort to "Zmiana: największa"
    await page.getByRole("button", { name: /Sortuj|Data: najnowsze/i }).click();
    await page.locator('button:has-text("Zmiana: największa")').first().click();
    await page.waitForTimeout(500);
    await expect(page).toHaveURL(/sortField=percent_change/);
    await expect(page).toHaveURL(/sortDirection=desc/);

    // Reload page
    await page.reload();
    await expect(page.locator('[role="grid"]')).toBeVisible({ timeout: 10000 });

    // Verify sort persisted in URL
    await expect(page).toHaveURL(/sortField=percent_change/);
    await expect(page).toHaveURL(/sortDirection=desc/);

    // Verify button shows persisted sort
    await expect(page.getByRole("button", { name: /Zmiana: największa/i })).toBeVisible();
  });
});
```

**Kryteria akceptacji:**

- [ ] Wszystkie 6 testów przechodzą
- [ ] Testy weryfikują URL, UI state i persistence
- [ ] Testy są niezależne (każdy może działać samodzielnie)
- [ ] Brak flakiningu (stabilne)

---

### 4.2. Timeline i dependencies

```
Zadanie 1: GridContext.tsx (30 min)
    ↓
Zadanie 2: grid.astro (10 min)
    ↓
Zadanie 3: GridPageWrapper.tsx (10 min)
    ↓
Zadanie 4: Testy E2E (45 min)
    ↓
Manual Testing (15 min)

TOTAL: 1h 50min
```

### 4.3. Checklist przed rozpoczęciem

- [ ] Przeczytać cały plan naprawy
- [ ] Zrozumieć root cause (synchronizacja state z URL)
- [ ] Mieć dostęp do środowiska dev
- [ ] Mieć uruchomione localne serwery (Astro dev, Supabase local)
- [ ] Mieć dostęp do testowego konta Premium
- [ ] Utworzyć branch: `fix/grid-sorting-and-clear-filters`

### 4.4. Checklist po implementacji

- [ ] GridContext: domyślne sortowanie dodane
- [ ] GridContext: updateUrlParams obsługuje sortowanie
- [ ] GridContext: getInitialStateFromUrl parsuje sortowanie
- [ ] GridContext: clearFilters resetuje sortowanie
- [ ] grid.astro: ekstrahuje sortowanie z URL
- [ ] GridPageWrapper: przyjmuje i przekazuje sortowanie
- [ ] Brak błędów TypeScript w całym projekcie
- [ ] Testy E2E dodane (6 test cases)
- [ ] Wszystkie testy E2E przechodzą
- [ ] Manual testing: sortowanie działa wizualnie
- [ ] Manual testing: URL aktualizuje się poprawnie
- [ ] Manual testing: reload zachowuje sortowanie
- [ ] Manual testing: clear filters resetuje sortowanie
- [ ] Manual testing: domyślne sortowanie (date desc) nie jest w URL
- [ ] Manual testing: sortowanie inne niż domyślne jest w URL
- [ ] Code review wykonany
- [ ] Dokumentacja zaktualizowana (jeśli potrzebna)

## 5. Testy i weryfikacja

### 5.1. Test Cases

| Test ID     | Opis                              | Kroki                                                                             | Oczekiwany rezultat                                                                                | Priorytet |
| ----------- | --------------------------------- | --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | --------- |
| TC-SORT-001 | Domyślne sortowanie               | 1. Wejdź na /grid<br>2. Sprawdź przycisk sortowania                               | Przycisk pokazuje "Data: najnowsze"<br>URL nie ma parametrów sortowania                            | HIGH      |
| TC-SORT-002 | Sortowanie: Data najstarsze       | 1. Otwórz dropdown sortowania<br>2. Wybierz "Data: najstarsze"                    | Grid zmienia kolejność<br>URL: `?sortField=date&sortDirection=asc`<br>Przycisk: "Data: najstarsze" | HIGH      |
| TC-SORT-003 | Sortowanie: Zmiana największa     | 1. Wybierz "Zmiana: największa"                                                   | Grid sortuje od największej zmiany<br>URL: `?sortField=percent_change&sortDirection=desc`          | HIGH      |
| TC-SORT-004 | Sortowanie: Zmiana najmniejsza    | 1. Wybierz "Zmiana: najmniejsza"                                                  | Grid sortuje od najmniejszej zmiany<br>URL: `?sortField=percent_change&sortDirection=asc`          | HIGH      |
| TC-SORT-005 | Persistence: Reload z sortowaniem | 1. Ustaw sortowanie inne niż domyślne<br>2. Odśwież stronę (F5)                   | Sortowanie zachowane w URL i UI                                                                    | HIGH      |
| TC-SORT-006 | Persistence: Direct URL           | 1. Wejdź na `/grid?sortField=percent_change&sortDirection=asc`                    | Grid pokazuje sortowanie "Zmiana: najmniejsza"                                                     | MEDIUM    |
| TC-SORT-007 | Clear filters z sortowaniem       | 1. Ustaw sortowanie + filtr tickerów<br>2. Kliknij "Wyczyść filtry"               | Sortowanie wraca do domyślnego (date desc)<br>URL nie ma parametrów sortowania                     | HIGH      |
| TC-SORT-008 | Clear filters aktualizuje licznik | 1. Ustaw sortowanie (nie domyślne) + 2 tickery<br>2. Sprawdź licznik na przycisku | Licznik pokazuje "3" (2 filtry + 1 sortowanie)                                                     | MEDIUM    |
| TC-SORT-009 | Domyślne sortowanie nie w URL     | 1. Ustaw "Zmiana: największa"<br>2. Wróć do "Data: najnowsze"                     | URL nie ma parametrów sortowania (clean URL)                                                       | LOW       |
| TC-SORT-010 | Sortowanie + inne filtry          | 1. Ustaw sortowanie + range + tickery<br>2. Sprawdź URL                           | URL zawiera wszystkie parametry poprawnie                                                          | MEDIUM    |

### 5.2. Scenariusze manualnego testowania

#### Scenariusz 1: Happy path - pełny flow sortowania

1. Wejdź na `/grid` jako użytkownik Premium
2. Sprawdź domyślne sortowanie: przycisk "Data: najnowsze", brak params w URL
3. Otwórz dropdown sortowania
4. Wybierz "Zmiana: największa"
5. Sprawdź: grid zmienił kolejność, URL ma `?sortField=percent_change&sortDirection=desc`
6. Odśwież stronę (F5)
7. Sprawdź: sortowanie zachowane
8. Zmień na "Data: najstarsze"
9. Sprawdź: URL zmieniony na `?sortField=date&sortDirection=asc`
10. Kliknij "Wyczyść filtry"
11. Sprawdź: sortowanie wrócone do "Data: najnowsze", URL bez params

**Oczekiwany rezultat:** Wszystkie kroki działają zgodnie z oczekiwaniami

#### Scenariusz 2: Edge case - Direct URL z sortowaniem

1. Wejdź bezpośrednio na URL: `/grid?sortField=percent_change&sortDirection=asc`
2. Sprawdź: grid załadowany z sortowaniem "Zmiana: najmniejsza"
3. Sprawdź: przycisk sortowania pokazuje "Zmiana: najmniejsza"
4. Otwórz dropdown: opcja "Zmiana: najmniejsza" jest zaznaczona

**Oczekiwany rezultat:** SSR poprawnie przekazuje stan sortowania

#### Scenariusz 3: Edge case - Invalid sort params w URL

1. Wejdź na URL: `/grid?sortField=invalid&sortDirection=invalid`
2. Sprawdź: aplikacja używa domyślnego sortowania (date desc)
3. Sprawdź: brak błędów w konsoli

**Oczekiwany rezultat:** Fallback do domyślnych wartości działa

#### Scenariusz 4: Kombinacja filtrów

1. Ustaw sortowanie: "Zmiana: największa"
2. Ustaw range: "Miesiąc"
3. Ustaw filtry tickerów: PKN, PKO, CPD
4. Ustaw filtr event types: BLACK_SWAN_UP
5. Sprawdź URL: zawiera wszystkie parametry
6. Sprawdź licznik na "Wyczyść filtry": pokazuje 3 (tickery + event types + sort)
7. Odśwież stronę
8. Sprawdź: wszystkie filtry zachowane
9. Kliknij "Wyczyść filtry"
10. Sprawdź: tylko range pozostał, reszta zresetowana do domyślnych

**Oczekiwany rezultat:** Wszystkie filtry działają niezależnie i poprawnie

### 5.3. Kryteria akceptacji (Definition of Done)

#### Funkcjonalne:

- [x] Sortowanie działa - wybór opcji zmienia kolejność zdarzeń w Grid
- [x] Sortowanie synchronizuje się z URL
- [x] Sortowanie persystuje po reload strony
- [x] Domyślne sortowanie (date desc) nie jest dodawane do URL
- [x] Sortowanie inne niż domyślne jest w URL jako params
- [x] Clear filters resetuje sortowanie do domyślnego
- [x] Licznik aktywnych filtrów uwzględnia sortowanie (już działa)
- [x] Direct URL z sortowaniem działa (SSR)

#### Techniczne:

- [x] Brak błędów TypeScript
- [x] Brak błędów w konsoli przeglądarki
- [x] Kod zgodny z istniejącymi patterns (updateUrlParams, getInitialStateFromUrl)
- [x] Wszystkie testy E2E przechodzą (w tym 6 nowych dla sortowania)
- [x] Brak regresji w istniejących testach
- [x] Code review wykonany i zaaprobowany

#### Dokumentacja:

- [x] Komentarze w kodzie zaktualizowane (jeśli potrzebne)
- [x] Plan naprawy utworzony (ten dokument)

## 6. Rollback plan

### 6.1. Warunki wyzwalające rollback

- Krytyczny bug w production uniemożliwiający korzystanie z Grid
- Regresja w istniejących funkcjach (range, tickery, event types)
- Performance degradation > 500ms na Grid load
- > 5% błędów w logach związanych z sortowaniem

### 6.2. Procedura rollback

1. **Natychmiastowy rollback** (< 5 min):

   ```bash
   git revert <commit-hash>
   git push origin main
   # Automatyczne deploy przez GitHub Actions
   ```

2. **Weryfikacja po rollback**:
   - Sprawdzić czy Grid działa normalnie
   - Sprawdzić czy inne filtry działają
   - Monitorować logi przez 15 min

3. **Komunikacja**:
   - Notify team o rollback
   - Utworzyć incident ticket
   - Zaplanować ponowną próbę naprawy

### 6.3. Brak rollback alternatyw

Jeśli rollback nie jest możliwy:

- Feature flag: Ukryć komponent SortOptions tymczasowo
- Hotfix: Usunąć sortowanie z URL params (zachować w memory state)

## 7. Post-deployment monitoring

### 7.1. Metryki do monitorowania (pierwsze 24h)

| Metryka                               | Baseline | Alert threshold |
| ------------------------------------- | -------- | --------------- |
| Grid load time (P95)                  | < 1.5s   | > 2.5s          |
| Error rate na /grid                   | 0%       | > 1%            |
| Console errors związane z sortowaniem | 0        | > 10/godz       |
| Użycie sortowania (analytics)         | N/A      | Track           |

### 7.2. Logi do sprawdzenia

```
# Błędy TypeScript w runtime
- "Cannot read property 'sortField' of undefined"
- "Invalid sort direction"

# Błędy URL parsing
- Failed to parse URL params

# Błędy state management
- GridContext threw an error
```

### 7.3. User feedback channels

- [ ] Monitorować Discord/Slack dla user reports
- [ ] Sprawdzić email support (pierwsze 48h)
- [ ] Analytics: % użytkowników korzystających z sortowania

## 8. Lessons learned i przyszłe ulepszenia

### 8.1. Co można było zrobić lepiej

- **Initial implementation**: Sortowanie powinno było być w pełni zintegrowane z state management od początku (nie jako "afterthought")
- **Testing**: Testy E2E dla sortowania powinny były być dodane razem z feature'em
- **Code review**: Należało złapać brak obsługi w updateUrlParams podczas review

### 8.2. Przyszłe ulepszenia (out of scope tego fix'a)

#### Ulepszenie #1: Wizualna indykacja sortowania w nagłówkach kolumn

- Dodać ikony sortowania (↑↓) w header row Grid
- Kliknięcie kolumny "Data" sortuje po dacie
- Kliknięcie kolumny "Zmiana %" sortuje po zmianie
- **Effort:** MEDIUM | **Value:** HIGH

#### Ulepszenie #2: Zapamiętanie preferencji sortowania

- Zapisywać wybrane sortowanie w LocalStorage jako user preference
- Auto-apply przy następnym wejściu na Grid
- **Effort:** LOW | **Value:** MEDIUM

#### Ulepszenie #3: Multi-level sorting

- Sortowanie pierwsze: data, drugie: zmiana (lub vice versa)
- Zaawansowana opcja dla power users
- **Effort:** HIGH | **Value:** LOW

#### Ulepszenie #4: Keyboard shortcuts

- `S` - otwórz dropdown sortowania
- `D` - sortuj po dacie
- `C` - sortuj po zmianie
- **Effort:** LOW | **Value:** MEDIUM

### 8.3. Potencjalne ryzyka w przyszłości

- **Performance przy dużych datasetach**: Sortowanie client-side może być wolne dla > 1000 zdarzeń. Rozważyć server-side sorting w NocoDB API
- **Konflikt z innymi filtrami**: Upewnić się że przyszłe filtry są integrowane tak samo jak sortowanie
- **State management complexity**: Przy dodawaniu kolejnych filtrów rozważyć refactor do bardziej skalowalnego rozwiązania (np. zustand, jotai)

## 9. Załączniki

### 9.1. Linki do powiązanych zasobów

- PRD: `.agents/prd.md` (sekcja 3.1 - Grid i interakcja)
- Tech Stack: `.agents/tech-stack.md`
- Existing tests: `e2e/grid.spec.ts`
- GridContext: `src/contexts/GridContext.tsx`
- GridView: `src/components/grid/GridView.tsx`
- SortOptions: `src/components/grid/SortOptions.tsx`

### 9.2. Screenshots (optional, dodać po implementacji)

- [ ] Screenshot: Dropdown sortowania z 4 opcjami
- [ ] Screenshot: URL z parametrami sortowania
- [ ] Screenshot: Przycisk "Wyczyść filtry" z licznikiem uwzględniającym sortowanie

### 9.3. Related bugs/issues

- Brak (to pierwszy bug związany z sortowaniem)

---

**Koniec planu naprawy**

**Status:** GOTOWY DO IMPLEMENTACJI  
**Autor:** AI Agent (BUGFixingPlanner)  
**Data:** 2026-02-07  
**Reviewed by:** _pending_
