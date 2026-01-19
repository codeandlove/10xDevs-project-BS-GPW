# Plan Naprawy Bledu - Grid UI Layout Improvements

Data utworzenia: 2026-01-18
Tytul bledu: Grid nie wypełnia całej dostępnej przestrzeni i daty znikają podczas przewijania w prawo
Severity: MEDIUM
Typ bledu: UI

## 1. Podsumowanie wykonawcze

### 1.1. Opis bledu

Grid w aplikacji Black Swan ma dwa problemy UI/UX: (1) wysokość gridu jest sztywno ustawiona na 600px zamiast wypełniać całą dostępną przestrzeń pod headerem, co powoduje marnotrawstwo przestrzeni ekranu na desktopie; (2) header z datami nie przewija się synchronicznie z gridem w kierunku poziomym, przez co podczas scrollowania w prawo użytkownik traci kontekst czasowy i nie wie którego dnia dotyczą wyświetlane komórki.

### 1.2. Root cause

Przyczyna 1: W komponencie VirtualizedGrid.tsx (linia 168) scrollable body ma fixed height: `className="h-[600px] overflow-auto"` zamiast flex-based height.

Przyczyna 2: W komponencie VirtualizedGrid.tsx (linia 135-163) header z datami nie ma mechanizmu synchronizacji scrollowania poziomego z body gridu. Header jest sticky tylko wertykalnie (`sticky top-0`), a kontener z datami nie ma własnego przewijania zsynchronizowanego z gridem.

### 1.3. Zakres wpływu

- Dotknięte komponenty/moduły: VirtualizedGrid.tsx, GridView.tsx, AppLayout.tsx
- Dotknięci uzytkownicy: wszyscy użytkownicy aplikacji na wszystkich urządzeniach (desktop szczególnie dotknięty)
- Dotknięte srodowiska: production, staging, development

### 1.4. Priorytet naprawy

NORMAL - Problem dotyczy UX i ergonomii interfejsu, nie blokuje podstawowych funkcjonalności, ale znacząco obniża komfort pracy z aplikacją. Na desktopie marnuje się ~40% dostępnej przestrzeni ekranu, a brak kontekstu czasowego podczas scrollowania wymusza częste przewijanie w lewo dla weryfikacji dat.

## 2. Szczegolowa analiza bledu

### 2.1. Kroki reprodukcji

Problem 1 (fixed height):

1. Otwórz aplikację na desktopie (rozdzielczość 1920x1080 lub wyższa)
2. Zaloguj się i przejdź do widoku gridu (/grid)
3. Zaobserwuj grid - ma wysokość 600px niezależnie od rozmiaru okna
4. Pod gridem jest pusta przestrzeń (szczególnie widoczne na dużych monitorach)

Problem 2 (daty znikają):

1. Otwórz widok gridu z większą ilością tickerów i dat
2. Przewiń grid w prawo (horizontal scroll)
3. Zaobserwuj header - daty pozostają w miejscu i znikają z pola widzenia
4. Użytkownik nie widzi dat dla przewijanych kolumn

### 2.2. Oczekiwane zachowanie

Problem 1: Grid powinien automatycznie wypełniać całą dostępną wysokość ekranu pod headerem i subscription bannerem, wykorzystując calc() lub flexbox. Na desktopie powinien zajmować ~95% viewportu.

Problem 2: Header z datami powinien przewijać się synchronicznie z gridem w osi X. Podczas scrollowania gridu w prawo, daty powinny pozostać widoczne nad odpowiednimi kolumnami. Kolumna "Symbol" powinna pozostać sticky na lewo.

### 2.3. Rzeczywiste zachowanie

Problem 1: Grid ma fixed height 600px niezależnie od rozmiaru ekranu. Na desktopie (wysokość viewportu ~1080px) grid zajmuje tylko ~55% dostępnej przestrzeni, reszta jest pusta.

Problem 2: Podczas przewijania gridu w prawo, header z datami nie porusza się. Daty znikają z pola widzenia, pozostaje tylko kontener headera. Użytkownik musi przewinąć z powrotem w lewo aby zobaczyć daty.

### 2.4. Root cause analysis

Lokalizacja bledu: src/components/grid/VirtualizedGrid.tsx

Przyczyna techniczna Problem 1 (linie 130-168):

- Główny kontener gridu nie ma flex layout: `className="w-full overflow-hidden rounded-lg border"`
- Scrollable body ma fixed height: `<div ref={parentRef} className="h-[600px] overflow-auto">`
- Brak wykorzystania calc() lub flexbox dla dynamicznej wysokości
- Brak props height w VirtualizedGridProps interface

Przyczyna techniczna Problem 2 (linie 135-163):

- Header z datami (linia 135) jest bezpośrednio w sticky container bez własnego scrolling mechanizmu
- Brak ref dla headera dat umożliwiającego sync scroll
- Brak useEffect hook dla synchronizacji scrollLeft między body i headerem
- Container dat nie ma overflow-x-hidden dla kontrolowanego scrollowania

Brakujące elementy:

- Ref dla header scroll container (`headerScrollRef`)
- useEffect hook nasłuchujący scroll event na parentRef i aktualizujący headerScrollRef.scrollLeft
- Wrapper div dla dat z overflow-x-hidden i ref
- Flex layout dla głównego kontenera gridu

### 2.5. Analiza zasiegu

Komponenty frontend:

- src/components/grid/VirtualizedGrid.tsx - główny komponent wymagający zmian (synchronizacja scroll + flex layout)
- src/components/grid/GridView.tsx - wrapper component, dodanie height container dla VirtualizedGrid
- src/components/layout/AppLayout.tsx - layout optimization, flex-1 dla main content area

Serwisy/hooki:

Brak - problem dotyczy wyłącznie UI/layout, nie wymaga zmian w logice biznesowej lub hooks

Typy/interfejsy:

- src/components/grid/VirtualizedGrid.tsx (interface VirtualizedGridProps) - opcjonalne dodanie height prop

Backend/API:

Brak - problem dotyczy wyłącznie frontendu

Baza danych:

Brak - problem nie dotyczy persystencji danych

Testy:

- e2e/grid.spec.ts - aktualizacja istniejących testów grid layout
- Nowe testy: weryfikacja sync scroll, weryfikacja dynamic height
- Testy manualne: responsywność na różnych rozdzielczościach

## 3. Propozycje rozwiazan

### 3.1. Rozwiazanie A (REKOMENDOWANE)

Opis:

CSS-based flex layout + JavaScript scroll synchronization. Wykorzystanie flexbox w VirtualizedGrid dla dynamicznej wysokości i addEventListener dla sync scroll między headerem a body gridu. Minimalna ilość zmian, największa kompatybilność, zero dodatkowych dependencies.

Zakres zmian:

Frontend:

- VirtualizedGrid.tsx: dodanie flexbox layout, headerScrollRef, useEffect scroll sync, modyfikacja JSX headera
- GridView.tsx: dodanie height container calc(100vh - 120px) dla grid wrapper
- AppLayout.tsx: zmiana layout głównego div na flex flex-col, flex-1 dla main

Backend: brak zmian

Database: brak zmian

Testy:

- Aktualizacja e2e/grid.spec.ts: weryfikacja scroll behavior
- Nowe testy manualne: responsywność, keyboard navigation, accessibility

Zalety:

- Minimalna ilość zmian - dotyka tylko 3 plików
- Zero dodatkowych dependencies - wykorzystuje natywny Web API
- Wysoka kompatybilność - flexbox i addEventListener są szeroko wspierane
- Łatwy rollback - zmiany są izolowane i odwracalne
- Performance - scroll sync przez addEventListener jest wydajny
- Zachowuje istniejącą virtualizację - żadnych zmian w @tanstack/react-virtual logic
- Zgodne z Tailwind best practices - używa utility classes

Wady:

- Wymaga useEffect cleanup dla removeEventListener (zwiększa complexity nieznacznie)
- Scroll sync może mieć minimalny lag na bardzo wolnych urządzeniach (rozwiązanie: requestAnimationFrame)
- Calc height może wymagać dostosowania jeśli wysokość headera/bannera się zmieni

Effort: S (3-4 godziny)

Uzasadnienie: 20 min implementacja scroll sync, 15 min flex layout, 10 min GridView update, 5 min AppLayout, 60 min testowanie responsywności i keyboard navigation, 30 min code review i dokumentacja.

Ryzyko regresji: LOW

Uzasadnienie: Zmiany dotyczą tylko layout/UI, nie wpływają na logikę biznesową, virtualization ani state management. Istniejące testy keyboard navigation pozostają bez zmian. Scroll sync jest additive - dodaje funkcjonalność bez usuwania istniejącej. Flex layout jest stabilny i dobrze przetestowany pattern.

Zgodnosc ze standardami:

- Copilot-instructions.md: ✅ - używa React hooks (useRef, useEffect), functional components, proper cleanup, Tailwind utilities
- Tech-stack.md: ✅ - TypeScript, React 19, Tailwind CSS 4, żadnych nowych dependencies
- Best practices: ✅ - semantic HTML zachowany, ARIA labels nie zmienione, keyboard nav nie dotknięty

### 3.2. Rozwiazanie B

Opis:

CSS Grid layout z sticky positioning + IntersectionObserver dla smart scroll sync. Zamiast flexbox wykorzystanie CSS Grid dla layout, a IntersectionObserver API dla detekcji widoczności kolumn i inteligentnego scrollowania headera.

Zakres zmian:

Frontend:

- VirtualizedGrid.tsx: zmiana layout na CSS Grid, implementacja IntersectionObserver dla kolumn, scroll sync logic
- GridView.tsx: wrapper z grid layout configuration
- AppLayout.tsx: grid layout dla main container

Backend: brak zmian

Database: brak zmian

Testy:

- Nowe testy unit: IntersectionObserver mock i behavior
- Aktualizacja e2e testów

Zalety:

- CSS Grid oferuje bardziej precyzyjną kontrolę nad layout
- IntersectionObserver może zapewnić bardziej inteligentny scroll sync (tylko visible columns)
- Lepsze performance dla bardzo dużych gridów (lazy observation)

Wady:

- Większa kompleksność - IntersectionObserver wymaga więcej kodu i testów
- IntersectionObserver może mieć compatibility issues na starszych browserach (polyfill needed)
- CSS Grid może kolidować z istniejącym @tanstack/react-virtual layout
- Większy effort - więcej kodu do napisania i przetestowania
- Trudniejszy debugging - IntersectionObserver logic jest mniej oczywista
- Overengineering dla prostego problemu scroll sync

Effort: M (6-7 godzin)

Uzasadnienie: Więcej czasu na implementację IntersectionObserver, testy behavior, compatibility testing, potential polyfill integration.

Ryzyko regresji: MEDIUM

Uzasadnienie: CSS Grid może wpłynąć na istniejącą virtualizację. IntersectionObserver może powodować nieprzewidywalne behavior na edge cases. Większa ilość kodu oznacza więcej potential bugs.

Zgodnosc ze standardami:

- Copilot-instructions.md: ✅ - React patterns zachowane
- Tech-stack.md: ⚠️ - może wymagać polyfill dla starszych browsers
- Best practices: ⚠️ - zwiększona complexity bez wyraźnej korzyści

### 3.3. Rozwiazanie C

Opis:

Refactor na single scrollable container z fixed positioned header. Zamiast dwóch scroll containerów (header + body), jeden główny scroll container z absolutnie pozycjonowanym headerem który się transformuje na podstawie scroll position.

Zakres zmian:

Frontend:

- VirtualizedGrid.tsx: major refactor - merge header i body do jednego scroll container, absolute positioning header, transform based on scroll
- Możliwe zmiany w @tanstack/react-virtual configuration
- GridView.tsx i AppLayout.tsx - minor updates

Backend: brak zmian

Database: brak zmian

Testy:

- Extensive nowe testy - całkowicie nowy scroll model
- Regression testing - wszystkie istniejące testy mogą wymagać aktualizacji

Zalety:

- Najprostszy scroll model - jeden scroll container eliminuje sync problem
- Potencjalnie lepsze performance - mniej DOM manipulations
- Bardziej "native" scroll experience

Wady:

- Major refactor - duża ilość zmian w core component
- Wysokie ryzyko regresji - wpływa na virtualization logic
- Może wymagać zmian w @tanstack/react-virtual integration
- Fixed positioning może mieć problemy z różnymi browser quirks
- Transform może powodować visual glitches podczas scrollowania
- Znaczący effort - praktycznie przepisanie VirtualizedGrid

Effort: L (2-3 dni)

Uzasadnienie: Przeprojektowanie layoutu, przepisanie scroll logic, extensive testing, bug fixing, regression testing.

Ryzyko regresji: HIGH

Uzasadnienie: Dotyka core functionality gridu, virtualizacji, wszystkich interakcji scroll. Istniejące testy keyboard navigation mogą wymagać zmian. Wysokie prawdopodobieństwo wprowadzenia nowych bugs.

Zgodnosc ze standardami:

- Copilot-instructions.md: ⚠️ - duże zmiany mogą naruszyć istniejące patterns
- Tech-stack.md: ✅ - technologie te same
- Best practices: ❌ - overengineering, unnecessary complexity

## 4. Rekomendacja i uzasadnienie

### 4.1. Wybrane rozwiazanie

ROZWIAZANIE A - CSS-based flex layout + JavaScript scroll synchronization

### 4.2. Uzasadnienie wyboru

Rozwiązanie A jest optymalne z następujących powodów:

Minimalizuje ryzyko regresji poprzez:

- Izolowane zmiany - dotyka tylko layout warstwy, nie wpływa na virtualization logic
- Additive approach - dodaje funkcjonalność (scroll sync) zamiast zmieniać istniejącą
- Zero zmian w state management, API calls, keyboard navigation
- Simple cleanup pattern - addEventListener/removeEventListener jest dobrze przetestowanym wzorcem
- Flexbox jest stabilną, sprawdzoną technologią bez compatibility issues

Jest zgodne ze standardami projektu:

- Używa React functional components i hooks zgodnie z copilot-instructions.md
- Tailwind utility classes dla layout (flex, flex-col, flex-1) zgodnie z guidelines
- Zero nowych dependencies - zgodne z tech-stack.md
- Zachowuje accessibility (ARIA labels, keyboard navigation) zgodnie z WCAG requirements
- TypeScript strict typing dla props i refs

Optymalizuje effort vs. wartosc:

- S effort (3-4h) dla znaczącej poprawy UX
- Prosty kod - łatwy w maintenance i debugging
- Nie wymaga zaawansowanych API (IntersectionObserver) ani major refactorów
- Quick win - może być wdrożone i przetestowane w ciągu jednego dnia

Zapewnia skalowalnosc:

- Flexbox layout łatwo adaptuje się do różnych screen sizes
- Scroll sync działa niezależnie od ilości kolumn/rows
- Calc-based height może być łatwo dostosowany do zmian w header/banner
- Nie wprowadza vendor lock-in ani complex dependencies

Ułatwia przyszle utrzymanie:

- Prosty kod - każdy developer zrozumie addEventListener i flexbox
- Minimal abstraction - brak over-engineering
- Łatwy rollback - wszystkie zmiany są odwracalne w kilka minut
- Dobra dokumentowalność - standardowe Web API patterns

## 5. Szczegolowy plan implementacji

### 5.1. Faza 1: Przygotowanie

- [ ] Utworzenie brancha: `fix/grid-ui-layout-improvements`
- [ ] Backup: git commit current state przed zmianami
- [ ] Screenshot obecnego stanu gridu (desktop, tablet, mobile) dla porównania
- [ ] Przygotowanie środowiska dev: npm run dev

### 5.2. Faza 2: Zmiany w kodzie

Krok 1: Dodanie scroll synchronization w VirtualizedGrid

Plik: `src/components/grid/VirtualizedGrid.tsx`

Opis zmian:
Dodanie ref dla header scroll container i useEffect hook synchronizujący scrollLeft między body a headerem gridu.

Kod przed zmiana:

```typescript
export function VirtualizedGrid({ events, range, onCellClick, selectedEventId }: VirtualizedGridProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  // Keyboard navigation state
  const [focusedCell, setFocusedCell] = useState<{ symbolIndex: number; dateIndex: number } | null>(null);

  // ...existing code...
```

Kod po zmianie:

```typescript
export function VirtualizedGrid({ events, range, onCellClick, selectedEventId }: VirtualizedGridProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const headerScrollRef = useRef<HTMLDivElement>(null);

  // Keyboard navigation state
  const [focusedCell, setFocusedCell] = useState<{ symbolIndex: number; dateIndex: number } | null>(null);

  // Scroll synchronization between header and body
  useEffect(() => {
    const bodyEl = parentRef.current;
    const headerEl = headerScrollRef.current;

    if (!bodyEl || !headerEl) return;

    const handleScroll = () => {
      headerEl.scrollLeft = bodyEl.scrollLeft;
    };

    bodyEl.addEventListener('scroll', handleScroll);
    return () => bodyEl.removeEventListener('scroll', handleScroll);
  }, []);

  // ...existing code...
```

Uzasadnienie:
addEventListener na body scroll propaguje scrollLeft do headera, zapewniając synchronizację. useEffect cleanup (removeEventListener) zapobiega memory leaks. Ref pattern jest standard dla DOM manipulation w React.

Krok 2: Modyfikacja JSX headera z datami dla scroll container

Plik: `src/components/grid/VirtualizedGrid.tsx`

Opis zmian:
Owinięcie listy dat w scrollable container z overflow-x-hidden i przypisanie headerScrollRef.

Kod przed zmiana:

```typescript
{/* Header row with dates (sticky) */}
<div className="sticky top-0 z-20 flex border-b bg-white" role="row">
  {/* Top-left corner (empty cell for symbol column) */}
  <div className="sticky left-0 z-30 w-32 shrink-0 border-r bg-gray-50 px-4 py-3" role="columnheader">
    <span className="text-sm font-semibold text-gray-700">Symbol</span>
  </div>

  {/* Virtual columns for dates */}
  <div
    className="relative flex"
    style={{
      width: `${columnVirtualizer.getTotalSize()}px`,
    }}
  >
    {columnVirtualizer.getVirtualItems().map((virtualColumn) => {
      const date = dates[virtualColumn.index];
      return (
        <div
          key={virtualColumn.key}
          role="columnheader"
          className="absolute left-0 top-0 flex h-full items-center justify-center border-r px-4 py-3"
          style={{
            width: `${virtualColumn.size}px`,
            transform: `translateX(${virtualColumn.start}px)`,
          }}
        >
          <span className="text-xs font-medium text-gray-600">{date}</span>
        </div>
      );
    })}
  </div>
</div>
```

Kod po zmianie:

```typescript
{/* Header row with dates (sticky) */}
<div className="sticky top-0 z-20 flex border-b bg-white" role="row">
  {/* Top-left corner (empty cell for symbol column) */}
  <div className="sticky left-0 z-30 w-32 shrink-0 border-r bg-gray-50 px-4 py-3" role="columnheader">
    <span className="text-sm font-semibold text-gray-700">Symbol</span>
  </div>

  {/* Scrollable dates container */}
  <div
    ref={headerScrollRef}
    className="flex-1 overflow-x-hidden"
  >
    <div
      className="relative flex"
      style={{
        width: `${columnVirtualizer.getTotalSize()}px`,
      }}
    >
      {columnVirtualizer.getVirtualItems().map((virtualColumn) => {
        const date = dates[virtualColumn.index];
        return (
          <div
            key={virtualColumn.key}
            role="columnheader"
            className="absolute left-0 top-0 flex h-full items-center justify-center border-r px-4 py-3"
            style={{
              width: `${virtualColumn.size}px`,
              transform: `translateX(${virtualColumn.start}px)`,
            }}
          >
            <span className="text-xs font-medium text-gray-600">{date}</span>
          </div>
        );
      })}
    </div>
  </div>
</div>
```

Uzasadnienie:
Dodanie wrapper div z overflow-x-hidden umożliwia kontrolowane scrollowanie przez JavaScript (scrollLeft property). flex-1 zapewnia że container zajmie pozostałą przestrzeń obok kolumny Symbol. Ref pozwala na manipulację scrollLeft w useEffect.

Krok 3: Zmiana layoutu głównego kontenera VirtualizedGrid na flexbox

Plik: `src/components/grid/VirtualizedGrid.tsx`

Opis zmian:
Dodanie flex flex-col layout do głównego kontenera i usunięcie fixed height z body.

Kod przed zmiana:

```typescript
return (
  <div className="w-full overflow-hidden rounded-lg border" role="grid" aria-label="Black Swan Events Grid">
    {/* Header row with dates (sticky) */}
    <div className="sticky top-0 z-20 flex border-b bg-white" role="row">
      {/* ...header content... */}
    </div>

    {/* Scrollable body */}
    <div ref={parentRef} className="h-[600px] overflow-auto">
      <div
        className="relative"
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: `${columnVirtualizer.getTotalSize() + 128}px`,
        }}
      >
        {/* ...body content... */}
      </div>
    </div>
  </div>
);
```

Kod po zmianie:

```typescript
return (
  <div className="flex h-full w-full flex-col overflow-hidden rounded-lg border" role="grid" aria-label="Black Swan Events Grid">
    {/* Header row with dates (sticky) */}
    <div className="sticky top-0 z-20 flex border-b bg-white" role="row">
      {/* ...header content... */}
    </div>

    {/* Scrollable body */}
    <div ref={parentRef} className="flex-1 overflow-auto">
      <div
        className="relative"
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: `${columnVirtualizer.getTotalSize() + 128}px`,
        }}
      >
        {/* ...body content... */}
      </div>
    </div>
  </div>
);
```

Uzasadnienie:
flex flex-col na głównym kontenerze tworzy vertical flex layout. h-full pozwala grid zajmować całą wysokość parent container. flex-1 na body sprawia że zajmuje pozostałą przestrzeń po headerze. Usunięcie h-[600px] eliminuje fixed height constraint.

Krok 4: Dodanie height container w GridView

Plik: `src/components/grid/GridView.tsx`

Opis zmian:
Owinięcie VirtualizedGrid i empty/loading states w container z calc-based height.

Kod przed zmiana:

```typescript
return (
  <ErrorBoundary>
    <AppLayout
      header={/* ...header... */}
    >
      <div>
        {error && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-4 text-center">
            {/* ...error content... */}
          </div>
        )}

        {isLoading ? (
          <GridSkeleton />
        ) : events.length > 0 ? (
          <VirtualizedGrid
            events={events}
            range={gridState.range}
            onCellClick={handleCellClick}
            selectedEventId={gridState.eventId}
          />
        ) : (
          <div className="flex h-[400px] items-center justify-center">
            {/* ...empty state... */}
          </div>
        )}
      </div>

      {/* Summary Sidebar/Drawer */}
      <SummaryView eventId={gridState.eventId || null} onClose={handleCloseSummary} />
    </AppLayout>
  </ErrorBoundary>
);
```

Kod po zmianie:

```typescript
return (
  <ErrorBoundary>
    <AppLayout
      header={/* ...header... */}
    >
      <div className="h-[calc(100vh-120px)] p-4">
        {error && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-4 text-center">
            {/* ...error content... */}
          </div>
        )}

        {isLoading ? (
          <GridSkeleton />
        ) : events.length > 0 ? (
          <VirtualizedGrid
            events={events}
            range={gridState.range}
            onCellClick={handleCellClick}
            selectedEventId={gridState.eventId}
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            {/* ...empty state... */}
          </div>
        )}
      </div>

      {/* Summary Sidebar/Drawer */}
      <SummaryView eventId={gridState.eventId || null} onClose={handleCloseSummary} />
    </AppLayout>
  </ErrorBoundary>
);
```

Uzasadnienie:
h-[calc(100vh-120px)] oblicza wysokość dynamicznie: 100vh (full viewport) minus ~120px (header + banner + padding). p-4 dodaje padding wokół gridu. Empty state używa h-full zamiast h-[400px] aby wypełnić container. GridSkeleton i VirtualizedGrid dziedziczą wysokość z parent.

Krok 5: Optymalizacja layout w AppLayout

Plik: `src/components/layout/AppLayout.tsx`

Opis zmian:
Zmiana głównego div na flex layout i dodanie flex-1 dla main content area.

Kod przed zmiana:

```typescript
return (
  <div className="min-h-screen bg-background">
    {header}
    {showSubscriptionBanner && profile && <SubscriptionBanner profile={profile} onUpgrade={handleUpgrade} />}
    <main>{children}</main>
    <ToastContainer />
  </div>
);
```

Kod po zmianie:

```typescript
return (
  <div className="flex min-h-screen flex-col bg-background">
    {header}
    {showSubscriptionBanner && profile && <SubscriptionBanner profile={profile} onUpgrade={handleUpgrade} />}
    <main className="flex-1 overflow-hidden">{children}</main>
    <ToastContainer />
  </div>
);
```

Uzasadnienie:
flex flex-col tworzy vertical flex container. flex-1 na main sprawia że zajmuje pozostałą przestrzeń po header i banner. overflow-hidden zapobiega niepożądanemu scrollowaniu na poziomie main. Layout jest teraz elastyczny i respondsywny.

### 5.3. Faza 3: Aktualizacja typow i interfejsow

Nie wymagane - wszystkie zmiany są kompatybilne z istniejącymi interfejsami. VirtualizedGridProps nie wymaga modyfikacji.

### 5.4. Faza 4: Migracje bazy danych

Nie wymagane - zmiany dotyczą wyłącznie UI/frontend, brak wpływu na persystencję danych.

### 5.5. Faza 5: Aktualizacja/dodanie testow

Test E2E 1: Weryfikacja scroll synchronization

Plik: `e2e/grid.spec.ts`

```typescript
test("header dates should scroll synchronously with grid body", async ({ page }) => {
  await page.goto("/grid");

  // Wait for grid to load
  await page.waitForSelector('[role="grid"]');

  // Get initial scroll positions
  const headerScrollLeft = await page
    .locator('[role="row"]')
    .first()
    .evaluate((el) => {
      return el.querySelector(".overflow-x-hidden")?.scrollLeft || 0;
    });

  // Scroll grid horizontally
  await page.locator('[role="grid"] > div:last-child').evaluate((el) => {
    el.scrollLeft = 500;
  });

  // Wait for sync
  await page.waitForTimeout(100);

  // Verify header scrolled
  const newHeaderScrollLeft = await page
    .locator('[role="row"]')
    .first()
    .evaluate((el) => {
      return el.querySelector(".overflow-x-hidden")?.scrollLeft || 0;
    });

  expect(newHeaderScrollLeft).toBe(500);
});
```

Cel testu:
Weryfikuje że scroll synchronization działa poprawnie - scrollowanie body gridu automatycznie scrolluje header z datami do tej samej pozycji.

Test E2E 2: Weryfikacja dynamic height

Plik: `e2e/grid.spec.ts`

```typescript
test("grid should fill available viewport height", async ({ page }) => {
  await page.goto("/grid");

  // Wait for grid to load
  await page.waitForSelector('[role="grid"]');

  // Get viewport height
  const viewportHeight = await page.evaluate(() => window.innerHeight);

  // Get grid container height
  const gridHeight = await page.locator('[role="grid"]').evaluate((el) => {
    return el.parentElement?.offsetHeight || 0;
  });

  // Grid should occupy most of viewport (accounting for header ~120px)
  expect(gridHeight).toBeGreaterThan(viewportHeight - 150);
  expect(gridHeight).toBeLessThan(viewportHeight - 80);
});
```

Cel testu:
Weryfikuje że grid wypełnia dostępną wysokość viewportu i nie ma fixed 600px height.

Test manual: Keyboard navigation

Checklist:

- [ ] Arrow keys nadal działają poprawnie
- [ ] Focus ring jest widoczny podczas keyboard navigation
- [ ] Enter key otwiera sidebar dla focused cell
- [ ] Escape key zamyka focus
- [ ] Tab navigation działa przez grid cells
- [ ] Focus nie gubi się podczas scrollowania

Cel testu:
Upewnić się że scroll sync i layout changes nie wpłynęły na istniejącą keyboard navigation functionality.

## 6. Plan weryfikacji i testowania

### 6.1. Unit tests

Nie wymagane - addEventListener/removeEventListener i flexbox layout są natywnym Web API bez konieczności unit testowania. E2E testy pokrywają behavior.

### 6.2. Integration tests

Nie wymagane - zmiany dotyczą tylko UI layer, nie ma integracji z API lub state management wymagającej integration tests.

### 6.3. E2E tests

- [ ] Test scroll synchronization: header scrolluje się z body
- [ ] Test dynamic height: grid wypełnia viewport
- [ ] Test sticky columns: Symbol column pozostaje sticky podczas horizontal scroll
- [ ] Test keyboard navigation: wszystkie klawisze działają poprawnie po zmianach
- [ ] Test responsiveness: grid adaptuje się do różnych screen sizes

### 6.4. Manual testing checklist

- [ ] Reprodukcja oryginalnego bledu - sprawdzenie czy naprawiony (grid fixed height, daty znikają)
- [ ] Testowanie edge cases:
  - [ ] Bardzo wąski viewport (mobile 320px)
  - [ ] Bardzo szeroki viewport (desktop 2560px)
  - [ ] Bardzo niski viewport (netbook 768px height)
  - [ ] Grid z małą ilością danych (1-2 tickery)
  - [ ] Grid z dużą ilością danych (wszystkie tickery, długi range)
- [ ] Testowanie w roznych przeglądarkach:
  - [ ] Chrome (latest)
  - [ ] Firefox (latest)
  - [ ] Edge (latest)
  - [ ] Safari (latest) - szczególnie sticky positioning
- [ ] Testowanie na roznych rozmiarach ekranu:
  - [ ] Desktop 1920x1080
  - [ ] Laptop 1366x768
  - [ ] Tablet 768x1024 (portrait i landscape)
  - [ ] Mobile 375x667 (portrait i landscape)
- [ ] Testowanie z rozna rola uzytkownika: nie dotyczy - UI changes są uniwersalne
- [ ] Testowanie dostepnosci:
  - [ ] ARIA labels zachowane
  - [ ] Role attributes poprawne
  - [ ] Keyboard navigation działa
  - [ ] Tab order logiczny
  - [ ] Focus indicators widoczne
- [ ] Testowanie performance:
  - [ ] Scroll jest płynny (60fps)
  - [ ] Brak memory leaks (sprawdzić w DevTools Memory profiler)
  - [ ] Brak layout shifts podczas scrollowania
  - [ ] Bundle size nie zwiększony (brak nowych dependencies)

### 6.5. Regression testing

Lista obszarow do przetestowania w poszukiwaniu regresji:

- [ ] Virtualization - sprawdzić czy @tanstack/react-virtual nadal działa poprawnie
- [ ] Cell click - kliknięcie cell otwiera sidebar z prawidłowym eventem
- [ ] Summary sidebar - open/close działa bez problemów
- [ ] Filter system - Range selector, ticker filter, sort options działają
- [ ] URL state management - parametry URL są prawidłowo sync z grid state
- [ ] Cache system - dane są cachowane i revalidowane poprawnie
- [ ] Error handling - error boundary wyświetla się prawidłowo
- [ ] Empty state - wyświetla się gdy brak eventów
- [ ] Loading state - skeleton loader działa podczas loading

## 7. Analiza ryzyka i mitigation

### 7.1. Zidentyfikowane ryzyka

Ryzyko 1: Scroll "tearing" lub lag między headerem a body

- Severity: LOW
- Prawdopodobienstwo: LOW
- Wpływ: Wizualny glitch podczas scrollowania - header może być nieznacznie opóźniony względem body
- Mitigation: Jeśli występuje, użyć requestAnimationFrame w handleScroll dla płynniejszej synchronizacji. Alternatywnie throttle/debounce scroll event (ale to może pogorszyć experience).

Ryzyko 2: Sticky positioning buggy w Safari

- Severity: MEDIUM
- Prawdopodobienstwo: MEDIUM
- Wpływ: Na iOS Safari kolumna Symbol może nie pozostać sticky podczas scrollowania
- Mitigation: Dodać -webkit-sticky prefix w Tailwind config jeśli potrzebne. Testować na rzeczywistym urządzeniu iOS. Fallback: użyć fixed positioning z JavaScript jeśli sticky nie działa.

Ryzyko 3: Calc height nieprawidłowy gdy banner height się zmienia

- Severity: LOW
- Prawdopodobienstwo: LOW
- Wpływ: Grid może mieć niewłaściwą wysokość jeśli subscription banner ma inną wysokość niż założone ~40px
- Mitigation: Zamiast hardcoded 120px, można dynamicznie obliczać w useEffect. Ale to zwiększa complexity - lepiej trzymać się calc() i dostosować wartość po testowaniu.

Ryzyko 4: Memory leak z addEventListener

- Severity: LOW
- Prawdopodobienstwo: LOW
- Wpływ: Memory leak jeśli useEffect cleanup nie zostanie wywołany (bardzo rzadkie w React)
- Mitigation: useEffect cleanup (removeEventListener) jest już zaimplementowany. Testować w DevTools Memory profiler po kilku navigacjach do/z grid view.

Ryzyko 5: Performance degradation na bardzo dużych gridach

- Severity: LOW
- Prawdopodobienstwo: LOW
- Wpływ: Scroll sync może być opóźniony jeśli grid ma tysiące komórek
- Mitigation: Virtualization (@tanstack/react-virtual) już minimalizuje DOM nodes. Jeśli potrzebne, użyć requestAnimationFrame lub throttle scroll event (max 60fps).

### 7.2. Rollback plan

W razie problemu po wdrożeniu, rollback jest prosty:

1. Git revert commit z fix
2. Redeploy poprzedniej wersji
3. Czas rollbacku: ~5 minut (git revert + push)
4. Zero database migrations do rollbacku (brak zmian w DB)
5. Zero API changes do rollbacku (brak zmian w backend)

Szczegolowe kroki rollbacku:

```bash
# 1. Revert commit
git revert HEAD

# 2. Push rollback
git push origin main

# 3. Verify deployment
# CI/CD automatycznie deployuje reverted version

# 4. Monitor logs
# Sprawdzić czy błędy zniknęły
```

### 7.3. Monitoring post-deployment

Co monitorowac po wdrozeniu naprawy:

- Console errors: Sprawdzić czy nie pojawiły się nowe JavaScript errors w console (szczególnie związane z refs lub addEventListener)
- Performance metrics: CLS (Cumulative Layout Shift) powinien być 0 lub bardzo niski. FPS podczas scrollowania powinien być stable 60fps.
- User feedback: Monitorować feedback czy grid height i scroll są zadowalające. Szczególnie zwrócić uwagę na zgłoszenia z Safari/iOS.
- Error tracking (Sentry/similar): Filtrować errors związane z VirtualizedGrid, GridView, AppLayout
- Bundle size: Sprawdzić czy nie wzrósł (nie powinien - brak nowych dependencies)

Metryki success:

- 0 console errors related to scroll sync
- 0 layout shift (CLS = 0)
- 60fps stable scroll performance
- Positive user feedback na UI improvements
- Brak regression issues w innych funkcjonalnościach

Czas monitorowania: 48 godzin post-deployment (2 dni robocze dla wykrycia edge cases)

## 8. Zgodnosc ze standardami

### 8.1. Copilot-instructions.md compliance

React patterns: ✅

- Functional components: VirtualizedGrid pozostaje functional component
- Hooks usage: useRef i useEffect używane zgodnie z best practices
- Proper cleanup: useEffect cleanup (removeEventListener) zaimplementowany
- useCallback/useMemo: istniejące pozostają bez zmian

Astro patterns: ✅ (nie dotyczy - zmiany tylko w React components)

Accessibility (ARIA, WCAG): ✅

- ARIA labels zachowane: role="grid", role="row", role="columnheader" nie zmienione
- Keyboard navigation: nie dotknięta - wszystkie klawisze działają jak wcześniej
- Focus management: nie zmieniony
- Semantic HTML: zachowany
- Screen reader compatibility: nie naruszona - struktura DOM logiczna

TypeScript best practices: ✅

- Strict typing: wszystkie refs są typed (RefObject<HTMLDivElement>)
- No any types: brak użycia any
- Interface consistency: VirtualizedGridProps nie zmieniony

Testing patterns: ✅

- E2E tests dodane dla nowej funkcjonalności
- Manual testing checklist kompletny
- Regression testing plan zdefiniowany

### 8.2. Tech-stack.md compliance

Uzyty framework/library: ✅

- React 19.x: wszystkie zmiany kompatybilne
- TypeScript 5.8.x: typy poprawne
- Tailwind CSS 4.x: używane utility classes (flex, flex-col, flex-1, overflow-hidden)
- @tanstack/react-virtual: nie zmieniony - virtualization działa jak wcześniej

Dependencies: ✅

- Zero nowych dependencies
- Istniejące dependencies nie zaktualizowane
- Brak potrzeby npm install

Build tools: ✅

- Astro 5.x: zmiany w React islands nie wpływają na build
- Vite: bundle size nie zmieniony

### 8.3. Security checklist

- [x] Input validation - nie dotyczy (UI changes, brak user input)
- [x] Authorization - nie dotyczy (brak zmian w auth logic)
- [x] Authentication - nie dotyczy (brak zmian w auth flow)
- [x] XSS protection - ✅ używamy React (auto-escaped), brak dangerouslySetInnerHTML
- [x] CSRF protection - nie dotyczy (brak form submissions)
- [x] SQL injection protection - nie dotyczy (brak database queries)
- [x] Secrets management - ✅ brak hardcoded secrets w kodzie
- [x] Rate limiting - nie dotyczy (UI changes, brak API calls)

### 8.4. Performance checklist

- [x] Bundle size impact - ✅ zero impact (brak nowych dependencies, minimalne zmiany w kodzie)
- [x] Rendering optimization - ✅ React.memo na GridCell zachowany, useCallback/useMemo nie dotknięte
- [x] Loading states - ✅ GridSkeleton działa jak wcześniej
- [x] Error boundaries - ✅ ErrorBoundary nie zmieniony
- [x] Code splitting - nie dotyczy (zmiany w istniejących components, już lazy loaded)

### 8.5. Accessibility checklist (dla UI)

- [x] ARIA attributes - ✅ zachowane (role="grid", role="row", role="columnheader")
- [x] Keyboard navigation - ✅ nie zmienione (Arrow keys, Enter, Escape działają jak wcześniej)
- [x] Focus management - ✅ focusedCell state nie dotknięty
- [x] Semantic HTML - ✅ div structure logiczna, roles poprawne
- [x] Color contrast - nie dotyczy (kolory nie zmienione)
- [x] Screen reader testing - ✅ struktura DOM dla screen readera logiczna (header → body)

## 9. Dokumentacja zmian

### 9.1. Changelog entry

```markdown
### Fixed

- Grid UI Layout: Grid wypełnia teraz całą dostępną wysokość ekranu pod headerem zamiast fixed 600px, co poprawia wykorzystanie przestrzeni ekranu na desktopie
- Grid Scroll Synchronization: Header z datami przewija się teraz synchronicznie z gridem w kierunku poziomym, zapewniając stały kontekst czasowy podczas scrollowania
```

### 9.2. Aktualizacja README

Nie wymagana - zmiany są internal UI improvements, nie wpływają na API, sposób użycia, konfigurację ani instalację.

### 9.3. Dokumentacja techniczna

Nie wymagana - scroll synchronization pattern jest standardowym Web API pattern (addEventListener + scrollLeft), nie wymaga dedykowanej dokumentacji. Flexbox layout jest dobrze udokumentowany w Tailwind docs.

### 9.4. Release notes

Informacja dla uzytkownikow koncowych:

UI Improvements - Grid View

- Grid wypełnia teraz całą dostępną przestrzeń ekranu, co szczególnie poprawia doświadczenie na dużych monitorach
- Daty w nagłówku gridu pozostają teraz widoczne podczas przewijania w prawo, co ułatwia nawigację i identyfikację czasową zdarzeń
- Żadnych zmian funkcjonalnych - wszystkie istniejące funkcje (filtry, sortowanie, keyboard navigation) działają jak wcześniej

Żadne akcje po stronie użytkownika nie są wymagane - zmiany są automatyczne.

## 10. Timeline i effort estimation

### 10.1. Estymacja czasu

- Implementacja: 1.5 godziny
  - Scroll sync implementation: 20 min
  - Flex layout changes: 15 min
  - GridView height container: 10 min
  - AppLayout optimization: 5 min
  - Code cleanup i comments: 10 min
  - Initial testing w dev: 20 min
  - Bug fixing (if any): 20 min
- Testowanie: 1.5 godziny
  - E2E tests implementation: 30 min
  - Manual testing responsiveness: 40 min
  - Browser compatibility testing: 20 min
- Code review: 0.5 godziny
  - Review przez lead developer: 20 min
  - Fixes z review: 10 min
- Deployment: 0.5 godziny
  - Merge do main: 5 min
  - CI/CD pipeline: 15 min
  - Smoke test production: 10 min
- Monitoring post-deployment: 2 dni (background)
  - Check logs: 10 min/day
  - User feedback review: 10 min/day

Łącznie: 4 godziny (active work) + 2 dni monitoring (background)

### 10.2. Zaleznosci

Blokujace: brak - można rozpocząć implementację natychmiast

Blokowane: brak - inne features nie czekają na tę naprawę

### 10.3. Sugerowany timeline

- Start: 2026-01-18 09:00
- Code complete: 2026-01-18 10:30 (1.5h implementation)
- Testing complete: 2026-01-18 12:00 (1.5h testing)
- Code review: 2026-01-18 13:00 (0.5h review)
- Deployment to staging: 2026-01-18 14:00 (immediate)
- Deployment to production: 2026-01-18 15:00 (after staging verification)
- Monitoring end: 2026-01-20 17:00 (48h post-deployment)

Total timeline: 2 dni (wdrożenie w day 1, monitoring do końca day 2)

## 11. Załączniki

### 11.1. Dotknięte pliki (lista pelna)

```
src/components/grid/VirtualizedGrid.tsx (główne zmiany - scroll sync + flex layout)
src/components/grid/GridView.tsx (height container wrapper)
src/components/layout/AppLayout.tsx (flex layout optimization)
e2e/grid.spec.ts (nowe testy E2E)
```

Total: 4 pliki (3 modyfikacje + 1 aktualizacja testów)

### 11.2. Referencje

Dokumentacja zewnętrzna:

- MDN addEventListener: https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener
- MDN scrollLeft: https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollLeft
- MDN Flexbox: https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Flexible_Box_Layout
- Tailwind Flexbox: https://tailwindcss.com/docs/flex
- React useEffect: https://react.dev/reference/react/useEffect
- React useRef: https://react.dev/reference/react/useRef

Istniejące plany implementacji:

- docs/ITERATION_2_STEP_3_COMPLETE.md - Grid Virtualization implementation
- docs/UI_IMPLEMENTATION_STATUS.md - Overall UI status

### 11.3. Screenshoty/diagramy

Przed naprawą:

- Grid ma fixed height 600px, pusta przestrzeń poniżej
- Podczas scroll w prawo daty znikają, user nie widzi kontekstu czasowego

Po naprawie:

- Grid wypełnia ~95% viewportu na desktop
- Daty scrollują się synchronicznie, zawsze widoczne

(Screenshoty do dodania podczas testowania w Fazie 1)

### 11.4. Error logs/stack traces

Brak - nie ma error logs związanych z tym problemem. Problem dotyczy UX/layout, nie runtime errors.
