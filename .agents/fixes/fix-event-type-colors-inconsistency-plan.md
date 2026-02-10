# Plan Naprawy Bledu - event-type-colors-inconsistency

Data utworzenia: 2026-02-10
Tytul bledu: Niespojnosc kolorow typow zdarzen pomiedzy Gridem, filtrami i minimapa
Severity: MEDIUM
Typ bledu: UI

## 1. Podsumowanie wykonawcze

### 1.1. Opis bledu

W aplikacji występuje niespojnosc kolorow dla typow zdarzen (BLACK_SWAN_UP, BLACK_SWAN_DOWN, VOLATILITY_UP, VOLATILITY_DOWN, BIG_MOVE). Kolory zdefiniowane w funkcji getEventTypeColor (uzywane w GridCell) roznia sie od kolorow uzytych w EventTypeFilter (kropki obok nazw) oraz w minimapie (funkcja getEventColor). To powoduje chaos wizualny i utrudnia uzytkownikowi orientacje, ktory typ zdarzenia jest wyswietlany.

### 1.2. Root cause

Brak centralnej definicji kolorow dla typow zdarzen - kolory sa definiowane w 3 roznych miejscach:

1. src/lib/ui-utils.ts (getEventTypeColor) - kolory jasne Tailwind z borderem (bg-green-100, bg-red-100, itp.)
2. src/lib/minimap-utils.ts (getEventColor) - kolory w hex (#22c55e, #ef4444, itp.)
3. src/components/grid/EventTypeFilter.tsx (EVENT_TYPES array) - kolory Tailwind solid (bg-red-500, bg-orange-500, itp.)

### 1.3. Zakres wpływu

- Dotknięte komponenty/moduly:
  - GridCell.tsx (komponent wyswietlajacy zdarzenia na gridzie)
  - EventTypeFilter.tsx (komponent filtrowania typow zdarzen)
  - GridMinimap.tsx + MinimapCanvas.tsx (miniatura gridu)
  - ui-utils.ts (utility function getEventTypeColor)
  - minimap-utils.ts (utility function getEventColor)

- Dotknięci uzytkownicy: wszyscy uzytkownicy aplikacji
- Dotknięte srodowiska: production, staging, development

### 1.4. Priorytet naprawy

NORMAL - nie blokuje funkcjonalnosci, ale obniza UX i spójnosc wizualna aplikacji

## 2. Szczegolowa analiza bledu

### 2.1. Kroki reprodukcji

1. Otwórz strone z gridem (np. /grid)
2. Wyswietl zdarzenia w gridzie - zauważ kolory uzyte dla poszczegolnych typow zdarzen
3. Otwórz filtr "Typy zdarzen" - porownaj kolory kropek obok nazw z kolorami w gridzie
4. Otwórz miniature gridu - porownaj kolory pikseli zdarzen z kolorami w gridzie i filtrze

### 2.2. Oczekiwane zachowanie

Wszystkie typy zdarzen powinny miec spójne kolory w calej aplikacji:

- Grid (GridCell)
- Filtr typow zdarzen (EventTypeFilter)
- Miniatura gridu (MinimapCanvas)

Referencyjne kolory powinny pochodzic z gridu (getEventTypeColor), ktory jest glownym miejscem wyswietlania zdarzen.

### 2.3. Rzeczywiste zachowanie

Kolory roznia sie pomiedzy:

- Gridem: jasne tla z borderem (np. bg-green-100 text-green-900 border-green-300 dla BLACK_SWAN_UP)
- Filtrem: solid kolory (np. bg-red-500 dla BLACK_SWAN_UP - niezgodny!)
- Minimapa: hex kolory (np. #22c55e dla BLACK_SWAN_UP - odpowiada green-500, nie green-100)

### 2.4. Root cause analysis

Lokalizacja bledu:

1. src/lib/ui-utils.ts:42-54 (getEventTypeColor)
2. src/lib/minimap-utils.ts:187-197 (getEventColor)
3. src/components/grid/EventTypeFilter.tsx:16-21 (EVENT_TYPES)

Przyczyna techniczna:

- Brak centralnej definicji kolorow dla typow zdarzen
- Kazde miejsce definiuje kolory niezaleznie, co prowadzi do niespojnosci
- GridCell uzywa jasnych tl Tailwind (bg-X-100) z borderem (border-X-300)
- EventTypeFilter uzywa solid kolorow Tailwind (bg-X-500/600)
- Minimap uzywa hex kolorow odpowiadajacych X-500

Nieprawidlowa logika:

- EventTypeFilter wyswietla BLACK_SWAN_UP jako bg-red-500, podczas gdy w gridzie jest bg-green-100
- EventTypeFilter wyswietla BLACK_SWAN_DOWN jako bg-red-600, podczas gdy w gridzie jest bg-red-100
- Minimap uzywa kolorow 500-series zamiast 100-series

### 2.5. Analiza zasiegu

#### Komponenty frontend:

- src/components/grid/GridCell.tsx - uzywa getEventTypeColor (poprawne kolory referencyjne)
- src/components/grid/EventTypeFilter.tsx - definiuje wlasne kolory (wymagaja synchronizacji)
- src/components/grid/MinimapCanvas.tsx - uzywa getEventColor (wymaga synchronizacji)

#### Serwisy/hooki:

- Nie dotyczy

#### Typy/interfejsy:

- src/types/nocodb.types.ts - definicja EventType (bez zmian)

#### Backend/API (jesli dotyczy):

- Nie dotyczy

#### Baza danych (jesli dotyczy):

- Nie dotyczy

#### Testy:

- src/test/lib/ui-utils.test.ts - testy dla getEventTypeColor (wymagaja aktualizacji)
- src/test/lib/minimap-utils.test.ts - testy dla getEventColor (wymagaja aktualizacji)
- e2e/grid.spec.ts - testy E2E dla gridu (do sprawdzenia, czy wymagaja aktualizacji)

## 3. Propozycje rozwiazan

### 3.1. Rozwiazanie A (REKOMENDOWANE)

#### Opis:

Utworzenie centralnej definicji kolorow dla typow zdarzen w pliku konfiguracyjnym i zastosowanie tej definicji we wszystkich miejscach w aplikacji. Kolory bazowe sa pobierane z GridCell (getEventTypeColor), ktory jest glownym miejscem wyswietlania zdarzen. Dla EventTypeFilter i Minimap ekstrahujemy kolory do osobnych wariantow (kropki i piksele).

#### Zakres zmian:

- Frontend:
  - Nowy plik: src/config/event-type-colors.ts - centralna definicja kolorow
  - Modyfikacja: src/lib/ui-utils.ts - getEventTypeColor uzywa centralnej konfiguracji
  - Modyfikacja: src/lib/minimap-utils.ts - getEventColor uzywa centralnej konfiguracji
  - Modyfikacja: src/components/grid/EventTypeFilter.tsx - EVENT_TYPES uzywa centralnej konfiguracji

- Backend: brak zmian
- Database: brak zmian
- Testy:
  - Modyfikacja: src/test/lib/ui-utils.test.ts - aktualizacja asercji
  - Modyfikacja: src/test/lib/minimap-utils.test.ts - aktualizacja asercji
  - Nowy plik: src/test/config/event-type-colors.test.ts - testy dla centralnej konfiguracji

#### Zalety:

- Centralna zrodlo prawdy dla kolorow - łatwa zmiana w jednym miejscu
- Spójnosc wizualna w calej aplikacji
- Łatwosc utrzymania i rozszerzania o nowe typy zdarzen
- Type-safe dzięki TypeScript
- Minimalna ingerencja w istniejacy kod

#### Wady:

- Wymaga aktualizacji testow jednostkowych
- Wymaga przetestowania wizualnego wszystkich miejsc wyswietlania kolorow

#### Effort: S (2-4 godziny)

- Utworzenie centralnej konfiguracji: 30 min
- Refactoring funkcji utility: 1 godz.
- Refactoring komponentow: 30 min
- Aktualizacja testow: 1 godz.
- Manualne testowanie: 30 min
- Code review: 30 min

#### Ryzyko regresji: LOW

Ryzyko jest niskie, poniewaz:

- Zmiana dotyczy tylko kolorow wizualnych
- Nie wpływa na logike biznesowa ani przepływ danych
- Można łatwo zauważyc problem podczas manualnego testowania
- Testy jednostkowe sprawdza poprawnosc mapowania kolorow

#### Zgodnosc ze standardami:

- Copilot-instructions.md: ✅ - zgodne z best practices React i TypeScript
- Best practices: ✅ - DRY principle, single source of truth, type safety

### 3.2. Rozwiazanie B

#### Opis:

Bezposrednia synchronizacja kolorow pomiedzy plikami bez tworzenia centralnej konfiguracji. Kolory z GridCell (getEventTypeColor) sa kopiowane recznie do EventTypeFilter i Minimap z odpowiednimi transformacjami.

#### Zakres zmian:

- Frontend:
  - Modyfikacja: src/lib/minimap-utils.ts - getEventColor uzywa kolorow z getEventTypeColor
  - Modyfikacja: src/components/grid/EventTypeFilter.tsx - EVENT_TYPES synchronizuje kolory

- Backend: brak zmian
- Database: brak zmian
- Testy:
  - Modyfikacja: src/test/lib/minimap-utils.test.ts - aktualizacja asercji

#### Zalety:

- Szybka implementacja
- Minimalna ilosc zmian w kodzie
- Brak nowych plikow

#### Wady:

- Brak centralnej definicji - ryzyko ponownej niespojnosci w przyszlosci
- Wymaga recnej synchronizacji przy dodawaniu nowych typow zdarzen
- Trudniejsze utrzymanie
- Duplikacja informacji o kolorach

#### Effort: XS (<2 godzin)

- Synchronizacja kolorow: 30 min
- Aktualizacja testow: 30 min
- Manualne testowanie: 30 min
- Code review: 30 min

#### Ryzyko regresji: LOW

Ryzyko jest niskie z tych samych powodow co w Rozwiazaniu A.

#### Zgodnosc ze standardami:

- Copilot-instructions.md: ⚠️ - działa, ale nie najlepsze podejscie (brak DRY)
- Best practices: ⚠️ - narusza DRY principle

## 4. Rekomendacja i uzasadnienie

### 4.1. Wybrane rozwiazanie

ROZWIAZANIE A

### 4.2. Uzasadnienie wyboru

Rozwiazanie A jest optymalne, poniewaz:

Minimalizuje ryzyko regresji poprzez:

- Utworzenie single source of truth dla kolorow
- Type-safe konfiguracje dzięki TypeScript
- Łatwe przetestowanie zmian (centralna lokalizacja)

Jest zgodne ze standardami projektu:

- Implementuje DRY principle
- Zgodne z best practices TypeScript i React
- Łatwe w utrzymaniu i rozszerzaniu

Optymalizuje effort vs. wartosc:

- Niewielki dodatkowy effort (30 min) w porownaniu z Rozwiazaniem B
- Znacznie wyzsza wartosc długoterminowa (łatwosc utrzymania)
- Eliminuje ryzyko ponownej niespojnosci

Zapewnia skalowalnosc:

- Łatwe dodawanie nowych typow zdarzen
- Centralna konfiguracja umozliwia łatwe zmiany palety kolorow
- Mozliwosc rozszerzenia o dodatkowe warianty (dark mode itp.)

Ułatwia przyszle utrzymanie:

- Wszystkie kolory w jednym miejscu
- Jasna struktura i dokumentacja
- Łatwe przetestowanie zmian

## 5. Szczegolowy plan implementacji

### 5.1. Faza 1: Przygotowanie

- [ ] Utworzenie brancha: `fix/event-type-colors-inconsistency`
- [ ] Przygotowanie dokumentacji zmian
- [ ] Sprawdzenie obecnych kolorow w GridCell (referencyjne)

### 5.2. Faza 2: Zmiany w kodzie

#### Krok 1: Utworzenie centralnej konfiguracji kolorow

Plik: `src/config/event-type-colors.ts`

Opis zmian:
Utworzenie nowego pliku z centralna definicja kolorow dla wszystkich typow zdarzen. Definiuje 3 warianty kolorow:

- cell: kolory dla GridCell (jasne tla z borderem)
- badge: kolory dla EventTypeFilter (solid kolory do kropek)
- pixel: kolory hex dla MinimapCanvas

Kod nowy:

```typescript
/**
 * Central color configuration for event types
 * Single source of truth for all event type colors across the application
 */

import type { EventType } from "@/types/nocodb.types";

/**
 * Color variants for event types
 */
export interface EventTypeColors {
  /** Full Tailwind classes for GridCell background, text, and border */
  cell: string;
  /** Tailwind background class for badge/dot indicators */
  badge: string;
  /** Hex color code for minimap pixels */
  pixel: string;
  /** Human-readable label */
  label: string;
}

/**
 * Color configuration for each event type
 *
 * Grid colors (cell variant):
 * - BLACK_SWAN_UP: green-100 background (growth/positive)
 * - BLACK_SWAN_DOWN: red-100 background (decline/negative)
 * - VOLATILITY_UP: orange-100 background (volatility increase)
 * - VOLATILITY_DOWN: yellow-100 background (volatility decrease)
 * - BIG_MOVE: blue-100 background (significant price movement)
 */
export const EVENT_TYPE_COLORS: Record<EventType, EventTypeColors> = {
  BLACK_SWAN_UP: {
    cell: "bg-green-100 text-green-900 border-green-300",
    badge: "bg-green-500",
    pixel: "#22c55e", // green-500
    label: "Czarny Łabędź (wzrost)",
  },
  BLACK_SWAN_DOWN: {
    cell: "bg-red-100 text-red-900 border-red-300",
    badge: "bg-red-500",
    pixel: "#ef4444", // red-500
    label: "Czarny Łabędź (spadek)",
  },
  VOLATILITY_UP: {
    cell: "bg-orange-100 text-orange-900 border-orange-300",
    badge: "bg-orange-500",
    pixel: "#f97316", // orange-500
    label: "Wysoka zmienność (wzrost)",
  },
  VOLATILITY_DOWN: {
    cell: "bg-yellow-100 text-yellow-900 border-yellow-300",
    badge: "bg-yellow-500",
    pixel: "#eab308", // yellow-500
    label: "Wysoka zmienność (spadek)",
  },
  BIG_MOVE: {
    cell: "bg-blue-100 text-blue-900 border-blue-300",
    badge: "bg-blue-500",
    pixel: "#3b82f6", // blue-500
    label: "Duży ruch cenowy",
  },
};

/**
 * Fallback colors for unknown event types
 */
export const FALLBACK_COLORS: EventTypeColors = {
  cell: "bg-gray-100 text-gray-900 border-gray-300",
  badge: "bg-gray-500",
  pixel: "#6b7280", // gray-500
  label: "Nieznany typ",
};

/**
 * Get cell color classes for GridCell component
 */
export function getEventTypeCellColor(eventType: EventType): string {
  return EVENT_TYPE_COLORS[eventType]?.cell || FALLBACK_COLORS.cell;
}

/**
 * Get badge color class for EventTypeFilter dots
 */
export function getEventTypeBadgeColor(eventType: EventType): string {
  return EVENT_TYPE_COLORS[eventType]?.badge || FALLBACK_COLORS.badge;
}

/**
 * Get pixel hex color for MinimapCanvas
 */
export function getEventTypePixelColor(eventType: EventType): string {
  return EVENT_TYPE_COLORS[eventType]?.pixel || FALLBACK_COLORS.pixel;
}

/**
 * Get human-readable label for event type
 */
export function getEventTypeLabel(eventType: EventType): string {
  return EVENT_TYPE_COLORS[eventType]?.label || FALLBACK_COLORS.label;
}

/**
 * Get all event types with their colors
 * Useful for filters, legends, etc.
 */
export function getAllEventTypeColors(): Array<{ value: EventType; colors: EventTypeColors }> {
  return Object.entries(EVENT_TYPE_COLORS).map(([value, colors]) => ({
    value: value as EventType,
    colors,
  }));
}
```

Uzasadnienie:
Centralna konfiguracja eliminuje duplikacje i zapewnia spójnosc kolorow w calej aplikacji. Rozdzielenie na warianty (cell, badge, pixel) umozliwia uzywanie odpowiednich kolorow w zaleznosci od kontekstu.

#### Krok 2: Refactoring ui-utils.ts

Plik: `src/lib/ui-utils.ts`

Opis zmian:
Zastapienie funkcji getEventTypeColor importem i uzyciem getEventTypeCellColor z centralnej konfiguracji.

Kod przed zmiana:

```typescript
/**
 * Get color class based on event type
 */
export function getEventTypeColor(eventType: string): string {
  switch (eventType) {
    case "BLACK_SWAN_UP":
      return "bg-green-100 text-green-900 border-green-300";
    case "BLACK_SWAN_DOWN":
      return "bg-red-100 text-red-900 border-red-300";
    case "VOLATILITY_UP":
      return "bg-orange-100 text-orange-900 border-orange-300";
    case "VOLATILITY_DOWN":
      return "bg-yellow-100 text-yellow-900 border-yellow-300";
    case "BIG_MOVE":
      return "bg-blue-100 text-blue-900 border-blue-300";
    default:
      return "bg-gray-100 text-gray-900 border-gray-300";
  }
}
```

Kod po zmianie:

```typescript
import { getEventTypeCellColor } from "@/config/event-type-colors";
import type { EventType } from "@/types/nocodb.types";

/**
 * Get color class based on event type
 * @deprecated Use getEventTypeCellColor from @/config/event-type-colors instead
 */
export function getEventTypeColor(eventType: string): string {
  return getEventTypeCellColor(eventType as EventType);
}
```

Uzasadnienie:
Zachowanie starej funkcji jako wrapper zapewnia backward compatibility, ale dodanie deprecation notice zacheca do uzywania nowej funkcji bezposrednio.

#### Krok 3: Refactoring minimap-utils.ts

Plik: `src/lib/minimap-utils.ts`

Opis zmian:
Zastapienie funkcji getEventColor importem i uzyciem getEventTypePixelColor z centralnej konfiguracji.

Kod przed zmiana:

```typescript
/**
 * Get color hex code for event type
 * Colors match GridCell component styling for consistency
 *
 * @param eventType - Type of black swan event
 * @returns Hex color code
 *
 * @example
 * getEventColor("BLACK_SWAN_UP");    // Returns: "#22c55e" (green-500)
 * getEventColor("BLACK_SWAN_DOWN");  // Returns: "#ef4444" (red-500)
 */
export function getEventColor(eventType: EventType): string {
  const colorMap: Record<EventType, string> = {
    BLACK_SWAN_UP: "#22c55e", // green-500
    BLACK_SWAN_DOWN: "#ef4444", // red-500
    VOLATILITY_UP: "#f97316", // orange-500
    VOLATILITY_DOWN: "#eab308", // yellow-500
    BIG_MOVE: "#3b82f6", // blue-500
  };

  return colorMap[eventType] || "#6b7280"; // gray-500 fallback
}
```

Kod po zmianie:

```typescript
import { getEventTypePixelColor } from "@/config/event-type-colors";

/**
 * Get color hex code for event type
 * Colors match GridCell component styling for consistency
 *
 * @param eventType - Type of black swan event
 * @returns Hex color code
 *
 * @example
 * getEventColor("BLACK_SWAN_UP");    // Returns: "#22c55e" (green-500)
 * getEventColor("BLACK_SWAN_DOWN");  // Returns: "#ef4444" (red-500)
 *
 * @deprecated Use getEventTypePixelColor from @/config/event-type-colors instead
 */
export function getEventColor(eventType: EventType): string {
  return getEventTypePixelColor(eventType);
}
```

Uzasadnienie:
Zachowanie starej funkcji jako wrapper zapewnia backward compatibility. Kolory sa teraz pobierane z centralnej konfiguracji.

#### Krok 4: Refactoring EventTypeFilter.tsx

Plik: `src/components/grid/EventTypeFilter.tsx`

Opis zmian:
Zastapienie lokalnej definicji EVENT_TYPES importem z centralnej konfiguracji z uzyciem getAllEventTypeColors i wariantu badge dla kropek.

Kod przed zmiana:

```typescript
const EVENT_TYPES: { value: EventType; label: string; color: string }[] = [
  { value: "BLACK_SWAN_UP", label: "Czarny Łabędź (wzrost)", color: "bg-red-500" },
  { value: "BLACK_SWAN_DOWN", label: "Czarny Łabędź (spadek)", color: "bg-red-600" },
  { value: "VOLATILITY_UP", label: "Wysoka zmienność (wzrost)", color: "bg-orange-500" },
  { value: "VOLATILITY_DOWN", label: "Wysoka zmienność (spadek)", color: "bg-orange-600" },
  { value: "BIG_MOVE", label: "Duży ruch cenowy", color: "bg-blue-500" },
];
```

Kod po zmianie:

```typescript
import { getAllEventTypeColors } from "@/config/event-type-colors";

// Get event types with their colors from central configuration
const EVENT_TYPES = getAllEventTypeColors().map(({ value, colors }) => ({
  value,
  label: colors.label,
  color: colors.badge,
}));
```

Uzasadnienie:
Eliminuje duplikacje i zapewnia spójnosc kolorow kropek z reszta aplikacji. Kolory badge sa teraz zgodne z kolorami grid (ta sama gama, ale solid zamiast light).

#### Krok 5: Aktualizacja GridCell.tsx (opcjonalnie)

Plik: `src/components/grid/GridCell.tsx`

Opis zmian:
Bezposrednie uzycie getEventTypeCellColor zamiast getEventTypeColor (opcjonalne - dla zachowania spójnosci).

Kod przed zmiana:

```typescript
import { getEventTypeColor, formatPercentChange } from "@/lib/ui-utils";

// ...existing code...
const colorClass = getEventTypeColor(data.eventType);
```

Kod po zmianie:

```typescript
import { formatPercentChange } from "@/lib/ui-utils";
import { getEventTypeCellColor } from "@/config/event-type-colors";

// ...existing code...
const colorClass = getEventTypeCellColor(data.eventType);
```

Uzasadnienie:
Bezposrednie uzycie funkcji z centralnej konfiguracji jest bardziej explicitne i eliminuje niepotrzebny wrapper.

### 5.3. Faza 3: Aktualizacja typow i interfejsow

Nie wymaga zmian w typach i interfejsach.

### 5.4. Faza 4: Migracje bazy danych

Nie dotyczy.

### 5.5. Faza 5: Aktualizacja/dodanie testow

#### Test jednostkowy 1: Centralna konfiguracja kolorow

Plik: `src/test/config/event-type-colors.test.ts`

```typescript
import { describe, it, expect } from "vitest";
import {
  EVENT_TYPE_COLORS,
  FALLBACK_COLORS,
  getEventTypeCellColor,
  getEventTypeBadgeColor,
  getEventTypePixelColor,
  getEventTypeLabel,
  getAllEventTypeColors,
} from "@/config/event-type-colors";
import type { EventType } from "@/types/nocodb.types";

describe("event-type-colors", () => {
  describe("EVENT_TYPE_COLORS", () => {
    it("should define colors for all event types", () => {
      const eventTypes: EventType[] = [
        "BLACK_SWAN_UP",
        "BLACK_SWAN_DOWN",
        "VOLATILITY_UP",
        "VOLATILITY_DOWN",
        "BIG_MOVE",
      ];

      eventTypes.forEach((type) => {
        expect(EVENT_TYPE_COLORS[type]).toBeDefined();
        expect(EVENT_TYPE_COLORS[type].cell).toBeTruthy();
        expect(EVENT_TYPE_COLORS[type].badge).toBeTruthy();
        expect(EVENT_TYPE_COLORS[type].pixel).toBeTruthy();
        expect(EVENT_TYPE_COLORS[type].label).toBeTruthy();
      });
    });

    it("should use correct color scheme for BLACK_SWAN_UP", () => {
      expect(EVENT_TYPE_COLORS.BLACK_SWAN_UP.cell).toContain("green");
      expect(EVENT_TYPE_COLORS.BLACK_SWAN_UP.badge).toBe("bg-green-500");
      expect(EVENT_TYPE_COLORS.BLACK_SWAN_UP.pixel).toBe("#22c55e");
    });

    it("should use correct color scheme for BLACK_SWAN_DOWN", () => {
      expect(EVENT_TYPE_COLORS.BLACK_SWAN_DOWN.cell).toContain("red");
      expect(EVENT_TYPE_COLORS.BLACK_SWAN_DOWN.badge).toBe("bg-red-500");
      expect(EVENT_TYPE_COLORS.BLACK_SWAN_DOWN.pixel).toBe("#ef4444");
    });

    it("should use correct color scheme for VOLATILITY_UP", () => {
      expect(EVENT_TYPE_COLORS.VOLATILITY_UP.cell).toContain("orange");
      expect(EVENT_TYPE_COLORS.VOLATILITY_UP.badge).toBe("bg-orange-500");
      expect(EVENT_TYPE_COLORS.VOLATILITY_UP.pixel).toBe("#f97316");
    });

    it("should use correct color scheme for VOLATILITY_DOWN", () => {
      expect(EVENT_TYPE_COLORS.VOLATILITY_DOWN.cell).toContain("yellow");
      expect(EVENT_TYPE_COLORS.VOLATILITY_DOWN.badge).toBe("bg-yellow-500");
      expect(EVENT_TYPE_COLORS.VOLATILITY_DOWN.pixel).toBe("#eab308");
    });

    it("should use correct color scheme for BIG_MOVE", () => {
      expect(EVENT_TYPE_COLORS.BIG_MOVE.cell).toContain("blue");
      expect(EVENT_TYPE_COLORS.BIG_MOVE.badge).toBe("bg-blue-500");
      expect(EVENT_TYPE_COLORS.BIG_MOVE.pixel).toBe("#3b82f6");
    });
  });

  describe("FALLBACK_COLORS", () => {
    it("should provide fallback colors", () => {
      expect(FALLBACK_COLORS.cell).toContain("gray");
      expect(FALLBACK_COLORS.badge).toBe("bg-gray-500");
      expect(FALLBACK_COLORS.pixel).toBe("#6b7280");
    });
  });

  describe("getEventTypeCellColor", () => {
    it("should return correct cell color for valid event type", () => {
      expect(getEventTypeCellColor("BLACK_SWAN_UP")).toBe("bg-green-100 text-green-900 border-green-300");
    });

    it("should return fallback color for unknown event type", () => {
      expect(getEventTypeCellColor("UNKNOWN" as EventType)).toBe(FALLBACK_COLORS.cell);
    });
  });

  describe("getEventTypeBadgeColor", () => {
    it("should return correct badge color for valid event type", () => {
      expect(getEventTypeBadgeColor("BLACK_SWAN_UP")).toBe("bg-green-500");
    });

    it("should return fallback color for unknown event type", () => {
      expect(getEventTypeBadgeColor("UNKNOWN" as EventType)).toBe(FALLBACK_COLORS.badge);
    });
  });

  describe("getEventTypePixelColor", () => {
    it("should return correct pixel color for valid event type", () => {
      expect(getEventTypePixelColor("BLACK_SWAN_UP")).toBe("#22c55e");
    });

    it("should return fallback color for unknown event type", () => {
      expect(getEventTypePixelColor("UNKNOWN" as EventType)).toBe(FALLBACK_COLORS.pixel);
    });
  });

  describe("getEventTypeLabel", () => {
    it("should return correct label for valid event type", () => {
      expect(getEventTypeLabel("BLACK_SWAN_UP")).toBe("Czarny Łabędź (wzrost)");
    });

    it("should return fallback label for unknown event type", () => {
      expect(getEventTypeLabel("UNKNOWN" as EventType)).toBe(FALLBACK_COLORS.label);
    });
  });

  describe("getAllEventTypeColors", () => {
    it("should return all event types with colors", () => {
      const all = getAllEventTypeColors();
      expect(all).toHaveLength(5);
      expect(all[0]).toHaveProperty("value");
      expect(all[0]).toHaveProperty("colors");
    });
  });
});
```

Cel testu:
Weryfikacja poprawnosci centralnej konfiguracji kolorow i wszystkich funkcji pomocniczych. Sprawdzenie spójnosci kolorow pomiedzy wariantami.

#### Test jednostkowy 2: Aktualizacja testow ui-utils.ts

Plik: `src/test/lib/ui-utils.test.ts`

Opis zmian:
Dodanie testow dla getEventTypeColor (wrapper) i upewnienie sie, ze zwraca te same wartosci co getEventTypeCellColor.

Kod nowy (dodany do istniejacych testow):

```typescript
import { getEventTypeColor } from "@/lib/ui-utils";
import { getEventTypeCellColor } from "@/config/event-type-colors";

describe("getEventTypeColor", () => {
  it("should return same values as getEventTypeCellColor", () => {
    const eventTypes = ["BLACK_SWAN_UP", "BLACK_SWAN_DOWN", "VOLATILITY_UP", "VOLATILITY_DOWN", "BIG_MOVE"];

    eventTypes.forEach((type) => {
      expect(getEventTypeColor(type)).toBe(getEventTypeCellColor(type as EventType));
    });
  });

  it("should return fallback for unknown event type", () => {
    expect(getEventTypeColor("UNKNOWN")).toContain("gray");
  });
});
```

Cel testu:
Weryfikacja zgodnosci wrappera getEventTypeColor z nowa funkcja getEventTypeCellColor.

#### Test jednostkowy 3: Aktualizacja testow minimap-utils.ts

Plik: `src/test/lib/minimap-utils.test.ts`

Opis zmian:
Dodanie testow dla getEventColor (wrapper) i upewnienie sie, ze zwraca te same wartosci co getEventTypePixelColor.

Kod nowy (dodany do istniejacych testow):

```typescript
import { getEventColor } from "@/lib/minimap-utils";
import { getEventTypePixelColor } from "@/config/event-type-colors";
import type { EventType } from "@/types/nocodb.types";

describe("getEventColor", () => {
  it("should return same values as getEventTypePixelColor", () => {
    const eventTypes: EventType[] = [
      "BLACK_SWAN_UP",
      "BLACK_SWAN_DOWN",
      "VOLATILITY_UP",
      "VOLATILITY_DOWN",
      "BIG_MOVE",
    ];

    eventTypes.forEach((type) => {
      expect(getEventColor(type)).toBe(getEventTypePixelColor(type));
    });
  });

  it("should return fallback hex for unknown event type", () => {
    expect(getEventColor("UNKNOWN" as EventType)).toBe("#6b7280");
  });
});
```

Cel testu:
Weryfikacja zgodnosci wrappera getEventColor z nowa funkcja getEventTypePixelColor.

## 6. Plan weryfikacji i testowania

### 6.1. Unit tests

- [ ] Testy dla centralnej konfiguracji event-type-colors.test.ts
- [ ] Testy dla getEventTypeColor w ui-utils.test.ts
- [ ] Testy dla getEventColor w minimap-utils.test.ts
- [ ] Wszystkie istniejace testy nadal przechodzą

### 6.2. Integration tests

- [ ] GridCell renderuje sie z poprawnymi kolorami z konfiguracji
- [ ] EventTypeFilter wyswietla kropki z poprawnymi kolorami
- [ ] MinimapCanvas renderuje piksele z poprawnymi kolorami

### 6.3. E2E tests

Nie wymaga nowych testow E2E, poniewaz zmiana dotyczy tylko kolorow wizualnych. Istniejace testy E2E dla gridu powinny nadal przechodzic.

### 6.4. Manual testing checklist

- [ ] Grid wyswietla zdarzenia z poprawnymi kolorami
- [ ] BLACK_SWAN_UP: zielone tło (bg-green-100)
- [ ] BLACK_SWAN_DOWN: czerwone tło (bg-red-100)
- [ ] VOLATILITY_UP: pomaranczowe tło (bg-orange-100)
- [ ] VOLATILITY_DOWN: zolte tło (bg-yellow-100)
- [ ] BIG_MOVE: niebieskie tło (bg-blue-100)
- [ ] EventTypeFilter wyswietla kropki zgodne z gridiem:
- [ ] BLACK_SWAN_UP: zielona kropka (bg-green-500)
- [ ] BLACK_SWAN_DOWN: czerwona kropka (bg-red-500)
- [ ] VOLATILITY_UP: pomaranczowa kropka (bg-orange-500)
- [ ] VOLATILITY_DOWN: zolta kropka (bg-yellow-500)
- [ ] BIG_MOVE: niebieska kropka (bg-blue-500)
- [ ] Miniatura gridu wyswietla piksele zgodne z gridiem:
- [ ] BLACK_SWAN_UP: zielony piksel (#22c55e)
- [ ] BLACK_SWAN_DOWN: czerwony piksel (#ef4444)
- [ ] VOLATILITY_UP: pomaranczowy piksel (#f97316)
- [ ] VOLATILITY_DOWN: zolty piksel (#eab308)
- [ ] BIG_MOVE: niebieski piksel (#3b82f6)
- [ ] Testowanie na desktop (Chrome, Firefox, Safari)
- [ ] Testowanie na mobile (iOS Safari, Android Chrome)
- [ ] Testowanie dostepnosci (aria-label, keyboard navigation)

### 6.5. Regression testing

- [ ] Grid renderuje sie poprawnie dla wszystkich typow zdarzen
- [ ] Filtrowanie po typie zdarzenia działa poprawnie
- [ ] Miniatura gridu działa poprawnie
- [ ] Sidebar z szczegolami zdarzenia wyswietla sie poprawnie
- [ ] Checkout flow nie jest dotkniety zmianami

## 7. Analiza ryzyka i mitigation

### 7.1. Zidentyfikowane ryzyka

#### Ryzyko 1: Niepoprawne kolory po refactoringu

- Severity: LOW
- Prawdopodobienstwo: LOW
- Wpływ: Kolory roznia sie od oczekiwanych, ale funkcjonalnosc działa
- Mitigation:
  - Dokładne przetestowanie wizualne wszystkich miejsc
  - Testy jednostkowe sprawdzajace poprawnosc mapowania kolorow
  - Code review z naciskiem na poprawnosc kolorow

#### Ryzyko 2: Regresja w istniejacych testach

- Severity: LOW
- Prawdopodobienstwo: MEDIUM
- Wpływ: Testy jednostkowe nie przechodzą po refactoringu
- Mitigation:
  - Aktualizacja wszystkich testow przed mergem
  - Uruchomienie pelnego test suite lokalnie
  - CI/CD automatycznie wykryje problemy

#### Ryzyko 3: Brak zgodnosci w dark mode (przyszlosc)

- Severity: LOW
- Prawdopodobienstwo: LOW
- Wpływ: Jesli w przyszlosci zostanie dodany dark mode, kolory moga wymagac aktualizacji
- Mitigation:
  - Centralna konfiguracja ułatwi dodanie wariantow dla dark mode
  - Dokumentacja struktury kolorow w konfiguracji

### 7.2. Rollback plan

W razie problemu po wdrozeniu:

1. Przywrocenie poprzedniej wersji kodu z brancha main
2. git revert {commit-hash}
3. Usuniecie pliku src/config/event-type-colors.ts
4. Przywrocenie oryginalnych funkcji getEventTypeColor i getEventColor
5. Przywrocenie oryginalnej definicji EVENT_TYPES w EventTypeFilter.tsx
6. Uruchomienie testow w celu weryfikacji przywrocenia
7. Deploy poprzedniej wersji

### 7.3. Monitoring post-deployment

Po wdrozeniu naprawy monitorowac:

- User feedback: czy uzytkownicy zgłaszaja problemy z kolorami lub czytelnoscia
- Error logs: brak bledow zwiazanych z getEventTypeColor / getEventColor
- Visual regression: porownanie screenshotow przed i po zmianach
- Performance: brak wpływu na wydajnosc renderowania

## 8. Zgodnosc ze standardami

### 8.1. Copilot-instructions.md compliance

- React patterns: ✅ - zgodne z functional components i hooks
- Astro patterns: ✅ - nie dotyczy (zmiany tylko w React)
- Accessibility (ARIA, WCAG): ✅ - brak wpływu na dostepnosc
- TypeScript best practices: ✅ - type-safe konfiguracja, Record<EventType, ...>
- Testing patterns: ✅ - testy jednostkowe dla nowych funkcji

### 8.2. Tech-stack.md compliance

- Uzyty framework/library: ✅ - TypeScript 5.8.x, React 19.x
- Dependencies: ✅ - brak nowych zaleznosci
- Build tools: ✅ - brak zmian w build tools

### 8.3. Security checklist

- [ ] Input validation - nie dotyczy (brak inputow)
- [ ] Authorization - nie dotyczy
- [ ] Authentication - nie dotyczy
- [ ] XSS protection - ✅ kolory sa statyczne, brak user input
- [ ] CSRF protection - nie dotyczy
- [ ] SQL injection protection - nie dotyczy
- [ ] Secrets management - nie dotyczy
- [ ] Rate limiting - nie dotyczy

### 8.4. Performance checklist

- [ ] Bundle size impact - minimalny (nowy plik konfiguracyjny ~2KB)
- [ ] Rendering optimization - ✅ brak wpływu na rendering
- [ ] Loading states - nie dotyczy
- [ ] Error boundaries - nie dotyczy
- [ ] Code splitting - nie dotyczy

### 8.5. Accessibility checklist (dla UI)

- [ ] ARIA attributes - ✅ brak zmian w ARIA
- [ ] Keyboard navigation - ✅ brak zmian w nawigacji
- [ ] Focus management - ✅ brak zmian w focus
- [ ] Semantic HTML - ✅ brak zmian w HTML
- [ ] Color contrast - ✅ kolory pozostaja te same, tylko spójne
- [ ] Screen reader testing - ✅ brak wpływu na czytniki ekranu

## 9. Dokumentacja zmian

### 9.1. Changelog entry

```markdown
### Fixed

- [Event Type Colors] Unified color scheme across Grid, EventTypeFilter, and Minimap for consistent visual experience
```

### 9.2. Aktualizacja README (jesli wymagana)

Nie wymaga aktualizacji README.

### 9.3. Dokumentacja techniczna (jesli wymagana)

Dodanie komentarza w src/config/event-type-colors.ts z opisem struktury konfiguracji i sposobu uzywania.

### 9.4. Release notes

Dla uzytkownikow koncowych:

Naprawiono spójnosc kolorow typow zdarzen w calej aplikacji. Teraz kolory zdarzen w gridzie, filtrze i minimapie sa zgodne ze soba, co ułatwia identyfikacje poszczegolnych typow.

## 10. Timeline i effort estimation

### 10.1. Estymacja czasu

- Implementacja: 2 godziny
  - Utworzenie konfiguracji: 30 min
  - Refactoring funkcji: 1 godz.
  - Refactoring komponentow: 30 min
- Testowanie: 1 godzina
  - Testy jednostkowe: 45 min
  - Manualne testowanie: 15 min
- Code review: 30 min
- Deployment: 15 min
- Monitoring post-deployment: 1 dzien (passive)

Łącznie: 3.75 godziny implementacji + 1 dzien monitoringu

### 10.2. Zaleznosci

Brak zaleznosci blokujacych lub blokowanych.

### 10.3. Sugerowany timeline

- Start: 2026-02-10
- Code complete: 2026-02-10 (ten sam dzien)
- Testing complete: 2026-02-10 (ten sam dzien)
- Code review: 2026-02-11
- Deployment to staging: 2026-02-11
- Deployment to production: 2026-02-11
- Monitoring: 2026-02-11 - 2026-02-12

## 11. Załączniki

### 11.1. Dotknięte pliki (lista pelna)

```
src/config/event-type-colors.ts (nowy)
src/lib/ui-utils.ts
src/lib/minimap-utils.ts
src/components/grid/EventTypeFilter.tsx
src/components/grid/GridCell.tsx (opcjonalnie)
src/test/config/event-type-colors.test.ts (nowy)
src/test/lib/ui-utils.test.ts
src/test/lib/minimap-utils.test.ts
```

### 11.2. Referencje

- Dokumentacja FIXES_SUMMARY.md - linie 60-100 (poprzednia naprawa EventTypeFilter)
- Dokumentacja FINAL_VERIFICATION_REPORT.md - linie 116-120 (definicja kolorow)
- GridCell.tsx - linie 1-88 (referencyjne kolory grid)
- MinimapCanvas.tsx - linie 151-155 (renderowanie pikseli)
- EventTypeFilter.tsx - linie 16-21 (aktualna definicja kolorow)

### 11.3. Screenshoty/diagramy

Przed zmiana:

- Grid: BLACK_SWAN_UP jako bg-green-100
- Filter: BLACK_SWAN_UP jako bg-red-500 (NIEZGODNE)
- Minimap: BLACK_SWAN_UP jako #22c55e (green-500, czesc zgadza sie z filtrem, ale nie z gridem)

Po zmianie:

- Grid: BLACK_SWAN_UP jako bg-green-100 (bez zmian)
- Filter: BLACK_SWAN_UP jako bg-green-500 (ZGODNE - ta sama gama co grid)
- Minimap: BLACK_SWAN_UP jako #22c55e (ZGODNE - green-500 to solid wersja green-100)

### 11.4. Error logs/stack traces

Nie dotyczy - brak bledow, tylko niespojnosc wizualna.
