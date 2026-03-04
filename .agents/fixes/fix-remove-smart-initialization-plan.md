# Plan Naprawy Bledu - remove-smart-initialization

Data utworzenia: 2026-03-03
Tytul bledu: Usunięcie automatycznej inicjalizacji tickerów (smartInitialization) i przycisku "Zaznacz ostatnie"
Severity: MEDIUM
Typ bledu: UI | Business Logic

## 1. Podsumowanie wykonawcze

### 1.1. Opis bledu

Po wejściu na /grid komponent `GridView.tsx` uruchamia asynchroniczny `useEffect` (`smartInitialization`), który wykonuje dodatkowe zapytanie do API (`fetchGridData("week", [], undefined)`), wyodrębnia unikalne tickery ze zdarzeń z ostatnich 7 dni i ustawia je jako aktywne filtry `symbols=`. Powoduje to zawężenie widoku do kilku spółek i zaśmiecenie URL parametrem `symbols=` bez wiedzy użytkownika. Przycisk "Zaznacz ostatnie" w `AdvancedTickerFilter` jest bezpośrednim produktem tej logiki i powinien być usunięty razem z nią.

### 1.2. Root cause

`smartInitialization` w `GridView.tsx` (linie 118-153) wykonuje nieautoryzowany przez użytkownika fetch i mutuje stan `symbols` zaraz po załadowaniu strony. Logika ta była zaprojektowana jako "przyjazne" domyślne wejście, ale de facto ukrywa dane (zawęża zakres) i tworzy nieoczekiwane zachowanie URL. Flaga `isInitialized` i tablica `recentSymbols` w `GridContext` istnieją wyłącznie na potrzeby tej logiki.

### 1.3. Zakres wplywu

- Dotknięte komponenty/moduły:
  - `src/components/grid/GridView.tsx` — logika smartInitialization, prop recentSymbols
  - `src/contexts/GridContext.tsx` — stan recentSymbols, isInitialized
  - `src/components/grid/AdvancedTickerFilter.tsx` — prop recentSymbols, przycisk "Zaznacz ostatnie"
  - `e2e/grid-filtering-advanced.spec.ts` — TC-FILTER-003 opiera się na pre-wybranych tickerach
- Dotknięci użytkownicy: wszyscy zalogowani z aktywnym dostępem (active, trial)
- Dotknięte środowiska: production, staging, development

### 1.4. Priorytet naprawy

NORMAL — nie blokuje podstawowych funkcji, ale degraduje UX i wprowadza w błąd użytkownika co do domyślnego widoku. Wydaje zbędne żądanie API przy każdym wejściu na /grid.

## 2. Szczegolowa analiza bledu

### 2.1. Kroki reprodukcji

1. Zaloguj się jako użytkownik z aktywnym dostępem
2. Wejdź na /grid (czyste URL, bez parametrów)
3. Obserwuj: URL zmienia się na `?range=week&symbols=PKN,PKO,...` automatycznie
4. Grid pokazuje jedynie kilka tickerów z ostatnich zdarzeń
5. Kliknij "Wyczyść filtry" — URL wraca do `?range=week` bez `symbols=`, widoczne są wszystkie zdarzenia

### 2.2. Oczekiwane zachowanie

Po wejściu na /grid bez parametru `symbols=` grid wyświetla wszystkie zdarzenia z zakresu date_start–date_end. Parametr `symbols=` nie jest automatycznie dodawany. Widok domyślny jest maksymalnie szeroki.

### 2.3. Rzeczywiste zachowanie

`smartInitialization` uruchamia się przy pierwszym renderze gdy `hasAccess === true` i `isInitialized === false`. Wykonuje fetch `fetchGridData("week", [], undefined)`, wyodrębnia unikalne symbole z wyników i wywołuje `setSymbols(uniqueSymbols)`. To aktualizuje `gridState.symbols`, co przez `updateUrlParams` w `GridContext` dodaje `symbols=PKN,PKO,...` do URL i zawęża wyświetlane dane.

### 2.4. Root cause analysis

- Lokalizacja bledu: `src/components/grid/GridView.tsx` linie 118–153, useEffect `smartInitialization`
- Przyczyna techniczna: logika wymusza `setSymbols()` na podstawie wyniku własnego fetch, omijając intencję użytkownika i domyślny stan pustej tablicy symbols
- Brakujące warunki: brak rozróżnienia między "user did not choose symbols" (pusta tablica = pokaż wszystkie) a "user cleared filters" — oba stany powinny dawać ten sam efekt: brak filtra symboli
- Nieprawidlowa logika: domyślna wartość `symbols: []` w GridState oznacza "brak filtra" (pokaż wszystko), a `smartInitialization` tę wartość nadpisuje bez potrzeby
- Wpływ uboczny: zbędne żądanie HTTP przy każdym wejściu na /grid, dodatkowy stan w kontekście (`recentSymbols`, `isInitialized`), blokowanie wyświetlania gridu przez `(!isInitialized && hasAccess)` w warunku skeleton (linia ~419)

### 2.5. Analiza zasiegu

#### Komponenty frontend:

- `src/components/grid/GridView.tsx` — useEffect smartInitialization, import WIG20_SYMBOLS, destrukturyzacja recentSymbols/setRecentSymbols/isInitialized/setIsInitialized z useGrid(), prop recentSymbols do AdvancedTickerFilter, warunek skeleton
- `src/components/grid/AdvancedTickerFilter.tsx` — prop recentSymbols, callback handleSelectRecent, przycisk "Zaznacz ostatnie"

#### Serwisy/hooki:

Brak bezpośrednich zmian. `fetchGridData` pozostaje w GridView (jest używany w `handleDateRangeChange`).

#### Typy/interfejsy:

- `src/contexts/GridContext.tsx` — interfejs `GridContextValue` (pola recentSymbols, setRecentSymbols, isInitialized, setIsInitialized), useState dla tych pól, obiekt value

#### Backend/API:

Nie dotyczy.

#### Baza danych:

Nie dotyczy.

#### Testy:

- `e2e/grid-filtering-advanced.spec.ts` — TC-FILTER-003 zakłada pre-wybrane tickery z smartInitialization, wymaga przepisania

## 3. Propozycje rozwiazan

### 3.1. Rozwiazanie A (REKOMENDOWANE)

#### Opis:

Całkowite usunięcie smartInitialization, recentSymbols i isInitialized ze wszystkich trzech plików. Brak zastępczej logiki inicjalizacji — domyślny stan `symbols: []` jest poprawnym "pokaż wszystko". Jednoczesna aktualizacja TC-FILTER-003.

#### Zakres zmian:

- Frontend:
  - `src/components/grid/GridView.tsx` — usunięcie useEffect, importu WIG20_SYMBOLS, destrukturyzacji 4 zmiennych, propu recentSymbols, warunku skeleton
  - `src/contexts/GridContext.tsx` — usunięcie 4 pól z interfejsu, 2 useState, 4 wpisów w value
  - `src/components/grid/AdvancedTickerFilter.tsx` — usunięcie propu, callbacku, przycisku
- Testy: przepisanie TC-FILTER-003 w `e2e/grid-filtering-advanced.spec.ts`

#### Zalety:

- Minimalna ingerencja — wyłącznie usuwanie kodu, zero nowej logiki
- Grid domyślnie pokazuje wszystkie zdarzenia — zgodne z oczekiwanym zachowaniem
- Eliminuje zbędne żądanie HTTP przy każdym wejściu na /grid
- Upraszcza GridContextValue i GridProvider
- Warunek skeleton staje się prostszy

#### Wady:

- TC-FILTER-003 wymaga przepisania (jeden test)

#### Effort: XS

Wyłącznie usuwanie kodu w 3 plikach + 1 test. Brak nowej logiki, brak migracji.

#### Ryzyko regresji: LOW

Usuwamy wyłącznie niezamierzone zachowanie. Główne ryzyko: TC-FILTER-003 zepsuje się bez aktualizacji.

#### Zgodnosc ze standardami:

- copilot-instructions.md: tak — functional component, hooks, brak niepotrzebnego stanu
- tech-stack.md: tak — React 19, Astro 5, brak zmian w stacku
- best practices: tak — upraszcza kontekst, usuwa zbędny fetch, czysta separacja odpowiedzialności

### 3.2. Rozwiazanie B

#### Opis:

Zachowanie przycisku "Zaznacz ostatnie" jako opcji opt-in, ale usunięcie automatycznego uruchamiania smartInitialization. Przycisk działałby on-demand — wywołanie fetcha dopiero po kliknięciu przez użytkownika.

#### Zakres zmian:

- `src/components/grid/GridView.tsx` — usunięcie useEffect smartInitialization
- `src/components/grid/AdvancedTickerFilter.tsx` — zmiana handleSelectRecent na funkcję wywołującą fetch (nowy prop callback lub wewnętrzny fetch)
- `src/contexts/GridContext.tsx` — usunięcie recentSymbols/isInitialized

#### Zalety:

- Zachowuje funkcjonalność "ostatnie zdarzenia" jako świadomy wybór użytkownika

#### Wady:

- Więcej zmian (nowy prop callback w AdvancedTickerFilter)
- Utrzymuje złożoność (przycisk, który rzadko będzie używany)
- Wymaga decyzji o zarządzaniu stanem recentSymbols (skąd pobierać, kiedy cache'ować)

#### Effort: S

#### Ryzyko regresji: MEDIUM

### 3.3. Rozwiazanie C

#### Opis:

Zastąpienie smartInitialization persystencją ostatnich wyborów użytkownika w localStorage. Pierwsze wejście = brak filtra, kolejne = odtworzenie ostatnich wyborów użytkownika.

#### Zakres zmian:

- Nowy hook `usePersistedSymbols` lub rozszerzenie GridContext o zapis do localStorage przy `setSymbols`

#### Zalety:

- Lepsza personalizacja UX — użytkownik widzi swoje ostatnie filtry

#### Wady:

- Znacznie szerszy zakres niż opisana naprawa
- Wykracza poza zakres bieżącego zgłoszenia
- Wymaga odrębnej specyfikacji UX

#### Effort: M-L

#### Ryzyko regresji: HIGH

## 4. Rekomendacja i uzasadnienie

### 4.1. Wybrane rozwiazanie

ROZWIAZANIE A

### 4.2. Uzasadnienie wyboru

Minimalizuje ryzyko regresji poprzez:

- wyłącznie usuwanie kodu — zero nowej logiki do przetestowania
- zmiana jest odwracalna przez `git revert` bez efektów ubocznych

Jest zgodne ze standardami projektu:

- `symbols: []` jako "brak filtra" jest wzorcem stosowanym w całym kodzie (GridState, clearFilters, updateUrlParams)
- usunięcie zbędnego stanu z kontekstu zgodne z zasadą minimalnego stanu React

Optymalizuje effort vs. wartość:

- XS effort, eliminuje zbędny fetch HTTP przy każdym wejściu na /grid
- natychmiastowa naprawa zgłoszonego zachowania

Ułatwia przyszłe utrzymanie:

- mniejszy GridContextValue = mniej do zrozumienia dla nowego dewelopera
- brak ukrytego efektu ubocznego przy pierwszym renderze

## 5. Szczegolowy plan implementacji

### 5.1. Faza 1: Przygotowanie

- [ ] Utworzenie brancha: `fix/remove-smart-initialization`
- [ ] Uruchomienie testów E2E jako baseline przed zmianą: `npm run test:e2e`

### 5.2. Faza 2: Zmiany w kodzie

#### Krok 1: Usunięcie smartInitialization z GridView.tsx

Plik: `src/components/grid/GridView.tsx`

Opis zmian:

1. Usunąć import `WIG20_SYMBOLS` (linia 30)
2. Usunąć 4 zmienne z destrukturyzacji `useGrid()`: `recentSymbols`, `setRecentSymbols`, `isInitialized`, `setIsInitialized`
3. Usunąć cały useEffect smartInitialization (linie 118–153)
4. Usunąć prop `recentSymbols={recentSymbols}` z `<AdvancedTickerFilter>`
5. Usunąć człon `(!isInitialized && hasAccess) ||` z warunku skeleton (~linia 419)

Kod przed zmiana (import):

```typescript
import { WIG20_SYMBOLS } from "@/config/gpw-indices";
```

Kod po zmianie:

```typescript
// import usunięty
```

Kod przed zmiana (destrukturyzacja useGrid):

```typescript
const {
  gridState,
  setRange,
  setSymbols,
  setEventTypes,
  setSort,
  setEventId,
  setDateRange,
  clearFilters,
  recentSymbols,
  setRecentSymbols,
  isInitialized,
  setIsInitialized,
} = useGrid();
```

Kod po zmianie:

```typescript
const { gridState, setRange, setSymbols, setEventTypes, setSort, setEventId, setDateRange, clearFilters } = useGrid();
```

Kod przed zmiana (useEffect smartInitialization):

```typescript
useEffect(() => {
  async function smartInitialization() {
    if (isInitialized || !hasAccess) return;
    try {
      const recentEvents = await fetchGridData("week", [], undefined);
      const uniqueSymbols = [...new Set(recentEvents.events.map((e) => e.symbol))];
      if (recentEvents.events.length >= 2) {
        setSymbols(uniqueSymbols);
        setRecentSymbols(uniqueSymbols);
      } else {
        setSymbols([...WIG20_SYMBOLS]);
        setRecentSymbols([...WIG20_SYMBOLS]);
      }
      setIsInitialized(true);
    } catch {
      setSymbols([...WIG20_SYMBOLS]);
      setRecentSymbols([...WIG20_SYMBOLS]);
      setIsInitialized(true);
    }
  }
  if (hasAccess === true) {
    smartInitialization();
  }
}, [hasAccess, isInitialized, setIsInitialized, setRecentSymbols, setSymbols]);
```

Kod po zmianie:

```typescript
// useEffect usunięty w całości
```

Kod przed zmiana (prop AdvancedTickerFilter):

```typescript
<AdvancedTickerFilter
  selected={gridState.symbols}
  onChange={setSymbols}
  recentSymbols={recentSymbols}
  range={gridState.range}
/>
```

Kod po zmianie:

```typescript
<AdvancedTickerFilter
  selected={gridState.symbols}
  onChange={setSymbols}
  range={gridState.range}
/>
```

Kod przed zmiana (warunek skeleton ~linia 419):

```typescript
{isLoading ||
hasAccess === null ||
(!isInitialized && hasAccess) ||
(hasAccess && gridResponse === null) ? (
  <GridSkeleton />
```

Kod po zmianie:

```typescript
{isLoading ||
hasAccess === null ||
(hasAccess && gridResponse === null) ? (
  <GridSkeleton />
```

Uzasadnienie:
`(!isInitialized && hasAccess)` blokowało wyświetlanie gridu do zakończenia smartInitialization. Po usunięciu smartInitialization `isInitialized` byłoby zawsze `false` (useState nie istnieje), co powodowałoby trwałe wyświetlanie skeleton.

#### Krok 2: Usunięcie recentSymbols i isInitialized z GridContext.tsx

Plik: `src/contexts/GridContext.tsx`

Opis zmian:

1. Usunąć z interfejsu `GridContextValue` cztery pola: `recentSymbols`, `setRecentSymbols`, `isInitialized`, `setIsInitialized`
2. Usunąć `useState` dla `recentSymbols` i `isInitialized`
3. Usunąć cztery wpisy z obiektu `value`

Kod przed zmiana (interfejs):

```typescript
interface GridContextValue {
  gridState: GridState;
  setRange: (range: DateRange) => void;
  setSymbols: (symbols: string[]) => void;
  setEventTypes: (types: EventType[]) => void;
  setSort: (sort: { field: "date" | "percent_change" | "symbol"; direction: "asc" | "desc" }) => void;
  setEventId: (eventId: string | undefined) => void;
  setDateRange: (startDate: string, endDate: string) => void;
  clearFilters: () => void;
  recentSymbols: string[];
  setRecentSymbols: (symbols: string[]) => void;
  isInitialized: boolean;
  setIsInitialized: (value: boolean) => void;
}
```

Kod po zmianie:

```typescript
interface GridContextValue {
  gridState: GridState;
  setRange: (range: DateRange) => void;
  setSymbols: (symbols: string[]) => void;
  setEventTypes: (types: EventType[]) => void;
  setSort: (sort: { field: "date" | "percent_change" | "symbol"; direction: "asc" | "desc" }) => void;
  setEventId: (eventId: string | undefined) => void;
  setDateRange: (startDate: string, endDate: string) => void;
  clearFilters: () => void;
}
```

Kod przed zmiana (useState):

```typescript
const [recentSymbols, setRecentSymbols] = useState<string[]>([]);
const [isInitialized, setIsInitialized] = useState(false);
```

Kod po zmianie:

```typescript
// obie linie usunięte
```

Kod przed zmiana (value obiekt):

```typescript
const value: GridContextValue = {
  gridState,
  setRange,
  setSymbols,
  setEventTypes,
  setSort,
  setEventId,
  setDateRange,
  clearFilters,
  recentSymbols,
  setRecentSymbols,
  isInitialized,
  setIsInitialized,
};
```

Kod po zmianie:

```typescript
const value: GridContextValue = {
  gridState,
  setRange,
  setSymbols,
  setEventTypes,
  setSort,
  setEventId,
  setDateRange,
  clearFilters,
};
```

Uzasadnienie:
Usunięcie martwego stanu z kontekstu. Te pola nie są i nie będą używane przez żaden inny komponent po usunięciu smartInitialization.

#### Krok 3: Usunięcie recentSymbols i przycisku z AdvancedTickerFilter.tsx

Plik: `src/components/grid/AdvancedTickerFilter.tsx`

Opis zmian:

1. Usunąć `recentSymbols?: string[]` z interfejsu `AdvancedTickerFilterProps`
2. Usunąć `recentSymbols` z destrukturyzacji propsów
3. Usunąć cały callback `handleSelectRecent`
4. Usunąć przycisk "Zaznacz ostatnie"

Kod przed zmiana (interfejs props):

```typescript
interface AdvancedTickerFilterProps {
  selected: string[];
  onChange: (selected: string[]) => void;
  recentSymbols?: string[];
  range?: DateRange;
}
```

Kod po zmianie:

```typescript
interface AdvancedTickerFilterProps {
  selected: string[];
  onChange: (selected: string[]) => void;
  range?: DateRange;
}
```

Kod przed zmiana (sygnatura funkcji):

```typescript
export function AdvancedTickerFilter({ selected, onChange, recentSymbols, range }: AdvancedTickerFilterProps) {
```

Kod po zmianie:

```typescript
export function AdvancedTickerFilter({ selected, onChange, range }: AdvancedTickerFilterProps) {
```

Kod przed zmiana (callback handleSelectRecent):

```typescript
const handleSelectRecent = useCallback(() => {
  if (recentSymbols && recentSymbols.length > 0) {
    setLocalSelected(new Set(recentSymbols));
  }
}, [recentSymbols]);
```

Kod po zmianie:

```typescript
// callback usunięty
```

Kod przed zmiana (przycisk):

```typescript
<Button
  variant="outline"
  size="sm"
  onClick={handleSelectRecent}
  disabled={isLoading || !recentSymbols || recentSymbols.length === 0}
  title="Zaznacz tickery z ostatniej inicjalizacji"
>
  Zaznacz ostatnie ({recentSymbols?.length || 0})
</Button>
```

Kod po zmianie:

```typescript
// przycisk usunięty
```

Uzasadnienie:
Bez recentSymbols przekazywanego z zewnątrz przycisk byłby trwale disabled (`recentSymbols` = undefined). Usunięcie go czyści UI.

### 5.3. Faza 3: Aktualizacja typow i interfejsow

Brak zmian wymaganych. `src/types/ui.types.ts` — interfejs `GridState` nie zawiera `recentSymbols` ani `isInitialized`. Pola te żyły wyłącznie w `GridContext.tsx`.

### 5.4. Faza 4: Migracje bazy danych

Nie dotyczy.

### 5.5. Faza 5: Aktualizacja testow

#### Aktualizacja TC-FILTER-003

Plik: `e2e/grid-filtering-advanced.spec.ts`

Problem: Test zakłada, że po `goto()` tickery CPD, PKO, PKN są już zaznaczone (z smartInitialization). Po usunięciu smartInitialization grid startuje z `symbols=[]`, więc `deselectTickers(["CPD", "PKO"])` jest no-op, a `apply()` aplikuje 0 tickerów.

Kod przed zmiana:

```typescript
test("TC-FILTER-003: Filters saved in localStorage", async ({ page }) => {
  const gridPage = new GridPage(page);
  await gridPage.goto();

  // Keep only PKN (uncheck CPD and PKO)
  await gridPage.tickerFilter.open();
  await gridPage.tickerFilter.deselectTickers(["CPD", "PKO"]);
  await gridPage.tickerFilter.apply();

  const localStorage = await page.evaluate(() => JSON.stringify(window.localStorage));
  expect(localStorage).toBeTruthy();
  expect(localStorage).toContain("PKN");
});
```

Kod po zmianie:

```typescript
test("TC-FILTER-003: Filters saved in localStorage", async ({ page }) => {
  const gridPage = new GridPage(page);
  await gridPage.goto();

  // Explicitly select PKN and apply
  await gridPage.tickerFilter.open();
  await gridPage.tickerFilter.deselectAll();
  await gridPage.tickerFilter.selectTicker("PKN");
  await gridPage.tickerFilter.apply();

  const localStorage = await page.evaluate(() => JSON.stringify(window.localStorage));
  expect(localStorage).toBeTruthy();
  expect(localStorage).toContain("PKN");
});
```

Cel testu:
Test weryfikuje, że po wybraniu i zaaplikowaniu filtra ticker trafia do localStorage (mechanizm cache). Po zmianie test jest niezależny od smartInitialization i weryfikuje tę samą właściwość systemu.

## 6. Plan weryfikacji i testowania

### 6.1. Unit tests

- [ ] Brak nowych testów jednostkowych — logika smartInitialization nie wymaga pokrycia po usunięciu
- [ ] Sprawdzenie, że istniejące testy GridContext przechodzą po usunięciu pól z interfejsu

### 6.2. Integration tests

- [ ] Weryfikacja, że GridProvider nadal poprawnie dostarcza wartości do konsumentów kontekstu
- [ ] Weryfikacja, że `clearFilters` nadal czyści symbols do []

### 6.3. E2E tests

- [ ] TC-FILTER-001: niezależny od smartInitialization — przechodzi bez zmian
- [ ] TC-FILTER-002: niezależny — przechodzi bez zmian
- [ ] TC-FILTER-003: wymagana aktualizacja zgodnie z krokiem 5.5
- [ ] TC-FILTER-004: niezależny — przechodzi bez zmian
- [ ] TC-FILTER-005: niezależny — przechodzi bez zmian
- [ ] Testy renderingu gridu: weryfikacja że grid wyświetla zdarzenia przy `symbols=[]`
- [ ] Weryfikacja że badge na przycisku tickerów nie pokazuje liczby przy wejściu bez parametrów

### 6.4. Manual testing checklist

- [ ] Wejść na /grid bez parametrów — URL nie powinien dodawać `symbols=`
- [ ] Wejść na /grid?range=week — `symbols=` nie powinno się pojawić
- [ ] Sprawdzić że grid pokazuje zdarzenia (nie pusta strona)
- [ ] Sprawdzić że "Zaznacz ostatnie" nie istnieje w oknie filtra tickerów
- [ ] Kliknąć "Wyczyść filtry" — zachowanie bez zmian (symbols już puste)
- [ ] Wybrać ręcznie tickery → zaaplikować → `symbols=` w URL
- [ ] Wyczyścić filtry → `symbols=` znika z URL
- [ ] Skeleton nie blokuje wyświetlania gridu przy wejściu z dostępem

### 6.5. Regression testing

- [ ] Filtrowanie tickerów — ręczny wybór, zastosowanie, czyszczenie
- [ ] Zakres dat — przełączanie week/month/quarter
- [ ] Sidebar zdarzeń — otwieranie, zamykanie
- [ ] Infinite scroll — ładowanie starszych danych
- [ ] Cache — ponowne wejście z tymi samymi parametrami nie wywołuje ponownego fetcha

## 7. Analiza ryzyka i mitigation

### 7.1. Zidentyfikowane ryzyka

#### Ryzyko 1: Regresja TC-FILTER-003

- Severity: LOW
- Prawdopodobienstwo: HIGH (test na pewno zawiedzie bez aktualizacji)
- Wpływ: test E2E failuje w CI, blokuje merge
- Mitigation: zaktualizować test zgodnie z krokiem 5.5 w tej samej gałęzi

#### Ryzyko 2: Inna część kodu odczytuje recentSymbols lub isInitialized z kontekstu

- Severity: MEDIUM
- Prawdopodobienstwo: LOW (brak innych użytkowników w przeszukiwanym kodzie)
- Wpływ: błąd TypeScript przy kompilacji
- Mitigation: po usunięciu pól z GridContextValue kompilator TypeScript zasygnalizuje wszystkie użycia; uruchomić `npm run build` po zmianach

#### Ryzyko 3: Grid pokazuje pustą stronę przy braku zdarzeń w domyślnym zakresie

- Severity: LOW
- Prawdopodobienstwo: LOW
- Wpływ: użytkownik widzi "Brak zdarzeń w wybranym zakresie" zamiast kilku tickerów
- Mitigation: to jest oczekiwane i poprawne zachowanie — komunikat jest już zaimplementowany w GridView

### 7.2. Rollback plan

1. `git revert <commit-sha>` — przywraca wszystkie pliki jednocześnie
2. Alternatywnie: `git checkout main -- src/components/grid/GridView.tsx src/contexts/GridContext.tsx src/components/grid/AdvancedTickerFilter.tsx e2e/grid-filtering-advanced.spec.ts`
3. Zbudować i wdrożyć

### 7.3. Monitoring post-deployment

- Sprawdzić logi API: liczba requestów do `/api/nocodb/grid` powinna spaść o ~1 per każde wejście na /grid (usunięty fetch z smartInitialization)
- Sprawdzić URL na /grid po wejściu — nie powinien zawierać `symbols=`
- Sprawdzić że użytkownicy nie zgłaszają problemów z pustym gridem

## 8. Zgodnosc ze standardami

### 8.1. Copilot-instructions.md compliance

- React patterns: tak — usuwamy useEffect z efektem ubocznym; pozostaje czysta logika hooks
- Astro patterns: tak — brak zmian w plikach .astro
- Accessibility (ARIA, WCAG): tak — usunięcie przycisku nie narusza dostępności (był opcjonalny)
- TypeScript best practices: tak — po usunięciu pól z interfejsu kompilator wymusi czystość
- Testing patterns: tak — aktualizacja E2E zgodna z Page Object Model

### 8.2. Tech-stack.md compliance

- React 19: tak — brak zmian wzorców
- Astro 5 SSR: tak — brak zmian
- Tailwind: tak — brak zmian w stylach

### 8.3. Security checklist

- [ ] Input validation — nie dotyczy
- [ ] Authorization — nie dotyczy
- [ ] XSS protection — nie dotyczy
- [ ] Secrets management — nie dotyczy

### 8.4. Performance checklist

- [ ] Bundle size impact — minimalny spadek (usunięcie kodu)
- [ ] Rendering optimization — usunięcie useEffect z fetchem poprawia performance (jeden fetch mniej per page load)
- [ ] Loading states — warunek skeleton uproszczony, nie powinna regresować

### 8.5. Accessibility checklist

- [ ] ARIA attributes — przycisk "Zaznacz ostatnie" nie miał specyficznego ARIA role; usunięcie nie degraduje dostępności
- [ ] Keyboard navigation — brak zmiany w nawigacji klawiaturowej filtru
- [ ] Semantic HTML — brak zmian strukturalnych

## 9. Dokumentacja zmian

### 9.1. Changelog entry

```markdown
### Fixed

- [remove-smart-initialization] Usunięto automatyczną inicjalizację symbols przy wejściu na /grid; grid domyślnie pokazuje wszystkie zdarzenia bez pre-wybranych tickerów
- Usunięto przycisk "Zaznacz ostatnie" z okna filtra tickerów
```

### 9.2. Aktualizacja README

Nie wymagana.

### 9.3. Release notes

Przy wejściu na /grid URL nie będzie już zawierał automatycznie dodanego parametru `symbols=`. Grid wyświetli wszystkie zdarzenia z wybranego zakresu dat. Użytkownicy z zapisanymi zakładkami zawierającymi `symbols=` — nadal będą widzieć swoje filtry (parametr z URL jest odczytywany przez GridContext bez zmian).

## 10. Timeline i effort estimation

### 10.1. Estymacja czasu

- Implementacja: 1-2 godziny (usuwanie kodu w 3 plikach + 1 test)
- Testowanie: 30 minut (manualne smoke testy + uruchomienie E2E)
- Code review: 30 minut
- Deployment: 15 minut

Łącznie: 2.5–3.5 godziny

### 10.2. Zaleznosci

- Blokujące: brak
- Blokowane przez tę naprawę: brak

### 10.3. Sugerowany timeline

- Start: 2026-03-03
- Code complete: 2026-03-03
- Testing complete: 2026-03-03
- Code review: 2026-03-04
- Deployment to production: 2026-03-04

## 11. Załączniki

### 11.1. Dotknięte pliki (lista pelna)

Modyfikowane:

```
src/components/grid/GridView.tsx
src/contexts/GridContext.tsx
src/components/grid/AdvancedTickerFilter.tsx
e2e/grid-filtering-advanced.spec.ts
```

Bez zmian (powiązane kontekstowo):

```
src/types/ui.types.ts              (GridState nie zawiera recentSymbols/isInitialized)
src/lib/cache-utils.ts             (brak kluczy cache dla recentSymbols/isInitialized)
src/config/gpw-indices.ts          (WIG20_SYMBOLS zostaje w pliku, tylko import w GridView usuwany)
```

### 11.2. Referencje

- AGENTS.md sekcja "Critical Patterns > Client-Side Caching"
- AGENTS.md sekcja "Feature Implementation Checklist"

### 11.3. Diagram przepływu

Przepływ przed naprawą:

```
Wejście na /grid
     ↓
GridView render (hasAccess = null) → GridSkeleton
     ↓
hasAccess = true, isInitialized = false → GridSkeleton (blokuje warunek)
     ↓
smartInitialization() → fetchGridData("week", [], undefined)
     ↓
setSymbols([uniqueSymbols]) → URL: ?range=week&symbols=PKN,PKO,...
     ↓
setIsInitialized(true) → GridSkeleton znika → VirtualizedGrid z wąskim filtrem symboli
```

Przepływ po naprawie:

```
Wejście na /grid
     ↓
GridView render (hasAccess = null) → GridSkeleton
     ↓
hasAccess = true, gridResponse != null → VirtualizedGrid z symbols=[] (wszystkie zdarzenia)
```
