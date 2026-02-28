# Plan Naprawy Bledu - Grid Header Scroll Lag

Data utworzenia: 2026-02-21
Tytul bledu: Daty w headerze gridu skaczą podczas scrollowania zamiast płynnie przyklejać się do kolumn
Severity: MEDIUM
Typ bledu: Performance / UI

## 1. Podsumowanie wykonawcze

### 1.1. Opis bledu

Podczas scrollowania gridu w poziomie (osi X), header z datami nie synchronizuje sie płynnie z body gridu. Daty "skaczą", występuje opóźnienie (lag) między scrollowaniem gridu a aktualizacją pozycji headera, co powoduje migotanie i złe wrażenie wizualne. Header wydaje się być "krok za" gridem, nie przyklejając sie płynnie do kolumn.

### 1.2. Root cause

Synchronizacja scroll między headerem a body gridu (VirtualizedGrid.tsx linie 131-152) jest zaimplementowana jako prosty addEventListener("scroll") bez optymalizacji performance. Handler scrollowania (linia 146-148) bezpośrednio ustawia `headerEl.scrollLeft = bodyEl.scrollLeft` na każdym scroll event, co powoduje:

- Synchroniczne DOM reflows na każdym pixel scrollowania (bardzo kosztowne)
- Brak batch updates - każdy scroll event triggeruje natychmiastową zmianę scrollLeft
- Brak wykorzystania GPU acceleration (transform) - używane jest właściwość scroll zamiast transform
- Brak requestAnimationFrame dla smooth rendering
- Potencjalny konflikt z virtualizacją @tanstack/react-virtual która też reaguje na scroll events

### 1.3. Zakres wpływu

- Dotknięte komponenty/moduły: VirtualizedGrid.tsx (scroll sync logic), GridSkeleton.tsx (ma ten sam problem)
- Dotknięci uzytkownicy: wszyscy użytkownicy scrollujący grid w poziomie, szczególnie na urządzeniach mid-range i wolniejszych komputerach
- Dotknięte srodowiska: production, staging, development

### 1.4. Priorytet naprawy

HIGH - Problem znacząco obniża UX podczas podstawowej interakcji z gridem (scrollowanie). Nie blokuje funkcjonalności, ale sprawia wrażenie "buggy" i niedopracowanej aplikacji. Na wolniejszych urządzeniach jest bardzo widoczny i frustrujący dla użytkowników.

## 2. Szczegolowa analiza bledu

### 2.1. Kroki reprodukcji

1. Otwórz aplikację i przejdź do widoku gridu (/grid)
2. Zaloguj się jako aktywny użytkownik
3. Poczekaj aż grid się załaduje z większą ilością dat (>20 kolumn)
4. Scrolluj grid w prawo używając scrollbara lub gestem trackpad/touch
5. Obserwuj header z datami podczas scrollowania
6. Zauważ że daty "skaczą" i nie poruszają się płynnie
7. Na wolniejszym urządzeniu lub przy szybkim scrollowaniu lag jest bardziej widoczny

### 2.2. Oczekiwane zachowanie

Header z datami powinien płynnie scrollować synchronicznie z gridem bez zauważalnego opóźnienia lub "skoków". Scrollowanie powinno być smooth na poziomie 60 FPS. Daty powinny wizualnie pozostać "przyklejone" do swoich kolumn podczas całego scrollowania bez migotania czy przeskakiwania.

### 2.3. Rzeczywiste zachowanie

Header scrolluje z widocznym opóźnieniem względem body gridu. Podczas scrollowania daty "skaczą" - przez moment są przesunięte względem kolumn, następnie "doganiają" grid. Na wolniejszych urządzeniach lub przy szybkim scrollowaniu opóźnienie może wynosić 50-200ms, co jest bardzo widoczne i irytujące. FPS spada poniżej 30 podczas intensywnego scrollowania.

### 2.4. Root cause analysis

Lokalizacja bledu: src/components/grid/VirtualizedGrid.tsx, linie 131-152

Przyczyna techniczna:

```typescript
// Linie 146-148
const handleScroll = () => {
  headerEl.scrollLeft = bodyEl.scrollLeft;
};
```

Analiza problemu:

1. Brak requestAnimationFrame - scroll handler wykonuje sie synchronicznie na każdym scroll event (może być 100+ events/sekundę), co blokuje main thread
2. Bezpośrednia manipulacja scrollLeft - wymusza synchroniczny reflow/repaint, nie wykorzystuje GPU compositing
3. Brak throttle/debounce - każdy pixel scroll triggeruje DOM update
4. Współzależność z virtualizacją - @tanstack/react-virtual też reaguje na scroll, może powodować konflikt i dodatkowe repaints
5. Brak passive listener - addEventListener nie ma flagi { passive: true }, co blokuje scroll performance

Brakujące elementy:

- requestAnimationFrame wrapper dla smooth 60 FPS updates
- Ref dla animation frame ID umożliwiający cleanup
- Passive event listener dla lepszej scroll performance
- Opcjonalnie: will-change CSS hint dla header container

Dodatkowe miejsca z tym samym problemem:

- src/components/ui/skeleton.tsx (linie 20-35) - GridSkeleton ma identyczną implementację scroll sync
- src/hooks/useTimelineScroll.ts (linia 65) - używa { passive: true }, ale mogłoby wykorzystać rAF

### 2.5. Analiza zasiegu

Komponenty frontend:

- src/components/grid/VirtualizedGrid.tsx - główny komponent wymagający poprawy scroll sync logic (linie 131-152)
- src/components/ui/skeleton.tsx - GridSkeleton komponent ma identyczny problem (linie 20-35)

Serwisy/hooki:

Brak - problem jest specyficzny dla scroll synchronization w gridzie

Typy/interfejsy:

Brak - nie wymaga zmian w typach

Backend/API:

Brak - problem dotyczy wyłącznie frontendu

Baza danych:

Brak

Testy:

- e2e/grid-layout.spec.ts - istniejący test TC-GRID-LAYOUT-001 weryfikuje scroll sync, ale nie testuje performance/smoothness
- Nowy test E2E: weryfikacja smooth scroll bez lagów (może być trudny do zautomatyzowania)
- Manual testing: weryfikacja visual smoothness na różnych urządzeniach

## 3. Propozycje rozwiazan

### 3.1. Rozwiazanie A (REKOMENDOWANE)

Opis:

requestAnimationFrame-based scroll synchronization z passive listener. Implementacja scroll handlera który scheduleuje update headera w następnym animation frame zamiast robić to synchronicznie. Zagwarantuje to smooth 60 FPS updates i wykorzystanie GPU acceleration. Dodatkowo passive listener nie blokuje scroll performance.

Zakres zmian:

Frontend:

- VirtualizedGrid.tsx: refactor handleScroll z requestAnimationFrame wrapper, dodanie animationFrameRef, passive listener
- skeleton.tsx (GridSkeleton): identyczne zmiany dla consistency
- Opcjonalnie: dodanie will-change: scroll-position CSS hint dla header container

Backend: brak zmian

Database: brak zmian

Testy:

- Aktualizacja e2e/grid-layout.spec.ts: TC-GRID-LAYOUT-001 powinien nadal działać (kompatybilność wsteczna)
- Manual testing: weryfikacja visual smoothness na desktop/mobile/tablet
- Performance audit: sprawdzenie FPS podczas scrollowania (powinno być 60 FPS)

Zalety:

- Minimalny refactor - zmiana tylko logiki handleScroll, zero zmian w JSX/layout
- Smooth 60 FPS rendering - requestAnimationFrame zapewnia optimal timing dla updates
- Lepsze performance - batch updates zamiast synchronicznych DOM manipulations na każdym pixel
- GPU acceleration - rAF umożliwia compositing layer optimization
- Passive listener - nie blokuje scroll performance
- Zero dodatkowych dependencies - wykorzystuje natywny Web API
- Backward compatible - istniejące testy nie wymagają zmian
- Łatwy rollback - zmiany są izolowane w jednym useEffect hook

Wady:

- Nieznacznie bardziej złożony kod - dodatkowy useRef, rAF cleanup
- Teoretycznie możliwy micro-delay (16ms) - praktycznie niezauważalny
- Nie rozwiązuje root cause (dwa scroll containers) - tylko łagodzi symptomy

Effort: XS (1-2 godziny)

Uzasadnienie: 15 min implementacja rAF wrapper, 10 min refactor GridSkeleton, 10 min testy jednostkowe, 20 min manual testing na różnych devices, 15 min code review.

Ryzyko regresji: LOW

Uzasadnienie: Zmiany dotyczą tylko internal scroll sync logic, nie wpływają na JSX/layout/state. Istniejące testy E2E weryfikują że scroll sync działa - nowa implementacja zachowuje tę samą funkcjonalność, tylko smooth. requestAnimationFrame jest battle-tested API, szeroko używany w performance-critical code.

Zgodnosc ze standardami:

- Copilot-instructions.md: ✅ - używa React hooks (useRef, useEffect, useCallback), proper cleanup, functional components
- Tech-stack.md: ✅ - TypeScript, React 19, zero nowych dependencies
- Best practices: ✅ - performance optimization, GPU acceleration, passive listeners, rAF pattern

### 3.2. Rozwiazanie B

Opis:

Transform-based header positioning zamiast scroll synchronization. Zamiast synchronizować scrollLeft między dwoma elementami, użyć pojedynczego scroll container dla gridu i pozycjonować header absolutnie z CSS transform: translateX(). Header byłby fixed positioned, a jego translateX byłby aktualizowany na podstawie scroll position gridu.

Zakres zmian:

Frontend:

- VirtualizedGrid.tsx: major refactor - usunięcie headerScrollRef, zmiana layoutu headera na absolute positioned
- Zmiana JSX: header div z position: absolute, transform: translateX(-scrollLeft)
- useEffect: zamiast sync scrollLeft, update transform property przez rAF
- GridSkeleton: identyczne zmiany

Backend: brak zmian

Database: brak zmian

Testy:

- Wszystkie testy E2E wymagają aktualizacji - zmiana struktury DOM headera
- Regression testing - weryfikacja sticky behavior, keyboard nav, accessibility

Zalety:

- Teoretycznie lepsze performance - GPU-accelerated transforms zamiast scroll
- Eliminuje problem z dwoma scroll containers
- Bardziej "correct" architektura - jeden source of truth dla scroll position
- Potencjalnie lepszy dla accessibility

Wady:

- Major refactor - duży zakres zmian w core component
- Wysokie ryzyko regresji - zmiana layoutu headera może złamać sticky positioning
- Wymaga aktualizacji wszystkich testów E2E
- Może wymagać zmian w @tanstack/react-virtual integration
- Złożoność - manualne zarządzanie transform zamiast natywnego scroll
- Effort XL - 1-2 dni implementacji + testowania

Effort: L (1-1.5 dnia)

Uzasadnienie: 2h refactor layoutu, 2h implementacja transform logic, 1h GridSkeleton, 2h testowanie, 1h aktualizacja E2E testów, 30min code review.

Ryzyko regresji: HIGH

Uzasadnienie: Zmiana layoutu headera, może wpłynąć na sticky positioning, keyboard navigation, accessibility. Wszystkie testy E2E wymagają weryfikacji i potencjalnej aktualizacji.

Zgodnosc ze standardami:

- Copilot-instructions.md: ⚠️ - major refactor core component, może naruszyć accessibility (ARIA structure)
- Tech-stack.md: ✅ - zero nowych dependencies
- Best practices: ⚠️ - transform approach jest bardziej custom, trudniejszy do maintain

### 3.3. Rozwiazanie C

Opis:

CSS-based sticky positioning bez scroll synchronization. Wykorzystanie najnowszego CSS position: sticky z overflow-clip-margin dla osiągnięcia sticky header bez JavaScript scroll sync. Header i body byłyby w jednym scroll container, header byłby sticky, a kolumny dat wykorzystywałyby position: sticky z horizontal axis.

Zakres zmian:

Frontend:

- VirtualizedGrid.tsx: merge header i body do jednego scroll container
- Usunięcie headerScrollRef i całego useEffect scroll sync
- Header jako pierwszy child scroll container z position: sticky
- CSS: overflow-clip-margin, position: sticky dla dat columns

Backend: brak zmian

Database: brak zmian

Testy:

- Regresion testing - weryfikacja sticky behavior na różnych browserach
- Browser compatibility testing - overflow-clip-margin support (Safari może mieć problemy)

Zalety:

- Najprostsze rozwiązanie - zero JavaScript scroll logic
- Native browser optimization - najlepszy performance
- Najmniej kodu do maintain
- Eliminuje problem na poziomie architektury

Wady:

- Wymaga merge header + body do jednego container - może konfliktować z virtualizacją
- Browser compatibility - overflow-clip-margin i sticky horizontal nie są powszechnie wspierane
- Safari support - może nie działać na iOS Safari (major issue)
- Może wymagać zmian w @tanstack/react-virtual configuration

Effort: M (4-6 godzin)

Uzasadnienie: 2h refactor layoutu, 30min CSS tweaks, 2h browser compatibility testing (szczególnie Safari), 1h E2E updates.

Ryzyko regresji: MEDIUM

Uzasadnienie: Merge header+body może wpłynąć na virtualizację, ale eliminuje scroll sync problem. Browser compatibility jest ryzykiem - może nie działać na wszystkich platformach.

Zgodnosc ze standardami:

- Copilot-instructions.md: ✅ - preferuje natywne rozwiązania CSS nad JavaScript
- Tech-stack.md: ✅ - zero nowych dependencies
- Best practices: ⚠️ - browser compatibility może być problemem

## 4. Rekomendacja i uzasadnienie

### 4.1. Wybrane rozwiazanie

ROZWIAZANIE A - requestAnimationFrame-based scroll synchronization

### 4.2. Uzasadnienie wyboru

Najlepiej realizuje wymagania poprzez:

Minimalizuje ryzyko regresji:

- Zero zmian w layout/JSX - tylko refactor logiki handleScroll
- Backward compatible - istniejące testy nie wymagają zmian
- Izolowane zmiany - tylko w jednym useEffect hook
- Battle-tested pattern - requestAnimationFrame jest standardem dla scroll optimization

Jest zgodne ze standardami projektu:

- Używa React hooks zgodnie z copilot-instructions.md
- Zero nowych dependencies zgodnie z tech-stack.md
- Passive listeners zgodnie z performance best practices
- GPU acceleration zgodnie z modern web standards

Optymalizuje effort vs. wartosc:

- XS effort (1-2h) vs. znacząca poprawa UX
- Quick win - można wdrożyć w tym samym sprincie
- Low risk - łatwy rollback w razie problemów

Zapewnia skalowalnosc:

- Może być podstawą dla przyszłego refactoru (Rozwiązanie B/C)
- Nie blokuje innych improvement'ów
- Łatwo rozszerzyć o throttle/debounce jeśli potrzebne

Ułatwia przyszle utrzymanie:

- Kod jest prosty i zrozumiały
- Pattern może być reused w innych komponentach
- Dobrze udokumentowany pattern (rAF dla scroll)

Rozwiązania B i C są "lepsze" architektonicznie, ale wymagają dużo więcej pracy i mają większe ryzyko. Rozwiązanie A to pragmatyczne "quick win" które znacząco poprawia UX przy minimalnym effort i risk.

## 5. Szczegolowy plan implementacji

### 5.1. Faza 1: Przygotowanie

- [ ] Utworzenie brancha: `fix/grid-header-scroll-lag`
- [ ] Backup obecnej implementacji dla porównania performance
- [ ] Setup performance monitoring (Chrome DevTools Performance tab)
- [ ] Przygotowanie test cases dla manual testing

### 5.2. Faza 2: Zmiany w kodzie

#### Krok 1: Refactor scroll sync w VirtualizedGrid.tsx

Plik: `src/components/grid/VirtualizedGrid.tsx`

Opis zmian:
Refactor useEffect scroll synchronization (linie 131-152) z requestAnimationFrame wrapper i passive listener. Dodanie useRef dla animation frame ID, zmiana handleScroll na rAF-batched update, dodanie { passive: true } flag.

Kod przed zmiana:

```typescript
// Scroll synchronization between header and body
useEffect(() => {
  const bodyEl = parentRef.current;
  const headerEl = headerScrollRef.current;

  if (!bodyEl || !headerEl) return;

  // Set grid scroll element for minimap
  setGridScrollElement(bodyEl);

  // Expose scroll element to parent (for infinite scroll detection)
  if (onScrollElement) {
    onScrollElement(bodyEl);
  }

  const handleScroll = () => {
    headerEl.scrollLeft = bodyEl.scrollLeft;
  };

  bodyEl.addEventListener("scroll", handleScroll);
  return () => bodyEl.removeEventListener("scroll", handleScroll);
}, [onScrollElement]);
```

Kod po zmianie:

```typescript
// Scroll synchronization between header and body (optimized with rAF)
useEffect(() => {
  const bodyEl = parentRef.current;
  const headerEl = headerScrollRef.current;

  if (!bodyEl || !headerEl) return;

  // Set grid scroll element for minimap
  setGridScrollElement(bodyEl);

  // Expose scroll element to parent (for infinite scroll detection)
  if (onScrollElement) {
    onScrollElement(bodyEl);
  }

  // Animation frame ID for smooth scroll sync
  let animationFrameId: number | null = null;

  const handleScroll = () => {
    // Cancel any pending animation frame to avoid stacking
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId);
    }

    // Schedule header scroll update in next animation frame for smooth 60 FPS
    animationFrameId = requestAnimationFrame(() => {
      headerEl.scrollLeft = bodyEl.scrollLeft;
      animationFrameId = null;
    });
  };

  // Use passive listener for better scroll performance (non-blocking)
  bodyEl.addEventListener("scroll", handleScroll, { passive: true });

  return () => {
    bodyEl.removeEventListener("scroll", handleScroll);
    // Cancel pending animation frame on cleanup
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId);
    }
  };
}, [onScrollElement]);
```

Uzasadnienie:

- requestAnimationFrame batch updates w optimal timing (60 FPS), eliminuje scroll lag
- cancelAnimationFrame przed schedulowaniem nowego frame zapobiega stacking i memory leaks
- Passive listener { passive: true } informuje browser że scroll nie bedzie preventDefault(), umożliwiając scroll optimization
- Cleanup cancelluje pending frame zapobiegając updates po unmount
- Zero zmian w behavior - nadal sync scrollLeft, tylko smooth timing

#### Krok 2: Refactor scroll sync w GridSkeleton.tsx

Plik: `src/components/ui/skeleton.tsx`

Opis zmian:
Identyczny refactor jak w VirtualizedGrid - GridSkeleton ma tę samą implementację scroll sync (linie 20-35). Dla consistency i identical UX w loading state.

Kod przed zmiana:

```typescript
// Sync scroll between header and body
useEffect(() => {
  const bodyEl = bodyScrollRef.current;
  const headerEl = headerScrollRef.current;

  if (!bodyEl || !headerEl) return;

  const handleScroll = () => {
    headerEl.scrollLeft = bodyEl.scrollLeft;
  };

  bodyEl.addEventListener("scroll", handleScroll);
  return () => bodyEl.removeEventListener("scroll", handleScroll);
}, []);
```

Kod po zmianie:

```typescript
// Sync scroll between header and body (optimized with rAF)
useEffect(() => {
  const bodyEl = bodyScrollRef.current;
  const headerEl = headerScrollRef.current;

  if (!bodyEl || !headerEl) return;

  // Animation frame ID for smooth scroll sync
  let animationFrameId: number | null = null;

  const handleScroll = () => {
    // Cancel any pending animation frame to avoid stacking
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId);
    }

    // Schedule header scroll update in next animation frame for smooth 60 FPS
    animationFrameId = requestAnimationFrame(() => {
      headerEl.scrollLeft = bodyEl.scrollLeft;
      animationFrameId = null;
    });
  };

  // Use passive listener for better scroll performance (non-blocking)
  bodyEl.addEventListener("scroll", handleScroll, { passive: true });

  return () => {
    bodyEl.removeEventListener("scroll", handleScroll);
    // Cancel pending animation frame on cleanup
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId);
    }
  };
}, []);
```

Uzasadnienie:
GridSkeleton musi mieć identyczne scroll behavior jak VirtualizedGrid dla consistent UX. Użytkownicy widzą skeleton podczas loading - scroll lag byłby równie irytujący w tym stanie.

### 5.3. Faza 3: Opcjonalne CSS optimization

Opcjonalnie: dodać will-change CSS hint dla header container jeśli performance improvements nie są wystarczające. Po testach manual może się okazać że rAF jest wystarczające i will-change nie jest potrzebny (unika over-optimization).

Plik: `src/components/grid/VirtualizedGrid.tsx`

Tylko jeśli potrzebne - dodać do header scroll container div (linia ~338):

```typescript
// Przed:
<div ref={headerScrollRef} className="flex flex-1 items-stretch overflow-x-hidden">

// Po (jeśli potrzebne):
<div
  ref={headerScrollRef}
  className="flex flex-1 items-stretch overflow-x-hidden"
  style={{ willChange: "scroll-position" }}
>
```

Uzasadnienie will-change:

- Informuje browser że scroll-position będzie się zmieniać często
- Browser może pre-optimize (GPU layer promotion)
- Może poprawić performance na wolniejszych urządzeniach
- Ale: over-use will-change może pogorszyć performance (memory overhead)
- Decision: dodać tylko jeśli testy pokażą że rAF sam nie wystarczy

### 5.4. Faza 4: Dodanie komentarzy dokumentujących

Plik: `src/components/grid/VirtualizedGrid.tsx`

Dodać komentarz nad scroll sync useEffect wyjaśniający optimization:

```typescript
/**
 * Scroll synchronization between header and body
 *
 * Optimized with requestAnimationFrame for smooth 60 FPS updates.
 * Passive listener ensures non-blocking scroll performance.
 *
 * Pattern:
 * 1. Scroll event triggers handleScroll
 * 2. Cancel any pending rAF to avoid stacking
 * 3. Schedule headerEl.scrollLeft update in next animation frame
 * 4. Browser batches update with other rAF callbacks for optimal timing
 *
 * Performance: eliminates scroll lag and jank on mid-range devices
 */
useEffect(() => {
  // ...existing code...
```

### 5.5. Faza 5: Aktualizacja testow (jeśli potrzebne)

Istniejące testy E2E powinny działać bez zmian (backward compatible), ale warto zweryfikować:

Plik: `e2e/grid-layout.spec.ts`

Test TC-GRID-LAYOUT-001 (linie 10-48) weryfikuje scroll sync - powinien pass bez zmian.

Opcjonalnie: dodać delay w teście aby dać czas rAF na execution:

```typescript
// W TC-GRID-LAYOUT-001, po scrollowaniu (linia 42):
await gridBody.evaluate((el, amount) => {
  el.scrollLeft = amount;
}, scrollAmount);

// Dodać micro-delay dla rAF (jeśli test flaky):
await page.waitForTimeout(50); // 3 animation frames @ 60 FPS

// Verify scroll occurred
const bodyScrollLeft = await gridBody.evaluate((el) => el.scrollLeft);
```

Uzasadnienie:
requestAnimationFrame może wprowadzić 16-32ms delay (1-2 frames). Jeśli test sprawdza scrollLeft natychmiast po scroll, może być race condition. Micro-delay (50ms = 3 frames) daje pewność że rAF został executed.

## 6. Plan weryfikacji i testowania

### 6.1. Unit tests

Brak - scroll sync jest integration-level feature, trudny do unit testowania (wymaga DOM i scroll events)

### 6.2. Integration tests

Brak - E2E test TC-GRID-LAYOUT-001 wystarcza dla weryfikacji funkcjonalności

### 6.3. E2E tests

- [ ] TC-GRID-LAYOUT-001: Header dates scroll synchronously with grid body - powinien pass bez zmian
- [ ] Weryfikacja że scroll sync działa na różnych viewportach (mobile, tablet, desktop)
- [ ] Weryfikacja że infinite scroll nadal działa poprawnie (backward loading)

### 6.4. Manual testing checklist

Performance testing (Chrome DevTools Performance tab):

- [ ] Before/after comparison: FPS during scrolling (target: 60 FPS after fix)
- [ ] Scripting time: powinien być niższy po fix (mniej synchronicznych DOM updates)
- [ ] Main thread work: powinno być bardziej batch'owane (rAF groupuje updates)

Visual smoothness testing:

- [ ] Slow scroll (scrollbar drag): header smooth, bez skoków
- [ ] Fast scroll (trackpad gesture): header nie pozostaje w tyle
- [ ] Inertial scroll (flick gesture na mobile/trackpad): smooth deceleration
- [ ] Edge cases: scrollowanie do początku/końca gridu

Device testing:

- [ ] Desktop Chrome (high-end): 60 FPS, smooth
- [ ] Desktop Safari: smooth, kompatybilność
- [ ] Desktop Firefox: smooth, kompatybilność
- [ ] Mobile Chrome (Android mid-range): smooth, bez lagów
- [ ] Mobile Safari (iOS): smooth, bez lagów
- [ ] Tablet (iPad): smooth z touch gestures

Regression testing:

- [ ] Keyboard navigation (Arrow keys): działa poprawnie
- [ ] Cell selection: nie zostało naruszone
- [ ] Sidebar open/close: działa poprawnie
- [ ] Infinite scroll backward: działa, scroll adjustment prawidłowy
- [ ] Minimap navigation: scroll sync działa z minimap
- [ ] Filters/sorting: grid re-renders poprawnie
- [ ] Accessibility (screen reader): ARIA labels nie zmienione

### 6.5. Performance benchmarks

Metryki do zmierzenia przed i po fix (Chrome DevTools Performance):

1. FPS during scroll:
   - Before: oczekiwane 30-45 FPS (laggy)
   - After: target 55-60 FPS (smooth)

2. Main thread time per scroll event:
   - Before: ~5-10ms (synchroniczny scrollLeft update)
   - After: ~1-2ms (schedule rAF tylko)

3. Total scripting time during 5s scroll test:
   - Before: ~200-300ms
   - After: ~100-150ms (fewer DOM updates)

4. Frame drops during 5s scroll test:
   - Before: ~50-100 dropped frames
   - After: <10 dropped frames

Test procedure:

1. Otwórz Chrome DevTools -> Performance
2. Start recording
3. Scrolluj grid w prawo przez 5 sekund (steady pace)
4. Stop recording
5. Analyze: FPS chart, Main thread flamegraph, Scripting time summary

## 7. Analiza ryzyka i mitigation

### 7.1. Zidentyfikowane ryzyka

#### Ryzyko 1: requestAnimationFrame może wprowadzić micro-delay

- Severity: LOW
- Prawdopodobienstwo: HIGH (rAF ma inherent 16ms max delay)
- Wpływ: Teoretycznie header może być opóźniony o 1-2 frames (16-32ms) względem gridu
- Mitigation:
  - W praktyce delay jest niezauważalny (60 FPS jest wystarczająco fast dla human perception)
  - Jeśli zauważalny, można throttle scroll event do max 60 updates/s zamiast rAF
  - Alternatywnie: CSS transform approach (Rozwiązanie B)

#### Ryzyko 2: Konflikt z @tanstack/react-virtual scroll handling

- Severity: LOW
- Prawdopodobienstwo: LOW
- Wpływ: Virtualizacja też reaguje na scroll events - może być race condition lub duplicate renders
- Mitigation:
  - @tanstack/react-virtual używa własnego scroll listener, nie powinno konflikować
  - Passive listener nie blokuje innych listeners
  - Jeśli problem: można coordinate z virtualization przez shared rAF

#### Ryzyko 3: E2E test może być flaky (race condition z rAF)

- Severity: LOW
- Prawdopodobienstwo: MEDIUM
- Wpływ: TC-GRID-LAYOUT-001 może czasami failować jeśli sprawdza scrollLeft zanim rAF się wykonał
- Mitigation:
  - Dodać micro-delay (50ms) w teście po scrollowaniu
  - Lub: waitForFunction sprawdzający że scrollLeft jest zsynchronizowany
  - Lub: zwiększyć tolerancję w assertion (już jest ±10px)

#### Ryzyko 4: Passive listener może nie być wspierany w starych browserach

- Severity: LOW
- Prawdopodobienstwo: LOW (passive listeners są w Chrome 51+, Safari 10+, Firefox 49+)
- Wpływ: Passive flag jest ignorowana w starych browserach, scroll nadal działa (tylko wolniej)
- Mitigation:
  - Browser support jest wystarczający (2016+)
  - Graceful degradation - browser ignoruje unknown flags
  - Można detect support i fallback: `const options = supportsPassive ? { passive: true } : false`

### 7.2. Rollback plan

Rollback jest trivial - revert jednego commita:

1. Jeśli wdrożone na production i występują problemy:

   ```bash
   git revert <commit-sha>
   git push origin master
   npm run build
   # Deploy
   ```

2. Jeśli problem wykryty w staging:
   - Merge master branch (przed fix) do staging
   - Lub: cherry-pick tylko fixes nie związane z scroll sync

3. Weryfikacja po rollback:
   - TC-GRID-LAYOUT-001 powinien pass (stary behavior)
   - Grid scrolluje (z lagiem, ale funkcjonalny)

### 7.3. Monitoring post-deployment

Metryki do monitorowania przez 7 dni po wdrożeniu:

Performance metrics (Real User Monitoring):

- [ ] FPS podczas scroll (target: >50 FPS dla 95% users)
- [ ] Main thread blocking time (target: <50ms dla scroll interactions)
- [ ] Lighthouse Performance score (powinno wzrosnąć o 1-2 punkty)

User feedback:

- [ ] Support tickets związane ze scrollowaniem gridu (powinno zmaleć)
- [ ] User complaints o "laggy grid" (powinno zmaleć)
- [ ] Session recordings: obserwacja scroll behavior (Hotjar/FullStory)

Error monitoring:

- [ ] JavaScript errors związane z scrollowaniem (powinno być zero)
- [ ] requestAnimationFrame errors (browser compatibility)
- [ ] Scroll event errors (passive listener issues)

Browser analytics:

- [ ] Browser breakdown: weryfikacja że fix działa we wszystkich browsers
- [ ] Device breakdown: weryfikacja że mobile/tablet/desktop smooth
- [ ] OS breakdown: weryfikacja że iOS/Android/Windows/macOS smooth

## 8. Zgodnosc ze standardami

### 8.1. Copilot-instructions.md compliance

React patterns: ✅

- Używa functional components (VirtualizedGrid, GridSkeleton)
- Używa hooks properly (useRef, useEffect, useCallback)
- Proper cleanup w useEffect return
- Dependencies array correct [onScrollElement]

Performance optimization: ✅

- requestAnimationFrame dla smooth rendering (GPU-friendly)
- Passive event listeners (scroll performance best practice)
- Cancel pending rAF dla avoid stacking (memory leak prevention)

Best practices: ✅

- Komentarze dokumentujące optimization pattern
- Kod jest readable i maintainable
- Zero side effects poza useEffect
- Proper TypeScript typing (number | null dla animationFrameId)

### 8.2. Tech-stack.md compliance

Dependencies: ✅

- Zero nowych dependencies
- Używa natywnego Web API (requestAnimationFrame, addEventListener)
- React 19 compatible
- TypeScript compatible

Build tools: ✅

- Brak zmian w build configuration
- Brak zmian w Vite/Astro config
- Zero impact na bundle size

Testing: ✅

- E2E tests kompatybilne (Playwright)
- Manual testing procedures defined
- Performance testing defined

### 8.3. Security checklist

- [x] Input validation - N/A (scroll events są browser-generated)
- [x] Authorization - N/A (UI optimization, nie dotyczy danych)
- [x] Authentication - N/A (UI optimization, nie dotyczy auth)
- [x] XSS protection - N/A (nie manipuluje HTML content)
- [x] CSRF protection - N/A (UI tylko, brak requests)
- [x] SQL injection - N/A (frontend tylko)
- [x] Secrets management - N/A (brak secrets)
- [x] Rate limiting - N/A (UI optimization)

### 8.4. Performance checklist

- [x] Bundle size impact - zero (brak nowych dependencies, ~10 lines added)
- [x] Rendering optimization - TAK (requestAnimationFrame, passive listener)
- [x] Loading states - nie dotyczy (scroll behavior, nie loading)
- [x] Error boundaries - nie dotyczy (scroll optimization, nie może throw)
- [x] Code splitting - nie dotyczy (VirtualizedGrid już jest code-splitted)

Performance gains:

- Reduced main thread blocking (scroll events nie blokują)
- Smooth 60 FPS rendering (rAF optimal timing)
- GPU acceleration potential (compositing layer optimization)
- Fewer DOM reflows (batched updates)

### 8.5. Accessibility checklist (dla UI)

- [x] ARIA attributes - nie zmienione (zero zmian w JSX)
- [x] Keyboard navigation - nie dotkniete (scroll sync nie wpływa)
- [x] Focus management - nie dotkniete (focus logic niezależny)
- [x] Semantic HTML - nie zmienione (zero zmian w structure)
- [x] Color contrast - N/A (scroll behavior, nie visual)
- [x] Screen reader testing - nie dotyczy (scroll sync nie wpływa na ARIA)

Scroll accessibility:

- Passive listener nie blokuje assistive technologies
- Smooth scroll może poprawić experience dla users with vestibular disorders
- Keyboard navigation (Arrow keys) nie jest dotknięta

## 9. Dokumentacja zmian

### 9.1. Changelog entry

```markdown
### Fixed

- [Grid Header Scroll Lag] Zoptymalizowano synchronizację scrollowania headera z gridem używając requestAnimationFrame i passive listeners dla smooth 60 FPS experience bez lagów i skoków
```

### 9.2. Aktualizacja README (jesli wymagana)

Brak - internal optimization, nie wpływa na API ani sposób użycia

### 9.3. Dokumentacja techniczna (jesli wymagana)

Opcjonalnie: dodać do AGENTS.md lub technical docs sekcję o scroll optimization pattern:

````markdown
## Scroll Optimization Pattern

Dla smooth scroll synchronization między elementami:

1. Używaj requestAnimationFrame dla batch updates (60 FPS)
2. Zawsze cancel pending rAF przed schedulowaniem nowego
3. Używaj passive listeners dla scroll events ({ passive: true })
4. Cleanup: cancel pending rAF w useEffect return

Pattern:

```typescript
let animationFrameId: number | null = null;

const handleScroll = () => {
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
  }
  animationFrameId = requestAnimationFrame(() => {
    // Update DOM
    animationFrameId = null;
  });
};

element.addEventListener("scroll", handleScroll, { passive: true });

// Cleanup
return () => {
  element.removeEventListener("scroll", handleScroll);
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
  }
};
```
````

``̀`

### 9.4. Release notes

```markdown
## Performance Improvements

Znacząco poprawiono płynność scrollowania gridu:

- Header z datami teraz płynnie synchronizuje się z gridem bez opóźnień
- Scrollowanie osiąga 60 FPS na większości urządzeń
- Eliminacja "skoków" i migotania dat podczas przewijania
- Lepsze performance na urządzeniach mid-range
```

## 10. Timeline i effort estimation

### 10.1. Estymacja czasu

- Implementacja: 30 minut
  - VirtualizedGrid.tsx refactor: 15 min
  - GridSkeleton.tsx refactor: 10 min
  - Code comments: 5 min

- Testowanie: 45 minut
  - E2E test verification: 10 min
  - Performance testing (DevTools): 15 min
  - Manual testing (desktop): 10 min
  - Manual testing (mobile): 10 min

- Code review: 15 minut
  - Review changes: 10 min
  - Approval: 5 min

- Deployment: 10 minut
  - Merge to master: 2 min
  - Build: 5 min
  - Deploy to production: 3 min

- Monitoring post-deployment: 30 minut (rozłożone na 2 dni)
  - Check error logs: 10 min (day 1)
  - Performance metrics: 10 min (day 2)
  - User feedback review: 10 min (day 2)

Łącznie: 2 godziny 10 minut (active work 1h 40min)

### 10.2. Zaleznosci

Blokujące:

- Brak - fix jest standalone, nie wymaga innych zmian

Blokowane:

- Brak - fix nie blokuje żadnych innych features

Nice to have (opcjonalnie po tym fix):

- Refactor na transform-based positioning (Rozwiązanie B) - jeśli chcemy "proper" fix
- Throttle dla scroll events jeśli rAF nie wystarczy
- will-change CSS optimization jeśli performance needs more boost

### 10.3. Sugerowany timeline

- Start: 2026-02-21 (piątek)
- Code complete: 2026-02-21 16:00 (1.5h od start)
- Testing complete: 2026-02-21 17:00
- Code review: 2026-02-21 17:30
- Deployment to production: 2026-02-21 18:00
- Monitoring: 2026-02-22 - 2026-02-24 (weekend + poniedziałek)

Fast-track: można wdrożyć w ten sam dzień (2h total)

## 11. Załączniki

### 11.1. Dotknięte pliki (lista pelna)

```
src/components/grid/VirtualizedGrid.tsx (linie 131-152)
src/components/ui/skeleton.tsx (linie 20-35)
```

### 11.2. Referencje

- Related plan: .agents/fixes/fix-grid-ui-layout-improvements-plan.md (podobny problem, scroll sync implementation)
- MDN requestAnimationFrame: https://developer.mozilla.org/en-US/docs/Web/API/window/requestAnimationFrame
- MDN Passive listeners: https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener#improving_scrolling_performance_with_passive_listeners
- Chrome DevTools Performance: https://developer.chrome.com/docs/devtools/performance

### 11.3. Screenshoty/diagramy

Flow diagram - Before (sync scroll):

```
Scroll event → handleScroll() → headerEl.scrollLeft = X → DOM reflow → Paint
     ↓                                                           ↓
Main thread blocked                                       Janky frame
```

Flow diagram - After (rAF scroll):

```
Scroll event → handleScroll() → requestAnimationFrame(update)
     ↓                                      ↓
Main thread continues                 Next frame: update scrollLeft → Paint
                                                      ↓
                                               Smooth 60 FPS
```

### 11.4. Error logs/stack traces

Brak - problem jest performance/UX issue, nie runtime error

Potencjalne problemy do obserwowania:

```javascript
// Jeśli rAF nie jest wspierany (very old browsers):
// TypeError: requestAnimationFrame is not a function

// Mitigation: graceful degradation
const rafSupport = typeof requestAnimationFrame !== "undefined";
if (rafSupport) {
  animationFrameId = requestAnimationFrame(() => {
    headerEl.scrollLeft = bodyEl.scrollLeft;
  });
} else {
  // Fallback: synchronous update (old behavior)
  headerEl.scrollLeft = bodyEl.scrollLeft;
}
```

Monitoring queries (post-deployment):

```javascript
// Sentry/error tracking:
// Filter: keyword "requestAnimationFrame" OR "cancelAnimationFrame"
// Expected: zero errors

// Performance monitoring:
// Metric: FPS during scroll
// Expected: >50 FPS for 95% percentile

// User feedback:
// Keywords: "laggy", "slow scroll", "jumping dates"
// Expected: decrease vs. previous week
```
