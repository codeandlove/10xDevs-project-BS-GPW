# Plan Naprawy Bledu - expired-trial-grid-access

Data utworzenia: 2026-01-15
Tytul bledu: Po wygasnieciu trialu uzytkownik nadal widzi grid z danymi zamiast rozmazanej wersji demo
Severity: HIGH
Typ bledu: Business Logic + Security

## 1. Podsumowanie wykonawcze

### 1.1. Opis bledu
Po wygasnieciu okresu trial, zalogowany uzytkownik widzi prawidlowy banner "Trial wygasl", jednak ponizej nadal wyswietlany jest w pelni funkcjonalny grid z rzeczywistymi danymi. Dane sa pobierane z API mimo braku aktywnej subskrypcji. Uzytkownik moze rowniez bezposrednio wchodzic na linki /event/[id] i ogladac szczegoly zdarzen.

### 1.2. Root cause
Middleware (`src/middleware/index.ts`) prawidlowo sprawdza status subskrypcji i przekierowuje do /403 gdy trial wygasl, jednak przekierowanie dziala TYLKO na poziomie server-side (Astro SSR). Komponenty React wykonujace fetch po stronie klienta (`GridView.tsx`, `EventDetailView.tsx`) pobieraja dane bezposrednio z API endpointow, ktore maja wlasna walidacje subskrypcji. Problem polega na tym, ze:
1. API endpointy (`/api/nocodb/grid.ts`, `/api/nocodb/events/[id].ts`, `/api/nocodb/summaries.ts`) zwracaja error 403, ale komponenty React nie obsluguja tego przypadku w sposob wymagany przez specyfikacje
2. Brak warunkowego renderowania w GridView.tsx - komponent zawsze renderuje pelny grid jesli dane sa dostepne
3. Brak implementacji rozmazanego demo grida z falszywyymi danymi dla uzytkownikow bez subskrypcji

### 1.3. Zakres wpływu
- Dotknięte komponenty/moduły: GridView.tsx, VirtualizedGrid.tsx, GridCell.tsx, EventDetailView.tsx, SummaryView.tsx, AuthContext.tsx
- Dotknięci uzytkownicy: Wszyscy uzytkownicy z wygaslym trialem (subscription_status = "trial" AND trial_expires_at < NOW)
- Dotknięte srodowiska: production, staging, development

### 1.4. Priorytet naprawy
HIGH - Blad pozwala uzytkownikow bez aktywnej subskrypcji ogladac premium content, co narusza model biznesowy i moze prowadzic do strat finansowych. Nie jest CRITICAL poniewaz middleware blokuje podstawowa nawigacje (wymaga obejscia przez bezposrednie API calls lub cache).

## 2. Szczegolowa analiza bledu

### 2.1. Kroki reprodukcji
1. Zaloguj sie jako uzytkownik z aktywnym trialem
2. Wejdz na /grid - widoczny jest pelny grid z danymi
3. Zmien manualnie w bazie danych `trial_expires_at` na date w przeszlosci (lub poczekaj na naturalne wygasniecie)
4. Odswiez strone /grid
5. Zaobserwuj banner "Trial wygasl" u gory strony
6. Przewin w dol - grid z rzeczywistymi danymi jest nadal widoczny i funkcjonalny
7. Otworz DevTools > Network - API calls do /api/nocodb/grid zwracaja 403, ale dane z cache sa wyswietlane
8. Wyczysc cache (localStorage) i odswiez
9. Grid nadal wyswietla sie (prawdopodobnie z powodu stale-while-revalidate lub innych mechanizmow cache)
10. Sprobuj wejsc bezposrednio na /event/abc123 - szczegoly zdarzenia sa widoczne

### 2.2. Oczekiwane zachowanie
Po wygasnieciu trialu uzytkownik powinien widziec:
- Banner "Trial wygasl" z CTA do zakupu planu
- Rozmazany (blurred) grid z falszywyymi/demo danymi
- Grid nieklikalny - brak mozliwosci otwierania szczegolow zdarzen
- Zablokowane scrollowanie lub wyswietlanie tylko czesci grida (np. pierwsze 3 wiersze)
- Komunikat overlayem "Kup plan aby zobaczyc pelne dane"
- Przekierowanie do /403 lub /checkout przy probie bezposredniego wejscia na /event/[id] lub /summary/[id]

### 2.3. Rzeczywiste zachowanie
- Banner "Trial wygasl" wyswietla sie poprawnie
- Grid z pelnyymi rzeczywistymi danymi jest widoczny i w pelni funkcjonalny
- Klikanie na komorki otwiera sidebary z AI summary
- Scrollowanie dziala normalnie
- Bezposrednie linki /event/[id] wyswietlaja pelne szczegoly
- Cache przegladarki pozwala na ogladanie danych nawet po wylogowaniu i ponownym zalogowaniu

### 2.4. Root cause analysis

Lokalizacja bledu:
1. `src/components/grid/GridView.tsx:150-165` - brak warunkowego renderowania w zaleznosci od subscription status
2. `src/components/event/EventDetailView.tsx` (nie zweryfikowano) - prawdopodobnie brak walidacji subskrypcji
3. `src/contexts/AuthContext.tsx:30-40` - profil uzytkownika jest pobierany, ale subscription status nie jest wykorzystywany do kontroli UI
4. `src/hooks/useClientCache.ts` (nie zweryfikowano) - cache moze przechowywac stare dane pomimo 403 z API

Przyczyna techniczna:
- GridView.tsx nie sprawdza `profile.subscription_status` ani funkcji `canAccessPremiumFeatures(profile)` przed renderowaniem pelnego grida
- Komponenty React islands w Astro dzialaja client-side i nie maja dostepu do middleware context
- API endpointy poprawnie zwracaja 403, ale error handling w komponentach nie obejmuje scenariusza "pokan demo/blurred grid"
- useClientCache prawdopodobnie zwraca stare dane z cache jesli API zwroci error (stale-while-revalidate pattern)

Brakujące warunki/sprawdzenia:
- Warunek w GridView.tsx: `if (!canAccessPremiumFeatures(profile)) return <BlurredDemoGrid />`
- Warunek w EventDetailView.tsx: przekierowanie do /403 jesli brak dostepu
- Implementacja komponentu BlurredDemoGrid z falszywyymi danymi
- Konfiguracja useClientCache aby NIE zwracac cached data jesli user stracil dostep

Nieprawidlowa logika:
- Middleware dziala tylko server-side (Astro SSR), ale React islands fetchuja dane client-side omijajac middleware
- Brak konsystencji miedzy server-side authorization a client-side UI rendering

### 2.5. Analiza zasiegu

#### Komponenty frontend:
- `src/components/grid/GridView.tsx` - wymaga dodania warunkowego renderowania w zaleznosci od subscription status
- `src/components/grid/VirtualizedGrid.tsx` - moze byc wykorzystany jako podstawa dla BlurredDemoGrid
- `src/components/grid/GridCell.tsx` - wymaga variant "blurred" dla demo mode
- `src/components/event/EventDetailView.tsx` - wymaga dodania sprawdzenia subscription przed renderowaniem
- `src/components/summary/SummaryView.tsx` - wymaga dodania sprawdzenia subscription przed renderowaniem
- `src/components/layout/AppLayout.tsx` - juz renderuje SubscriptionBanner, mozna dodac overlay/gate

#### Nowe komponenty do utworzenia:
- `src/components/grid/BlurredDemoGrid.tsx` - rozmazany grid z falszywyymi danymi dla uzytkownikow bez subskrypcji
- `src/components/subscription/SubscriptionGate.tsx` - wrapper component sprawdzajacy dostep i renderujacy children lub paywall

#### Serwisy/hooki:
- `src/hooks/useClientCache.ts` - moze wymagac aktualizacji aby invalidate cache gdy subscription wygasnie
- `src/lib/auth.ts` - funkcja `canAccessPremiumFeatures()` juz istnieje i dziala poprawnie

#### Typy/interfejsy:
- `src/types/ui.types.ts` - mozliwe dodanie typu `GridMode = 'full' | 'demo' | 'blurred'`
- Brak koniecznosci zmian w istniejacych typach

#### Backend/API:
- API endpointy juz poprawnie zwracaja 403 dla uzytkownikow bez subskrypcji
- Brak koniecznosci zmian w API

#### Baza danych:
- Brak koniecznosci zmian w schema
- Istniejace kolumny `subscription_status` i `trial_expires_at` sa wystarczajace

#### Testy:
- `e2e/grid.spec.ts` - wymaga dodania testu dla expired trial scenario
- `src/components/grid/GridView.test.tsx` (do utworzenia) - unit test dla warunkowego renderowania
- `src/lib/auth.test.ts` - juz istnieje i testuje `canAccessPremiumFeatures()`

## 3. Propozycje rozwiazan

### 3.1. Rozwiazanie A: Warunkowe renderowanie z BlurredDemoGrid (REKOMENDOWANE)

#### Opis:
Dodac warunek w GridView.tsx ktory sprawdza `canAccessPremiumFeatures(profile)`. Jesli false, renderowac nowy komponent BlurredDemoGrid zamiast VirtualizedGrid. BlurredDemoGrid bedzie wyswietlal:
- Falszywe dane (hardcoded mock events z generycznymi nazwami ticker'ow)
- Efekt blur na wszystkich komorkach (CSS filter: blur(4px))
- Overlay z komunikatem "Kup plan aby zobaczyc pelne dane" i CTA button
- Zablokowane klikanie i scrollowanie
Dodatkowo, EventDetailView.tsx i SummaryView.tsx beda sprawdzac subscription i przekierowywac do /403 lub renderowac paywall.

#### Zakres zmian:
- Frontend:
  - `src/components/grid/GridView.tsx` - dodanie warunku sprawdzajacego subscription
  - `src/components/grid/BlurredDemoGrid.tsx` - nowy komponent (80-100 linii)
  - `src/components/grid/GridCell.tsx` - dodanie variant blurred (opcjonalnie)
  - `src/components/subscription/SubscriptionGate.tsx` - reusable wrapper (40-50 linii)
  - `src/components/event/EventDetailView.tsx` - dodanie SubscriptionGate
  - `src/components/summary/SummaryView.tsx` - dodanie sprawdzenia subscription
- Backend: Brak zmian
- Database: Brak zmian
- Testy:
  - `e2e/grid.spec.ts` - dodanie testu dla expired trial (20-30 linii)
  - `src/components/grid/GridView.test.tsx` - nowy plik (50-80 linii)

#### Zalety:
- Minimalna ingerencja w istniejacy kod
- Wykorzystuje istniejace funkcje auth (`canAccessPremiumFeatures`)
- Nie wymaga zmian w API ani bazie danych
- Latwo testowalny
- Dobrze oddziela logike subscription od logiki renderowania grida
- Reusable SubscriptionGate moze byc uzywany w innych miejscach

#### Wady:
- Wymaga utworzenia mock'owanych danych dla BlurredDemoGrid
- Dodatkowy kod do utrzymania (BlurredDemoGrid)
- Efekt blur moze nie byc wystarczajaco mocny (uzytkownik moze odczytac dane)

#### Effort: M (6-8 godzin)
- Implementacja BlurredDemoGrid: 2-3h
- Implementacja SubscriptionGate: 1h
- Integracja z GridView/EventDetailView/SummaryView: 1-2h
- Testy E2E i unit: 2h
- Testing manualny i bugfixing: 1h

#### Ryzyko regresji: LOW
- Zmiany sa addytywne (dodajemy nowe komponenty)
- Istniejacy grid nie jest modyfikowany
- Logika autoryzacji juz istnieje i jest przetestowana

#### Zgodnosc ze standardami:
- Copilot-instructions.md: ✅ - Uzywa React functional components, hooks, conditional rendering
- Tech-stack.md: ✅ - Wykorzystuje Astro + React, TypeScript
- Best practices: ✅ - Separation of concerns, reusable components

### 3.2. Rozwiazanie B: Client-side invalidation cache + przekierowanie

#### Opis:
Zamiast renderowac BlurredDemoGrid, zmodyfikowac useClientCache aby sprawdzal subscription status przed zwroceniem cached data. Jesli user nie ma dostepu, useClientCache zwraca error i GridView renderuje komunikat "Subscription required" z przekierowaniem do /checkout. Podobnie dla EventDetailView i SummaryView - przekierowanie do /403.

#### Zakres zmian:
- Frontend:
  - `src/hooks/useClientCache.ts` - dodanie sprawdzenia subscription status przed zwroceniem cache
  - `src/components/grid/GridView.tsx` - renderowanie "subscription required" zamiast grida
  - `src/contexts/AuthContext.tsx` - dodanie funkcji pomocniczej `clearCacheOnSubscriptionChange`
  - `src/components/event/EventDetailView.tsx` - przekierowanie do /403
  - `src/components/summary/SummaryView.tsx` - przekierowanie do /403 lub zamkniecie sidebar
- Backend: Brak zmian
- Database: Brak zmian
- Testy:
  - `src/hooks/useClientCache.test.ts` - aktualizacja testow
  - `e2e/grid.spec.ts` - test przekierowania

#### Zalety:
- Prostsze rozwiazanie - brak koniecznosci tworzenia BlurredDemoGrid
- Cache jest automatycznie invalidowany gdy subscription wygasa
- Mniej kodu do utrzymania

#### Wady:
- Gorsze UX - uzytkownik nie widzi nawet demo wersji grida
- Wymaga zmian w core hook (useClientCache) co moze wpłynac na inne miejsca
- Brak "soft paywall" - uzytkownik od razu jest blokowany
- Nie realizuje wymagania "rozmazany grid z falszywyymi danymi"

#### Effort: S (3-4 godziny)
- Modyfikacja useClientCache: 1-2h
- Integracja z komponentami: 1h
- Testy: 1h

#### Ryzyko regresji: MEDIUM
- Zmiana core hook (useClientCache) moze wpłynac na inne komponenty korzystajace z cache
- Wymaga gruntownego testowania cache invalidation

#### Zgodnosc ze standardami:
- Copilot-instructions.md: ✅ - Wykorzystuje hooki
- Tech-stack.md: ✅ - Bez zmian w stacku
- Best practices: ⚠️ - Modyfikacja core utility moze byc ryzykowna

### 3.3. Rozwiazanie C: Server-side gate w Astro + client hydration

#### Opis:
Przeniesienie logiki sprawdzania subscription na poziom Astro SSR. Strona grid.astro sprawdza subscription i przekazuje prop `hasAccess` do GridPageWrapper. Jesli hasAccess = false, GridPageWrapper renderuje BlurredDemoGrid zamiast normalnego GridView. Podobnie dla event/[id].astro.

#### Zakres zmian:
- Frontend:
  - `src/pages/grid.astro` - dodanie sprawdzenia subscription w Astro context
  - `src/pages/event/[id].astro` - dodanie sprawdzenia subscription
  - `src/components/grid/GridPageWrapper.tsx` - przyjmowanie prop hasAccess
  - `src/components/grid/BlurredDemoGrid.tsx` - nowy komponent
  - `src/components/event/EventDetailView.tsx` - przyjmowanie prop hasAccess
- Backend: Brak zmian
- Database: Brak zmian
- Testy:
  - E2E testy dla grid i event detail view

#### Zalety:
- Sprawdzanie subscription na server-side - bardziej bezpieczne
- Brak mozliwosci obejscia przez cache czy DevTools
- Spojne z architektura Astro (SSR first)

#### Wady:
- Wymaga duplikacji logiki middleware w plikach .astro
- Wiecej zmian w roznych miejscach
- Trudniejsze do utrzymania (logika subscription w 3 miejscach: middleware, grid.astro, event.astro)
- Hydration errors jesli server i client renderuja rozne rzeczy

#### Effort: M (5-7 godzin)
- Modyfikacja plikow .astro: 1-2h
- Przekazanie props przez komponenty: 1-2h
- Implementacja BlurredDemoGrid: 2h
- Testy: 1-2h

#### Ryzyko regresji: MEDIUM
- Zmiana w strukturze props moze spowodowac problemy z hydration
- Duplikacja logiki autoryzacji (DRY violation)

#### Zgodnosc ze standardami:
- Copilot-instructions.md: ✅ - Zgodne z Astro SSR patterns
- Tech-stack.md: ✅ - Wykorzystuje Astro capabilities
- Best practices: ⚠️ - Duplikacja logiki

## 4. Rekomendacja i uzasadnienie

### 4.1. Wybrane rozwiazanie
ROZWIAZANIE A - Warunkowe renderowanie z BlurredDemoGrid

### 4.2. Uzasadnienie wyboru

Minimalizuje ryzyko regresji poprzez:
- Addytywne zmiany (dodajemy nowe komponenty zamiast modyfikowac istniejace)
- Brak zmian w core utilities (useClientCache, middleware)
- Izolacja logiki subscription gate w osobnych komponentach
- Istniejaca funkcja `canAccessPremiumFeatures()` jest juz przetestowana

Jest zgodne ze standardami projektu:
- Wykorzystuje React functional components + hooks (copilot-instructions.md)
- Uzywa TypeScript dla type safety
- Zgodne z Astro islands architecture (client:load components)
- Separation of concerns - BlurredDemoGrid i SubscriptionGate sa reusable

Optymalizuje effort vs. wartosc:
- Srednio-niski effort (6-8h) dla HIGH priority bug
- Dobrze skalowalne - SubscriptionGate moze byc uzywany w innych miejscach
- Najlepszy UX - uzytkownik widzi "preview" grida (blur) zamiast pustej strony

Zapewnia skalowalnosc:
- SubscriptionGate moze byc uzywany dla innych premium features w przyszlosci
- BlurredDemoGrid moze byc enhancement z czasem (np. wiecej demo danych, lepszy blur effect)
- Pattern moze byc replikowany dla innych widokow (charts, analytics itp.)

Ułatwia przyszle utrzymanie:
- Czytelny kod - latwo zrozumiec gdzie jest logika subscription
- Latwo testowalny - unit testy dla SubscriptionGate, E2E dla user journey
- Dokumentacja w komponentach bedzie jasno opisywac zachowanie

## 5. Szczegolowy plan implementacji

### 5.1. Faza 1: Przygotowanie
- [ ] Utworzenie brancha: `fix/expired-trial-grid-access`
- [ ] Przygotowanie mock danych dla BlurredDemoGrid (5-10 fake events)
- [ ] Przygotowanie srodowiska testowego z userem trial expired
- [ ] Przygotowanie screenshotow "before" dla dokumentacji

### 5.2. Faza 2: Zmiany w kodzie

#### Krok 1: Utworzenie SubscriptionGate component
Plik: `src/components/subscription/SubscriptionGate.tsx`

Opis zmian:
Utworzyc reusable wrapper component ktory sprawdza czy user ma dostep do premium features i renderuje children lub fallback (paywall/redirect).

Kod do implementacji:
```typescript
/**
 * Subscription Gate Component
 * Wrapper that checks if user has access to premium features
 * Renders children if access granted, otherwise shows paywall or redirects
 */

import { useAuth } from "@/contexts/AuthContext";
import { canAccessPremiumFeatures } from "@/lib/auth";
import { useEffect, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface SubscriptionGateProps {
  children: ReactNode;
  fallback?: ReactNode;
  redirectTo?: string;
  mode?: "render" | "redirect";
}

export function SubscriptionGate({ 
  children, 
  fallback, 
  redirectTo = "/checkout",
  mode = "render" 
}: SubscriptionGateProps) {
  const { profile, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && profile && !canAccessPremiumFeatures(profile) && mode === "redirect") {
      window.location.href = redirectTo;
    }
  }, [profile, isLoading, redirectTo, mode]);

  if (isLoading) {
    return <div className="flex h-full items-center justify-center">Ładowanie...</div>;
  }

  if (!profile || !canAccessPremiumFeatures(profile)) {
    if (mode === "redirect") {
      return <div className="flex h-full items-center justify-center">Przekierowywanie...</div>;
    }
    
    if (fallback) {
      return <>{fallback}</>;
    }

    // Default paywall
    return (
      <div className="flex h-[400px] flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-8">
        <div className="text-center">
          <h3 className="text-xl font-semibold text-gray-900">Wymagana subskrypcja</h3>
          <p className="mt-2 text-sm text-gray-600">
            Aby uzyskać dostęp do pełnych danych, kup plan premium.
          </p>
        </div>
        <Button onClick={() => window.location.href = redirectTo}>
          Kup plan
        </Button>
      </div>
    );
  }

  return <>{children}</>;
}
```

Uzasadnienie:
Ten komponent enkapsuluje logike sprawdzania subscription i moze byc reusowany w roznych miejscach. Wspiera mode="redirect" dla hard block i mode="render" dla soft paywall.

#### Krok 2: Utworzenie BlurredDemoGrid component
Plik: `src/components/grid/BlurredDemoGrid.tsx`

Opis zmian:
Utworzyc komponent wyswietlajacy rozmazany grid z falszywyymi danymi. Uzytkownik widzi "preview" ale nie moze ogladac rzeczywistych danych.

Kod do implementacji:
```typescript
/**
 * Blurred Demo Grid Component
 * Shows a blurred preview grid with fake data for users without subscription
 */

import { useMemo } from "react";
import { GridCell } from "./GridCell";
import { getDatesInRange } from "@/lib/ui-utils";
import type { DateRange, EventType } from "@/types/nocodb.types";
import type { GridCellData } from "@/types/ui.types";
import { Button } from "@/components/ui/button";

const DEMO_SYMBOLS = ["ABC", "XYZ", "QWE", "RTY"];
const DEMO_EVENT_TYPES: EventType[] = ["BLACK_SWAN_UP", "BLACK_SWAN_DOWN", "VOLATILITY_UP"];

interface BlurredDemoGridProps {
  range: DateRange;
}

export function BlurredDemoGrid({ range }: BlurredDemoGridProps) {
  // Generate fake data
  const { symbols, dates, fakeCells } = useMemo(() => {
    const datesInRange = getDatesInRange(range);
    const cells: GridCellData[][] = [];

    DEMO_SYMBOLS.forEach((symbol) => {
      const row: GridCellData[] = [];
      datesInRange.forEach((date, index) => {
        // Random events (30% chance)
        if (Math.random() > 0.7) {
          row.push({
            eventId: `demo-${symbol}-${date}`,
            symbol,
            date,
            eventType: DEMO_EVENT_TYPES[Math.floor(Math.random() * DEMO_EVENT_TYPES.length)],
            percentChange: (Math.random() * 20 - 10), // -10% to +10%
            hasSummary: Math.random() > 0.5,
          });
        } else {
          row.push({
            eventId: null,
            symbol,
            date,
          });
        }
      });
      cells.push(row);
    });

    return {
      symbols: DEMO_SYMBOLS,
      dates: datesInRange,
      fakeCells: cells,
    };
  }, [range]);

  return (
    <div className="relative">
      {/* Blurred grid */}
      <div className="pointer-events-none select-none blur-sm" aria-hidden="true">
        <div className="overflow-x-auto rounded-lg border">
          <div className="inline-block min-w-full align-middle">
            <div className="overflow-hidden">
              <table className="min-w-full" role="grid">
                <thead className="bg-gray-50">
                  <tr role="row">
                    <th className="sticky left-0 z-10 bg-gray-50 px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      Symbol
                    </th>
                    {dates.map((date) => (
                      <th key={date} className="px-4 py-3 text-center text-sm font-semibold text-gray-700" role="columnheader">
                        {date}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {symbols.map((symbol, symbolIndex) => (
                    <tr key={symbol} role="row">
                      <td className="sticky left-0 z-10 bg-white px-4 py-2 text-sm font-medium text-gray-900">
                        {symbol}
                      </td>
                      {dates.map((date, dateIndex) => (
                        <td key={`${symbol}-${date}`} className="p-1">
                          <GridCell
                            data={fakeCells[symbolIndex][dateIndex]}
                            isSelected={false}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Overlay with CTA */}
      <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-sm">
        <div className="rounded-xl border-2 border-primary bg-white p-8 shadow-2xl">
          <div className="text-center">
            <div className="mb-4 text-5xl">🔒</div>
            <h3 className="mb-2 text-2xl font-bold text-gray-900">
              Odblokuj pełny dostęp
            </h3>
            <p className="mb-6 text-gray-600">
              Zobacz rzeczywiste dane i AI analizy Black Swan events
            </p>
            <Button size="lg" onClick={() => window.location.href = "/checkout"}>
              Kup plan premium
            </Button>
            <p className="mt-4 text-xs text-gray-500">
              Bezpłatny trial na 7 dni • Anuluj w każdej chwili
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
```

Uzasadnienie:
Komponent generuje losowe fake dane aby pokazac "preview" grida. Blur effect + overlay uniemozliwia odczytanie danych, a CTA zacheca do zakupu planu.

#### Krok 3: Modyfikacja GridView - warunkowe renderowanie
Plik: `src/components/grid/GridView.tsx`

Opis zmian:
Dodac sprawdzenie subscription status i renderowac BlurredDemoGrid jesli user nie ma dostepu.

Kod przed zmiana:
```typescript
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
    <div className="text-center">
      <p className="text-lg font-medium text-muted-foreground">Brak zdarzeń w wybranym zakresie</p>
      <p className="mt-2 text-sm text-muted-foreground">Spróbuj zmienić zakres czasowy lub filtry tickerów</p>
    </div>
  </div>
)}
```

Kod po zmianie:
```typescript
import { useAuth } from "@/contexts/AuthContext";
import { canAccessPremiumFeatures } from "@/lib/auth";
import { BlurredDemoGrid } from "./BlurredDemoGrid";

// ...existing imports...

export function GridView() {
  const { profile } = useAuth();
  // ...existing code...

  // Check if user has access to premium features
  const hasAccess = profile && canAccessPremiumFeatures(profile);

  return (
    <ErrorBoundary>
      <AppLayout
        // ...existing props...
      >
        <div>
          {error && (
            // ...existing error handling...
          )}

          {isLoading ? (
            <GridSkeleton />
          ) : !hasAccess ? (
            <BlurredDemoGrid range={gridState.range} />
          ) : events.length > 0 ? (
            <VirtualizedGrid
              events={events}
              range={gridState.range}
              onCellClick={handleCellClick}
              selectedEventId={gridState.eventId}
            />
          ) : (
            <div className="flex h-[400px] items-center justify-center">
              <div className="text-center">
                <p className="text-lg font-medium text-muted-foreground">Brak zdarzeń w wybranym zakresie</p>
                <p className="mt-2 text-sm text-muted-foreground">Spróbuj zmienić zakres czasowy lub filtry tickerów</p>
              </div>
            </div>
          )}
        </div>

        {/* Summary Sidebar/Drawer - only if has access */}
        {hasAccess && <SummaryView eventId={gridState.eventId || null} onClose={handleCloseSummary} />}
      </AppLayout>
    </ErrorBoundary>
  );
}
```

Uzasadnienie:
Dodajemy sprawdzenie `hasAccess` przed renderowaniem pelnego grida. Jesli user nie ma dostepu, renderujemy BlurredDemoGrid. Dodatkowo, SummaryView jest renderowany tylko jesli user ma dostep (zapobiega otwieraniu sidebar'a nawet jesli ktos sprobuje manipulowac URL).

#### Krok 4: Ochrona EventDetailView
Plik: `src/components/event/EventDetailView.tsx`

Opis zmian:
Owinac caly komponent w SubscriptionGate aby blokowac dostep do szczegolow zdarzenia dla uzytkownikow bez subskrypcji.

Kod do dodania:
```typescript
import { SubscriptionGate } from "@/components/subscription/SubscriptionGate";

// ...existing imports and code...

export function EventDetailView({ eventId }: EventDetailViewProps) {
  return (
    <SubscriptionGate mode="redirect" redirectTo="/403?reason=subscription_required">
      {/* ...existing EventDetailView content... */}
    </SubscriptionGate>
  );
}
```

Uzasadnienie:
Uzytkownik probujacy wejsc bezposrednio na /event/[id] bez aktywnej subskrypcji zostanie przekierowany do /403. Mode="redirect" zapewnia hard block.

#### Krok 5: Ochrona SummaryView (opcjonalnie - juz czescio chronione)
Plik: `src/components/summary/SummaryView.tsx`

Opis zmian:
SummaryView jest juz czescio chroniony przez to, ze GridView nie renderuje go jesli `!hasAccess`. Jednak dla dodatkowego bezpieczenstwa mozemy dodac wewnetrzne sprawdzenie.

Kod do dodania na poczatku komponentu:
```typescript
import { useAuth } from "@/contexts/AuthContext";
import { canAccessPremiumFeatures } from "@/lib/auth";

export function SummaryView({ eventId, onClose }: SummaryViewProps) {
  const { profile } = useAuth();
  
  // Additional safety check
  if (!profile || !canAccessPremiumFeatures(profile)) {
    return null;
  }

  // ...existing code...
}
```

Uzasadnienie:
Defense in depth - nawet jesli ktos sprobuje otworzyc summary przez manipulacje state, komponent nie renderuje sie.

### 5.3. Faza 3: Aktualizacja typow i interfejsow

Brak koniecznosci zmian w typach - istniejace interfejsy sa wystarczajace.

### 5.4. Faza 4: Migracje bazy danych

Brak koniecznosci migracji - istniejace kolumny `subscription_status` i `trial_expires_at` sa wystarczajace.

### 5.5. Faza 5: Aktualizacja/dodanie testow

#### Test E2E 1: Grid dla expired trial
Plik: `e2e/grid.spec.ts`

```typescript
test("TC-GRID-005: Show blurred demo grid for expired trial user", async ({ page }) => {
  // Setup: Mock user with expired trial
  await page.route("**/api/users/me", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          user: {
            auth_uid: "test-expired-user",
            email: "expired@example.com",
            subscription_status: "trial",
            trial_expires_at: "2025-01-01T00:00:00Z", // Past date
            deleted_at: null,
          },
        },
      }),
    });
  });

  // Mock grid API to return 403
  await page.route("**/api/nocodb/grid**", (route) => {
    route.fulfill({
      status: 403,
      contentType: "application/json",
      body: JSON.stringify({ error: "Subscription required" }),
    });
  });

  await page.goto("/grid");

  // Should show subscription banner
  await expect(page.locator('text="Trial wygasł"')).toBeVisible();

  // Should show blurred demo grid with overlay
  await expect(page.locator('text="Odblokuj pełny dostęp"')).toBeVisible();
  await expect(page.locator('button:has-text("Kup plan premium")')).toBeVisible();

  // Grid should be blurred (check for blur class)
  const blurredGrid = page.locator('.blur-sm');
  await expect(blurredGrid).toBeVisible();

  // Should not be able to click on cells
  const gridCell = page.locator('[role="gridcell"]').first();
  await expect(gridCell).toHaveCSS('pointer-events', 'none');
});
```

Cel testu:
Weryfikuje ze uzytkownik z wygaslym trialem widzi rozmazany demo grid z overlay i nie moze wchodzic w interakcje.

#### Test E2E 2: Redirect on direct event access
Plik: `e2e/grid.spec.ts`

```typescript
test("TC-GRID-006: Redirect to 403 when accessing event detail without subscription", async ({ page }) => {
  // Setup: Mock user with expired trial
  await page.route("**/api/users/me", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          user: {
            auth_uid: "test-expired-user",
            email: "expired@example.com",
            subscription_status: "trial",
            trial_expires_at: "2025-01-01T00:00:00Z",
            deleted_at: null,
          },
        },
      }),
    });
  });

  // Try to access event detail page directly
  await page.goto("/event/some-event-id");

  // Should redirect to 403
  await page.waitForURL(/\/403/);
  await expect(page.url()).toContain("reason=subscription_required");
});
```

Cel testu:
Weryfikuje ze bezposredni dostep do /event/[id] bez aktywnej subskrypcji powoduje przekierowanie do /403.

#### Test jednostkowy: GridView conditional rendering
Plik: `src/components/grid/GridView.test.tsx` (nowy)

```typescript
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { GridView } from "./GridView";
import { useAuth } from "@/contexts/AuthContext";
import { canAccessPremiumFeatures } from "@/lib/auth";

// Mock dependencies
vi.mock("@/contexts/AuthContext");
vi.mock("@/lib/auth");
vi.mock("@/contexts/GridContext", () => ({
  useGrid: () => ({
    gridState: { range: "week", symbols: [], eventTypes: [], eventId: undefined },
    setRange: vi.fn(),
    setSymbols: vi.fn(),
    setEventTypes: vi.fn(),
    setSort: vi.fn(),
    setEventId: vi.fn(),
    clearFilters: vi.fn(),
  }),
}));
vi.mock("@/hooks/useClientCache", () => ({
  useClientCache: () => ({
    data: { events: [] },
    isLoading: false,
    error: null,
  }),
}));

describe("GridView - Subscription Access", () => {
  it("should render BlurredDemoGrid for user without subscription", () => {
    // Mock user with expired trial
    (useAuth as any).mockReturnValue({
      profile: {
        subscription_status: "trial",
        trial_expires_at: "2025-01-01T00:00:00Z",
      },
    });
    (canAccessPremiumFeatures as any).mockReturnValue(false);

    render(<GridView />);

    // Should show blurred demo grid overlay
    expect(screen.getByText(/Odblokuj pełny dostęp/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Kup plan premium/i })).toBeInTheDocument();
  });

  it("should render VirtualizedGrid for user with active subscription", () => {
    // Mock user with active subscription
    (useAuth as any).mockReturnValue({
      profile: {
        subscription_status: "active",
        trial_expires_at: null,
      },
    });
    (canAccessPremiumFeatures as any).mockReturnValue(true);

    render(<GridView />);

    // Should NOT show blurred demo grid
    expect(screen.queryByText(/Odblokuj pełny dostęp/i)).not.toBeInTheDocument();
    
    // Should show regular grid (role="grid")
    expect(screen.getByRole("grid")).toBeInTheDocument();
  });
});
```

Cel testu:
Weryfikuje ze GridView poprawnie renderuje BlurredDemoGrid dla uzytkownikow bez dostepu i normalny grid dla uzytkownikow z dostepem.

## 6. Plan weryfikacji i testowania

### 6.1. Unit tests
- [ ] GridView renderuje BlurredDemoGrid gdy `canAccessPremiumFeatures()` zwraca false
- [ ] GridView renderuje VirtualizedGrid gdy `canAccessPremiumFeatures()` zwraca true
- [ ] SubscriptionGate renderuje children dla active subscription
- [ ] SubscriptionGate renderuje fallback dla expired trial
- [ ] SubscriptionGate przekierowuje gdy mode="redirect"

### 6.2. Integration tests
- [ ] Zmiana subscription status (z active na expired) powoduje zmiane renderowania grida
- [ ] Cache jest ignorowany gdy user traci dostep
- [ ] SummaryView nie renderuje sie dla uzytkownikow bez dostepu

### 6.3. E2E tests
- [ ] Uzytkownik z active subscription widzi pelny grid z danymi
- [ ] Uzytkownik z expired trial widzi blurred demo grid z overlay
- [ ] Klikniecie "Kup plan premium" przekierowuje do /checkout
- [ ] Bezposrednie wejscie na /event/[id] bez subscription przekierowuje do /403
- [ ] Banner "Trial wygasl" wyswietla sie poprawnie

### 6.4. Manual testing checklist
- [ ] Reprodukcja oryginalnego bledu - sprawdzenie czy naprawiony
- [ ] Testowanie edge cases:
  - [ ] User z active subscription widzi normaly grid
  - [ ] User z trial active (nie wygasl) widzi normalny grid
  - [ ] User z trial expired widzi blurred grid
  - [ ] User z subscription canceled widzi blurred grid
  - [ ] User bez subscription (nowy) widzi blurred grid
- [ ] Testowanie w roznych przeglądarkach: Chrome, Firefox, Safari
- [ ] Testowanie na roznych rozmiarach ekranu: desktop (1920x1080), tablet (768x1024), mobile (375x667)
- [ ] Testowanie z rozna rola uzytkownika: regular user (trial/active/expired)
- [ ] Testowanie dostepnosci:
  - [ ] Overlay ma poprawne aria-labels
  - [ ] Klawiszem Tab mozna nawigowac do buttona CTA
  - [ ] Screen reader poprawnie czyta overlay message
- [ ] Testowanie performance:
  - [ ] BlurredDemoGrid renderuje sie szybko (< 100ms)
  - [ ] Brak spadku performance po dodaniu warunku
  - [ ] Bundle size zwiekszyl sie maksymalnie o 5KB

### 6.5. Regression testing
Lista obszarow do przetestowania w poszukiwaniu regresji:
- [ ] Normalny grid dla active users dziala bez zmian (klikanie, scrollowanie, filtry)
- [ ] SummaryView otwiera sie poprawnie dla active users
- [ ] EventDetailView wyswietla sie poprawnie dla active users
- [ ] Cache nadal dziala dla active users
- [ ] SubscriptionBanner wyswietla sie poprawnie dla wszystkich statusow
- [ ] Filtrowanie i sortowanie grida dziala bez zmian
- [ ] Keyboard navigation w gridzie dziala bez zmian

## 7. Analiza ryzyka i mitigation

### 7.1. Zidentyfikowane ryzyka

#### Ryzyko 1: User moze obejsc blur effect przez DevTools
- Severity: LOW
- Prawdopodobienstwo: MEDIUM
- Wpływ: Uzytkownik moze zobaczyc demo dane, ale sa to fake dane wiec nie ma to wplywu na biznes
- Mitigation: 
  - Demo dane sa losowe i nie reprezentuja rzeczywistych zdarzen
  - API endpointy nadal zwracaja 403 wiec nawet z DevTools nie pobierze rzeczywistych danych
  - Mozna dodac watermark "DEMO" na kazdej komorce

#### Ryzyko 2: Cache moze zachowac stare dane pomimo utraty dostepu
- Severity: MEDIUM
- Prawdopodobienstwo: LOW
- Wpływ: Uzytkownik moze przez krotki czas widziec stare dane z cache
- Mitigation:
  - Sprawdzenie `hasAccess` przed renderowaniem VirtualizedGrid zapobiega wyswietlaniu cached data
  - Mozna dodac observer w AuthContext ktory invaliduje cache gdy subscription status sie zmienia
  - useClientCache moze zostac zaktualizowany w przyszlosci aby automatycznie invalidate przy zmianie subscription

#### Ryzyko 3: Hydration mismatch jesli server i client renderuja rozne rzeczy
- Severity: LOW
- Prawdopodobienstwo: LOW
- Wpływ: Blad w console, potencjalne problemy z renderowaniem
- Mitigation:
  - Astro + React islands (client:load) nie maja problemu z hydration mismatch poniewaz caly island jest renderowany client-side
  - Middleware blokuje dostep server-side wiec ta sytuacja nie powinna wystapic

### 7.2. Rollback plan
Szczegolowy plan jak wycofac zmiany w razie problemu:

1. Revert commit z brancha `fix/expired-trial-grid-access`
2. Usunac nowe pliki: `BlurredDemoGrid.tsx`, `SubscriptionGate.tsx`
3. Przywrocic oryginalna wersje `GridView.tsx` bez warunku `hasAccess`
4. Przywrocic oryginalna wersje `EventDetailView.tsx` bez SubscriptionGate
5. Wyczysc cache w przegladarkach uzytkownikow (localStorage.clear() przez console message)
6. Deploy rollback do staging -> test -> production

Czas rollbacku: ~15 minut

### 7.3. Monitoring post-deployment
Co monitorowac po wdrozeniu naprawy:

- Metryka 1: % uzytkownikow z expired trial odwiedzajacych /grid
  - Oczekiwana wartosc: wzrost conversion rate do /checkout o 10-20%
- Metryka 2: Liczba klikniec w button "Kup plan premium" na BlurredDemoGrid
  - Oczekiwana wartosc: >50% uzytkownikow klikajacych w CTA
- Metryka 3: % 403 redirects na /event/[id]
  - Oczekiwana wartosc: zwiekszona liczba 403 dla expired users
- Logi: Sprawdzic logi API dla 403 responses - czy liczba sie zwiekszyla
- User feedback: Monitorowac support tickets dotyczace "nie moge zobaczyc grida"
  - Oczekiwana wartosc: wzrost tickets ale pozytywny (uzytkownik rozumie ze potrzebuje subscription)

## 8. Zgodnosc ze standardami

### 8.1. Copilot-instructions.md compliance
Sprawdzenie zgodnosci naprawy ze standardami kodowania:

- React patterns: ✅ - Uzywamy functional components, hooks (useAuth, useMemo, useCallback), conditional rendering
- Astro patterns: ✅ - Nie modyfikujemy Astro SSR, client islands (client:load) dzialaja bez zmian
- Accessibility (ARIA, WCAG): ✅ - BlurredDemoGrid ma aria-hidden na blurred content, overlay ma poprawne heading hierarchy (h3), button ma dostepny label
- TypeScript best practices: ✅ - Wszystkie komponenty maja wyraznie zdefiniowane Props interfaces, uzywamy type safety
- Testing patterns: ✅ - Unit tests + E2E tests pokrywaja nowa funkcjonalnosc

### 8.2. Tech-stack.md compliance
Sprawdzenie zgodnosci z stackiem technologicznym:

- Uzyty framework/library: ✅ - Astro 5 + React 19 + TypeScript 5 (bez zmian)
- Dependencies: ✅ - Brak nowych dependencies (uzywamy istniejacych: @/lib/auth, @/contexts/AuthContext)
- Build tools: ✅ - Brak zmian w build process

### 8.3. Security checklist
- [x] Input validation - nie dotyczy (brak nowych inputow)
- [x] Authorization - sprawdzanie uprawnien uzytkownika przez `canAccessPremiumFeatures()`
- [x] Authentication - wykorzystuje istniejaca AuthContext z Supabase
- [x] XSS protection - React automatycznie escapuje content, brak dangerouslySetInnerHTML
- [ ] CSRF protection - nie dotyczy (brak form submissions)
- [ ] SQL injection protection - nie dotyczy (brak zapytan SQL)
- [x] Secrets management - brak hardcoded secrets
- [ ] Rate limiting - nie dotyczy (API endpointy juz maja rate limiting)

### 8.4. Performance checklist
- [x] Bundle size impact - dodajemy ~3KB (BlurredDemoGrid + SubscriptionGate), minimalny wplyw
- [x] Rendering optimization - BlurredDemoGrid uzywa useMemo dla fake data generation
- [x] Loading states - wykorzystujemy istniejacy GridSkeleton
- [x] Error boundaries - GridView juz jest owiniete w ErrorBoundary
- [ ] Code splitting - nie wymagane (komponenty sa male)

### 8.5. Accessibility checklist (dla UI)
- [x] ARIA attributes - aria-hidden na blurred grid, role="grid" zachowane
- [x] Keyboard navigation - button CTA jest focusable (Tab), Enter aktywuje
- [x] Focus management - overlay nie trapuje focusa (nie jest modal)
- [x] Semantic HTML - uzywamy semantycznych elementow (button, h3, p)
- [x] Color contrast - testowal bede manualnie, ale uzywamy Tailwind colors ktore maja dobry contrast
- [x] Screen reader testing - bede testowal z VoiceOver/NVDA

## 9. Dokumentacja zmian

### 9.1. Changelog entry
```markdown
### Fixed
- [Expired trial grid access] Uzytkownik z wygaslym trialem widzi teraz rozmazany demo grid zamiast pelnych danych. Dodano overlay z CTA do zakupu planu premium. Bezposredni dostep do /event/[id] bez aktywnej subskrypcji przekierowuje do /403.
```

### 9.2. Aktualizacja README (jesli wymagana)
Brak koniecznosci aktualizacji README - zmiana dotyczy wewnetrznej logiki komponentow.

### 9.3. Dokumentacja techniczna (jesli wymagana)
Dodac komentarze JSDoc do nowych komponentow:
- BlurredDemoGrid - opis co robi, jakie props przyjmuje
- SubscriptionGate - opis patterns uzywania (mode render vs redirect)

### 9.4. Release notes
Informacja dla uzytkownikow koncowych:

```
## Co zostało naprawione
- Poprawiona obsługa wygaśniętego okresu trial - użytkownicy bez aktywnej subskrypcji widzą teraz podgląd gridu zamiast pełnych danych

## Jak wpływa to na doświadczenie użytkownika
- Jeśli Twój trial wygasł, zobaczysz teraz rozmazany podgląd gridu z informacją o konieczności zakupu planu
- Pełne dane są dostępne tylko dla użytkowników z aktywną subskrypcją
- Łatwiejszy dostęp do zakupu planu premium przez wyraźny przycisk CTA

## Czy wymagane są jakieś akcje po stronie użytkownika
- Jeśli masz aktywną subskrypcję, nie musisz nic robić - wszystko działa bez zmian
- Jeśli Twój trial wygasł, kliknij "Kup plan premium" aby odzyskać dostęp do pełnych danych
```

## 10. Timeline i effort estimation

### 10.1. Estymacja czasu
- Implementacja: 6 godzin
  - SubscriptionGate: 1h
  - BlurredDemoGrid: 2h
  - Integracja z GridView/EventDetailView: 2h
  - SummaryView protection: 0.5h
  - Bugfixing initial: 0.5h
- Testowanie: 2 godziny
  - Unit tests: 0.5h
  - E2E tests: 1h
  - Manual testing: 0.5h
- Code review: 1 godzina
- Deployment: 0.5 godziny
- Monitoring post-deployment: 1 dzien (obserwacja metryk)

Łącznie: 9.5 godzin + 1 dzien monitoringu

### 10.2. Zaleznosci
Czy naprawa wymaga czekania na cos lub blokuje cos innego:
- Blokujace: Brak - mozna zaczac natychmiast
- Blokowane: Zadne inne featury nie sa zablokowane przez ta naprawe

### 10.3. Sugerowany timeline
- Start: 2026-01-16 (jutro)
- Code complete: 2026-01-16 EOD
- Testing complete: 2026-01-17 EOD
- Code review: 2026-01-18 AM
- Deployment to staging: 2026-01-18 PM
- Testing on staging: 2026-01-19 AM
- Deployment to production: 2026-01-19 PM
- Monitoring: 2026-01-20 caly dzien

## 11. Załączniki

### 11.1. Dotknięte pliki (lista pelna)
Pelna lista wszystkich plikow wymagajacych zmian:
```
src/components/subscription/SubscriptionGate.tsx (NEW)
src/components/grid/BlurredDemoGrid.tsx (NEW)
src/components/grid/GridView.tsx (MODIFIED)
src/components/event/EventDetailView.tsx (MODIFIED)
src/components/summary/SummaryView.tsx (MODIFIED)
e2e/grid.spec.ts (MODIFIED)
src/components/grid/GridView.test.tsx (NEW)
```

### 11.2. Referencje
Linki do zwiazanych issuow, PRow, dokumentacji:
- PRD: `.agents/prd.md` - wymagania biznesowe dla subscription model
- API Plan: `.agents/api-plan.md` - sekcja 3.2 Authorization Strategy
- UI Plan: `.agents/ui-plan.md` - Grid View requirements
- Existing auth functions: `src/lib/auth.ts` - `canAccessPremiumFeatures()`

### 11.3. Screenshoty/diagramy

Diagram przepływu uzytkownika:

```
[User z expired trial]
        |
        v
  [Wchodzi na /grid]
        |
        v
  [Middleware: session OK, subscription expired]
        |
        v
  [Grid.astro SSR renderuje normanlnie]
        |
        v
  [GridPageWrapper client:load]
        |
        v
  [GridView sprawdza canAccessPremiumFeatures()]
        |
        +-- YES --> [Renderuje VirtualizedGrid z API data]
        |
        +-- NO  --> [Renderuje BlurredDemoGrid z fake data]
                    + [Overlay z CTA]
```

### 11.4. Error logs/stack traces
Brak error logs - blad polega na braku walidacji a nie na exception.

Oczekiwane zachowanie API (juz dziala poprawnie):
```
GET /api/nocodb/grid?range=week
Authorization: Bearer <expired-trial-token>

Response: 403 Forbidden
{
  "error": "Subscription required",
  "message": "Active subscription or valid trial required to access this endpoint"
}
```

---

## Podsumowanie

Plan naprawy bledu "expired-trial-grid-access" jest gotowy do implementacji. Rozwiazanie A (warunkowe renderowanie z BlurredDemoGrid) jest rekomendowane ze wzgledu na:
- Najlepsze UX (soft paywall z preview)
- Niskie ryzyko regresji (addytywne zmiany)
- Zgodnosc ze standardami projektu
- Reusability (SubscriptionGate moze byc uzywany w innych miejscach)

Estymowany czas implementacji: 9.5 godzin
Priorytet: HIGH
Gotowy do startu: TAK

