# Plan Implementacji Feature - Grid Minimap Navigation

Data utworzenia: 2026-02-08
Tytul feature: Interaktywna Mapa Nawigacyjna dla Black Swan Grid
Typ: Full Feature (UI/UX + Business Logic + Integration)
Priorytet: MEDIUM

## 1. Podsumowanie wykonawcze

### 1.1. Opis funkcjonalności

Implementacja interaktywnej mini-mapy nawigacyjnej dla Black Swan Grid, która wizualizuje rozmieszczenie zdarzeń na gridzie w formie kompaktowego podglądu (max 300x200px) oraz umożliwia szybką nawigację poprzez przeciąganie prostokąta reprezentującego aktualny viewport. Mini-mapa rozwiązuje problem "pustego gridu" - użytkownicy nie wiedzą w którą stronę przewijać aby znaleźć zdarzenia.

Kluczowe elementy:

- **Wizualizacja gęstości zdarzeń**: Każde zdarzenie renderowane jako pixel z kolorem według typu (BLACK_SWAN_UP=zielony, BLACK_SWAN_DOWN=czerwony, etc.)
- **Viewport rectangle**: Niebieski prostokąt pokazujący aktualnie widoczny fragment gridu
- **Drag interaction**: Przeciąganie viewport rectangle scrolluje grid do odpowiedniego miejsca
- **Responsive sizing**: Mini-mapa skaluje się proporcjonalnie do rozmiaru gridu (max 300x200px)
- **Mobile overlay**: Na mobile mini-mapa pokazywana jako full-screen overlay z toggle button
- **Persistence**: Preferencja widoczności (show/hide) zapisywana w localStorage

### 1.2. Value proposition

Użytkownicy zyskują:

- **Orientacja przestrzenna**: Natychmiastowa informacja gdzie na gridzie znajdują się zdarzenia
- **Szybsza nawigacja**: Przeciągnięcie viewport rectangle zamiast przewijania gridu
- **Mniej frustracji**: Koniec z "pustym gridem" i zgadywaniem gdzie szukać danych
- **Power user feature**: Narzędzie dla zaawansowanych użytkowników analizujących duże zakresy danych (quarter = 90 dni)
- **Kontekst wizualny**: Widzą rozkład zdarzeń w czasie i pomiędzy symbolami

Biznes zyskuje:

- **Zwiększone engagement**: Łatwiejsza eksploracja danych = więcej czasu spędzonego w aplikacji (+10% expected)
- **Redukcja bounce rate**: Użytkownicy nie opuszczają gridu bo "nie ma danych" (-8% expected)
- **Professional UX**: Feature znany z IDE/editors (VSCode minimap) - podnosi postrzeganą jakość produktu
- **Competitive advantage**: Unikalny feature w kategorii financial analysis tools
- **Better data discovery**: Użytkownicy odkrywają więcej zdarzeń = więcej wartości z subskrypcji

### 1.3. Zakres wpływu

**Nowe komponenty/moduły:**

- `src/types/minimap.types.ts` - typy TypeScript dla mini-mapy (MinimapViewport, MinimapDimensions, MinimapEvent, MinimapState)
- `src/lib/minimap-utils.ts` - utility functions (calculateMinimapDimensions, calculateViewportRect, normalizePosition, denormalizePosition, getEventColor, prepareMinimapEvents)
- `src/hooks/useMinimapState.ts` - hook do zarządzania stanem (visibility, dragging, mobile detection, localStorage persistence)
- `src/hooks/useMinimapDrag.ts` - hook do obsługi drag interaction (mouse events, scroll synchronization)
- `src/components/grid/MinimapCanvas.tsx` - Canvas renderer (renderowanie tła, pikseli zdarzeń, viewport rectangle)
- `src/components/grid/GridMinimap.tsx` - główny container component (integracja wszystkich części, mobile/desktop UI)

**Modyfikowane komponenty/moduły:**

- `src/components/grid/VirtualizedGrid.tsx` - expose parentRef, integracja GridMinimap, przekazanie danych (events, symbols, dates)
- `src/components/grid/GridView.tsx` - opcjonalne adjustments jeśli potrzebne dla scroll container access

**Nowe testy:**

- `src/lib/__tests__/minimap-utils.test.ts` - unit testy dla utility functions
- `e2e/minimap.spec.ts` - E2E testy dla user flows (toggle visibility, drag viewport, mobile overlay, localStorage persistence)

**Grupa docelowa użytkowników:** Wszyscy zalogowani użytkownicy z dostępem do premium gridu (hasAccess === true)

**Dotknięte środowiska:** development, staging, production

### 1.4. Priorytet i MVP scope

**MEDIUM** - Feature znacząco poprawia UX dla power users, ale nie jest krytyczny dla core functionality

**MVP (must-have):**

- Renderowanie mini-mapy z Canvas 2D API dla wydajności
- Wizualizacja wszystkich zdarzeń jako piksele z kolorami według typu
- Viewport rectangle pokazujący aktualny widoczny fragment gridu
- Drag interaction - przeciąganie viewport rectangle scrolluje grid
- Responsive sizing - auto-scaling do max 300x200px z zachowaniem aspect ratio
- Fixed position (bottom-right corner) na desktop
- Toggle button show/hide z persistence do localStorage
- Mobile overlay (full-screen) z dedykowanym toggle button
- Graceful handling edge cases (0 events, bardzo duży grid >5000 komórek)

**Nice-to-have (może być dodane później):**

- Click-to-jump - kliknięcie na mini-mapie przesuwa viewport tam
- Tooltip pokazujący liczbę zdarzeń w obszarze pod kursorem
- Zoom controls (+/- buttons) do zmiany scale mini-mapy
- Keyboard shortcuts (M - toggle minimap, Esc - close)
- Minimap presets (pozycja: top-right, bottom-left, bottom-right)
- Export minimap as PNG
- Heatmap mode - zamiast pikseli pokazuje gradient gęstości

## 2. Szczegółowa analiza wymagań

### 2.1. Wymagania funkcjonalne

1. **[MUST]** System musi renderować mini-mapę używając Canvas 2D API dla wydajności (obsługa >1000 zdarzeń)
2. **[MUST]** Każde zdarzenie musi być renderowane jako pixel/cell z kolorem odpowiadającym typowi zdarzenia (zgodnym z GridCell)
3. **[MUST]** Mini-mapa musi skalować się responsive proporcjonalnie do rozmiaru gridu (max 300x200px width/height)
4. **[MUST]** Viewport rectangle musi pokazywać aktualny widoczny fragment gridu (pozycja i rozmiar synchronized ze scroll)
5. **[MUST]** Użytkownik musi móc przeciągnąć viewport rectangle aby scrollować grid (drag interaction)
6. **[MUST]** Mini-mapa musi być umieszczona w fixed position (bottom-right corner) na desktop
7. **[MUST]** Toggle button musi pozwalać ukryć/pokazać mini-mapę
8. **[MUST]** Preferencja widoczności (show/hide) musi być zapisana w localStorage i przywracana po reload
9. **[MUST]** Na mobile (<768px) mini-mapa musi pokazywać się jako full-screen overlay z dedykowanym toggle button
10. **[MUST]** Drag musi działać tylko gdy użytkownik kliknie WEWNĄTRZ viewport rectangle (nie na całej mini-mapie)
11. **[MUST]** Viewport rectangle nie może "wyjść" poza granice mini-mapy (clamping)
12. **[MUST]** Mini-mapa musi re-renderować się gdy zmienią się: events, symbols, dates, scroll position
13. **[SHOULD]** Mini-mapa musi pokazywać subtelne grid lines dla lepszej orientacji (co 5-10 komórek)
14. **[SHOULD]** Viewport rectangle musi mieć różny styl podczas drag (isDragging = true)
15. **[COULD]** Click na mini-mapie (poza viewport) może przenosić viewport do klikniętego miejsca

### 2.2. Wymagania niefunkcjonalne

**Performance:**

- Rendering mini-mapy < 100ms dla 5000 komórek (90 dni × 50 symboli)
- Drag interaction frame rate >= 55 FPS (smooth scrolling)
- Re-render on scroll <= 16ms (60 FPS)
- Canvas memory footprint < 5MB dla max size minimap

**Accessibility:**

- Mini-mapa musi mieć aria-label="Mapa nawigacyjna gridu"
- Toggle button musi mieć aria-label i title
- Keyboard shortcuts (optional MVP): M - toggle, Esc - close

**Browser compatibility:**

- Chrome/Edge >= 90
- Firefox >= 88
- Safari >= 14
- Canvas 2D API support (wszystkie nowoczesne przeglądarki)

**Responsiveness:**

- Desktop (>=1024px): Fixed position bottom-right, max 300×200px
- Tablet (768-1023px): Fixed position bottom-right, scaled proportionally
- Mobile (<768px): Full-screen overlay, shown only when toggled

**Usability:**

- Drag offset tracking - viewport nie "skacze" do pozycji kursora podczas drag
- Visual feedback - cursor: grab / grabbing
- Subtle animations (transform scale on click)
- Clear visual hierarchy (viewport rectangle z alpha fill + border)

### 2.3. Ograniczenia techniczne

**Ograniczenia Canvas API:**

- Canvas re-draw jest expensive - wymaga requestAnimationFrame optimization
- Brak automatic retina display scaling - wymaga manual devicePixelRatio handling (opcjonalne dla MVP)
- Nie wspiera CSS styling - wszystkie style inline w rendering function

**Ograniczenia performance:**

- Dla bardzo dużych gridów (>10,000 komórek) każdy pixel może być mniejszy niż 2px - trudno kliknąć
- Rozwiązanie: MIN_CELL_SIZE = 2px w calculateMinimapDimensions

**Ograniczenia mobile:**

- Mało miejsca na ekranie - mini-mapa jako overlay może zasłaniać grid
- Touch gestures mogą konfliktować z scroll gestures
- Rozwiązanie: Mobile tylko na explicit toggle (domyślnie ukryta)

**Ograniczenia VirtualizedGrid integration:**

- VirtualizedGrid używa @tanstack/react-virtual - scroll container to parentRef
- Musimy expose parentRef z VirtualizedGrid do GridMinimap
- Alternative: useRef w GridView i przekazanie do obu komponentów

### 2.4. Zależności od innych modułów

**Bezpośrednie zależności:**

- `@tanstack/react-virtual` - do obliczenia total scroll dimensions (virtualizer.getTotalSize())
- `lucide-react` - ikony dla toggle button (Map, X)
- `src/types/nocodb.types.ts` - BlackSwanEventMinimal, EventType
- `src/components/grid/VirtualizedGrid.tsx` - scroll container ref, events, symbols, dates
- `src/lib/ui-utils.ts` - getDatesInRange (dla consistency w date calculation)

**Integracje:**

- VirtualizedGrid przekazuje: events, symbols, dates, parentRef (scroll container)
- GridContext nie jest potrzebny (minimap jest presentational, nie zarządza stanem globalnym)

**Potencjalne konflikty:**

- Fixed position bottom-right może kolidować z innymi fixed elements (np. chat widget)
- Rozwiązanie: z-index = 40 (poniżej modali/sidebars ale powyżej content)

## 3. Architektura rozwiązania

### 3.1. Diagram komponentów

```
GridView
  └─ VirtualizedGrid
      ├─ Header (dates)
      ├─ Body (virtual rows/cols)
      │   └─ GridCell[]
      └─ GridMinimap ⭐ NEW
          ├─ useMinimapState (visibility, mobile, dragging)
          ├─ useMinimapDrag (mouse events, scroll sync)
          └─ MinimapCanvas
              └─ Canvas 2D rendering
                  ├─ Background + grid lines
                  ├─ Event pixels (prepareMinimapEvents)
                  └─ Viewport rectangle
```

### 3.2. Przepływ danych

```
1. VirtualizedGrid przekazuje props do GridMinimap:
   - events: BlackSwanEventMinimal[]
   - symbols: string[]
   - dates: string[]
   - gridScrollElement: HTMLElement (parentRef.current)

2. GridMinimap oblicza:
   - dimensions = calculateMinimapDimensions(symbols.length, dates.length)
   - minimapEvents = prepareMinimapEvents(events, symbols, dates)
   - viewport = calculateViewportRect(scrollLeft, scrollTop, ...)

3. MinimapCanvas renderuje:
   - Canvas context.fillRect() dla każdego minimapEvent
   - Viewport rectangle z denormalizePosition(viewport.x, viewport.y)

4. useMinimapDrag obsługuje:
   - mousedown na viewport → isDragging = true
   - mousemove → normalize position → clamp → scroll grid
   - mouseup → isDragging = false

5. useMinimapState zarządza:
   - isVisible (toggle + localStorage persistence)
   - isMobile (window.innerWidth detection)
   - isDragging (przekazane z useMinimapDrag)
```

### 3.3. Struktura katalogów

```
src/
├── types/
│   └── minimap.types.ts ⭐ NEW
├── lib/
│   ├── minimap-utils.ts ⭐ NEW
│   └── __tests__/
│       └── minimap-utils.test.ts ⭐ NEW
├── hooks/
│   ├── useMinimapState.ts ⭐ NEW
│   └── useMinimapDrag.ts ⭐ NEW
├── components/
│   └── grid/
│       ├── MinimapCanvas.tsx ⭐ NEW
│       ├── GridMinimap.tsx ⭐ NEW
│       ├── VirtualizedGrid.tsx (MODIFIED)
│       └── GridView.tsx (OPTIONAL MODIFIED)
e2e/
└── minimap.spec.ts ⭐ NEW
```

### 3.4. Decyzje architektoniczne

**1. Dlaczego Canvas zamiast SVG/HTML?**

- **Canvas**: Najwydajniejszy dla dużej liczby małych elementów (>1000 pikseli)
- SVG: Lepszy dla interaktywnych elementów, ale wolniejszy dla dużej liczby
- HTML divs: Najmniej wydajny, problemy z performance już przy 500+ elementach
- **Decyzja**: Canvas 2D API z requestAnimationFrame optimization

**2. Dlaczego normalized coordinates (0-1)?**

- Upraszcza obliczenia proporcji viewport vs minimap
- Łatwiejsze skalowanie przy zmianie rozmiaru minimap
- Separacja logiki od fizycznych pikseli
- **Decyzja**: Viewport używa normalized coords, konwertowane do px tylko przy renderingu

**3. Dlaczego fixed position zamiast relative?**

- Fixed: Zawsze widoczny podczas scrollowania gridu
- Relative: Przewija się z gridem - mniej użyteczny
- **Decyzja**: Fixed bottom-right (z-index: 40)

**4. Dlaczego localStorage zamiast URL params?**

- Visibility preference to UI state, nie grid filter state
- Nie chcemy clutterować URL
- localStorage: Persistent across sessions bez URL bloat
- **Decyzja**: localStorage dla visibility, URL params pozostają dla grid filters

**5. Dlaczego mobile overlay zamiast small fixed minimap?**

- Mobile ma mało miejsca - fixed minimap zasłaniałby grid
- Overlay: Pokazywany tylko on-demand (explicit toggle)
- Lepsze touch experience (większy target)
- **Decyzja**: Mobile = full-screen overlay z toggle button

## 4. Plan implementacji krok po kroku

### ETAP 1: Typy i interfaces (30 min)

**Cel:** Definicja typów TypeScript dla mini-mapy

**Plik:** `src/types/minimap.types.ts` (nowy)

**Tasks:**

- [ ] Utworzyć MinimapViewport interface (x, y, width, height - normalized 0-1)
- [ ] Utworzyć MinimapDimensions interface (width, height, cellWidth, cellHeight - px)
- [ ] Utworzyć MinimapEvent interface (symbolIndex, dateIndex, eventType)
- [ ] Utworzyć MinimapState interface (isVisible, isDragging, dragStartX, dragStartY)
- [ ] Dodać import EventType z nocodb.types.ts

**Acceptance criteria:**

- Wszystkie typy wyexportowane
- Dokumentacja JSDoc dla każdego interface
- Brak błędów TypeScript

**Dependencies:** Brak

---

### ETAP 2: Utility functions (1h)

**Cel:** Implementacja pure functions dla obliczeń geometrycznych

**Plik:** `src/lib/minimap-utils.ts` (nowy)

**Tasks:**

- [ ] Implementować `calculateMinimapDimensions(totalSymbols, totalDates): MinimapDimensions`
  - Oblicza aspect ratio = totalDates / totalSymbols
  - Skaluje do MAX_WIDTH=300, MAX_HEIGHT=200
  - Ensure MIN_CELL_SIZE=2px
  - Returns physical dimensions
- [ ] Implementować `calculateViewportRect(scrollLeft, scrollTop, containerW, containerH, totalW, totalH): MinimapViewport`
  - Normalize scroll position do 0-1
  - Clamp do valid range (viewport nie może wyjść poza minimap)
- [ ] Implementować `normalizePosition(pixelX, pixelY, dims): {x, y}`
  - Konwertuje pixel coords na normalized 0-1
- [ ] Implementować `denormalizePosition(normalizedX, normalizedY, dims): {x, y}`
  - Konwertuje normalized 0-1 na pixel coords
- [ ] Implementować `getEventColor(eventType): string`
  - BLACK_SWAN_UP → #22c55e (green-500)
  - BLACK_SWAN_DOWN → #ef4444 (red-500)
  - VOLATILITY_UP → #f97316 (orange-500)
  - VOLATILITY_DOWN → #eab308 (yellow-500)
  - BIG_MOVE → #3b82f6 (blue-500)
  - default → #6b7280 (gray-500)
- [ ] Implementować `prepareMinimapEvents(events, symbols, dates): MinimapEvent[]`
  - Tworzy Maps dla symbol→index, date→index
  - Mapuje BlackSwanEventMinimal → MinimapEvent
  - Filtruje events bez valid symbol/date (return null, filter later)

**Acceptance criteria:**

- Wszystkie funkcje są pure (no side effects)
- 100% test coverage (unit testy w ETAP 9)
- Dokumentacja JSDoc z przykładami
- Brak błędów TypeScript

**Dependencies:** `src/types/minimap.types.ts`, `src/types/nocodb.types.ts`

---

### ETAP 3: useMinimapState hook (45 min)

**Cel:** Hook do zarządzania UI state mini-mapy

**Plik:** `src/hooks/useMinimapState.ts` (nowy)

**Tasks:**

- [ ] Implementować useState dla isVisible (initial: z localStorage lub true)
- [ ] Implementować useState dla isDragging (initial: false)
- [ ] Implementować useState dla isMobile (initial: false)
- [ ] Implementować useEffect dla localStorage persistence (zapisuje isVisible przy zmianie)
- [ ] Implementować useEffect dla mobile detection
  - window.innerWidth < 768 → isMobile = true
  - addEventListener('resize', checkMobile)
  - cleanup removeEventListener
- [ ] Implementować useCallback dla toggleVisibility
  - setIsVisible(prev => !prev)
- [ ] Return { isVisible, isDragging, isMobile, setIsDragging, toggleVisibility }

**Acceptance criteria:**

- Hook działa zarówno SSR-safe (typeof window check)
- localStorage persistence działa (zapisuje/odczytuje po reload)
- Mobile detection reaguje na resize
- Proper cleanup listeners w useEffect return

**Dependencies:** Brak (vanilla React hooks)

---

### ETAP 4: MinimapCanvas component (1.5h)

**Cel:** Canvas renderer dla mini-mapy

**Plik:** `src/components/grid/MinimapCanvas.tsx` (nowy)

**Tasks:**

- [ ] Utworzyć functional component z memo()
- [ ] Props: dimensions, events (MinimapEvent[]), viewport, isDragging
- [ ] useRef dla canvasRef
- [ ] useRef dla animationFrameRef (do optimization)
- [ ] useEffect z dependency [dimensions, events, viewport, isDragging]
  - Cancel pending animationFrame
  - Schedule new animationFrame z render()
  - Cleanup: cancel animationFrame
- [ ] Implementować render(ctx, dims, events, viewport, isDragging)
  - ctx.clearRect() - clear canvas
  - Draw background (#f9fafb gray-50)
  - Draw grid lines (co 5 lub 10 komórek, zależnie od cellWidth/Height)
  - Loop przez events: ctx.fillRect() z getEventColor()
  - Draw viewport fill (semi-transparent blue, alpha różna dla isDragging)
  - Draw viewport border (blue, lineWidth różna dla isDragging)
- [ ] Return <canvas ref={canvasRef} width={dims.width} height={dims.height} />

**Acceptance criteria:**

- Canvas renderuje wszystkie events jako piksele
- Viewport rectangle widoczny z fill + border
- Smooth rendering (requestAnimationFrame)
- memo() zapobiega unnecessary re-renders
- Visual correctness (kolory zgodne z GridCell)

**Dependencies:** `src/lib/minimap-utils.ts` (getEventColor, denormalizePosition), `src/types/minimap.types.ts`

---

### ETAP 5: useMinimapDrag hook (1.5h)

**Cel:** Hook do obsługi drag interaction

**Plik:** `src/hooks/useMinimapDrag.ts` (nowy)

**Tasks:**

- [ ] Props: dimensions, viewport, gridScrollElement, onDragStart, onDragEnd
- [ ] useRef dla isDraggingRef (persists across renders bez re-render)
- [ ] useRef dla dragOffsetRef ({ x, y } - offset kursora od top-left viewport)
- [ ] Implementować handleMouseDown
  - Oblicz click position względem canvas (e.clientX - rect.left)
  - Check if click inside viewport rectangle
  - If inside: isDraggingRef = true, calculate dragOffset, onDragStart()
  - preventDefault() aby zapobiec text selection
- [ ] Implementować handleMouseMove
  - If !isDraggingRef.current → return
  - Get canvas rect (querySelector by data-minimap attribute)
  - Calculate new viewport position (mouseX - dragOffset.x)
  - normalizePosition() → clamp to valid range
  - Convert to scroll position: scrollLeft = normalizedX × scrollWidth
  - Update gridScrollElement.scrollLeft/scrollTop
- [ ] Implementować handleMouseUp
  - isDraggingRef = false, onDragEnd()
- [ ] useEffect dla global listeners
  - addEventListener('mousemove', handleMouseMove)
  - addEventListener('mouseup', handleMouseUp)
  - cleanup: removeEventListener
- [ ] Return { handleMouseDown }

**Acceptance criteria:**

- Drag działa tylko gdy click inside viewport
- Drag offset tracking - viewport nie skacze do kursora
- Viewport clamping - nie wychodzi poza minimap bounds
- Smooth scrolling gridu podczas drag
- Global listeners properly cleaned up

**Dependencies:** `src/lib/minimap-utils.ts` (normalizePosition), `src/types/minimap.types.ts`

---

### ETAP 6: GridMinimap container component (2h)

**Cel:** Główny komponent integrujący wszystkie części

**Plik:** `src/components/grid/GridMinimap.tsx` (nowy)

**Tasks:**

- [ ] Props: events (BlackSwanEventMinimal[]), symbols, dates, gridScrollElement
- [ ] Użyć useMinimapState() → { isVisible, isDragging, isMobile, setIsDragging, toggleVisibility }
- [ ] Użyć useState dla viewport (initial: {x:0, y:0, width:1, height:1})
- [ ] useMemo dla dimensions = calculateMinimapDimensions(symbols.length, dates.length)
- [ ] useMemo dla minimapEvents = prepareMinimapEvents(events, symbols, dates)
- [ ] useEffect dla viewport update on scroll
  - addEventListener('scroll', updateViewport) na gridScrollElement
  - addEventListener('resize', updateViewport) na window
  - updateViewport() → calculateViewportRect() → setViewport()
  - cleanup: removeEventListener
- [ ] Użyć useMinimapDrag({ dimensions, viewport, gridScrollElement, onDragStart: setIsDragging(true), onDragEnd: setIsDragging(false) })
- [ ] Render logic:
  - If !isVisible → show toggle button (Map icon)
  - If isMobile → show full-screen overlay with MinimapCanvas
  - Else → show fixed bottom-right with MinimapCanvas
- [ ] Toggle button onClick → toggleVisibility()
- [ ] Canvas onMouseDown → handleMouseDown z useMinimapDrag
- [ ] Add data-minimap attribute do canvas wrappera (dla useMinimapDrag querySelector)

**Acceptance criteria:**

- Desktop: Fixed bottom-right position
- Mobile: Full-screen overlay
- Toggle button działa (show/hide)
- Viewport updates on scroll
- Drag interaction działa
- Cursor styles (grab/grabbing)

**Dependencies:** Wszystkie poprzednie etapy

---

### ETAP 7: Integracja z VirtualizedGrid (30 min)

**Cel:** Połączenie mini-mapy z istniejącym gridem

**Plik:** `src/components/grid/VirtualizedGrid.tsx` (modyfikacja)

**Tasks:**

- [ ] Import GridMinimap
- [ ] useMemo dla gridDataForMinimap = { events, symbols, dates }
- [ ] Render GridMinimap po zamknięciu głównego div gridu (jako sibling)
  ```tsx
  return (
    <>
      <div className="flex h-full w-full flex-col rounded-lg border">{/* existing grid code */}</div>

      <GridMinimap
        events={gridDataForMinimap.events}
        symbols={gridDataForMinimap.symbols}
        dates={gridDataForMinimap.dates}
        gridScrollElement={parentRef.current}
      />
    </>
  );
  ```

**Acceptance criteria:**

- Mini-mapa renderuje się razem z gridem
- parentRef.current przekazane poprawnie
- Brak błędów TypeScript
- Brak regresji w istniejącej funkcjonalności gridu

**Dependencies:** ETAP 6 (GridMinimap), istniejący VirtualizedGrid

---

### ETAP 8: Styling i polish (45 min)

**Cel:** Dopracowanie UX i visual feedback

**Tasks:**

- [ ] Dodać smooth transitions dla minimap wrapper (transform scale on click)
- [ ] Cursor styles: grab/grabbing w GridMinimap
- [ ] Visual feedback dla isDragging (blue highlight na viewport)
- [ ] Subtle shadow dla fixed minimap (shadow-lg)
- [ ] Responsive text sizes (text-xs na desktop, dostosowane na mobile)
- [ ] Accessibility: aria-label dla canvas i buttons
- [ ] Focus states dla toggle button (focus:ring-2)

**Acceptance criteria:**

- Visual polish zgodny z designem aplikacji
- Smooth transitions (nie janky)
- Cursor feedback podczas hover/drag
- Accessibility attributes present

**Dependencies:** ETAP 7 (fully integrated minimap)

---

### ETAP 9: Unit testy (1.5h)

**Cel:** Pokrycie testami core utilities

**Plik:** `src/lib/__tests__/minimap-utils.test.ts` (nowy)

**Tasks:**

- [ ] Test suite dla calculateMinimapDimensions
  - Small grid (10 symbols × 7 dates) → should fit in max bounds
  - Large grid (50 symbols × 90 dates) → should scale down
  - Aspect ratio preservation → aspectRatio should match grid ratio
  - MIN_CELL_SIZE enforcement → cellWidth/Height >= 2px
- [ ] Test suite dla calculateViewportRect
  - Scrolled to top-left → viewport.x=0, y=0
  - Scrolled to middle → viewport values in 0-1 range
  - Scrolled to bottom-right → viewport clamped correctly
- [ ] Test suite dla normalizePosition / denormalizePosition
  - Normalize middle point → should be 0.5, 0.5
  - Denormalize 0.5, 0.5 → should return middle pixel
  - Round-trip (normalize → denormalize) → should return original
- [ ] Test suite dla getEventColor
  - All EventType values → should return correct hex colors
  - Unknown type → should return default gray
- [ ] Test suite dla prepareMinimapEvents
  - Valid events → should map to MinimapEvent with correct indices
  - Event with invalid symbol → should filter out (not in result)
  - Empty events → should return empty array

**Acceptance criteria:**

- All test suites passing
- Code coverage >= 90% dla minimap-utils.ts
- Edge cases covered (empty arrays, invalid inputs)

**Dependencies:** Vitest setup (już istnieje w projekcie)

---

### ETAP 10: E2E testy (2h)

**Cel:** Testowanie user flows end-to-end

**Plik:** `e2e/minimap.spec.ts` (nowy)

**Tasks:**

- [ ] Setup: beforeEach → login + navigate to /grid
- [ ] Test: "should display minimap by default"
  - Expect [data-minimap] toBeVisible()
- [ ] Test: "should toggle visibility with button"
  - Click "Ukryj mini-mapę" → expect minimap not visible
  - Click "Pokaż mini-mapę" → expect minimap visible
- [ ] Test: "should scroll grid when dragging viewport"
  - Get initial scrollLeft/scrollTop z grid
  - Drag viewport rectangle na minimapie
  - Expect scrollLeft/scrollTop changed
- [ ] Test: "should persist visibility preference"
  - Hide minimap
  - Reload page
  - Expect minimap still hidden
- [ ] Test: "should show mobile overlay on small viewport"
  - setViewportSize(375, 667)
  - Toggle minimap
  - Expect full-screen overlay visible
  - Close overlay
  - Expect overlay hidden
- [ ] Test: "should not drag when clicking outside viewport"
  - Click poza viewport rectangle na minimapie
  - Expect grid scroll nie changed

**Acceptance criteria:**

- All E2E tests passing
- Tests run w Chromium (desktop + mobile viewport)
- No flakiness (tests stable)
- Proper waits dla async operations

**Dependencies:** Playwright setup (już istnieje), ETAP 7 (fully integrated minimap)

---

## 5. Harmonogram i estymacja

### 5.1. Breakdown zadań

| Etap | Zadanie                     | Estymacja | Developer    | Dependencies |
| ---- | --------------------------- | --------- | ------------ | ------------ |
| 1    | Types & interfaces          | 30 min    | Frontend Dev | -            |
| 2    | Utility functions           | 1h        | Frontend Dev | Etap 1       |
| 3    | useMinimapState hook        | 45 min    | Frontend Dev | -            |
| 4    | MinimapCanvas component     | 1.5h      | Frontend Dev | Etap 1, 2    |
| 5    | useMinimapDrag hook         | 1.5h      | Frontend Dev | Etap 1, 2    |
| 6    | GridMinimap container       | 2h        | Frontend Dev | Etap 3, 4, 5 |
| 7    | VirtualizedGrid integration | 30 min    | Frontend Dev | Etap 6       |
| 8    | Styling & polish            | 45 min    | Frontend Dev | Etap 7       |
| 9    | Unit tests                  | 1.5h      | Frontend Dev | Etap 2       |
| 10   | E2E tests                   | 2h        | Frontend Dev | Etap 7       |
| -    | Code review                 | 1h        | Tech Lead    | All          |
| -    | QA testing                  | 1.5h      | QA           | All          |
| -    | Bug fixes                   | 1h        | Frontend Dev | QA feedback  |

**Total estymacja:** ~15h (2 dni robocze dla 1 frontend dev)

### 5.2. Kamienie milowe

**Milestone 1 (Day 1 午前):** Foundation (Etapy 1-3)

- Typy, utility functions, state management gotowe
- Możliwe do unit testowania

**Milestone 2 (Day 1 午後):** Core rendering (Etapy 4-5)

- Canvas rendering działa
- Drag interaction działa w izolacji

**Milestone 3 (Day 2 午前):** Integration (Etapy 6-7)

- Mini-mapa zintegrowana z gridem
- Podstawowe funkcjonalności działają end-to-end

**Milestone 4 (Day 2 午後):** Polish & testing (Etapy 8-10)

- UX polish
- Testy (unit + E2E)
- Gotowe do code review

### 5.3. Critical path

```
Etap 1 (Types)
  ↓
Etap 2 (Utils) ──→ Etap 9 (Unit tests)
  ↓
Etap 4 (Canvas) ───┐
  ↓                │
Etap 5 (Drag) ─────┤
  ↓                │
Etap 3 (State) ────┤
  ↓                ↓
Etap 6 (Container)
  ↓
Etap 7 (Integration)
  ↓
Etap 8 (Polish) ──→ Etap 10 (E2E tests)
  ↓
Code Review & QA
```

**Bottlenecks:**

- Etap 6 (GridMinimap) - blokuje integrację, wymaga ukończenia 3,4,5
- Etap 7 (Integration) - blokuje E2E testy

## 6. Strategia testowania

### 6.1. Unit testy

**Scope:** `src/lib/minimap-utils.ts`

**Tools:** Vitest, @testing-library/react (dla hooks jeśli potrzeba)

**Test cases (szczegóły w ETAP 9):**

- calculateMinimapDimensions: aspect ratio, min cell size, max bounds
- calculateViewportRect: scroll positions, clamping
- normalizePosition / denormalizePosition: conversions, round-trip
- getEventColor: wszystkie EventType values
- prepareMinimapEvents: mapping, filtering invalid events

**Coverage target:** >=90%

### 6.2. Integration testy

**Scope:** useMinimapState, useMinimapDrag (hooks)

**Approach:** React Testing Library z renderHook

**Test cases:**

- useMinimapState: localStorage persistence, mobile detection, toggle
- useMinimapDrag: drag offset calculation, clamping, scroll synchronization

**Note:** Może być postponed jeśli E2E testy wystarczająco pokrywają te flows

### 6.3. E2E testy

**Scope:** Full user flows z mini-mapą

**Tools:** Playwright

**Test cases (szczegóły w ETAP 10):**

- Visibility default state
- Toggle show/hide
- Drag viewport → grid scrolls
- localStorage persistence
- Mobile overlay behavior
- Click outside viewport → no drag

**Browsers:** Chromium (desktop + mobile viewport)

### 6.4. Manual testing checklist

Pre-release QA:

**Desktop (Chrome, Firefox, Safari):**

- [ ] Mini-mapa renderuje się poprawnie dla różnych zakresów (week, month, quarter)
- [ ] Drag viewport scrolluje grid smoothly (60 FPS)
- [ ] Toggle button ukrywa/pokazuje mini-mapę
- [ ] Preferencja widoczności zapisuje się w localStorage
- [ ] Viewport rectangle aktualizuje się podczas scrollowania gridu
- [ ] Kolory pikseli zgodne z typami zdarzeń w GridCell
- [ ] Cursor feedback (grab/grabbing) działa
- [ ] Mini-mapa nie zasłania ważnych elementów UI

**Mobile (iOS Safari, Android Chrome):**

- [ ] Toggle button widoczny na mobile
- [ ] Overlay pokazuje się full-screen
- [ ] Touch drag działa na overlay
- [ ] Close button zamyka overlay
- [ ] Overlay nie konfliktuje z grid scroll gestures

**Edge cases:**

- [ ] Grid bez zdarzeń (0 events) → mini-mapa pokazuje pusty canvas + viewport
- [ ] Bardzo duży grid (90 dni × 50 symboli) → mini-mapa renderuje się w <200ms
- [ ] Zmiana filtrów gridu (symbols, date range) → mini-mapa aktualizuje się
- [ ] Resize window → mini-mapa rescales poprawnie
- [ ] Rapid scrolling gridu → viewport rectangle smooth follow

## 7. Monitorowanie i metryki sukcesu

### 7.1. Metryki techniczne

**Performance:**

- [ ] Minimap render time < 100ms (p95) dla 5000 komórek - **Target: <100ms**
- [ ] Drag frame rate >= 55 FPS (p50) - **Target: >=55 FPS**
- [ ] Canvas memory < 5MB - **Target: <5MB**
- [ ] Re-render on scroll <= 16ms (60 FPS) - **Target: <=16ms**

**Reliability:**

- [ ] Zero JS errors related to minimap in production (7 days post-launch) - **Target: 0 errors**
- [ ] E2E test pass rate >= 95% - **Target: >=95%**

**Adoption:**

- [ ] % users who keep minimap visible (not hidden) after 1st session - **Target: >70%**
- [ ] % users who interact with minimap (drag viewport) at least once - **Target: >30%**

### 7.2. Metryki biznesowe

**Engagement:**

- [ ] Avg session duration in grid view +10% (baseline: 5min → target: 5.5min)
- [ ] Avg scroll actions per session +15% (baseline: 20 → target: 23)
- [ ] Avg events viewed per session +12% (baseline: 8 → target: 9)

**User satisfaction:**

- [ ] Bounce rate from grid view -8% (baseline: 25% → target: 23%)
- [ ] Feature satisfaction score (survey) >= 4.0/5.0
- [ ] Support tickets related to "can't find events" -20% (baseline: 15/month → target: 12/month)

**Retention:**

- [ ] 7-day retention rate +2% (baseline: 65% → target: 67%)
- [ ] Churn rate -3% (baseline: 12% → target: 9%)

### 7.3. Monitoring setup

**Frontend monitoring:**

- Setup custom timing mark dla minimap render: `performance.mark('minimap:render:start/end')`
- Log minimap interactions do analytics: `trackEvent('minimap:drag', { duration, distance })`
- Monitor Canvas errors: `canvas.onerror` handler z Sentry reporting

**Analytics events:**

```typescript
// Track minimap usage
analytics.track("minimap:toggle", { action: "show" | "hide", source: "button" | "shortcut" });
analytics.track("minimap:drag", { duration_ms: number, scroll_distance_px: number });
analytics.track("minimap:render", { event_count: number, render_time_ms: number });
```

**Alerts:**

- Alert if minimap render time p95 > 200ms (2x target)
- Alert if JS error rate from minimap > 1% users
- Alert if minimap feature adoption < 50% after 2 weeks

## 8. Ryzyko i mitygacja

### 8.1. Identyfikacja ryzyk

**Ryzyko 1: Performance degradation dla dużych gridów (90 dni × 100 symboli = 9000 komórek)**

- **Prawdopodobieństwo:** MEDIUM
- **Impact:** HIGH (slow render, janky scroll)
- **Mitygacja:**
  - Use requestAnimationFrame dla Canvas rendering
  - Implement MIN_CELL_SIZE = 2px (redukuje liczbę renderowanych pikseli)
  - Debounce scroll events (throttle viewport update do 60 FPS max)
  - Profile z Chrome DevTools Performance tab przed release
- **Fallback:** Jeśli performance < target, dodaj toggle "Enable minimap" (disabled by default dla quarter range + >50 symbols)

**Ryzyko 2: Canvas nie wspiera retina displays (blurry minimap na MacBook/iPhone)**

- **Prawdopodobieństwo:** MEDIUM
- **Impact:** MEDIUM (UX issue, nie blocker)
- **Mitygacja:**
  - Implement devicePixelRatio scaling w MinimapCanvas (optional dla MVP)
  - Set canvas.width/height = physical × devicePixelRatio
  - Scale ctx back: ctx.scale(devicePixelRatio, devicePixelRatio)
- **Fallback:** Document jako known issue dla MVP, fix w v2

**Ryzyko 3: Drag conflicts z touch scroll na mobile**

- **Prawdopodobieństwo:** LOW (mobile używa overlay, nie fixed minimap)
- **Impact:** MEDIUM
- **Mitygacja:**
  - Mobile minimap tylko w overlay mode (nie fixed position)
  - Overlay shown only on explicit toggle (domyślnie ukryty)
  - Use touch-action: none na canvas wrapper w overlay
- **Fallback:** Disable drag na mobile, tylko show events (no interaction)

**Ryzyko 4: Fixed position minimap zasłania inne fixed elements (chat widget, toast notifications)**

- **Prawdopodobieństwo:** MEDIUM
- **Impact:** LOW (UX annoyance)
- **Mitygacja:**
  - z-index = 40 (poniżej modals/sidebars, powyżej content)
  - User może ukryć minimap (toggle button + localStorage)
  - Position configurable w przyszłości (top-right, bottom-left options)
- **Fallback:** Zmiana default position jeśli user feedback negatywny

**Ryzyko 5: VirtualizedGrid refactoring breaks minimap integration**

- **Prawdopodobieństwo:** LOW
- **Impact:** HIGH (minimap przestaje działać)
- **Mitygacja:**
  - Minimal coupling - minimap tylko potrzebuje: events, symbols, dates, scrollElement ref
  - Unit testy dla wszystkich utility functions (nie zależą od VirtualizedGrid)
  - E2E testy wykryją breakage
- **Fallback:** Minimap jako optional feature - jeśli broken, ukryj gracefully (nie crash app)

### 8.2. Plan awaryjny

**Jeśli performance nie spełnia targetów (<55 FPS drag):**

1. Implement throttling dla scroll events (reduce update frequency)
2. Reduce grid lines frequency (nie rysuj co 5, tylko co 10 komórek)
3. Use OffscreenCanvas API (jeśli browser support >= 95%)
4. Last resort: Disable minimap dla very large grids (>5000 komórek)

**Jeśli mobile UX problematyczna:**

1. A/B test: overlay vs small fixed minimap
2. Jeśli overlay win rate < 50%, revert do desktop-only feature
3. Add user preference toggle "Show minimap on mobile"

**Jeśli delays w delivery:**

- Priority 1 (must-ship): Desktop fixed minimap + drag + toggle (core value)
- Priority 2 (can defer): Mobile overlay, localStorage persistence
- Priority 3 (nice-to-have): E2E testy, retina support

## 9. Dokumentacja

### 9.1. Dokumentacja techniczna

**Dla developerów:**

**README update:** Add section w `docs/features/MINIMAP.md`

```markdown
# Grid Minimap Navigation

## Overview

Interactive minimap showing event distribution and viewport position.

## Architecture

- Canvas 2D rendering for performance
- Normalized coordinates (0-1) for viewport calculations
- Fixed position (bottom-right) on desktop, overlay on mobile

## API

### GridMinimap props

- `events`: BlackSwanEventMinimal[] - events to render
- `symbols`: string[] - grid row labels
- `dates`: string[] - grid column labels
- `gridScrollElement`: HTMLElement - scroll container ref

### Utility functions

See `src/lib/minimap-utils.ts` for full API docs.

## Performance considerations

- Max 5000 cells supported with smooth 60 FPS
- Canvas re-render optimized with requestAnimationFrame
- MIN_CELL_SIZE = 2px ensures clickable targets

## Troubleshooting

- Blurry on retina: Enable devicePixelRatio scaling
- Slow drag: Check Chrome DevTools Performance profiler
- Not visible: Check localStorage 'minimap:visibility' value
```

**Code comments:** JSDoc dla wszystkich exported functions/components

### 9.2. Dokumentacja użytkownika

**In-app tooltip/onboarding:**

- First time user widzi minimap → Show tooltip: "Przeciągnij niebieski prostokąt aby nawigować po gridzie"
- Tooltip auto-dismiss po 5s lub po pierwszym drag

**Help Center article:** "How to use the grid minimap"

- Screenshot z annotacjami
- GIF pokazujący drag interaction
- FAQ: "Jak ukryć minimap?", "Dlaczego minimap jest pusty?" (no events in range)

**Release notes:** Feature announcement w changelog

```markdown
## v2.5.0 - Grid Minimap Navigation

### 🗺️ New Feature: Interactive Minimap

- Quickly see where events are located on the grid
- Drag the blue viewport rectangle to navigate
- Toggle visibility with the map icon (bottom-right)
- Full-screen overlay on mobile devices

Perfect for analyzing large date ranges (quarter view with many symbols)!
```

## 10. Post-launch plan

### 10.1. Monitoring (pierwsze 7 dni)

**Daily checks:**

- [ ] Error rate w Sentry (filter: minimap\*)
- [ ] Performance metrics (render time p95, FPS p50)
- [ ] Adoption rate (% users z visible minimap)
- [ ] User feedback w support tickets

**Weekly review:**

- [ ] Porównanie metryk vs baseline (engagement, retention)
- [ ] Analiza user behavior (drag frequency, toggle frequency)
- [ ] Prioritization feature requests (click-to-jump, zoom controls)

### 10.2. Iteracje (v2, v3)

**v2 (2-3 tygodnie po launch):**

- [ ] Click-to-jump - kliknięcie na minimap przesuwa viewport
- [ ] Keyboard shortcuts (M = toggle, Esc = close)
- [ ] Retina display support (devicePixelRatio scaling)
- [ ] Bug fixes z user feedback

**v3 (1-2 miesiące po launch):**

- [ ] Tooltip pokazujący liczbę zdarzeń pod kursorem
- [ ] Minimap position presets (top-right, bottom-left, bottom-right)
- [ ] Heatmap mode toggle (gradient zamiast pikseli)
- [ ] Export minimap as PNG
- [ ] Zoom controls (+/- buttons)

**Future considerations:**

- Integration z keyboard navigation (arrow keys scroll + minimap viewport follows)
- Minimap dla mobile w native app (jeśli będzie iOS/Android app)
- A/B test różnych color schemes dla lepszej czytelności

### 10.3. Success criteria review

**2 tygodnie po launch:**

- Review metryk technicznych vs targets
- Decision: czy feature enabled by default dla wszystkich users, czy opt-in?
- Gather qualitative feedback (user interviews, survey)

**1 miesiąc po launch:**

- Review metryk biznesowych vs targets
- Calculate feature ROI (development cost vs engagement lift)
- Decision: invest w v2 iterations czy pivot?

---

## Changelog

- **2026-02-08**: Initial plan created (v1.0)

## Approvals

- [ ] Product Owner: ******\_\_\_******
- [ ] Tech Lead: ******\_\_\_******
- [ ] Frontend Dev: ******\_\_\_******
- [ ] QA Lead: ******\_\_\_******
