# Plan Naprawy Bledu - mobile-filter-popup-scroll

Data utworzenia: 2026-02-06
Tytul bledu: Popup z filtrami niemozliwy do scrollowania na mobile + brak przycisku zatwierdzajacego w widocznym obszarze
Severity: MEDIUM
Typ bledu: UI / Mobile UX

## 1. Podsumowanie wykonawcze

### 1.1. Opis bledu

W wersji mobilnej popup z filtrami tickerow (AdvancedTickerFilter) jest niemozliwy do scrollowania, przez co uzytkownik nie moze dotrzec do wszystkich opcji filtrowania ani do przycisku "Zastosuj" znajdujacego sie na dole dialogu. Problem wystepuje szczegolnie gdy lista tickerow jest dluga (460+ pozycji) oraz gdy wyswietlane sa dodatkowe sekcje (zaznaczone tickery + wszystkie tickery).

### 1.2. Root cause

Komponent Dialog z Radix UI w polaczeniu z max-w-2xl i standardowym paddinghiem tworzy kontener, ktory na urzadzeniach mobilnych:

- Ma ograniczona wysokosc bez wlasciwego overflow management
- Nie pozwala na scroll wewnetrznej zawartosci
- DialogFooter z przyciskami znajduje sie poza widocznym obszarem
- Brak jest sticky/fixed positioning dla przyciskow akcji

Problem techniczny: DialogContent ma fixed positioning z transform, ale jego wewnetrzna struktura nie implementuje prawidlowej hierarchii scroll-owanyh kontenerow.

### 1.3. Zakres wplywu

- Dotknięte komponenty/moduly:
  - src/components/grid/AdvancedTickerFilter.tsx
  - src/components/ui/dialog.tsx
  - src/components/grid/TickerList.tsx (potencjalnie)
- Dotknięci uzytkownicy: wszyscy uzytkownicy mobilni (viewport < 640px) probujacy filtrowac tickery
- Dotknięte srodowiska: production, staging, development

### 1.4. Priorytet naprawy

NORMAL - Blad nie blokuje krytycznych funkcji, ale znaczaco pogarsza UX na mobile. Uzytkownicy moga obejsc problem uzywajac wersji desktop lub nie filtrujac tickerow, ale jest to istotne ograniczenie funkcjonalnosci mobilnej.

## 2. Szczegolowa analiza bledu

### 2.1. Kroki reprodukcji

1. Otwórz aplikacje na urzadzeniu mobilnym lub w trybie responsive (szerokość < 640px)
2. Przejdz do widoku Grid
3. Kliknij przycisk "Tickery" (Filter by ticker)
4. Popup z filtrami sie otwiera
5. Sprobuj przescrollowac liste tickerow w dol
6. BLAD: Nie mozna scrollowac zawartosci
7. BLAD: Przycisk "Zastosuj" nie jest widoczny (znajduje sie poza viewport)
8. BLAD: Jesli sa zaznaczone tickery, sekcja "Zaznaczone" zajmuje dodatkowe miejsce, co jeszcze bardziej ogranicza dostep do reszty

### 2.2. Oczekiwane zachowanie

Na urzadzeniach mobilnych popup z filtrami powinien:

- Zajmowac cala dostepna wysokosc i szerokosc ekranu (fullscreen modal)
- Pozwalac na scrollowanie calej zawartosci
- Miec przycisk "Zastosuj" (i "Anuluj") widoczny jako sticky/fixed footer u dolu ekranu
- Zapewnic dostatecznie duze touch targets (min 44x44px)
- Zachowywac czytelnosc i dostepnosc wszystkich elementow

### 2.3. Rzeczywiste zachowanie

Popup:

- Ma ograniczona wysokosc i szerokosc (max-w-2xl z paddingami)
- Nie pozwala na scroll wewnetrznej zawartosci
- DialogFooter z przyciskami znajduje sie poza widocznym obszarem viewport
- Brak mozliwosci dotarcia do wiekszosci tickerow i przycisku akcji

### 2.4. Root cause analysis

Lokalizacja bledu:

- Plik: src/components/grid/AdvancedTickerFilter.tsx, linie 129-284
- Plik: src/components/ui/dialog.tsx, linie 43-71 (DialogContent)

Przyczyna techniczna:

1. DialogContent ma fixed positioning z transform: translate(-50%, -50%) co centruje go na ekranie
2. max-w-2xl ogranicza szerokosc na desktop, ale na mobile (max-w-[calc(100%-2rem)]) pozostawia marginesy
3. Wewnetrzna struktura nie ma dedykowanego scroll container
4. DialogFooter jest czescia flow dokumentu wewnatrz DialogContent, bez sticky positioning
5. Brak responsywnych wariantow dla mobile - ten sam layout jest uzywany na wszystkich urzadzeniach
6. TickerList ma height={150} dla zaznaczonych i height={250/400} dla wszystkich, co na male viewport (np. 667px wysokosci iPhone) wraz z header, search, actions, description zajmuje wiecej miejsca niz dostepne

Brakujące warunki/sprawdzenia:

- Brak warunkowego renderowania fullscreen modal na mobile
- Brak sticky footer dla przyciskow akcji na mobile
- Brak ograniczenia wysokosci DialogContent z prawidlowym overflow management

### 2.5. Analiza zasiegu

#### Komponenty frontend:

- src/components/grid/AdvancedTickerFilter.tsx - glowny komponent wymagajacy modyfikacji dla mobile layout
- src/components/ui/dialog.tsx - potencjalnie dodanie wariantu fullscreen dla mobile (opcjonalnie)
- src/components/grid/TickerList.tsx - ewentualne dostosowanie wysokosci na mobile (opcjonalnie)

#### Serwisy/hooki:

- src/hooks/useMediaQuery.ts - potencjalnie nowy hook do detekcji mobile viewport (jesli nie istnieje)

#### Typy/interfejsy:

- Brak koniecznosci aktualizacji typow

#### Backend/API (jesli dotyczy):

- Nie dotyczy

#### Baza danych (jesli dotyczy):

- Nie dotyczy

#### Testy:

- e2e/grid.spec.ts - dodanie testow dla mobile viewport (filter popup scrolling, apply button visibility)
- Nowe testy dla mobile UX

## 3. Propozycje rozwiazan

### 3.1. Rozwiazanie A (REKOMENDOWANE): Fullscreen Modal na Mobile z Sticky Footer

#### Opis:

Zaimplementowac dedykowany fullscreen layout dla popup filtrów na urzadzeniach mobilnych (viewport < 640px). Modal zajmie cala wysokosc i szerokosc ekranu, naglowek pozostanie sticky u gory, przyciski akcji (Anuluj/Zastosuj) beda jako sticky footer u dolu, a cala srodkowa sekcja bedzie scrollowalna.

Implementacja:

1. W AdvancedTickerFilter.tsx dodac conditional rendering dla DialogContent z klasami Tailwind odpowiedzialnymi za fullscreen na mobile
2. Zmienic layout tak aby:
   - DialogHeader byl sticky top
   - Content area (search, actions, ticker lists) byl scrollowalny z flex-1 overflow-auto
   - DialogFooter byl sticky bottom z floating efektem (shadow/border)
3. Uzyc responsywnych klas Tailwind: sm:max-w-2xl (desktop) vs w-full h-full (mobile)
4. Dostosowac wysokosci TickerList na mobile (zmniejszyc fixed heights)
5. Dodac backdrop blur dla lepszego UX

#### Zakres zmian:

Frontend:

- src/components/grid/AdvancedTickerFilter.tsx:
  - Linia 129: zmiana className w DialogContent na responsive variant
  - Linie 130-284: restrukturyzacja layoutu z flex-col, sticky header/footer, scrollable content
  - Dodanie klas: "sm:max-w-2xl sm:h-auto h-full w-full sm:w-auto", "flex flex-col", "overflow-hidden"
  - DialogHeader: sticky positioning z background
  - Content area: flex-1 overflow-auto
  - DialogFooter: sticky bottom z shadow/border

Testy:

- e2e/grid.spec.ts: dodanie testow mobilnych
  - Test: otwarcie filtrów na mobile viewport
  - Test: scrollowanie listy tickerow
  - Test: widocznosc i klikniecie przycisku Zastosuj
  - Test: sticky footer podczas scroll

#### Zalety:

- Dedykowane, zoptymalizowane UX dla mobile
- Maksymalne wykorzystanie dostepnej przestrzeni ekranu
- Przycisk akcji zawsze widoczny (sticky footer)
- Zgodne z mobile-first best practices
- Minimalne zmiany w kodzie (glownie CSS/Tailwind)
- Brak breaking changes dla desktop
- Zgodne z WCAG touch target requirements (44x44px)

#### Wady:

- Nieco inny visual experience miedzy mobile a desktop (ale to feature, nie bug)
- Wymaga testowania na roznych rozmiarach mobile (iPhone SE, standard, Plus, Android)

#### Effort: S (3-4 godziny)

- 1h: implementacja responsywnego layoutu w AdvancedTickerFilter.tsx
- 1h: testowanie manualne na roznych viewport sizes
- 1h: dodanie/aktualizacja testow e2e
- 0.5h: code review, fixes
- 0.5h: dokumentacja (jesli wymagana)

#### Ryzyko regresji: LOW

Zmiany dotycza glownie layoutu i responsywnych klas CSS/Tailwind. Logika biznesowa (filtering, selection) pozostaje niezmieniona. Desktop experience nie zmienia sie. Testy e2e zapewnia brak regresji.

#### Zgodnosc ze standardami:

- Copilot-instructions.md: ✅
  - MOBILE_ACCESSIBILITY: Touch targets 44x44px - przyciski zostana zachowane w odpowiednim rozmiarze
  - WCAG_PERCEIVABLE: Responsive design bez horizontal scroll - fullscreen eliminuje problem
  - TAILWIND: Uzycie responsywnych wariantow sm: dla adaptive design
- Tech-stack.md: ✅
  - Radix UI Dialog (istniejacy)
  - Tailwind CSS (istniejacy)
  - React hooks (istniejace)
- Best practices: ✅
  - Mobile-first approach
  - Progressive enhancement
  - Accessibility (keyboard nav, screen readers)

### 3.2. Rozwiazanie B: Dodanie Overflow Scroll do Istniejacego Dialogu

#### Opis:

Zamiast zmiany layoutu na fullscreen, dodac prawidlowe overflow management do istniejacego dialogu. DialogContent otrzyma max-height: 90vh, a wewnetrzny content area bedzie mial overflow-y: auto. DialogFooter pozostanie w flow, ale bedzie widoczny po scrollu.

#### Zakres zmian:

Frontend:

- src/components/grid/AdvancedTickerFilter.tsx:
  - Dodanie wrapper div wewnatrz DialogContent z overflow-y-auto i max-h-[70vh]
  - Zmniejszenie fixed heights w TickerList na mobile
  - DialogContent: dodanie "max-h-[90vh]"

#### Zalety:

- Prostsza implementacja (mniej zmian w strukturze)
- Zachowanie spojnosci UI miedzy mobile a desktop
- Szybsze do zaimplementowania

#### Wady:

- Przycisk Zastosuj nadal poza viewport do czasu scrollu (gorsze UX)
- Nie maksymalizuje wykorzystania przestrzeni ekranu mobile
- Nie jest zgodne z mobile best practices (fullscreen modals dla complex forms)
- Mniej intuicyjne dla uzytkownika (trzeba wiedziec ze scroll jest mozliwy)

#### Effort: XS (1-2 godziny)

- 0.5h: dodanie overflow classes
- 0.5h: testowanie manualne
- 0.5h: testy e2e
- 0.5h: review

#### Ryzyko regresji: LOW

Minimalne zmiany w strukturze.

#### Zgodnosc ze standardami:

- Copilot-instructions.md: ⚠️
  - MOBILE_ACCESSIBILITY: Czesc zalecanej - ale nie optymalna
  - Brak fullscreen modal dla complex interactions
- Best practices: ⚠️
  - Nie mobile-first approach
  - Suboptimal UX

### 3.3. Rozwiazanie C: Bottom Sheet na Mobile

#### Opis:

Zaimplementowac Bottom Sheet pattern (modal wysuwajacy sie od dolu ekranu) specjalnie dla mobile. Bottom Sheet zajmie 90% wysokosci ekranu, bedzie mogl byc przeciagany, a przyciski akcji beda sticky u dolu.

#### Zakres zmian:

Frontend:

- Nowy komponent: src/components/ui/bottom-sheet.tsx
- src/components/grid/AdvancedTickerFilter.tsx:
  - Conditional rendering: Dialog dla desktop, BottomSheet dla mobile
  - Duplikacja logiki w obu komponentach

#### Zalety:

- Bardzo mobile-native experience
- Mozliwosc drag-to-close
- Zgodne z mobile design patterns (iOS/Android)

#### Wady:

- Wysoki effort (nowy komponent)
- Dodatkowa zaleznosc (np. react-spring, framer-motion dla animacji)
- Duplikacja kodu/logiki miedzy Dialog a BottomSheet
- Ryzyko inconsistency
- Wiekszy bundle size

#### Effort: L (2-3 dni)

- 1 dzien: implementacja BottomSheet komponentu
- 0.5 dnia: integracja z AdvancedTickerFilter
- 0.5 dnia: testowanie
- 0.5 dnia: testy e2e
- 0.5 dnia: fixes

#### Ryzyko regresji: MEDIUM

Wprowadzenie nowego komponentu i conditional rendering moze wprowadzic bugi. Duplikacja logiki zwieksza ryzyko inconsistency.

#### Zgodnosc ze standardami:

- Copilot-instructions.md: ✅
  - MOBILE_ACCESSIBILITY: Bardzo dobre
  - Native mobile patterns
- Best practices: ⚠️
  - Dodatkowe dependencies
  - Duplikacja kodu

## 4. Rekomendacja i uzasadnienie

### 4.1. Wybrane rozwiazanie

ROZWIAZANIE A: Fullscreen Modal na Mobile z Sticky Footer

### 4.2. Uzasadnienie wyboru

Rozwiazanie A jest optymalne z nastepujacych powodów:

Minimalizuje ryzyko regresji poprzez:

- Zmienia glownie layout i CSS classes, nie logike biznesowa
- Uzywa istniejacych komponentow (Dialog, DialogContent) bez wprowadzania nowych zaleznosci
- Desktop experience pozostaje bez zmian
- Conditional rendering oparte na responsywnych klasach Tailwind (sm:) jest natywne i dobrze przetestowane

Jest zgodne ze standardami projektu:

- Uzywa Tailwind responsive variants zgodnie z TAILWIND guidelines
- Spełnia MOBILE_ACCESSIBILITY requirements (touch targets, fullscreen dla complex forms)
- Implementuje WCAG_PERCEIVABLE (responsive design, no horizontal scroll, max screen usage)
- Zgodne z React best practices (brak duplikacji kodu, single responsibility)

Optymalizuje effort vs. wartosc:

- Niski effort (3-4h) przy wysokiej wartosci UX improvement
- Nie wymaga nowych dependencies
- Latwa do utrzymania (standardowe Tailwind classes)
- Szybka do zaimplementowania i przetestowania

Zapewnia skalowalnosc:

- Pattern moze byc uzyty dla innych modali/popupow w przyszlosci
- Nie wprowadza technical debt
- Zgodne z mobile-first evolution aplikacji

Ulatwia przyszle utrzymanie:

- Brak duplikacji kodu (vs. Bottom Sheet solution)
- Wykorzystuje istniejace komponenty
- Jasna struktura z sticky header/footer pattern
- Latwe do debugowania

Najlepsze UX:

- Maksymalne wykorzystanie ekranu mobile
- Przycisk akcji zawsze widoczny (sticky footer)
- Naturalne scrollowanie
- Zgodne z oczekiwaniami uzytkownikow mobile (fullscreen modals dla complex interactions)

## 5. Szczegolowy plan implementacji

### 5.1. Faza 1: Przygotowanie

- [x] Utworzenie brancha: `fix/mobile-filter-popup-scroll`
- [x] Analiza istniejacego kodu (AdvancedTickerFilter.tsx, dialog.tsx)
- [ ] Przygotowanie srodowiska testowego z mobile viewports
- [ ] Przygotowanie listy device sizes do testowania (iPhone SE 375px, iPhone 12 390px, iPhone 12 Pro Max 428px, Android standard 360px, 412px)

### 5.2. Faza 2: Zmiany w kodzie

#### Krok 1: Aktualizacja DialogContent - responsywny layout

Plik: `src/components/grid/AdvancedTickerFilter.tsx`

Opis zmian:
Zmienic className DialogContent aby na mobile (<640px) byl fullscreen, a na desktop zachowywal standardowy rozmiar. Dodac strukturę flex-col z overflow management.

Kod przed zmiana:

```typescript
<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent className="max-w-2xl" showCloseButton={true}>
    <DialogHeader>
      <DialogTitle>Wybierz tickery</DialogTitle>
      <DialogDescription>
        Wyszukaj i wybierz spółki GPW, które chcesz analizować. Możesz również wybrać cały indeks.
      </DialogDescription>
    </DialogHeader>

    {/* Search and Actions */}
    <div className="space-y-4">
      {/* ... search, actions, content ... */}
    </div>

    {/* Content */}
    <div className="space-y-4">
      {/* ... ticker lists ... */}
    </div>

    <DialogFooter>
      <Button variant="outline" onClick={handleCancel}>
        Anuluj
      </Button>
      <Button onClick={handleApply} disabled={isLoading || localSelected.size === 0}>
        Zastosuj ({localSelected.size})
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

Kod po zmianie:

```typescript
<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent
    className="h-full w-full overflow-hidden p-0 sm:h-auto sm:max-w-2xl sm:p-6"
    showCloseButton={true}
  >
    {/* Mobile: Fullscreen with flex layout */}
    <div className="flex h-full flex-col">
      {/* Sticky Header */}
      <DialogHeader className="shrink-0 border-b bg-background p-4 sm:border-0 sm:p-0 sm:pb-4">
        <DialogTitle>Wybierz tickery</DialogTitle>
        <DialogDescription>
          Wyszukaj i wybierz spółki GPW, które chcesz analizować. Możesz również wybrać cały indeks.
        </DialogDescription>
      </DialogHeader>

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-0">
        {/* Search and Actions */}
        <div className="space-y-4">
          {/* ... existing search, actions, content ... */}
        </div>

        {/* Content */}
        <div className="space-y-4">
          {/* ... existing ticker lists ... */}
        </div>
      </div>

      {/* Sticky Footer */}
      <DialogFooter className="shrink-0 border-t bg-background p-4 shadow-lg sm:border-0 sm:p-0 sm:pt-4 sm:shadow-none">
        <Button variant="outline" onClick={handleCancel} className="min-h-[44px] flex-1 sm:flex-none">
          Anuluj
        </Button>
        <Button
          onClick={handleApply}
          disabled={isLoading || localSelected.size === 0}
          className="min-h-[44px] flex-1 sm:flex-none"
          title={localSelected.size === 0 ? "Musisz zaznaczyć przynajmniej jeden ticker" : undefined}
        >
          Zastosuj ({localSelected.size})
        </Button>
      </DialogFooter>
    </div>
  </DialogContent>
</Dialog>
```

Uzasadnienie:

- `h-full w-full` na mobile (fullscreen), `sm:h-auto sm:max-w-2xl` na desktop (standard)
- `overflow-hidden` na DialogContent zapobiega double scrollbar
- `p-0 sm:p-6` - brak paddingu na mobile (przestrzen dla sticky elementow), standardowy padding na desktop
- Flex layout: `flex h-full flex-col` - header/content/footer stack
- Header: `shrink-0 border-b` - sticky z wizualnym separatorem na mobile
- Content: `flex-1 overflow-y-auto` - zajmuje cala dostepna przestrzen, scrollowalny
- Footer: `shrink-0 border-t shadow-lg` - sticky z elevacja na mobile
- Przyciski: `min-h-[44px] flex-1 sm:flex-none` - touch target 44px, full width na mobile, standard na desktop

#### Krok 2: Dostosowanie wysokosci TickerList na mobile

Plik: `src/components/grid/AdvancedTickerFilter.tsx`

Opis zmian:
Zmniejszyc fixed heights w TickerList aby lepiej wykorzystac dostepna przestrzen na mobile i nie forsowac zbyt duzych kontenerow.

Kod przed zmiana:

```typescript
{/* Selected Tickers (if any) */}
{!isLoading && !error && selectedSymbols.length > 0 && (
  <div>
    <h4 className="mb-2 text-sm font-medium">Zaznaczone ({selectedSymbols.length})</h4>
    <TickerList
      symbols={selectedSymbols}
      selected={localSelected}
      onToggle={handleToggle}
      height={150}
      className="mb-4"
    />
  </div>
)}

{/* All Available Tickers */}
{!isLoading && !error && (
  <div>
    <h4 className="mb-2 text-sm font-medium">
      {searchQuery
        ? `Wyniki wyszukiwania (${filteredSymbols.length})`
        : `Wszystkie tickery (${symbols.length})`}
    </h4>
    <TickerList
      symbols={filteredSymbols}
      selected={localSelected}
      onToggle={handleToggle}
      height={selectedSymbols.length > 0 ? 250 : 400}
    />
  </div>
)}
```

Kod po zmianie:

```typescript
{/* Selected Tickers (if any) */}
{!isLoading && !error && selectedSymbols.length > 0 && (
  <div>
    <h4 className="mb-2 text-sm font-medium">Zaznaczone ({selectedSymbols.length})</h4>
    <TickerList
      symbols={selectedSymbols}
      selected={localSelected}
      onToggle={handleToggle}
      height={120}
      className="mb-4"
    />
  </div>
)}

{/* All Available Tickers */}
{!isLoading && !error && (
  <div>
    <h4 className="mb-2 text-sm font-medium">
      {searchQuery
        ? `Wyniki wyszukiwania (${filteredSymbols.length})`
        : `Wszystkie tickery (${symbols.length})`}
    </h4>
    <TickerList
      symbols={filteredSymbols}
      selected={localSelected}
      onToggle={handleToggle}
      height={selectedSymbols.length > 0 ? 200 : 300}
    />
  </div>
)}
```

Uzasadnienie:

- Zmniejszenie height dla "Zaznaczone" z 150 na 120px - wystarczajace dla 2-3 tickerow
- Zmniejszenie height dla "Wszystkie" z 250/400 na 200/300px - lepsze wykorzystanie przestrzeni przy zachowaniu virtualizer performance
- Na mobile z fullscreen modal i flex-1 overflow content area, fixed heights sa mniej krytyczne ale wciaz pomagaja w performance (virtualizer estimateSize)

#### Krok 3: Opcjonalnie - dostosowanie touch targets w TickerList

Plik: `src/components/grid/TickerList.tsx`

Opis zmian:
Upewnic sie ze touch targets w TickerRow sa minimum 44x44px zgodnie z MOBILE_ACCESSIBILITY guidelines.

Kod przed zmiana:

```typescript
<label
  className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 transition-colors hover:bg-accent"
  htmlFor={`ticker-${symbol.symbol}`}
>
  {/* Checkbox */}
  <input
    type="checkbox"
    id={`ticker-${symbol.symbol}`}
    checked={isSelected}
    onChange={handleChange}
    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-2 focus:ring-ring focus:ring-offset-2"
    aria-label={`Wybierz ${symbol.name}`}
  />
  {/* ... rest ... */}
</label>
```

Kod po zmianie:

```typescript
<label
  className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 transition-colors hover:bg-accent min-h-[44px]"
  htmlFor={`ticker-${symbol.symbol}`}
>
  {/* Checkbox */}
  <input
    type="checkbox"
    id={`ticker-${symbol.symbol}`}
    checked={isSelected}
    onChange={handleChange}
    className="h-5 w-5 shrink-0 rounded border-gray-300 text-primary focus:ring-2 focus:ring-ring focus:ring-offset-2"
    aria-label={`Wybierz ${symbol.name}`}
  />
  {/* ... rest ... */}
</label>
```

Uzasadnienie:

- `min-h-[44px]` - zapewnia minimum touch target height zgodnie z WCAG
- `py-2.5` - zwiekszenie vertical paddingu dla lepszego touch area
- checkbox: `h-5 w-5` (z h-4 w-4) - wiekszy, latwiejszy do klikniecia na mobile
- checkbox: `shrink-0` - zapobiega shrinkaniu w flex container

#### Krok 4: Aktualizacja virtualizer estimateSize w TickerList

Plik: `src/components/grid/TickerList.tsx`

Opis zmian:
Dostosowac estimateSize w virtualizer aby odzwierciedlal zwiekszona wysokosc row (min-h-[44px]).

Kod przed zmiana:

```typescript
const virtualizer = useVirtualizer({
  count: symbols.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 56, // ~56px per row (py-2 + content)
  overscan: 5,
});
```

Kod po zmianie:

```typescript
const virtualizer = useVirtualizer({
  count: symbols.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 60, // ~60px per row (min-h-[44px] + py-2.5 + content)
  overscan: 5,
});
```

Uzasadnienie:

- Dostosowanie estimateSize z 56 na 60px aby odzwierciedlalo min-h-[44px] + py-2.5
- Zapewnia prawidlowe scrollowanie i positioning w virtualizer

### 5.3. Faza 3: Aktualizacja typow i interfejsow

Nie wymagana - brak zmian w interface/types.

### 5.4. Faza 4: Migracje bazy danych

Nie dotyczy - brak zmian w bazie danych.

### 5.5. Faza 5: Aktualizacja/dodanie testow

#### Test E2E 1: Mobile filter popup fullscreen

Plik: `e2e/grid.spec.ts`

```typescript
test.describe("Grid View - Mobile Filter Popup", () => {
  test.use({ viewport: { width: 390, height: 844 } }); // iPhone 12 Pro

  test("TC-GRID-MOBILE-001: Filter popup opens fullscreen on mobile", async ({ page }) => {
    await page.goto("/grid");
    await page.waitForLoadState("networkidle");

    // Open filter popup
    await page.getByRole("button", { name: /Filter by ticker|Tickery/i }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // Check fullscreen dimensions (approximately)
    const dialogBox = await dialog.boundingBox();
    expect(dialogBox).toBeTruthy();
    expect(dialogBox!.width).toBeGreaterThan(370); // Close to viewport width
    expect(dialogBox!.height).toBeGreaterThan(800); // Close to viewport height
  });

  test("TC-GRID-MOBILE-002: Filter popup content is scrollable on mobile", async ({ page }) => {
    await page.goto("/grid");
    await page.waitForLoadState("networkidle");

    await page.getByRole("button", { name: /Filter by ticker|Tickery/i }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await page.waitForTimeout(300);

    // Find scrollable content area
    const contentArea = dialog.locator('[class*="overflow-y-auto"]').first();
    await expect(contentArea).toBeVisible();

    // Get initial scroll position
    const initialScrollTop = await contentArea.evaluate((el) => el.scrollTop);
    expect(initialScrollTop).toBe(0);

    // Scroll down
    await contentArea.evaluate((el) => el.scrollBy(0, 200));
    await page.waitForTimeout(100);

    // Check scroll happened
    const newScrollTop = await contentArea.evaluate((el) => el.scrollTop);
    expect(newScrollTop).toBeGreaterThan(initialScrollTop);
  });

  test("TC-GRID-MOBILE-003: Apply button is visible and clickable on mobile", async ({ page }) => {
    await page.goto("/grid");
    await page.waitForLoadState("networkidle");

    await page.getByRole("button", { name: /Filter by ticker|Tickery/i }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await page.waitForTimeout(300);

    // Wait for symbols to load
    const searchInput = dialog.getByPlaceholder(/Szukaj po symbolu/i);
    await expect(searchInput).toBeEnabled({ timeout: 10000 });

    // Apply button should be visible at bottom (sticky footer)
    const applyButton = dialog.getByRole("button", { name: /Zastosuj \(\d+\)/i });
    await expect(applyButton).toBeVisible();

    // Check button is within viewport (sticky)
    const buttonBox = await applyButton.boundingBox();
    expect(buttonBox).toBeTruthy();
    expect(buttonBox!.y + buttonBox!.height).toBeLessThanOrEqual(844); // Within viewport height

    // Button should be clickable
    await expect(applyButton).toBeEnabled();
    await applyButton.click();

    // Dialog should close
    await expect(dialog).not.toBeVisible();
  });

  test("TC-GRID-MOBILE-004: Sticky footer remains visible during scroll", async ({ page }) => {
    await page.goto("/grid");
    await page.waitForLoadState("networkidle");

    await page.getByRole("button", { name: /Filter by ticker|Tickery/i }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await page.waitForTimeout(300);

    const searchInput = dialog.getByPlaceholder(/Szukaj po symbolu/i);
    await expect(searchInput).toBeEnabled({ timeout: 10000 });

    const applyButton = dialog.getByRole("button", { name: /Zastosuj \(\d+\)/i });
    const cancelButton = dialog.getByRole("button", { name: /Anuluj/i });

    // Check initial visibility
    await expect(applyButton).toBeVisible();
    await expect(cancelButton).toBeVisible();

    // Scroll content area
    const contentArea = dialog.locator('[class*="overflow-y-auto"]').first();
    await contentArea.evaluate((el) => el.scrollBy(0, 500));
    await page.waitForTimeout(200);

    // Buttons should still be visible (sticky footer)
    await expect(applyButton).toBeVisible();
    await expect(cancelButton).toBeVisible();
  });

  test("TC-GRID-MOBILE-005: Touch targets are minimum 44x44px", async ({ page }) => {
    await page.goto("/grid");
    await page.waitForLoadState("networkidle");

    await page.getByRole("button", { name: /Filter by ticker|Tickery/i }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await page.waitForTimeout(300);

    const searchInput = dialog.getByPlaceholder(/Szukaj po symbolu/i);
    await expect(searchInput).toBeEnabled({ timeout: 10000 });

    // Check apply button touch target
    const applyButton = dialog.getByRole("button", { name: /Zastosuj \(\d+\)/i });
    const applyBox = await applyButton.boundingBox();
    expect(applyBox).toBeTruthy();
    expect(applyBox!.height).toBeGreaterThanOrEqual(44);

    // Check cancel button touch target
    const cancelButton = dialog.getByRole("button", { name: /Anuluj/i });
    const cancelBox = await cancelButton.boundingBox();
    expect(cancelBox).toBeTruthy();
    expect(cancelBox!.height).toBeGreaterThanOrEqual(44);

    // Check first ticker checkbox touch target (label)
    const firstTickerLabel = dialog.locator('label[for^="ticker-"]').first();
    await expect(firstTickerLabel).toBeVisible();
    const labelBox = await firstTickerLabel.boundingBox();
    expect(labelBox).toBeTruthy();
    expect(labelBox!.height).toBeGreaterThanOrEqual(44);
  });
});
```

Cel testu:
Weryfikacja ze na mobile filter popup:

- Otwiera sie w trybie fullscreen
- Zawartosc jest scrollowalna
- Przycisk Zastosuj jest widoczny i klikalny bez scrollowania
- Sticky footer pozostaje widoczny podczas scrollu
- Touch targets spelniaja WCAG requirements (44x44px)

#### Test E2E 2: Desktop filter popup unchanged

```typescript
test.describe("Grid View - Desktop Filter Popup", () => {
  test.use({ viewport: { width: 1280, height: 720 } }); // Desktop

  test("TC-GRID-DESKTOP-001: Filter popup opens centered on desktop", async ({ page }) => {
    await page.goto("/grid");
    await page.waitForLoadState("networkidle");

    await page.getByRole("button", { name: /Filter by ticker|Tickery/i }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // Check NOT fullscreen (max-w-2xl)
    const dialogBox = await dialog.boundingBox();
    expect(dialogBox).toBeTruthy();
    expect(dialogBox!.width).toBeLessThan(700); // max-w-2xl with padding
    expect(dialogBox!.height).toBeLessThan(700); // Not fullscreen
  });

  test("TC-GRID-DESKTOP-002: Filter popup layout unchanged on desktop", async ({ page }) => {
    await page.goto("/grid");
    await page.waitForLoadState("networkidle");

    await page.getByRole("button", { name: /Filter by ticker|Tickery/i }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await page.waitForTimeout(300);

    const searchInput = dialog.getByPlaceholder(/Szukaj po symbolu/i);
    await expect(searchInput).toBeEnabled({ timeout: 10000 });

    // Apply button should be visible (no sticky footer needed on desktop)
    const applyButton = dialog.getByRole("button", { name: /Zastosuj \(\d+\)/i });
    await expect(applyButton).toBeVisible();

    // Can apply filter
    await applyButton.click();
    await expect(dialog).not.toBeVisible();
  });
});
```

Cel testu:
Weryfikacja ze desktop experience pozostal niezmieniony (no regression).

## 6. Plan weryfikacji i testowania

### 6.1. Unit tests

- Nie wymagane - zmiany dotycza glownie layoutu/CSS, nie logiki biznesowej

### 6.2. Integration tests

- Nie wymagane - brak zmian w integracji z API/services

### 6.3. E2E tests

- [x] TC-GRID-MOBILE-001: Filter popup opens fullscreen on mobile
- [x] TC-GRID-MOBILE-002: Filter popup content is scrollable on mobile
- [x] TC-GRID-MOBILE-003: Apply button is visible and clickable on mobile
- [x] TC-GRID-MOBILE-004: Sticky footer remains visible during scroll
- [x] TC-GRID-MOBILE-005: Touch targets are minimum 44x44px
- [x] TC-GRID-DESKTOP-001: Filter popup opens centered on desktop
- [x] TC-GRID-DESKTOP-002: Filter popup layout unchanged on desktop

### 6.4. Manual testing checklist

- [ ] Reprodukcja oryginalnego bledu - sprawdzenie czy naprawiony
  - [ ] iPhone SE (375x667)
  - [ ] iPhone 12 (390x844)
  - [ ] iPhone 12 Pro Max (428x926)
  - [ ] Android standard (360x740)
  - [ ] Android large (412x915)

- [ ] Testowanie edge cases:
  - [ ] Popup z 0 zaznaczonymi tickerami (przycisk Zastosuj disabled)
  - [ ] Popup z 1 zaznaczonym tickerem
  - [ ] Popup z 50+ zaznaczonymi tickerami (sekcja "Zaznaczone" zajmuje sporo miejsca)
  - [ ] Popup z wyszukiwaniem (search results)
  - [ ] Popup z wyborem indeksu (WIG20 - 20 tickerow naraz)
  - [ ] Popup z "Zaznacz wszystkie" (460+ tickerow)
  - [ ] Loading state (symbols loading)
  - [ ] Error state (symbols loading failed)

- [ ] Testowanie w roznych przeglądarkach:
  - [ ] Chrome mobile (Android)
  - [ ] Safari mobile (iOS)
  - [ ] Firefox mobile (Android)
  - [ ] Chrome desktop
  - [ ] Safari desktop
  - [ ] Firefox desktop

- [ ] Testowanie na roznych rozmiarach ekranu:
  - [ ] Smartphone portrait (375-428px)
  - [ ] Smartphone landscape (667-926px width)
  - [ ] Tablet portrait (768px)
  - [ ] Tablet landscape (1024px)
  - [ ] Desktop (1280px+)

- [ ] Testowanie z rozna rola uzytkownika:
  - [ ] Trial user
  - [ ] Premium user
  - [ ] Guest (jesli dotyczy)

- [ ] Testowanie dostepnosci:
  - [ ] Keyboard navigation (Tab, Enter, Esc)
  - [ ] Screen reader (VoiceOver na iOS, TalkBack na Android)
  - [ ] Focus management (focus trap w dialogu)
  - [ ] ARIA labels prawidlowe
  - [ ] Close button dziala (X w rogu)
  - [ ] Esc zamyka dialog

- [ ] Testowanie performance:
  - [ ] Loading time popup < 300ms
  - [ ] Scroll smooth 60 FPS
  - [ ] No layout shifts
  - [ ] Bundle size impact < 1KB

### 6.5. Regression testing

- [ ] Desktop filter popup dziala identycznie jak przed zmiana
- [ ] Filtrowanie tickerow dziala prawidlowo (logic unchanged)
- [ ] URL params (symbols=) aktualizowane prawidlowo
- [ ] localStorage (filter preferences) zapisywane prawidlowo
- [ ] Grid re-fetch z nowymi symbols dziala
- [ ] Badge z liczba zaznaczonych tickerow aktualizowany
- [ ] Search w popup dziala (filtering symbols)
- [ ] Select all / Deselect all dziala
- [ ] Index selection dziala
- [ ] "Zaznacz ostatnie" dziala
- [ ] Event counts wyswietlane prawidlowo (jesli range dostarczony)
- [ ] Virtualized list scrolling smooth (performance)

## 7. Analiza ryzyka i mitigation

### 7.1. Zidentyfikowane ryzyka

#### Ryzyko 1: Layout breaks na niestandardowych viewport sizes

- Severity: MEDIUM
- Prawdopodobienstwo: LOW
- Wpływ: Na bardzo malych (<360px) lub bardzo duzych mobile (>450px) layout moze nie byc optymalny
- Mitigation:
  - Testowanie na szerokiej gamie device sizes (iPhone SE do Pro Max, Android small do large)
  - Uzycie relative units i flexbox zamiast fixed dimensions
  - Fallback na overflow scroll jesli cos nie dziala

#### Ryzyko 2: Regresja na desktop

- Severity: HIGH
- Prawdopodobienstwo: LOW
- Wpływ: Desktop experience moglby zostac zepsuty
- Mitigation:
  - Uzycie responsywnych klas Tailwind (sm:) zapewnia pelna izolacje mobile/desktop
  - Dedicated E2E testy dla desktop do weryfikacji no regression
  - Conditional rendering tylko CSS-based, logika unchanged
  - Manual testing na desktop przed mergeем

#### Ryzyko 3: Performance degradation na mobile

- Severity: MEDIUM
- Prawdopodobienstwo: LOW
- Wpływ: Scrolling moze byc laggy na slabszych mobile devices
- Mitigation:
  - Virtualizer w TickerList juz optymalizuje rendering (460+ items)
  - CSS transforms i sticky positioning sa hardware-accelerated
  - Testowanie na slabszych devices (nie tylko flagship)
  - Monitoring performance metrics post-deployment

#### Ryzyko 4: Accessibility issues

- Severity: MEDIUM
- Prawdopodobienstwo: LOW
- Wpływ: Keyboard navigation lub screen readers moga miec problemy
- Mitigation:
  - Zachowanie wszystkich ARIA attributes i semantic HTML
  - Testowanie z keyboard (Tab, Enter, Esc)
  - Testowanie z VoiceOver / TalkBack
  - Focus trap w dialogu pozostaje (Radix UI Dialog handles it)

#### Ryzyko 5: Touch event conflicts

- Severity: LOW
- Prawdopodobienstwo: LOW
- Wpływ: Touch events na mobile moga konfliktowac z scroll lub virtualizer
- Mitigation:
  - Standardowe scroll behavior, brak custom touch handlers
  - Virtualizer library (@tanstack/react-virtual) dobrze handleuje touch events
  - Testowanie na real devices, nie tylko emulatory

### 7.2. Rollback plan

W razie problemow po wdrozeniu:

1. Natychmiastowy rollback: git revert commit z fix
2. Weryfikacja ze desktop dziala prawidlowo po rollback
3. Analiza problemu:
   - Sprawdzenie error logs (browser console, Sentry jesli uzywan)
   - Zebranie feedback od uzytkownikow mobile
   - Sprawdzenie konkretnych device models z problemem
4. Fix issues offline:
   - Odtworzenie problemu lokalnie
   - Implementacja poprawki
   - Dodatkowe testowanie
5. Re-deployment z poprawka

Rollback commands:

```bash
git revert <commit-hash>
git push origin main
# Deploy rollback
```

### 7.3. Monitoring post-deployment

Monitorowac po wdrozeniu naprawy:

- Metryki UX:
  - Bounce rate na /grid page (mobile) - nie powinien wzrosnac
  - Time on page - powinien pozostac stabilny lub wzrosnac
  - Filter usage rate - powinien wzrosnac (lepsza dostepnosc)
  - Conversion rate trial -> premium (jesli filter critical dla decision)

- Metryki performance:
  - Page load time - powinien pozostac <2s
  - Time to Interactive - powinien pozostac <3s
  - First Contentful Paint - powinien pozostac <1s
  - Lighthouse score - powinien pozostac 90+ (mobile)

- Logi i errory:
  - Browser console errors related to Dialog/AdvancedTickerFilter
  - React errors (Error Boundary catches)
  - API errors (symbols fetch) - nie powinny wzrosnac
  - Timeout errors - nie powinny wzrosnac

- User feedback:
  - Support tickets dotyczace filtrów na mobile - powinny zniknac
  - User reviews mentioning mobile UX - powinny poprawic sie
  - A/B testing (jesli mozliwe): stara vs nowa wersja

- Device/browser breakdown:
  - Sprawdzic metrics per device type (iPhone vs Android)
  - Sprawdzic metrics per browser (Safari vs Chrome mobile)
  - Zidentyfikowac potential outliers

Timeline monitoringu:

- Pierwsze 24h: intensive monitoring (co 2h)
- Pierwsze 7 dni: daily monitoring
- Nastepne 30 dni: weekly monitoring

## 8. Zgodnosc ze standardami

### 8.1. Copilot-instructions.md compliance

React patterns: ✅

- Functional component with hooks (useState, useCallback, useMemo)
- React.memo na TickerRow (juz istniejace)
- No logic changes, only layout/CSS

Astro patterns: ✅

- N/A - to jest React component w Astro project, zgodne

Accessibility (ARIA, WCAG): ✅

- MOBILE_ACCESSIBILITY:
  - Touch targets min 44x44px: ✅ (min-h-[44px] na buttons i labels)
  - Proper viewport configuration: ✅ (fullscreen modal, no scaling issues)
  - Layouts adapt portrait/landscape: ✅ (flex-based layout adaptuje)
  - Touch and keyboard navigation: ✅ (unchanged, Radix Dialog handles it)
  - Sufficient spacing: ✅ (gap-3, padding, no accidental touches)
  - Screen reader compatible: ✅ (semantic HTML, ARIA labels preserved)
- WCAG_PERCEIVABLE:
  - Responsive design no horizontal scroll: ✅ (fullscreen eliminuje problem)
  - Text resize up to 200%: ✅ (relative units, flex layout)
  - Color not sole indicator: ✅ (unchanged)
- WCAG_OPERABLE:
  - Keyboard accessible: ✅ (unchanged, Dialog trap focus)
  - No keyboard traps: ✅ (Esc closes dialog)
  - Focus indicators: ✅ (Tailwind focus: classes)

TypeScript best practices: ✅

- No type changes required
- Existing types remain valid

Testing patterns: ✅

- E2E tests with Playwright
- Mobile viewport testing
- Accessibility testing included

### 8.2. Tech-stack.md compliance

Uzyty framework/library: ✅

- React 18 (existing)
- Radix UI Dialog (existing)
- Tailwind CSS (existing)
- @tanstack/react-virtual (existing)

Dependencies: ✅

- Brak nowych dependencies

Build tools: ✅

- Astro (existing)
- Vite (existing)
- Brak zmian w build process

### 8.3. Security checklist

- [x] Input validation - nie dotyczy (brak nowych inputow)
- [x] Authorization - nie dotyczy (brak zmian w auth)
- [x] Authentication - nie dotyczy (brak zmian w auth)
- [x] XSS protection - nie dotyczy (brak nowych inputow/outputs)
- [x] CSRF protection - nie dotyczy (brak form submissions)
- [x] SQL injection protection - nie dotyczy (brak DB queries)
- [x] Secrets management - nie dotyczy (brak secrets)
- [x] Rate limiting - nie dotyczy (brak API calls changes)

Brak security concerns - zmiany tylko CSS/layout.

### 8.4. Performance checklist

- [x] Bundle size impact - minimalny (<1KB, tylko CSS classes)
- [x] Rendering optimization - unchanged (React.memo, virtualizer preserved)
- [x] Loading states - unchanged (existing loading states preserved)
- [x] Error boundaries - unchanged (existing error handling preserved)
- [x] Code splitting - nie dotyczy (brak nowych komponentow)

### 8.5. Accessibility checklist (dla UI)

- [x] ARIA attributes - preserved (all existing ARIA unchanged)
- [x] Keyboard navigation - preserved (Radix Dialog focus trap, Esc to close)
- [x] Focus management - preserved (Dialog manages focus automatically)
- [x] Semantic HTML - preserved (button, label, input elements)
- [x] Color contrast - unchanged (existing color scheme preserved)
- [x] Screen reader testing - required in manual testing phase

## 9. Dokumentacja zmian

### 9.1. Changelog entry

```markdown
### Fixed

- [Mobile UX] Filter popup (AdvancedTickerFilter) is now fullscreen on mobile with scrollable content and sticky action buttons, fixing issue where users could not scroll to see all tickers or reach the Apply button
```

### 9.2. Aktualizacja README (jesli wymagana)

Nie wymagana - brak zmian w API, konfiguracji lub sposobie uzycia aplikacji.

### 9.3. Dokumentacja techniczna (jesli wymagana)

Nie wymagana - pattern jest standardowy (fullscreen modal on mobile with Tailwind responsive variants).

Opcjonalnie: jesli planowane sa wiecej mobile-specific modali w przyszlosci, mozna dodac do internal docs:

```markdown
## Mobile Modal Pattern

For complex modals/popups on mobile, use fullscreen layout:

- `h-full w-full sm:h-auto sm:max-w-{size}` on DialogContent
- `flex flex-col` for header/content/footer stack
- `shrink-0` on header and footer (sticky)
- `flex-1 overflow-y-auto` on content area (scrollable)
- `min-h-[44px]` on all interactive elements (WCAG touch targets)

See `AdvancedTickerFilter.tsx` for reference implementation.
```

### 9.4. Release notes

Informacja dla uzytkownikow koncowych:

```markdown
## Co nowego w tej wersji

### Poprawki

- Poprawiono widok filtrów tickerów na urzadzeniach mobilnych
  - Filtry zajmuja teraz caly ekran dla lepszej widocznosci
  - Mozna swobodnie scrollowac liste wszystkich tickerow
  - Przyciski "Anuluj" i "Zastosuj" sa zawsze widoczne u dolu ekranu
  - Lepsza obsługa dotyku - wieksze przyciski i checkboxy
```

Brak wymaganych akcji po stronie uzytkownika.

## 10. Timeline i effort estimation

### 10.1. Estymacja czasu

- Implementacja: 1.5 godziny
  - Krok 1 (DialogContent responsive): 30 min
  - Krok 2 (TickerList heights): 15 min
  - Krok 3 (Touch targets): 30 min
  - Krok 4 (Virtualizer estimateSize): 15 min

- Testowanie: 1.5 godziny
  - Manual testing (5 device sizes, 3 browsers): 1 godzina
  - E2E tests implementation: 30 min

- Code review: 30 min

- Deployment: 15 min
  - Deploy to staging: 5 min
  - Smoke test: 5 min
  - Deploy to production: 5 min

- Monitoring post-deployment: 2 dni (passive monitoring)

Łącznie: 3.5 godziny active work + 2 dni monitoring

### 10.2. Zaleznosci

Blokujace:

- Brak - mozna rozpoczac natychmiast

Blokowane:

- Brak - inne features nie czekaja na ten fix

### 10.3. Sugerowany timeline

- Start: 2026-02-06 (dzis)
- Code complete: 2026-02-06 (koniec dnia)
- Testing complete: 2026-02-07 (poranek)
- Code review: 2026-02-07 (poludnie)
- Deployment to staging: 2026-02-07 (po review)
- Deployment to production: 2026-02-07 (wieczor) lub 2026-02-08 (rano - bezpieczniejsze)
- Monitoring period: 2026-02-08 do 2026-02-10

## 11. Załączniki

### 11.1. Dotknięte pliki (lista pelna)

```
src/components/grid/AdvancedTickerFilter.tsx
src/components/grid/TickerList.tsx
e2e/grid.spec.ts
```

### 11.2. Referencje

- Issue: Mobile filter popup not scrollable
- Related components:
  - Dialog primitive: src/components/ui/dialog.tsx
  - TickerSearchInput: src/components/grid/TickerSearchInput.tsx
  - useSymbols hook: src/hooks/useSymbols.ts
- Documentation:
  - Radix UI Dialog: https://www.radix-ui.com/primitives/docs/components/dialog
  - TanStack Virtual: https://tanstack.com/virtual/latest
  - WCAG Mobile Accessibility: https://www.w3.org/WAI/standards-guidelines/mobile/
  - Tailwind Responsive Design: https://tailwindcss.com/docs/responsive-design

### 11.3. Screenshoty/diagramy

Problem (przed naprawą):

```
┌─────────────────────┐
│  [X] Wybierz tick.  │ ← Header widoczny
│  Wyszukaj...        │
│                     │
│  [ Search input ]   │
│                     │
│  [Wybierz indeks▼]  │
│  [Zaznacz][Odznacz] │
│                     │
│  Zaznaczone (3):    │
│  ☑ CPD             │
│  ☑ PKN             │
│  ☑ PKO             │ ← Tu konczy sie viewport
│─ ─ ─ ─ ─ ─ ─ ─ ─ ─│
│  Wszystkie (460):   │ ← Poza viewport
│  ☐ 11B             │
│  ☐ ABE             │
│  ...               │
│  [Anuluj][Zastosuj]│ ← Przyciski poza viewport
└─────────────────────┘
    BLAD: Brak scroll
```

Rozwiazanie (po naprawie):

```
┌─────────────────────┐
│  [X] Wybierz tick. ─│ ← Sticky header
│  Wyszukaj...       │
├─────────────────────┤
│ ╭─────────────────╮ │
│ │ [ Search input ]│ │
│ │                 │ │
│ │ [Wybierz indeks]│ │
│ │ [Zaznacz][Odz.] │ │
│ │                 │ │
│ │ Zaznaczone (3): │ │
│ │ ☑ CPD          │ │
│ │ ☑ PKN          │ │
│ │ ☑ PKO          │ │
│ │                 │ │ ← Scrollable area
│ │ Wszystkie (460):│ │
│ │ ☐ 11B          │ │
│ │ ☐ ABE          │ │
│ │ ☐ ABS          │ │
│ │ ...  [scroll]   │ │
│ ╰─────────────────╯ │
├─────────────────────┤
│ [Anuluj][Zastosuj] ─│ ← Sticky footer (zawsze widoczny)
└─────────────────────┘
```

Layout structure (po naprawie):

```
DialogContent (h-full w-full overflow-hidden)
└── div (flex flex-col h-full)
    ├── DialogHeader (shrink-0 sticky top)
    │   ├── DialogTitle
    │   └── DialogDescription
    ├── div (flex-1 overflow-y-auto)  ← Scrollable
    │   ├── Search & Actions
    │   └── Ticker Lists (TickerList components)
    └── DialogFooter (shrink-0 sticky bottom)
        ├── Button (Anuluj)
        └── Button (Zastosuj)
```

### 11.4. Error logs/stack traces

Brak - problem jest UI/UX issue, nie runtime error. Brak error logs ani stack traces.

---

KONIEC PLANU NAPRAWY BLEDU
