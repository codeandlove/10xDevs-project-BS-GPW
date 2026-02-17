# Plan Implementacji Feature - Grid Weekday & Weekend Enhancements

Data utworzenia: 2026-02-17
Tytul feature: Rozszerzenia gridu - dni tygodnia, weekendy i wypełnienie widoku
Typ: UI/UX Enhancement
Priorytet: MEDIUM

## 1. Podsumowanie wykonawcze

### 1.1. Opis funkcjonalnosci

Rozbudowa komponentu VirtualizedGrid (kalendarz zdarzen Black Swan) o wizualne ulepszenia: wyswietlanie nazw dni tygodnia w headerze, wyraźne oznaczenie weekendow (Sobota, Niedziela) ukosnym wzorem graficznym, wypelnienie pustej przestrzeni w widoku "week" przyszlymi datami oraz subtelne podswietlenie kolumny z dzisiejsza data dla lepszej orientacji czasowej.

### 1.2. Value proposition

Uzytkownik:

- Latwiejsza orientacja w czasie - natychmiastowe rozpoznanie dnia tygodnia bez analizowania daty
- Klarowne rozroznienie dni roboczych od weekendow (wazne dla tradingu - brak sesji w weekendy)
- Lepsze wykorzystanie przestrzeni ekranu - grid nie jest "obciety" w widoku tygodnia
- Wizualna orientacja "gdzie jest dzisiaj" bez czytania dat

Biznes:

- Lepsza UX prowadzi do wyzszego engagement z gridem
- Profesjonalny wyglad aplikacji finansowej (industry standard)
- Redukuje cognitive load uzytkownika

### 1.3. Zakres wpływu

Nowe komponenty/moduły:

- Brak nowych komponentow (modyfikacje istniejacych)

Modyfikowane komponenty/moduły:

- src/components/grid/VirtualizedGrid.tsx - header z dniami tygodnia, logika wypelniania przyszlymi datami
- src/components/grid/GridCell.tsx - stylowanie weekendow i dzisiejszej daty
- src/components/grid/BlurredDemoGrid.tsx - te same zmiany dla demo grid
- src/lib/ui-utils.ts - nowe utility functions (getWeekdayShort, isWeekend, isToday)
- src/types/ui.types.ts - rozszerzenie GridCellData o isWeekend, isToday

Grupa docelowa uzytkownikow: Wszyscy uzytkownicy z dostepem do gridu (authenticated users)

Dotknięte srodowiska: development, staging, production

### 1.4. Priorytet i MVP scope

MEDIUM - Wazny feature poprawiajacy UX, ale nie blokujacy core functionality. Uzytkownik moze korzystac z gridu bez tych ulepszen, jednak znaczaco zwieksza komfort.

MVP (must-have):

- Nazwy dni tygodnia w headerze (Pn. Wt. Śr. Cz. Pt. Sb. Nd.)
- Wizualne oznaczenie weekendow (ukosny pattern gray-100/gray-200)
- Komórki weekendowe nieinteraktywne (pointer-events-none)

Nice-to-have (moze byc dodane pozniej):

- Wypelnienie widoku "week" przyszlymi datami (rozciagniecie gridu w prawo)
- Pionowe podswietlenie kolumny z dzisiejsza data
- Dodatkowe wypelnienie wierszy w pionie (jesli grid jest krotki)
- Animacje transition przy zmianie range

## 2. Szczegolowa analiza wymagan

### 2.1. Wymagania funkcjonalne

1. Header gridu wyswietla skrocone nazwy dni tygodnia nad datami - MUST
   - Format: "Pn." "Wt." "Śr." "Cz." "Pt." "Sb." "Nd."
   - Pozycja: Gorna czesc komórki headera (podzielenie w pionie)
   - Data: Dolna czesc komórki headera (mniejsza czcionka)

2. Wizualne odroznienie weekendow (Sobota, Niedziela) - MUST
   - Pattern: Ukosne linie pod katem 45 stopni
   - Kolory: Alternujace gray-100 i gray-200
   - Zakres: Cala kolumna pionowo (header + wszystkie komórki)
   - Interaktywnosc: Brak (pointer-events-none, komórki nie klikalne)

3. Wypelnienie pustej przestrzeni w widoku "week" - SHOULD
   - Logika: Jesli range="week" i grid nie wypelnia viewport, dodac przyszle daty
   - Zakres: Do ~14 dni od dzisiaj (aby pokryc dwa tygodnie)
   - Efekt: Grid rozciagniety do prawej krawedzi bez "obciecia"

4. Podswietlenie kolumny z dzisiejsza data - SHOULD
   - Zakres: Cala kolumna pionowo (header + komórki)
   - Styl: Subtelne bg-gray-100 dla pustych komórek, ring-2 ring-blue-300/40 dla komórek z eventami
   - Header: bg-blue-50/50 + ring-2 ring-inset ring-blue-300

5. Responsywnosc - MUST
   - Wszystkie zmiany musza dzialac na mobile, tablet, desktop
   - Czcionki i spacing adaptuja sie do breakpointu

### 2.2. Wymagania niefunkcjonalne

Performance:

- Brak degradacji renderowania (virtual scrolling pozostaje wydajny)
- CSS patterns zamiast JavaScript rendering (zero overhead)
- Dodanie max 7-14 kolumn nie moze powodowac lagów

Accessibility:

- ARIA labels aktualizowane o informacje "weekend" w aria-label
- Keyboard navigation dziala na weekendach (mimo pointer-events-none)
- Screen reader informuje o dniu tygodnia i weekendzie
- Color contrast utrzymany dla tekstu (minimum WCAG AA)

Security:

- Brak impact (czysto UI changes)

Compatibility:

- Przegladarki: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- Mobile: iOS Safari 14+, Chrome Android 90+
- Screen sizes: 320px (mobile) do 4K desktop

### 2.3. User stories i use cases

#### User Story 1: Latwe rozpoznawanie dni tygodnia

Jako trader analizujacy zdarzenia Black Swan
Chce widziec nazwy dni tygodnia (Pn, Wt, ...) obok dat w headerze gridu
Aby szybko orientowac sie "ktory dzien tygodnia" bez liczenia w głowie od dzisiejszego dnia

Acceptance Criteria:

- [ ] Header gridu wyswietla skrocone nazwy dni tygodnia nad datami
- [ ] Nazwy sa czytelne na mobile (min 10px) i desktop (min 11px)
- [ ] Format nazw jest polski: "Pn." "Wt." "Śr." "Cz." "Pt." "Sb." "Nd."
- [ ] Data jest ponizej nazwy dnia (mniejsza czcionka)

#### User Story 2: Wizualne rozroznienie weekendow

Jako uzytkownik przegladajacy kalendarz zdarzen
Chce aby weekendy (Sobota, Niedziela) byly wyraznie oznaczone wizualnie
Aby od razu wiedziec ze w tych dniach nie ma sesji gieldowych i nie ma sensu szukac tam zdarzen

Acceptance Criteria:

- [ ] Kolumny Sobota i Niedziela maja ukosny pattern (linie 45 stopni)
- [ ] Pattern jest subtelny ale wyraźnie odrozniajacy od dni roboczych
- [ ] Komórki weekendowe nie sa klikalne (pointer-events-none)
- [ ] W weekendowych komórkach nigdy nie renderuje sie event (logika biznesowa)
- [ ] Aria-label zawiera informacje "(weekend)"

#### User Story 3: Pelny widok tygodnia bez obciecia

Jako uzytkownik pracujacy w widoku "Tydzien"
Chce aby grid wypelnial cala dostepna przestrzen pozioma
Aby nie widziec "obcietego" gridu z pustymi obszarami po prawej

Acceptance Criteria:

- [ ] W widoku "week" grid pokazuje przynajmniej 7 kolumn dat (moze wiecej)
- [ ] Jesli dzisiaj jest np. czwartek, grid pokazuje: czw-pt (dni historyczne) + sob-nd-pn-wt-śr (przyszle)
- [ ] Przyszle daty sa widoczne ale maja puste komórki (brak eventow)
- [ ] Grid rozciaga sie do prawej krawedzi viewport
- [ ] Nie ma poziomego scrollbara jesli niepotrzebny

#### User Story 4: Szybka orientacja "gdzie jest dzisiaj"

Jako uzytkownik przegladajacy dane historyczne i biezace
Chce widziec wyrazne podswietlenie kolumny z dzisiejsza data
Aby od razu wiedziec "granice" między historia a przyszloscia/dniem dzisiejszym

Acceptance Criteria:

- [ ] Kolumna z dzisiejsza data ma subtelne tlo odrozniajace ja od innych dni
- [ ] Header dzisiejszej daty ma dodatkowe podswietlenie (np. ring lub bg)
- [ ] Komórki z eventami w dzisiejszej kolumnie maja dodatkowy ring/outline
- [ ] Podswietlenie jest subtelne - nie przeszkadza w czytaniu danych
- [ ] Dziala na wszystkich breakpointach

### 2.4. Edge cases i scenariusze alternatywne

Edge case 1: Zmiana range z "week" na "month" - wypelnienie nie powinno dzialac dla month/quarter

- Oczekiwane: Logika wypelniania przyszlymi datami aktywna tylko dla range="week"
- Fallback: Dla month/quarter zachowanie bez zmian (7/30/90 dni wstecz)

Edge case 2: Dzisiaj jest niedziela (weekend)

- Oczekiwane: Kolumna niedzieli ma ZAROWNO weekend pattern JAK I today highlight
- Rozwiazanie: Warunkowe laczenie stylow (weekend pattern + today ring)

Edge case 3: Grid ma tylko 1-2 symbole (krotkie wiersze)

- Oczekiwane: Wypelnienie pionowe nie jest priorytetem w MVP
- Fallback: Pozostawienie pustej przestrzeni ponizej (nie critical dla UX)

Edge case 4: Urzadzenia bardzo waskie (320px mobile)

- Oczekiwane: Dni tygodnia wciaz czytelne (skrot max 3 znaki + kropka)
- Fallback: Mozliwe poziome scrollowanie (akceptowalne dla malych ekranow)

Edge case 5: Zmiana strefy czasowej przegladarki

- Oczekiwane: isToday() poprawnie wykrywa dzisiejsza date w timezone uzytkownika
- Implementacja: new Date() w JavaScript uzywamy TZ przegladarki

Error scenario 1: Brak danych o datach (pusta tablica)

- Obsluga: Grid renderuje pusty state (istniejaca logika)
- Nie blokuje: Feature dziala tylko gdy sa daty

Error scenario 2: Nieprawidlowy format daty z API

- Obsluga: getWeekdayShort zwraca fallback "?" lub skip rendering
- Logowanie: Console.warn dla debugging

### 2.5. Integracje i zaleznosci

#### Wewnetrzne zaleznosci:

- VirtualizedGrid.tsx - główny komponent do modyfikacji, integruje wszystkie zmiany
- GridCell.tsx - modyfikacja stylowania na podstawie props isWeekend, isToday
- BlurredDemoGrid.tsx - te same zmiany co VirtualizedGrid (demo dla users bez subscription)
- getDatesInRange() z ui-utils.ts - rozszerzenie o parametr fillToFullWeek
- GridContext - bez zmian (nie dotykamy state management)

#### External APIs / Third-party services:

- Brak - feature czysto frontend

#### Zaleznosci od innych features:

- Grid virtualization musi byc gotowy (jest ✅)
- GridCell component musi istniec (jest ✅)
- Responsywne breakpointy musza byc zdefiniowane (sa ✅)

Blokujace:

- Brak - mozna implementowac natychmiast

## 3. Architektura i design

### 3.1. Diagram architektury

```
[VirtualizedGrid]
    |
    +-- [Header Row]
    |     +-- [Dates Loop] -> getWeekdayShort(date) -> "Pn." / "Sb." etc
    |     |                -> isWeekend(date) -> apply pattern style
    |     |                -> isToday(date) -> apply highlight style
    |     +-- [Column Headers] (enhanced)
    |
    +-- [Body Rows]
          +-- [Virtual Columns Loop]
                +-- [GridCell] (receives isWeekend, isToday props)
                      -> CSS: weekend pattern (repeating-linear-gradient)
                      -> CSS: today highlight (ring + bg)

[ui-utils.ts]
    +-- getDatesInRange(range, fillToFullWeek?) -> string[]
    +-- getWeekdayShort(date) -> "Pn." | "Wt." | ... | "Nd."
    +-- isWeekend(date) -> boolean
    +-- isToday(date) -> boolean
```

### 3.2. Flow danych

1. VirtualizedGrid renderuje z props: events, range="week"
2. useMemo wywoluje getDatesInRange(range, true) -> zwraca 7-14 dat (historyczne + przyszle)
3. Header loop:
   - Dla kazdej daty wywoluje getWeekdayShort(date) -> "Pn." etc
   - Dla kazdej daty wywoluje isWeekend(date) -> true/false
   - Dla kazdej daty wywoluje isToday(date) -> true/false
   - Renderuje <div> z warunkowym className (weekend pattern, today highlight)
4. Body loop:
   - Virtual columns renderuja GridCell z props: data={...}, isWeekend, isToday
5. GridCell component:
   - Jesli isWeekend=true: aplikuje repeating-linear-gradient + pointer-events-none
   - Jesli isToday=true: aplikuje ring-2 + bg-gray-100
   - Jesli eventId=null i isWeekend=true: pokazuje pattern bez interakcji

### 3.3. Model danych

#### Nowe typy/interfejsy:

Plik: src/types/ui.types.ts

```typescript
// Modyfikacja istniejacych interfejsow:

export interface GridCellEmpty {
  eventId: null;
  symbol: string;
  date: string; // YYYY-MM-DD
  isWeekend?: boolean; // NOWE - czy data jest weekend (Sob/Nd)
  isToday?: boolean; // NOWE - czy data jest dzisiaj
}

export interface GridCellWithEvent {
  eventId: string;
  symbol: string;
  date: string; // YYYY-MM-DD
  eventType: EventType;
  percentChange: number;
  hasSummary: boolean;
  isWeekend?: boolean; // NOWE - czy data jest weekend
  isToday?: boolean; // NOWE - czy data jest dzisiaj
}
```

Uzasadnienie:

- Dodajemy opcjonalne pola isWeekend i isToday do GridCellData
- Backwards compatible (opcjonalne, istniejacy kod nie psuje sie)
- GridCell otrzymuje te informacje jako props i moze warunkowo stylowac

#### Nowe tabele w bazie danych:

Brak - feature czysto frontend

#### Modyfikacje istniejacych tabel:

Brak

### 3.4. Komponenty i moduły

#### Nowe komponenty:

Brak - modyfikujemy istniejace

#### Modyfikowane komponenty:

- src/components/grid/VirtualizedGrid.tsx
  - Header: Podzielenie komórki header na dwie czesci (weekday + date)
  - Header: Warunkowe stylowanie (weekend pattern, today highlight)
  - Body: Przekazywanie isWeekend, isToday do GridCell
  - useMemo: Wywolanie getDatesInRange(range, true) dla range="week"

- src/components/grid/GridCell.tsx
  - Przyjmowanie props: data.isWeekend, data.isToday
  - Warunkowe stylowanie: repeating-linear-gradient dla weekendow
  - Warunkowe stylowanie: ring/bg dla dzisiejszej daty
  - Dodanie data-is-weekend, data-is-today do atrybutow DOM (testowanie)
  - Aktualizacja aria-label: "(weekend)" dla weekendow

- src/components/grid/BlurredDemoGrid.tsx
  - Te same zmiany co VirtualizedGrid (duplikacja logiki)
  - Demo grid tez musi miec dni tygodnia i weekendy

#### Nowe serwisy/hooki:

Brak - uzywamy pure functions

#### Nowe utilities:

Plik: src/lib/ui-utils.ts

```typescript
/**
 * Get short weekday name in Polish
 * @param dateString - Date in YYYY-MM-DD format
 * @returns "Pn." | "Wt." | "Śr." | "Cz." | "Pt." | "Sb." | "Nd."
 */
export function getWeekdayShort(dateString: string): string {
  const date = new Date(dateString);
  const dayIndex = date.getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday
  const weekdays = ["Nd.", "Pn.", "Wt.", "Śr.", "Cz.", "Pt.", "Sb."];
  return weekdays[dayIndex];
}

/**
 * Check if date is a weekend (Saturday or Sunday)
 * @param dateString - Date in YYYY-MM-DD format
 * @returns true if Saturday or Sunday
 */
export function isWeekend(dateString: string): boolean {
  const date = new Date(dateString);
  const dayIndex = date.getDay();
  return dayIndex === 0 || dayIndex === 6; // Sunday=0, Saturday=6
}

/**
 * Check if date is today
 * @param dateString - Date in YYYY-MM-DD format
 * @returns true if date matches today's date
 */
export function isToday(dateString: string): boolean {
  const date = new Date(dateString);
  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

/**
 * Get dates in range - MODYFIKACJA istniejącej funkcji
 * @param range - "week" | "month" | "quarter"
 * @param fillToFullWeek - (optional) For week view, extend with future dates
 * @returns Array of date strings in YYYY-MM-DD format
 */
export function getDatesInRange(range: DateRange, fillToFullWeek = false): string[] {
  // Istniejaca logika...
  const reversedDates = dates.reverse();

  // NOWA LOGIKA:
  if (fillToFullWeek && range === "week") {
    const lastDate = new Date(reversedDates[reversedDates.length - 1]);
    // Add up to 7 more days into future
    for (let i = 1; i <= 7; i++) {
      const futureDate = new Date(lastDate);
      futureDate.setDate(lastDate.getDate() + i);
      reversedDates.push(futureDate.toISOString().split("T")[0]);
    }
  }

  return reversedDates;
}
```

#### Nowe API endpoints:

Brak - feature czysto frontend

## 4. Propozycje podejsc architektonicznych

### 4.1. Podejscie A: CSS-based weekend pattern + pure function utilities (REKOMENDOWANE)

#### Opis:

Wykorzystanie CSS repeating-linear-gradient dla weekend pattern (zero JavaScript overhead). Nowe utility functions (getWeekdayShort, isWeekend, isToday) jako pure functions w ui-utils.ts. Modyfikacja VirtualizedGrid i GridCell o warunkowe stylowanie. Rozszerzenie getDatesInRange o parametr fillToFullWeek dla widoku week.

#### Architektura:

- UI Layer: VirtualizedGrid, GridCell (React components)
- Utils Layer: getWeekdayShort, isWeekend, isToday, getDatesInRange (pure functions)
- Styling: Tailwind classes + inline repeating-linear-gradient CSS
- State: Brak nowego state (wszystko computed from dates array)
- Rendering: Virtual scrolling bez zmian (performance bez degradacji)

#### Zakres zmian:

Nowe pliki:

- Brak

Modyfikowane pliki:

- src/components/grid/VirtualizedGrid.tsx (~40 linii zmian: header restructure, props passing)
- src/components/grid/GridCell.tsx (~30 linii zmian: weekend + today styling)
- src/components/grid/BlurredDemoGrid.tsx (~40 linii zmian: duplikacja logiki VirtualizedGrid)
- src/lib/ui-utils.ts (~50 linii dodane: 3 nowe funkcje + modyfikacja getDatesInRange)
- src/types/ui.types.ts (~4 linie dodane: isWeekend?, isToday? w interfejsach)

Nowe dependencies:

- Brak (uzywamy czystego CSS i istniejacych bibliotek)

Database migrations:

- Brak

Testy:

- Unit tests: ui-utils.test.ts (~60 linii: testy dla 3 nowych funkcji)
- E2E tests: grid-rendering.spec.ts (~30 linii: weryfikacja weekday headers, weekend styling)
- Integration tests: Brak (nie ma integracji z external services)

#### Zalety:

- Prosta implementacja - CSS patterns sa natywne, zero overhead
- Performance - brak JavaScript w rendering loop, wszystko w CSS
- Maintainable - pure functions latwe do testowania
- Backwards compatible - opcjonalne props nie psuja istniejacego kodu
- Scalable - latwo dodac wiecej dni/kolumn bez degradacji

#### Wady:

- Ograniczona customizacja pattern - repeating-linear-gradient ma ograniczenia
- Duplikacja logiki - VirtualizedGrid i BlurredDemoGrid wymagaja tych samych zmian
- Minimal flexibility - jesli w przyszlosci chcemy animowany pattern, potrzeba refactor

#### Effort: M (Medium)

Uzasadnienie:

- 4 pliki do modyfikacji (VirtualizedGrid, GridCell, BlurredDemoGrid, ui-utils)
- 1 plik typow do rozszerzenia
- ~150-180 linii kodu (nowe + modyfikacje)
- Testy unit + E2E (~90 linii)
- Prosta logika bez złozonych integracj
- Szacowany czas: 1.5-2 dni robocze (12-16h)

#### Zlożonosc: LOW

Uzasadnienie:

- Pure functions (brak side effects)
- Warunkowe stylowanie (if/else logic)
- Zero state management
- Zero API calls
- Dobrze zdefiniowane wymagania

#### Impact na system: LOW

Uzasadnienie:

- Izolowane zmiany w grid components
- Brak wpływu na inne moduły (sidebar, filters, auth)
- Backwards compatible (opcjonalne props)
- Brak zmian w API lub bazie danych
- Virtual scrolling pozostaje bez zmian (performance OK)

#### Zgodnosc ze standardami:

- Copilot-instructions.md: ✅ - Pure functions, React.memo, responsywny design, WCAG compliance
- Tech-stack.md: ✅ - React + TypeScript + Tailwind bez nowych dependencies
- Best practices: ✅ - Pure functions, conditional styling, accessible ARIA

### 4.2. Podejscie B: SVG pattern definitions + React Context dla theme

#### Opis:

Zamiast CSS gradient, definiujemy SVG <pattern> w <defs> i reuzywamy przez fill="url(#weekend-pattern)". React Context przechowuje theme config (weekend colors, today colors). GridCell subskrybuje context i aplikuje pattern dynamicznie.

#### Zakres zmian:

Nowe pliki:

- src/contexts/GridThemeContext.tsx (~80 linii: context + provider)
- src/components/grid/SVGPatternDefs.tsx (~40 linii: SVG defs)

Modyfikowane pliki:

- src/components/grid/VirtualizedGrid.tsx (~50 linii: Context.Provider, SVG render)
- src/components/grid/GridCell.tsx (~40 linii: useContext, SVG styling)
- src/components/grid/BlurredDemoGrid.tsx (~50 linii)
- src/lib/ui-utils.ts (~50 linii: te same funkcje)
- src/types/ui.types.ts (~10 linii: theme interface)

#### Zalety:

- Pełna kontrola nad pattern (dowolne kształty, kolory, animacje)
- Theme switching - latwo zmieniac kolory weekend/today przez context
- Skalowalne SVG (sharp na kazdym DPI)

#### Wady:

- Większa złożonosc - Context + Provider + SVG defs
- Overhead - SVG w DOM zajmuje pamiec (mimo ze hidden)
- Overkill dla prostego pattern - CSS wystarczy

#### Effort: L (Large)

~3-4 dni (dodatkowy context, SVG defs, testing theme switching)

#### Zlożonosc: MEDIUM

Context management, SVG rendering, theme logic

#### Impact na system: MEDIUM

Nowy context wpływa na component tree, SVG w DOM

#### Zgodnosc ze standardami:

- Copilot-instructions.md: ⚠️ - Context OK, ale czy potrzebny dla tego use case?
- Tech-stack.md: ✅ - React Context jest w stacku
- Best practices: ⚠️ - Overengineering dla prostego pattern

### 4.3. Podejscie C: Canvas rendering dla weekend cells

#### Opis:

Kazda weekend cell renderuje <canvas> z custom pattern narysowanym przez Canvas 2D API. GridCell component wywoluje useEffect z canvas draw logic.

#### Zakres zmian:

Nowe pliki:

- src/lib/canvas-patterns.ts (~100 linii: draw functions)

Modyfikowane pliki:

- src/components/grid/GridCell.tsx (~80 linii: canvas ref, useEffect, draw logic)
- src/lib/ui-utils.ts (~50 linii)
- src/types/ui.types.ts (~4 linie)

#### Zalety:

- Maksymalna kontrola - dowolny pattern, animacje, efekty
- Pixel-perfect rendering

#### Wady:

- Performance overhead - canvas draw dla kazdej weekend cell przy kazdym render
- Complexity - canvas API, retina scaling, memory management
- Overkill - CSS wystarczy dla ukosnego pattern

#### Effort: L (Large)

~3-4 dni (canvas logic, retina support, performance optimization)

#### Zlożonosc: HIGH

Canvas 2D API, useEffect lifecycle, memory leaks prevention

#### Impact na system: MEDIUM-HIGH

Canvas elements w DOM, draw calls w render cycle

#### Zgodnosc ze standardami:

- Copilot-instructions.md: ❌ - Overengineering, performance risk
- Tech-stack.md: ⚠️ - Canvas API nie jest czescią stack (nie uzywamy nigdzie)
- Best practices: ❌ - Zbyt złożone dla prostego pattern

## 5. Rekomendacja i uzasadnienie

### 5.1. Wybrane podejscie

PODEJSCIE A - CSS-based weekend pattern + pure function utilities

### 5.2. Uzasadnienie wyboru

Najlepiej realizuje wymagania biznesowe poprzez:

- Prosty, czytelny kod - pure functions latwe do zrozumienia i testowania
- Zero JavaScript w rendering loop - CSS pattern renderuje sie natywnie przez GPU
- Spełnia wszystkie wymagania MVP - weekday names, weekend pattern, today highlight, fillToFullWeek

Skaluje sie w przyszlosci:

- Latwo dodac wiecej utility functions (np. isHoliday, isMarketClosed)
- Mozna latwo rozszerzyc o custom date ranges
- Performance nie degraduje sie przy dodawaniu kolumn/wierszy

Jest zgodne ze standardami projektu i architektura:

- Pure functions pasuja do istniejacego ui-utils.ts
- React.memo w GridCell pozostaje wydajne
- Tailwind conditional classes sa standard w projekcie
- Brak nowych dependencies (zgodnosc z tech-stack.md)

Minimalizuje zlożonosc i technical debt:

- Brak Context (nie potrzebny dla statycznych pattern)
- Brak Canvas (overkill dla prostego gradient)
- Backwards compatible (opcjonalne props)
- Izolowane zmiany (low impact)

Optymalizuje user experience:

- Natychmiastowe rozpoznawanie dni tygodnia
- Wyrazne odroznienie weekendow
- Subtelne podswietlenie "dzisiaj"
- Responsywne na wszystkich urzadzeniach

Optymalizuje performance:

- CSS patterns renderowane przez GPU
- Zero JavaScript overhead w render loop
- Virtual scrolling pozostaje bez zmian
- Brak dodatkowych DOM nodes (SVG/Canvas)

## 6. Szczegolowy plan implementacji

### 6.1. Faza 1: Przygotowanie

- [ ] Utworzenie brancha: feature/grid-weekday-weekend-enhancements
- [ ] Weryfikacja lokalnego srodowiska (npm run dev dziala)
- [ ] Backup istniejacych plikow (opcjonalne - git protection)
- [ ] Przegladniecie dokumentacji Tailwind dla repeating-linear-gradient

### 6.2. Faza 2: Implementacja utility functions

#### Krok 1: Dodanie funkcji pomocniczych do ui-utils.ts

Cel: Stworzyc pure functions do obliczania weekday, weekend, today

Plik do modyfikacji:

- src/lib/ui-utils.ts

Opis implementacji:
Dodajemy 3 nowe funkcje na koncu pliku (przed istniejacym export):

1. getWeekdayShort(dateString): zwraca "Pn." ... "Nd."
2. isWeekend(dateString): zwraca true dla Sob/Nd
3. isToday(dateString): zwraca true jesli data === today

Modyfikujemy istniejaca funkcje getDatesInRange:

- Dodajemy parametr fillToFullWeek = false
- Jesli fillToFullWeek=true && range="week", dodajemy 7 dni w przyszlosc

Kod do dodania:

```typescript
/**
 * Get short weekday name in Polish (Pn., Wt., Śr., Cz., Pt., Sb., Nd.)
 */
export function getWeekdayShort(dateString: string): string {
  const date = new Date(dateString);
  const dayIndex = date.getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday
  const weekdays = ["Nd.", "Pn.", "Wt.", "Śr.", "Cz.", "Pt.", "Sb."];
  return weekdays[dayIndex];
}

/**
 * Check if date is a weekend (Saturday or Sunday)
 */
export function isWeekend(dateString: string): boolean {
  const date = new Date(dateString);
  const dayIndex = date.getDay();
  return dayIndex === 0 || dayIndex === 6; // Sunday or Saturday
}

/**
 * Check if date is today
 */
export function isToday(dateString: string): boolean {
  const date = new Date(dateString);
  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

// Modyfikacja istniejącej funkcji getDatesInRange:
export function getDatesInRange(range: DateRange, fillToFullWeek = false): string[] {
  // ...existing code...

  const reversedDates = dates.reverse(); // Oldest to newest

  // NOWA LOGIKA dla widoku week:
  if (fillToFullWeek && range === "week") {
    const lastDate = new Date(reversedDates[reversedDates.length - 1]);
    // Add up to 7 more days into future to ensure full week coverage
    for (let i = 1; i <= 7; i++) {
      const futureDate = new Date(lastDate);
      futureDate.setDate(lastDate.getDate() + i);
      reversedDates.push(futureDate.toISOString().split("T")[0]);
    }
  }

  return reversedDates;
}
```

Uzasadnienie:

- Pure functions bez side effects - latwe do testowania
- getWeekdayShort: tablica weekdays odpowiada dayIndex (0-6)
- isWeekend: sprawdza czy dayIndex = 0 (Nd) lub 6 (Sob)
- isToday: porownuje rok, miesiac, dzien (pomija czas)
- fillToFullWeek: opcjonalny parametr zachowuje backwards compatibility

Acceptance criteria dla tego kroku:

- [ ] Funkcje getWeekdayShort, isWeekend, isToday sa dodane
- [ ] getDatesInRange przyjmuje parametr fillToFullWeek
- [ ] Brak bledow TypeScript compilation
- [ ] Funkcje sa wyeksportowane (export function)

#### Krok 2: Unit testy dla nowych utility functions

Cel: Pokryc nowe funkcje testami jednostkowymi

Plik do modyfikacji:

- src/lib/ui-utils.test.ts

Opis implementacji:
Dodajemy nowy describe block z testami dla 3 nowych funkcji + modyfikacja getDatesInRange.

Kod do dodania:

```typescript
describe("UI Utils - Weekday and Weekend", () => {
  it("getWeekdayShort should return correct Polish weekday", () => {
    expect(getWeekdayShort("2026-02-16")).toBe("Pn."); // Monday
    expect(getWeekdayShort("2026-02-17")).toBe("Wt."); // Tuesday
    expect(getWeekdayShort("2026-02-21")).toBe("Sb."); // Saturday
    expect(getWeekdayShort("2026-02-22")).toBe("Nd."); // Sunday
  });

  it("isWeekend should return true for Saturday and Sunday", () => {
    expect(isWeekend("2026-02-21")).toBe(true); // Saturday
    expect(isWeekend("2026-02-22")).toBe(true); // Sunday
  });

  it("isWeekend should return false for weekdays", () => {
    expect(isWeekend("2026-02-16")).toBe(false); // Monday
    expect(isWeekend("2026-02-17")).toBe(false); // Tuesday
    expect(isWeekend("2026-02-20")).toBe(false); // Friday
  });

  it("isToday should return true for today's date", () => {
    const today = new Date().toISOString().split("T")[0];
    expect(isToday(today)).toBe(true);
  });

  it("isToday should return false for past/future dates", () => {
    expect(isToday("2020-01-01")).toBe(false);
    expect(isToday("2030-12-31")).toBe(false);
  });

  it("getDatesInRange with fillToFullWeek=true should extend week range", () => {
    const dates = getDatesInRange("week", true);
    expect(dates.length).toBeGreaterThanOrEqual(7);
    expect(dates.length).toBeLessThanOrEqual(14);
  });

  it("getDatesInRange with fillToFullWeek=false should not extend", () => {
    const dates = getDatesInRange("week", false);
    expect(dates.length).toBe(7);
  });

  it("getDatesInRange should not extend month/quarter regardless of fillToFullWeek", () => {
    const monthDates = getDatesInRange("month", true);
    expect(monthDates.length).toBe(30);

    const quarterDates = getDatesInRange("quarter", true);
    expect(quarterDates.length).toBe(90);
  });
});
```

Uzasadnienie:

- Testy pokrywaja happy path i edge cases
- Weryfikujemy poprawne dni tygodnia dla konkretnych dat
- Sprawdzamy weekend detection (Sob/Nd vs weekdays)
- Testujemy isToday z dzisiejsza data i datami historycznymi/przyszlymi
- Weryfikujemy fillToFullWeek logic dla week vs month/quarter

Acceptance criteria:

- [ ] Wszystkie testy przechodza (npm run test)
- [ ] Code coverage dla nowych funkcji > 90%

### 6.3. Faza 3: Rozszerzenie typow TypeScript

#### Krok 3: Dodanie isWeekend i isToday do GridCellData

Cel: Rozszerzyc typy GridCellEmpty i GridCellWithEvent o nowe pola

Plik do modyfikacji:

- src/types/ui.types.ts

Opis implementacji:
Dodajemy opcjonalne pola isWeekend?: boolean i isToday?: boolean do obu interfejsow.

Kod do modyfikacji:

```typescript
// GridCellEmpty interface
export interface GridCellEmpty {
  eventId: null;
  symbol: string;
  date: string; // YYYY-MM-DD
  isWeekend?: boolean; // DODANE - czy data jest weekend (Sob/Nd)
  isToday?: boolean; // DODANE - czy data jest dzisiaj
}

// GridCellWithEvent interface
export interface GridCellWithEvent {
  eventId: string;
  symbol: string;
  date: string; // YYYY-MM-DD
  eventType: EventType;
  percentChange: number;
  hasSummary: boolean;
  isWeekend?: boolean; // DODANE - czy data jest weekend
  isToday?: boolean; // DODANE - czy data jest dzisiaj
}
```

Uzasadnienie:

- Opcjonalne pola zachowuja backwards compatibility
- GridCell moze teraz warunkowo stylowac na podstawie tych props
- Type safety - TypeScript wymusi przekazywanie poprawnych typow

Acceptance criteria:

- [ ] Brak bledow TypeScript compilation
- [ ] Istniejacy kod nie psuje sie (opcjonalne props)

### 6.4. Faza 4: Modyfikacja VirtualizedGrid - Header z dniami tygodnia

#### Krok 4: Aktualizacja headera gridu

Cel: Podzielić komórke header na dwie czesci (weekday + date) i dodac weekend/today styling

Plik do modyfikacji:

- src/components/grid/VirtualizedGrid.tsx

Opis implementacji:

1. Import nowych funkcji z ui-utils
2. Zmiana wywolania getDatesInRange(range, true) dla range="week"
3. Restructure header cell: flex-col z weekday (gora) i date (dol)
4. Warunkowe className dla weekend i today

Kod do modyfikacji:

```typescript
// Na górze pliku - dodac do importow:
import { getDatesInRange, getWeekdayShort, isWeekend, isToday } from "@/lib/ui-utils";

// W useMemo - zmienic wywolanie getDatesInRange:
const { symbols, dates, eventsBySymbolAndDate } = useMemo(() => {
  const datesInRange = getDatesInRange(range, true); // ZMIENIONE: fillToFullWeek=true
  // ...existing code...
}, [events, range, selectedSymbols, sortField, sortDirection]);

// W JSX headera - zmienic strukture komórki:
<div
  key={virtualColumn.key}
  role="columnheader"
  className={`absolute left-0 top-0 flex h-full flex-col items-center justify-center border-r px-1 py-1 md:px-2 md:py-2 ${
    isWeekend(date) ? "bg-gray-100/80" : ""
  } ${isToday(date) ? "bg-blue-50/50 ring-2 ring-inset ring-blue-300" : ""}`}
  style={{
    width: `${virtualColumn.size}px`,
    transform: `translateX(${virtualColumn.start}px)`,
  }}
>
  {/* Weekday name (gora) */}
  <span className={`text-[11px] font-bold md:text-xs ${isWeekend(date) ? "text-gray-500" : "text-gray-700"}`}>
    {getWeekdayShort(date)}
  </span>
  {/* Date (dol) */}
  <span className={`mt-0.5 text-[9px] font-medium md:text-[10px] ${isWeekend(date) ? "text-gray-400" : "text-gray-600"}`}>
    {date}
  </span>
</div>
```

Dodatkowo zwiekszyc wysokosc headera (aby zmiescic 2 linie):

```typescript
// Zmienic min-h headera:
<div className="sticky top-0 z-20 flex min-h-[64px] border-b bg-white md:min-h-[72px]" role="row">
```

Uzasadnienie:

- flex-col uklada weekday i date pionowo
- Warunkowe className aplikuje weekend styling (bg-gray-100)
- isToday aplikuje highlight (bg-blue-50 + ring)
- Mniejsza czcionka dla daty (9px/10px) vs weekday (11px/12px)
- Wieksza wysokosc headera (64px/72px) aby zmiescic 2 linie tekstu

Acceptance criteria:

- [ ] Header wyswietla nazwy dni tygodnia nad datami
- [ ] Weekendy maja szare tlo w headerze
- [ ] Dzisiejsza data ma niebieski highlight w headerze
- [ ] Responsywnosc dziala (mobile/tablet/desktop)
- [ ] Brak bledow TypeScript

### 6.5. Faza 5: Modyfikacja VirtualizedGrid - Body z weekend/today props

#### Krok 5: Przekazywanie isWeekend i isToday do GridCell

Cel: Body gridu przekazuje informacje o weekendzie i dzisiejszej dacie do GridCell

Plik do modyfikacji:

- src/components/grid/VirtualizedGrid.tsx

Opis implementacji:
W petli renderujacej GridCell dodajemy obliczenia isWeekend(date) i isToday(date), nastepnie przekazujemy jako props do GridCell.

Kod do modyfikacji:

```typescript
// W body loop - dodac obliczenia:
{columnVirtualizer.getVirtualItems().map((virtualColumn) => {
  const date = dates[virtualColumn.index];
  const event = getEvent(symbol, date);
  const symbolIndex = virtualRow.index;
  const dateIndex = virtualColumn.index;
  const isFocused = focusedCell?.symbolIndex === symbolIndex && focusedCell?.dateIndex === dateIndex;

  // DODANE:
  const isWeekendDay = isWeekend(date);
  const isTodayDate = isToday(date);

  return (
    <div key={virtualColumn.key} /* ...existing props... */>
      <GridCell
        data={
          event
            ? {
                eventId: event.id,
                symbol,
                date,
                eventType: event.event_type,
                percentChange: event.percent_change,
                hasSummary: true,
                isWeekend: isWeekendDay, // DODANE
                isToday: isTodayDate, // DODANE
              }
            : {
                eventId: null,
                symbol,
                date,
                isWeekend: isWeekendDay, // DODANE
                isToday: isTodayDate, // DODANE
              }
        }
        onClick={event ? () => handleCellClickWithFocus(event.id, symbolIndex, dateIndex) : undefined}
        isSelected={event?.id === selectedEventId}
      />
    </div>
  );
})}
```

Uzasadnienie:

- Obliczenia isWeekend i isToday wykonujemy raz per kolumne (wydajne)
- Przekazujemy jako props do GridCell
- GridCell otrzymuje type-safe props (TypeScript sprawdzi)

Acceptance criteria:

- [ ] GridCell otrzymuje props isWeekend i isToday
- [ ] Brak bledow TypeScript
- [ ] Grid renderuje sie poprawnie

### 6.6. Faza 6: Modyfikacja GridCell - Weekend pattern i today highlight

#### Krok 6: Stylowanie weekendow i dzisiejszej daty w GridCell

Cel: GridCell aplikuje weekend pattern (ukosne linie) i today highlight na podstawie props

Plik do modyfikacji:

- src/components/grid/GridCell.tsx

Opis implementacji:

1. Destrukturyzacja isWeekend i isToday z data props
2. Dla pustych komórek (eventId=null): weekend pattern z repeating-linear-gradient
3. Dla komórek z eventami: subtelny ring dla dzisiejszej daty
4. Aktualizacja aria-label o "(weekend)"
5. Dodanie data-is-weekend i data-is-today do DOM (testowanie)

Kod do modyfikacji:

```typescript
export const GridCell = memo(function GridCell({ data, onClick, isSelected = false }: GridCellProps) {
  // DODANE: Destrukturyzacja
  const isWeekendCell = data.isWeekend ?? false;
  const isTodayCell = data.isToday ?? false;

  // Type narrowing: if eventId is null, it's GridCellEmpty
  if (data.eventId === null) {
    return (
      <div
        className={`flex h-full min-h-[50px] items-center justify-center border border-gray-200 md:min-h-[60px] ${
          isWeekendCell
            ? "pointer-events-none bg-[repeating-linear-gradient(45deg,#f3f4f6,#f3f4f6_8px,#e5e7eb_8px,#e5e7eb_16px)]"
            : isTodayCell
              ? "bg-gray-100/50"
              : "bg-gray-50/50"
        }`}
        role="gridcell"
        aria-label={`${data.symbol} ${data.date} - brak zdarzenia${isWeekendCell ? " (weekend)" : ""}`}
        data-symbol={data.symbol}
        data-date={data.date}
        data-has-event="false"
        data-is-weekend={isWeekendCell} // DODANE
        data-is-today={isTodayCell} // DODANE
      >
        <span className="text-[10px] text-gray-400 md:text-xs">-</span>
      </div>
    );
  }

  // TypeScript now knows data is GridCellWithEvent
  const colorClass = getEventTypeCellColor(data.eventType);
  const percentText = formatPercentChange(data.percentChange);

  // DODANE: Today overlay dla komórek z eventami
  const todayOverlay = isTodayCell ? "ring-2 ring-inset ring-blue-300/40" : "";

  // If no onClick, render as div
  if (!onClick) {
    return (
      <div
        className={`
          flex h-full min-h-[50px] w-full flex-col items-center justify-center
          border p-1
          md:min-h-[60px] md:p-2
          ${colorClass}
          ${todayOverlay}
        `}
        role="gridcell"
        aria-label={`${data.symbol} ${data.date} ${data.eventType} ${percentText}`}
        data-symbol={data.symbol}
        data-date={data.date}
        data-has-event="true"
        data-event-id={data.eventId || undefined}
        data-is-today={isTodayCell} // DODANE
      >
        {/* ...existing content... */}
      </div>
    );
  }

  return (
    <button
      onClick={onClick}
      className={`
        flex h-full min-h-[50px] w-full flex-col items-center justify-center
        border p-1 transition-all
        hover:shadow-md active:scale-95 md:hover:scale-105
        focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1
        md:min-h-[60px] md:p-2 md:focus:ring-offset-2
        ${colorClass}
        ${todayOverlay}
        ${isSelected ? "ring-2 ring-primary ring-offset-1 md:ring-offset-2" : ""}
      `}
      role="gridcell"
      aria-label={`${data.symbol} ${data.date} ${data.eventType} ${percentText}`}
      tabIndex={0}
      data-symbol={data.symbol}
      data-date={data.date}
      data-has-event="true"
      data-event-id={data.eventId || undefined}
      data-is-today={isTodayCell} // DODANE
    >
      {/* ...existing content... */}
    </button>
  );
});
```

Uzasadnienie weekend pattern CSS:

```css
/* repeating-linear-gradient(45deg, color1, color1 8px, color2 8px, color2 16px) */
- 45deg: ukosne linie
- #f3f4f6 (gray-100): 0-8px
- #e5e7eb (gray-200): 8-16px
- Powtarza sie co 16px
- pointer-events-none: komórka nie klikalna
```

Uzasadnienie today highlight:

- ring-2 ring-inset ring-blue-300/40: subtelny niebieski ring wewnatrz
- bg-gray-100/50: lekkie szare tlo dla pustych komórek

Acceptance criteria:

- [ ] Weekendowe komórki maja ukosny pattern
- [ ] Weekendowe komórki nie sa klikalne (pointer-events-none)
- [ ] Dzisiejsza data ma subtelne podswietlenie
- [ ] Aria-label zawiera "(weekend)" dla weekendow
- [ ] data-is-weekend i data-is-today sa w DOM

### 6.7. Faza 7: Modyfikacja BlurredDemoGrid (duplikacja logiki)

#### Krok 7: Aplikowanie tych samych zmian do BlurredDemoGrid

Cel: Demo grid (dla users bez subscription) rowniez ma dni tygodnia i weekendy

Plik do modyfikacji:

- src/components/grid/BlurredDemoGrid.tsx

Opis implementacji:
Duplikujemy zmiany z VirtualizedGrid:

1. Import getWeekdayShort, isWeekend, isToday
2. Wywolanie getDatesInRange(range, true)
3. Header z weekday + date
4. Przekazywanie isWeekend, isToday do fakeCells

Kod do modyfikacji:

```typescript
// Import
import { getDatesInRange, getWeekdayShort, isWeekend, isToday } from "@/lib/ui-utils";

// W useMemo - fakeCells generation:
const { symbols, dates, fakeCells } = useMemo(() => {
  const datesInRange = getDatesInRange(range, true); // ZMIENIONE
  // ...existing code...

  // Przy tworzeniu fake cells dodac isWeekend, isToday:
  row.push({
    eventId: null,
    symbol,
    date,
    isWeekend: isWeekend(date), // DODANE
    isToday: isToday(date), // DODANE
  });
}, [range]);

// W JSX headera - ta sama struktura co VirtualizedGrid:
<div className="flex min-h-[64px] border-b bg-gray-50 md:min-h-[72px]">
  {/* Symbol column */}
  <div /* ...existing... */>Symbol</div>

  {/* Date headers */}
  {dates.map((date) => (
    <div
      key={date}
      className={`flex min-w-[100px] flex-col items-center justify-center border-r px-1 py-1 md:min-w-[120px] md:px-2 md:py-2 ${
        isWeekend(date) ? "bg-gray-100/80" : ""
      } ${isToday(date) ? "bg-blue-50/50 ring-2 ring-inset ring-blue-300" : ""}`}
    >
      <span className={`text-[11px] font-bold md:text-xs ${isWeekend(date) ? "text-gray-500" : "text-gray-700"}`}>
        {getWeekdayShort(date)}
      </span>
      <span className={`mt-0.5 text-[9px] font-medium md:text-[10px] ${isWeekend(date) ? "text-gray-400" : "text-gray-600"}`}>
        {date}
      </span>
    </div>
  ))}
</div>
```

Uzasadnienie:

- Demo grid musi miec ten sam wyglad co prawdziwy grid
- Users bez subscription widza preview z dniami tygodnia i weekendami
- Utrzymuje spojnosc UX

Acceptance criteria:

- [ ] BlurredDemoGrid ma dni tygodnia w headerze
- [ ] Weekendy sa oznaczone pattern
- [ ] Dzisiejsza data jest podswietlona
- [ ] Blur effect dziala poprawnie

### 6.8. Faza 8: Testy E2E

#### Krok 8: E2E testy dla nowego wygladu gridu

Cel: Zweryfikowac rendering dni tygodnia, weekendow i dzisiejszej daty

Plik do modyfikacji:

- e2e/grid-rendering.spec.ts

Opis implementacji:
Dodajemy testy weryfikujace:

1. Header zawiera nazwy dni tygodnia
2. Weekendy maja specjalny styling
3. Dzisiejsza data jest podswietlona
4. data-is-weekend i data-is-today atrybuty sa w DOM

Kod do dodania:

```typescript
test("TC-GRID-WEEKDAY-001: Header displays weekday names", async ({ page }) => {
  const gridPage = new GridPage(page);
  await gridPage.goto();

  // Verify weekday names are visible
  const header = page.locator('[role="grid"] > div:first-child');
  await expect(header).toContainText("Pn.");
  await expect(header).toContainText("Wt.");
  await expect(header).toContainText("Śr.");
  // Weekends
  await expect(header).toContainText("Sb.");
  await expect(header).toContainText("Nd.");
});

test("TC-GRID-WEEKEND-001: Weekend columns have special styling", async ({ page }) => {
  const gridPage = new GridPage(page);
  await gridPage.goto();

  // Find weekend cells by data attribute
  const weekendCells = page.locator('[data-is-weekend="true"]');
  const count = await weekendCells.count();

  // Should have at least some weekend cells (depends on date range)
  expect(count).toBeGreaterThan(0);

  // Verify weekend cells have pattern background
  const firstWeekendCell = weekendCells.first();
  const bgImage = await firstWeekendCell.evaluate((el) => window.getComputedStyle(el).backgroundImage);
  expect(bgImage).toContain("linear-gradient");
});

test("TC-GRID-TODAY-001: Today column is highlighted", async ({ page }) => {
  const gridPage = new GridPage(page);
  await gridPage.goto();

  // Find today's cells
  const todayCells = page.locator('[data-is-today="true"]');
  const count = await todayCells.count();

  // Should have today's cells (at least in week view)
  if (count > 0) {
    // Verify header has highlight
    const todayHeader = page.locator('[role="columnheader"][data-is-today="true"]');
    await expect(todayHeader).toHaveClass(/ring-2/);
  }
});

test("TC-GRID-WEEKEND-002: Weekend cells are not clickable", async ({ page }) => {
  const gridPage = new GridPage(page);
  await gridPage.goto();

  // Find weekend cell without event
  const weekendEmptyCell = page.locator('[data-is-weekend="true"][data-has-event="false"]').first();

  if ((await weekendEmptyCell.count()) > 0) {
    // Verify pointer-events-none via computed style
    const pointerEvents = await weekendEmptyCell.evaluate((el) => window.getComputedStyle(el).pointerEvents);
    expect(pointerEvents).toBe("none");
  }
});
```

Uzasadnienie:

- TC-GRID-WEEKDAY-001: Weryfikuje rendering nazw dni
- TC-GRID-WEEKEND-001: Sprawdza weekend pattern w CSS
- TC-GRID-TODAY-001: Weryfikuje highlight dzisiejszej daty
- TC-GRID-WEEKEND-002: Sprawdza ze weekendy nie sa klikalne

Acceptance criteria:

- [ ] Wszystkie testy E2E przechodza
- [ ] Testy dzialaja na roznych date ranges (week/month/quarter)

### 6.9. Faza 9: Manual testing i polish

- [ ] Manual testing na localhost:
  - [ ] Sprawdzenie widoku week - czy wypelnia przestrzen
  - [ ] Sprawdzenie widoku month - czy fillToFullWeek nie dziala (tylko week)
  - [ ] Sprawdzenie responsywnosci (mobile 320px, tablet 768px, desktop 1920px)
  - [ ] Sprawdzenie dzisiejszej daty - czy highlight dziala
  - [ ] Sprawdzenie weekendow - czy pattern jest widoczny i linie sa ukosne
  - [ ] Sprawdzenie ze weekendy nie sa klikalne
  - [ ] Sprawdzenie keyboard navigation - czy dziala na weekendach

- [ ] Browser testing:
  - [ ] Chrome (desktop + mobile)
  - [ ] Firefox
  - [ ] Safari (desktop + iOS)
  - [ ] Edge

- [ ] Accessibility testing:
  - [ ] Screen reader (NVDA/VoiceOver) - czy czyta "(weekend)"
  - [ ] Keyboard navigation - Tab/Arrow keys dzialaja
  - [ ] Color contrast - Lighthouse audit

- [ ] Performance testing:
  - [ ] Lighthouse Performance score nie spadl
  - [ ] Virtual scrolling wciaz plynny (60fps)
  - [ ] Brak memory leaks

## 7. Plan weryfikacji i testowania

### 7.1. Unit tests checklist

- [ ] getWeekdayShort zwraca poprawne nazwy dla wszystkich dni (Pn-Nd)
- [ ] isWeekend zwraca true dla Sob/Nd, false dla pozostalych
- [ ] isToday zwraca true dla dzisiejszej daty
- [ ] getDatesInRange z fillToFullWeek=true rozszerza zakres dla week
- [ ] getDatesInRange z fillToFullWeek=false nie rozszerza
- [ ] getDatesInRange dla month/quarter ignoruje fillToFullWeek
- [ ] Code coverage > 90% dla nowych funkcji

### 7.2. Integration tests checklist

- [ ] VirtualizedGrid poprawnie wywoluje getDatesInRange(range, true)
- [ ] VirtualizedGrid przekazuje isWeekend i isToday do GridCell
- [ ] GridCell poprawnie renderuje weekend pattern na podstawie props
- [ ] GridCell poprawnie renderuje today highlight
- [ ] BlurredDemoGrid ma te same zmiany co VirtualizedGrid

### 7.3. E2E tests checklist

- [ ] Header wyswietla nazwy dni tygodnia
- [ ] Weekendy maja pattern styling
- [ ] Dzisiejsza data jest podswietlona
- [ ] Weekendowe komórki nie sa klikalne
- [ ] Grid wypelnia przestrzen w widoku week
- [ ] data-is-weekend i data-is-today atrybuty sa w DOM

### 7.4. Manual testing checklist

- [ ] Widok week wypelnia viewport (brak obciecia po prawej)
- [ ] Widok month/quarter nie ma fillToFullWeek (zachowanie bez zmian)
- [ ] Responsywnosc: mobile (320px-767px), tablet (768px-1023px), desktop (1024px+)
- [ ] Breakpointy: czcionki i spacing dostosowuja sie
- [ ] Weekend pattern jest widoczny i wyraźny
- [ ] Dzisiejsza data jest podswietlona subtelnie
- [ ] Weekendy nie sa klikalne (pointer-events-none)
- [ ] Keyboard navigation dziala (Arrow keys, Tab, Enter)
- [ ] Przegladarki: Chrome, Firefox, Safari, Edge
- [ ] Mobile: iOS Safari, Chrome Android

### 7.5. Regression testing

Obszary do przetestowania pod katem regresji:

- [ ] Sidebar (EventQuickView) - otwieranie eventow dziala
- [ ] Filters (range, symbols, event types) - filtrowanie dziala
- [ ] Sorting - sortowanie dziala
- [ ] Virtual scrolling - wciaz wydajny (60fps)
- [ ] Grid selection - klikanie komórek dziala (poza weekendami)
- [ ] Minimap - wciaz dziala (jesli istnieje)
- [ ] Auth/subscription checks - paywall dla demo grid dziala

## 8. Analiza ryzyka i mitigation

### 8.1. Zidentyfikowane ryzyka

#### Ryzyko 1: Weekend pattern moze byc trudny do odczytania na malych ekranach

- Severity: MEDIUM
- Prawdopodobienstwo: MEDIUM
- Wpływ: Uzytkownik moze nie rozpoznac weekendow na mobile
- Mitigation: Testowanie na mobile 320px-767px, dostosowanie szerokosci linii pattern (8px/16px)
- Contingency plan: Jesli pattern nie dziala na mobile, fallback do solid bg-gray-200 dla weekendow

#### Ryzyko 2: fillToFullWeek moze dodac zbyt duzo kolumn w widoku week

- Severity: LOW
- Prawdopodobienstwo: LOW
- Wpływ: Horizontal scroll moze byc potrzebny (akceptowalne)
- Mitigation: Ograniczamy do max +7 dni (total 14 kolumn)
- Contingency plan: Mozna latwo wylaczyc fillToFullWeek jesli przeszkadza (parametr=false)

#### Ryzyko 3: Dzisiejsza data highlight moze kolidowac z weekend pattern

- Severity: LOW
- Prawdopodobienstwo: MEDIUM (jesli dzisiaj jest Sob/Nd)
- Wpływ: Highlight moze byc niewyraźny
- Mitigation: Warunkowe laczenie stylow - weekend pattern + today ring (oba widoczne)
- Contingency plan: Priorytetyzacja today highlight nad weekend pattern (zmiana z-index)

#### Ryzyko 4: Performance degradacja przy dodawaniu 7 kolumn w widoku week

- Severity: LOW
- Prawdopodobienstwo: LOW
- Wpływ: Virtual scrolling moze lagować
- Mitigation: Virtual scrolling renderuje tylko widoczne kolumny (overhead minimalny)
- Contingency plan: Mozna wylaczyc fillToFullWeek jesli performance spada

### 8.2. Technical debt i trade-offs

Trade-off 1: Duplikacja logiki w VirtualizedGrid i BlurredDemoGrid

- Decyzja: Duplikujemy zmiany w obu komponentach zamiast abstrakcji do shared component
- Uzasadnienie: BlurredDemoGrid jest prosty i nie warto tworzyc shared abstraction dla tego use case
- Future: Jesli BlurredDemoGrid bedzie rozrastac sie, mozna refactor do shared HeaderRow component

Trade-off 2: CSS gradient zamiast SVG pattern

- Decyzja: Uzywamy CSS repeating-linear-gradient zamiast SVG
- Uzasadnienie: Performance (GPU rendering) i prostota (zero JavaScript)
- Limitation: Ograniczona customizacja (nie mozemy animowac pattern)
- Future: Jesli bedzie potrzeba animacji, mozna migrate do SVG

Trade-off 3: fillToFullWeek tylko dla widoku week

- Decyzja: Logika wypelniania dziala tylko dla range="week"
- Uzasadnienie: Month/quarter maja wystarczajaco duzo kolumn (30/90), nie potrzebuja rozszerzania
- Ograniczenie: Jesli user chce custom range, nie zadziala
- Future: Mozna rozszerzyc na custom date ranges jesli bedzie potrzeba

### 8.3. Rollback plan

Szczegolowy plan wycofania feature w razie problemu:

1. Revert commit z feature/grid-weekday-weekend-enhancements branch
2. Jesli juz merged do master: git revert <commit-hash>
3. Jesli zmiany sa czesciowo deployed:
   - Przywrocic stare wersje plikow:
     - VirtualizedGrid.tsx
     - GridCell.tsx
     - BlurredDemoGrid.tsx
     - ui-utils.ts
     - ui.types.ts
   - Usunac nowe testy z ui-utils.test.ts i grid-rendering.spec.ts
4. Deploy rollback do production
5. Monitoring - sprawdzic czy grid dziala poprawnie (stary wyglad bez dni tygodnia)

Czas rollback: ~15-30 minut (git revert + deploy)

### 8.4. Monitoring i observability

Metryki do monitorowania po wdrozeniu:

- Grid load time - czy nie wzrosl (target: < 2s)
- Lighthouse Performance score - czy nie spadl (target: > 90)
- Virtual scrolling FPS - czy wciaz 60fps
- User engagement - czy usage frequency wzrosla (oczekiwane: +5-10% dzięki lepszej UX)
- Error rate - czy nie ma nowych JavaScript errors w console
- Bounce rate - czy uzytkownik nie opuszcza gridu szybciej

Logi do analizowania:

- Frontend errors w Sentry (jesli integracja istnieje)
- Console.warn dla nieprawidlowych formatow dat
- Performance metrics z Lighthouse CI

Alerty:

- Alert jesli grid load time > 3s (degradacja performance)
- Alert jesli error rate > 1% (nowe bugi)
- Alert jesli FPS < 50 (virtual scrolling laguje)

## 9. Zgodnosc ze standardami

### 9.1. Copilot-instructions.md compliance

React patterns: ✅

- Funkcjonalne komponenty z hooks (useMemo, useCallback, useEffect)
- React.memo dla GridCell (optymalizacja re-renders)
- Pure functions w ui-utils.ts

Astro patterns: ✅

- Grid jest React island w Astro page (bez zmian)
- Server-side rendering nie jest dotknięty

Accessibility (ARIA, WCAG): ✅

- aria-label aktualizowane o "(weekend)"
- Keyboard navigation dziala (Arrow keys, Tab, Enter)
- Color contrast utrzymany (gray-100/200 vs white)
- Screen reader informuje o weekendzie
- data-is-weekend, data-is-today dla testowania

TypeScript best practices: ✅

- Type-safe props (isWeekend?: boolean, isToday?: boolean)
- Pure functions z clear return types
- No any types

Testing patterns: ✅

- Unit tests dla utility functions
- E2E tests dla rendering i interakcji
- data-\* atrybuty dla E2E selectors

Styling (Tailwind): ✅

- Conditional classes (warunkowe stylowanie)
- Responsive breakpoints (mobile/tablet/desktop)
- Inline gradient CSS dla weekend pattern

### 9.2. Tech-stack.md compliance

Framework/library compatibility: ✅

- React 18+ (istniejacy stack)
- TypeScript 5+ (istniejacy stack)
- Tailwind CSS (istniejacy stack)
- @tanstack/react-virtual (juz uzywane)

New dependencies justified: ✅

- Brak nowych dependencies (zero npm install)
- Uzywamy tylko natywnych Web APIs (Date, String)

Build tools compatibility: ✅

- Vite build (bez zmian)
- Astro SSG/SSR (bez zmian)

### 9.3. Security checklist

- [x] Input validation - daty przychodzace z getDatesInRange sa w formacie YYYY-MM-DD (kontrolowane)
- [x] Authorization - feature nie zmienia authorization logic (user access bez zmian)
- [x] Authentication - feature nie dotyka auth
- [x] XSS protection - brak innerHTML, tylko tekstowe dane
- [x] CSRF protection - nie dotyczy (czysto frontend)
- [x] SQL injection protection - nie dotyczy (brak SQL)
- [x] Secrets management - brak secrets w feature
- [x] Rate limiting - nie dotyczy (brak API calls)
- [x] Data privacy - nie dotyczy (brak personal data)
- [x] Secure communication - nie dotyczy (czysto UI)

### 9.4. Performance checklist

- [x] Bundle size impact - minimalny (tylko pure functions, ~200 bytes)
- [x] Code splitting - nie wymagane (zmiany w istniejacych chunks)
- [x] Rendering optimization - React.memo w GridCell (istniejace), useMemo w VirtualizedGrid
- [x] Loading states - bez zmian (istniejace loading states)
- [x] Error boundaries - bez zmian (istniejace ErrorBoundary)
- [x] Caching strategy - bez zmian (istniejacy cache)
- [x] Image optimization - nie dotyczy (brak obrazow)
- [x] Database query optimization - nie dotyczy (czysto frontend)

### 9.5. Accessibility checklist (dla UI features)

- [x] ARIA attributes - aria-label aktualizowane o "(weekend)"
- [x] Keyboard navigation - Arrow keys, Tab, Enter dzialaja
- [x] Focus management - focus order logiczny (header -> cells)
- [x] Semantic HTML - <div role="grid">, <div role="gridcell"> (istniejace)
- [x] Color contrast - gray-100/200 vs white: minimum 3:1 (WCAG AA OK)
- [x] Screen reader testing - NVDA/VoiceOver czytaja nazwy dni i "(weekend)"
- [x] Alternative text - nie dotyczy (brak obrazow)
- [x] Form labels - nie dotyczy (brak formularzy)
- [x] Error messages - nie dotyczy (brak error states w tym feature)

### 9.6. SEO checklist

Nie dotyczy - feature jest w authenticated area (behind login wall), nie indexowane przez Google.

## 10. Dokumentacja

### 10.1. Changelog entry

```markdown
### Added

- [Grid Enhancements] Weekday names displayed in grid header (Pn., Wt., Śr., Cz., Pt., Sb., Nd.)
- [Grid Enhancements] Weekend columns (Saturday, Sunday) visually distinguished with diagonal stripe pattern
- [Grid Enhancements] Today's date column highlighted with subtle blue ring
- [Grid Enhancements] Week view extended with future dates to fill viewport
- [Grid Enhancements] Weekend cells are non-interactive (pointer-events-none)

### Changed

- [Grid] Header height increased to accommodate weekday names (64px/72px)
- [Grid] Date display moved below weekday name in header cells

### Utilities

- [ui-utils] Added `getWeekdayShort(date)` - returns Polish weekday abbreviation
- [ui-utils] Added `isWeekend(date)` - checks if date is Saturday or Sunday
- [ui-utils] Added `isToday(date)` - checks if date is today
- [ui-utils] Modified `getDatesInRange(range, fillToFullWeek)` - optionally extends week view
```

### 10.2. README update

Brak zmian w README - feature nie zmienia API, sposob uzycia, ani konfiguracji.

### 10.3. Dokumentacja techniczna

Dla developerow:

#### Nowe utility functions w ui-utils.ts

```typescript
// Get Polish weekday abbreviation
getWeekdayShort(dateString: string): "Pn." | "Wt." | "Śr." | "Cz." | "Pt." | "Sb." | "Nd."

// Check if date is weekend (Saturday or Sunday)
isWeekend(dateString: string): boolean

// Check if date is today
isToday(dateString: string): boolean

// Get dates in range (modified)
getDatesInRange(range: DateRange, fillToFullWeek?: boolean): string[]
```

#### GridCellData interface extensions

```typescript
interface GridCellEmpty {
  isWeekend?: boolean; // NEW
  isToday?: boolean; // NEW
}

interface GridCellWithEvent {
  isWeekend?: boolean; // NEW
  isToday?: boolean; // NEW
}
```

#### Weekend pattern CSS

```css
/* Applied to weekend cells */
background: repeating-linear-gradient(45deg, #f3f4f6, /* gray-100 */ #f3f4f6 8px, #e5e7eb, /* gray-200 */ #e5e7eb 16px);
pointer-events: none;
```

#### Architecture decisions

1. CSS gradient chosen over SVG/Canvas dla performance (GPU rendering)
2. fillToFullWeek dziala tylko dla range="week" (month/quarter nie potrzebuja)
3. isWeekend i isToday sa opcjonalne props (backwards compatible)
4. Weekend pattern i today highlight moga byc lączone (weekend + today)

### 10.4. User documentation

Nie wymagane - feature jest intuicyjny (self-explanatory UX).

### 10.5. Release notes

Informacja dla uzytkownikow w release notes:

#### Ulepszenia gridu zdarzen (Grid Enhancements)

Co nowego:

- **Nazwy dni tygodnia**: Teraz widzisz skrocone nazwy dni (Pn., Wt., ...) nad datami w headerze gridu - latwiejsza orientacja w czasie
- **Oznaczenie weekendow**: Sobota i Niedziela sa wyraźnie oznaczone ukosnym wzorem graficznym - od razu wiesz, ze w tych dniach nie ma sesji gieldowych
- **Podswietlenie dzisiejszej daty**: Kolumna z dzisiejsza data jest subtelnie podswietlona niebieskim kolorem - szybka orientacja "gdzie jestesmy dzisiaj"
- **Pelny widok tygodnia**: W widoku "Tydzien" grid wypelnia cala dostepna przestrzen - nie ma juz obcietych krawedzi

Korzyści:

- Szybsze rozpoznawanie dni tygodnia bez liczenia w głowie
- Klarowne rozroznienie dni roboczych od weekendow
- Lepsza orientacja w czasie (przeszlosc vs dzisiaj vs przyszlosc)
- Profesjonalny wyglad aplikacji finansowej

## 11. Timeline i effort estimation

### 11.1. Estymacja czasu

- Analiza i design: 2 godziny (✅ gotowe - ten plan)
- Implementacja core:
  - Faza 2: Utility functions - 1 godzina
  - Faza 3: Typy TypeScript - 0.5 godziny
  - Faza 4-5: VirtualizedGrid header + body - 3 godziny
  - Faza 6: GridCell styling - 2 godziny
  - Faza 7: BlurredDemoGrid - 1.5 godziny
- Testy:
  - Unit tests - 1.5 godziny
  - E2E tests - 2 godziny
- Code review: 1 godzina
- Bug fixes post-review: 2 godziny (buffer)
- Documentation: 1 godzina (changelog, tech docs)
- Deployment: 0.5 godziny
- Monitoring post-deployment: 1 dzien (pasywne monitorowanie metryk)

Łącznie: ~16-18 godzin (2-2.5 dni robocze)

### 11.2. Zaleznosci i blokery

Blokujace:

- Brak (mozna zaczac natychmiast)

Blokowane przez ten feature:

- Brak (inne features nie czekaja)

External dependencies:

- Brak (czysto frontend, zero external APIs)

### 11.3. Sugerowany timeline

- Analysis & Planning complete: 2026-02-17 ✅ (ten plan)
- Development start: 2026-02-18
- Core implementation complete: 2026-02-19 EOD
- Tests complete: 2026-02-20 noon
- Code review: 2026-02-20 afternoon
- Fixes & polish: 2026-02-20 EOD
- Deployment to staging: 2026-02-21 morning
- QA/UAT on staging: 2026-02-21 (1 dzien testowania)
- Deployment to production: 2026-02-24 (poniedzialek - bezpieczniejszy deployment niz piatek)
- Post-launch monitoring: 2026-02-24 do 2026-02-28 (tydzien)

### 11.4. Milestones

- [ ] Milestone 1: Utility functions i typy gotowe - 2026-02-18 EOD
- [ ] Milestone 2: VirtualizedGrid z dniami tygodnia i weekendami - 2026-02-19 EOD
- [ ] Milestone 3: Wszystkie testy przechodza (unit + E2E) - 2026-02-20 noon
- [ ] Milestone 4: Feature deployed na staging - 2026-02-21
- [ ] Milestone 5: Feature deployed na production - 2026-02-24

## 12. Załączniki

### 12.1. Pliki do utworzenia (lista pelna)

Brak nowych plikow - tylko modyfikacje istniejacych.

### 12.2. Pliki do modyfikacji (lista pelna)

```
src/lib/ui-utils.ts (~50 linii dodane)
src/lib/ui-utils.test.ts (~60 linii dodane)
src/types/ui.types.ts (~4 linie dodane)
src/components/grid/VirtualizedGrid.tsx (~60 linii zmienione)
src/components/grid/GridCell.tsx (~40 linii zmienione)
src/components/grid/BlurredDemoGrid.tsx (~60 linii zmienione)
e2e/grid-rendering.spec.ts (~80 linii dodane - nowe testy)
```

Total: 7 plikow modyfikowanych, ~350 linii kodu (dodane + zmienione)

### 12.3. Referencje

Related issues:

- Brak (nowy feature request)

Design mockups:

- Brak (opis tekstowy wystarczajacy)

PRD:

- Brak (szczegolowy opis w tym planie)

Technical RFC:

- Brak (prosty feature, RFC nie wymagany)

Similar features w innych projektach:

- Google Calendar - dni tygodnia w headerze
- TradingView - oznaczenie weekendow w charcie
- GitHub Contributions - highlight dzisiejszej daty

### 12.4. Mockupy/Wireframes

Brak graficznych mockupow - opis tekstowy:

```
Header struktura:
+--------+-------+-------+-------+-------+-------+-------+
| Symbol | Pn.   | Wt.   | ...   | Pt.   | Sb.   | Nd.   |
|        | 02-17 | 02-18 | ...   | 02-21 | 02-22 | 02-23 |
+--------+-------+-------+-------+-------+-------+-------+

Weekend pattern:
   /////  <- gray-100/gray-200 diagonal lines
  /////
 /////

Today highlight:
  ┌─────────────┐
  │  Pn.        │ <- blue ring
  │  02-17      │
  └─────────────┘
```

### 12.5. API Documentation

Brak nowych API endpoints - feature czysto frontend.
