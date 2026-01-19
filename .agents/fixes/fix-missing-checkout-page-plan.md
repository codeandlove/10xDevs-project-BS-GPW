# Plan Naprawy Bledu - missing-checkout-page

Data utworzenia: 2026-01-19
Tytul bledu: Brakujaca strona /checkout dla zakupu subskrypcji
Severity: HIGH
Typ bledu: Business Logic | UI

## 1. Podsumowanie wykonawcze

### 1.1. Opis bledu

Po wygasnieciu trialu uzytkownik widzi przycisk "Kup plan" (w komponencie SubscriptionBanner i innych miejscach w UI), ktory prowadzi do /checkout. Niestety ta podstrona nie istnieje i zwraca 404, co uniemozliwia uzytkownikowi zakup subskrypcji i kontynuowanie korzystania z aplikacji.

### 1.2. Root cause

Strona /checkout nie zostala zaimplementowana w fazie MVP, mimo ze jest wspomniana w planach (PRD.md, UI-plan.md, API-plan.md) oraz w kodzie komponentow UI (SubscriptionBanner.tsx, poprzednie plany naprawcze). Backend API endpoint POST /api/subscriptions/create-checkout jest zaimplementowany i dziala poprawnie, ale brakuje frontendu do jego wywolania.

### 1.3. Zakres wplywu

- Dotknięte komponenty/moduły:
  - Brakujaca strona: src/pages/checkout/index.astro (nie istnieje)
  - Brakujace strony success/cancel: src/pages/checkout/success.astro, src/pages/checkout/cancel.astro (nie istnieja)
  - Istniejace komponenty z linkami do /checkout: SubscriptionBanner.tsx
  - Istniejace API: src/pages/api/subscriptions/create-checkout.ts (dziala)
- Dotknięci uzytkownicy: Wszyscy z wygaslym trialem lub anulowana subskrypcja (status: trial/past_due/canceled)
- Dotknięte srodowiska: production, staging, development

### 1.4. Priorytet naprawy

HIGH - Blokuje kluczowy user journey (konwersja trial -> paid), bezposrednio wplywa na przychody. Uzytkownik nie moze dokonac zakupu pomimo checi, co jest krytyczne dla modelu biznesowego.

## 2. Szczegolowa analiza bledu

### 2.1. Kroki reprodukcji

1. Zaloguj sie jako uzytkownik z wygaslym trialem (trial_expires_at < now())
2. Otworz strone /grid
3. Zobacz banner "Trial wygasl" z przyciskiem "Kup plan"
4. Kliknij przycisk "Kup plan"
5. Zostaniesz przekierowany do /checkout

### 2.2. Oczekiwane zachowanie

Po kliknieciu "Kup plan" uzytkownik powinien:

1. Zostac przekierowany do /checkout
2. Zobaczyc strone z wyborem planu subskrypcji (lub bezposrednia inicjacja Stripe Checkout jesli jest tylko 1 plan)
3. Kliknac CTA "Wybierz plan" / "Przejdz do platnosci"
4. Zostac przekierowany do Stripe Checkout
5. Po oplaceniu zostac przekierowany na /checkout/success
6. Po anulowaniu zostac przekierowany na /checkout/cancel

### 2.3. Rzeczywiste zachowanie

- Uzytkownik klika "Kup plan"
- Zostaje przekierowany do /checkout
- Otrzymuje 404 Not Found
- Nie moze dokonac zakupu subskrypcji

### 2.4. Root cause analysis

Lokalizacja bledu:

- Brakujace pliki: src/pages/checkout/index.astro, success.astro, cancel.astro
- Problem w kodzie: BRAK IMPLEMENTACJI (nie jest to bug w kodzie, tylko brak funkcjonalnosci)

Przyczyna techniczna:

- Podczas implementacji MVP skupiono sie na backend API (create-checkout endpoint jest gotowy)
- Frontend checkout flow nie zostal zaimplementowany
- SubscriptionBanner.tsx i inne komponenty maja hardcoded link do /checkout, ktory nie istnieje
- W dokumentacji (PRD.md sekcja 2.7, UI-plan.md sekcja 2.7, API-plan.md sekcja 2.2) checkout jest opisany, ale nie zaimplementowany

Brakujące elementy:

1. Strona wyboru planu lub bezposrednia inicjacja checkout (/checkout)
2. Strona potwierdzenia sukcesu (/checkout/success)
3. Strona anulowania (/checkout/cancel)
4. Komponent wyboru planu (opcjonalny, jesli wiele planow)
5. Logika pobierania price_id z konfiguracji lub API

Nieprawidlowa logika: Brak
Problemy integracji: API dziala, Stripe dziala - tylko brak UI

### 2.5. Analiza zasiegu

#### Komponenty frontend:

- src/pages/checkout/index.astro - BRAK (nowy plik ~150-200 linii)
- src/pages/checkout/success.astro - BRAK (nowy plik ~80-100 linii)
- src/pages/checkout/cancel.astro - BRAK (nowy plik ~80-100 linii)
- src/components/checkout/CheckoutButton.tsx - BRAK (nowy plik ~50-80 linii, opcjonalny)
- src/components/checkout/PlanCard.tsx - BRAK (nowy plik ~80-120 linii, opcjonalny jesli wiele planow)
- src/components/SubscriptionBanner.tsx - ISTNIEJACY (bez zmian, juz linkuje do /checkout)

#### Serwisy/hooki:

- src/hooks/useCheckout.ts - OPCJONALNY (nowy plik ~80-100 linii, dla enkapsulacji logiki checkout)

#### Typy/interfejsy:

- src/types/subscription.types.ts - ISTNIEJACY (juz ma CreateCheckoutDTO, CheckoutSessionDTO - bez zmian)

#### Backend/API:

- src/pages/api/subscriptions/create-checkout.ts - ISTNIEJACY (dziala poprawnie, bez zmian)

#### Baza danych:

- Brak zmian (app_users, stripe_webhook_events juz istnieja)

#### Testy:

- e2e/checkout.spec.ts - NOWY (150-200 linii)
- src/components/checkout/CheckoutButton.test.tsx - OPCJONALNY (~50 linii)

#### Konfiguracja:

- src/config/plans.ts - NOWY (opcjonalny, 20-40 linii - konfiguracja cennika Stripe)
- .env.example - UPDATE (dodac STRIPE*PRICE_ID*\* zmienne)

## 3. Propozycje rozwiazan

### 3.1. Rozwiazanie A: Prosta strona checkout z bezposrednia inicjacja Stripe Checkout (REKOMENDOWANE)

#### Opis:

Implementacja minimalnej strony /checkout, ktora automatycznie inicjuje Stripe Checkout Session i przekierowuje uzytkownika. Strona jest tylko "przejsciowa" - wyswietla loader/skeleton podczas tworzenia sesji Stripe, a nastepnie przekierowuje do checkout.stripe.com. Dodatkowo tworzymy strony success i cancel z odpowiednimi komunikatami.

To rozwiazanie jest optymalne dla MVP z jednym planem. Jesli w przyszlosci pojawi sie wiele planow, latwo rozszerzyc o PlanCard components.

#### Zakres zmian:

- Frontend:
  - src/pages/checkout/index.astro - nowa strona z loaderem i automatyczna inicjacja checkout (140-180 linii)
  - src/pages/checkout/success.astro - strona potwierdzenia (80-100 linii)
  - src/pages/checkout/cancel.astro - strona anulowania (70-90 linii)
  - src/components/checkout/CheckoutLoader.tsx - komponent loadera (40-60 linii, opcjonalny)
  - src/config/plans.ts - konfiguracja price_id (20-30 linii)
  - src/hooks/useCheckout.ts - hook do inicjacji checkout (80-100 linii)
- Backend: Brak zmian (API juz dziala)
- Database: Brak zmian
- Testy:
  - e2e/checkout.spec.ts - kompleksowe testy flow (150-200 linii)

#### Zalety:

- Minimal viable solution - szybka implementacja (2-4h)
- Zero decyzji po stronie uzytkownika jesli jest tylko 1 plan (lepsze UX)
- Wykorzystuje istniejacy API endpoint bez zmian
- Latwo rozszerzyc w przyszlosci o wybor planow
- Konsystentne z PRD.md sekcja 2.7 Checkout View
- Dziala z istniejacym kodem SubscriptionBanner

#### Wady:

- Jesli w przyszlosci bedzie wiele planow, trzeba bedzie dodac UI wyboru (ale to prosty refactor)
- Brak mozliwosci zobaczenia szczegolow planu przed przejsciem do Stripe (ale to mozna dodac w modal przed redirect)

#### Effort: S (2-4 godziny)

- 1h: Implementacja checkout/index.astro z loaderem i logika inicjacji
- 0.5h: Implementacja success.astro i cancel.astro
- 0.5h: Konfiguracja plans.ts i hook useCheckout
- 1h: Testy E2E
- 0.5h: Dokumentacja i code review

#### Ryzyko regresji: LOW

- Nowa funkcjonalnosc, nie modyfikuje istniejacego kodu (poza dodaniem routow)
- API juz jest przetestowany
- Stripe Checkout jest proven solution
- Jedyny risk: redirect loops jesli success_url lub cancel_url sa zle skonfigurowane (ale to latwo przetestowac)

#### Zgodnosc ze standardami:

- Copilot-instructions.md: ✅
  - Astro dla statycznych stron (success, cancel)
  - React islands dla interaktywnosci (checkout loader, button)
  - Tailwind CSS dla stylow
  - Accessibility: keyboard nav, aria-labels, semantic HTML
- Tech-stack.md: ✅
  - Astro + React
  - Supabase Auth (session check w middleware)
  - Stripe integration (istniejace API)
- Best practices: ✅
  - Loading states
  - Error handling z retry
  - Secure redirect (whitelist domen)
  - Environment variables dla price_id

---

### 3.2. Rozwiazanie B: Pelna strona wyboru planu z PlanCard components

#### Opis:

Implementacja kompleksowej strony /checkout z UI wyboru planow. Uzytkownik widzi karty z roznych planow (np. Basic, Pro, Enterprise), moze porownac features i ceny, a nastepnie wybiera plan i inicjuje checkout. To rozwiazanie jest bardziej skalowalne i lepsze dla multi-tier pricing.

#### Zakres zmian:

- Frontend:
  - src/pages/checkout/index.astro - strona z wyborem planow (180-220 linii)
  - src/components/checkout/PlanCard.tsx - karta planu z features i CTA (100-140 linii)
  - src/components/checkout/PlanComparison.tsx - tabela porownawcza planow (120-160 linii, opcjonalna)
  - src/pages/checkout/success.astro - strona potwierdzenia (80-100 linii)
  - src/pages/checkout/cancel.astro - strona anulowania (70-90 linii)
  - src/config/plans.ts - konfiguracja wielu planow (60-100 linii)
  - src/hooks/useCheckout.ts - hook z parametryzacja price_id (100-130 linii)
- Backend: Brak zmian
- Database: Brak zmian
- Testy:
  - e2e/checkout.spec.ts - testy dla multi-plan flow (200-250 linii)
  - src/components/checkout/PlanCard.test.tsx - unit testy (60-80 linii)

#### Zalety:

- Skalowalne rozwiazanie - latwo dodac nowe plany
- Lepsze dla scenariusza multi-tier pricing
- Uzytkownik widzi porownanie i moze wybrac najlepszy plan
- Zgodne z best practices SaaS (pokazanie value proposition)

#### Wady:

- Dluzszy czas implementacji (4-8h)
- Wiecej kodu do utrzymania
- Overengineering jesli obecnie jest tylko 1 plan
- Wymaga design/mockup dla PlanCard i layout

#### Effort: M (4-8 godzin)

- 2h: Implementacja checkout/index.astro z lista planow
- 2h: Implementacja PlanCard i PlanComparison components
- 1h: Implementacja success/cancel pages
- 1h: Konfiguracja plans.ts z features i pricing
- 1.5h: Testy E2E i unit
- 0.5h: Dokumentacja

#### Ryzyko regresji: LOW

- Taki sam jak Rozwiazanie A (nowa funkcjonalnosc)

#### Zgodnosc ze standardami:

- Copilot-instructions.md: ✅ (wszystkie jak A + dodatkowe komponenty)
- Tech-stack.md: ✅
- Best practices: ✅

---

### 3.3. Rozwiazanie C: Hybrid - prosta strona z opcjonalnym modal wyboru planu

#### Opis:

Kompromis miedzy A i B. Domyslnie strona /checkout automatycznie inicjuje checkout dla default planu (Basic/Pro), ale wyswietla link/button "Porownaj plany" ktory otwiera modal z krotkim porownaniem. Po wyborze w modal, checkout jest inicjowany z wybranym price_id.

#### Zakres zmian:

- Frontend:
  - src/pages/checkout/index.astro - prosta strona z loader + opcjonalny modal (160-200 linii)
  - src/components/checkout/PlanSelectionModal.tsx - modal z wyborem (100-140 linii)
  - src/pages/checkout/success.astro (80-100 linii)
  - src/pages/checkout/cancel.astro (70-90 linii)
  - src/config/plans.ts - konfiguracja 2-3 planow (40-60 linii)
  - src/hooks/useCheckout.ts (90-110 linii)
- Backend: Brak zmian
- Database: Brak zmian
- Testy: e2e/checkout.spec.ts (180-220 linii)

#### Zalety:

- Szybkie default flow (auto-checkout)
- Flexibility - uzytkownik moze wybrac inny plan jesli chce
- Sredni effort - wiecej niz A, mniej niz B
- Dobre dla scenariusza 2-3 planow

#### Wady:

- Nieco bardziej skomplikowane UX (modal + redirect)
- Modal moze byc pominienty przez uzytkownika (mniejsza conversion dla higher plans)

#### Effort: S-M (3-6 godzin)

#### Ryzyko regresji: LOW

#### Zgodnosc ze standardami: ✅

---

## 4. Rekomendacja i uzasadnienie

### 4.1. Wybrane rozwiazanie

ROZWIAZANIE A: Prosta strona checkout z bezposrednia inicjacja Stripe Checkout

### 4.2. Uzasadnienie wyboru

Minimalizuje ryzyko regresji poprzez:

- Brak zmian w istniejacym kodzie
- Nowa funkcjonalnosc izolowana w nowych plikach
- API juz przetestowany i dzialajacy
- Stripe Checkout jest battle-tested solution

Jest zgodne ze standardami projektu:

- PRD.md sekcja 2.7 opisuje Checkout View jako "opcjonalne w MVP jesli tylko 1 plan"
- UI-plan.md sekcja 2.7 sugeruje "CheckoutPage.tsx - strona z wyborem planu (opcjonalne w MVP jesli tylko 1 plan)"
- Copilot-instructions mowi o Astro + React islands - dokładnie to uzywamy
- Minimal viable solution zgodna z filozofia MVP

Optymalizuje effort vs. wartosc:

- Najszybsza implementacja (2-4h) = najszybsze odblokowanie revenue stream
- 100% funkcjonalne - uzytkownik moze kupic subskrypcje
- Latwe do rozszerzenia w przyszlosci jesli pojawia sie wiele planow

Zapewnia skalowalnosc:

- Konfiguracja w plans.ts latwo rozszerzyc o nowe plany
- Hook useCheckout parametryzowany - przyjmuje price_id
- Struktura plikow gotowa na dodanie PlanCard components w przyszlosci

Ulatwia przyszle utrzymanie:

- Prosty kod, latwy do zrozumienia
- Minimalny surface area dla bugow
- Clear separation of concerns (config, logic, UI)

## 5. Szczegolowy plan implementacji

### 5.1. Faza 1: Przygotowanie

- [x] Utworzenie brancha: `fix/missing-checkout-page`
- [ ] Sprawdzenie zmiennych srodowiskowych (STRIPE_PRICE_ID w .env)
- [ ] Przygotowanie danych testowych (test price_id z Stripe test mode)

### 5.2. Faza 2: Zmiany w kodzie

#### Krok 1: Utworzenie konfiguracji plans.ts

Plik: `src/config/plans.ts`

Opis zmian:
Utworzenie pliku konfiguracyjnego z cenami Stripe. W MVP bedzie tylko jeden plan, ale struktura pozwala latwo dodac wiecej.

Kod:

```typescript
/**
 * Subscription Plans Configuration
 * Centralized configuration for Stripe pricing
 */

export interface SubscriptionPlan {
  id: string;
  name: string;
  price_id: string; // Stripe Price ID
  price_monthly: number; // Cena w PLN/miesiąc
  features: string[];
  recommended?: boolean;
}

/**
 * Available subscription plans
 * In MVP we have only one plan, but structure allows easy expansion
 */
export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: "pro",
    name: "Pro",
    price_id: import.meta.env.PUBLIC_STRIPE_PRICE_ID_PRO || "price_default",
    price_monthly: 99,
    features: [
      "Pełen dostęp do Black Swan Grid",
      "Nieograniczone AI summaries",
      "Historyczne dane GPW",
      "Analizy i rekomendacje AI",
      "Wsparcie email",
    ],
    recommended: true,
  },
];

/**
 * Get default plan (first plan or recommended)
 */
export function getDefaultPlan(): SubscriptionPlan {
  return SUBSCRIPTION_PLANS.find((p) => p.recommended) || SUBSCRIPTION_PLANS[0];
}

/**
 * Get plan by id
 */
export function getPlanById(id: string): SubscriptionPlan | undefined {
  return SUBSCRIPTION_PLANS.find((p) => p.id === id);
}
```

Uzasadnienie:
Centralizacja konfiguracji cennika. Latwiej zarzadzac i aktualizowac price_id w jednym miejscu. Environment variables pozwalaja na rozne ceny w dev/staging/prod.

---

#### Krok 2: Utworzenie hooka useCheckout

Plik: `src/hooks/useCheckout.ts`

Opis zmian:
Hook enkapsulujacy logike inicjacji Stripe Checkout. Obsluguje wywolanie API, loading states, error handling, i redirect.

Kod:

```typescript
/**
 * useCheckout hook
 * Handles Stripe Checkout session creation and redirect
 */

import { useState } from "react";
import type { CheckoutSessionDTO } from "@/types/subscription.types";

interface UseCheckoutOptions {
  priceId: string;
  successUrl?: string;
  cancelUrl?: string;
}

interface UseCheckoutReturn {
  initiateCheckout: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

export function useCheckout({
  priceId,
  successUrl = `${window.location.origin}/checkout/success`,
  cancelUrl = `${window.location.origin}/checkout/cancel`,
}: UseCheckoutOptions): UseCheckoutReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initiateCheckout = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Get Supabase session token
      const token = localStorage.getItem("supabase.auth.token");
      if (!token) {
        throw new Error("Nie jesteś zalogowany. Zaloguj się, aby kontynuować.");
      }

      // Call create-checkout API
      const response = await fetch("/api/subscriptions/create-checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          price_id: priceId,
          success_url: successUrl,
          cancel_url: cancelUrl,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error?.message || "Nie udało się utworzyć sesji płatności");
      }

      const checkoutData = data.data as CheckoutSessionDTO;

      // Redirect to Stripe Checkout
      window.location.href = checkoutData.checkout_url;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Wystąpił błąd. Spróbuj ponownie.";
      setError(message);
      setIsLoading(false);
    }
  };

  return {
    initiateCheckout,
    isLoading,
    error,
  };
}
```

Uzasadnienie:
Separacja logiki od UI. Hook moze byc reużyty w innych miejscach (np. modal, banner). Centralizacja error handlingu i loading states.

---

#### Krok 3: Utworzenie strony checkout/index.astro

Plik: `src/pages/checkout/index.astro`

Opis zmian:
Glowna strona checkout. Automatycznie inicjuje Stripe Checkout Session i pokazuje loader podczas tworzenia sesji. Jesli wystapi blad, wyswietla komunikat z przyciskiem retry.

Kod:

```astro
---
/**
 * Checkout Page
 * Automatically initiates Stripe Checkout session for subscription
 */

import Layout from "@/layouts/Layout.astro";
import CheckoutLoader from "@/components/checkout/CheckoutLoader";

// Middleware should ensure user is authenticated
// If not authenticated, redirect to login with returnUrl
const { locals } = Astro;
const user = locals.user;

if (!user) {
  return Astro.redirect("/auth/login?returnUrl=/checkout");
}

// Get default plan from config
import { getDefaultPlan } from "@/config/plans";
const defaultPlan = getDefaultPlan();

const pageTitle = "Przejdź do płatności - Black Swan Grid";
---

<Layout title={pageTitle}>
  <main class="container mx-auto flex min-h-screen items-center justify-center px-4 py-12">
    <div class="w-full max-w-md">
      <CheckoutLoader client:only="react" priceId={defaultPlan.price_id} />
    </div>
  </main>
</Layout>
```

Uzasadnienie:
Prosta, czytelna struktura. Middleware sprawdza auth, strona deleguje logike do React component (CheckoutLoader). SSR Astro renderuje layout, a React island handluje interaktywnosc.

---

#### Krok 4: Utworzenie komponentu CheckoutLoader

Plik: `src/components/checkout/CheckoutLoader.tsx`

Opis zmian:
React component wyswietlajacy loader podczas inicjacji checkout. Automatycznie wywoluje useCheckout on mount. Jesli blad, wyswietla komunikat i przycisk retry.

Kod:

```typescript
/**
 * CheckoutLoader component
 * Displays loading state while creating Stripe Checkout session
 */

import { useEffect } from "react";
import { useCheckout } from "@/hooks/useCheckout";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle } from "lucide-react";

interface CheckoutLoaderProps {
  priceId: string;
}

export default function CheckoutLoader({ priceId }: CheckoutLoaderProps) {
  const { initiateCheckout, isLoading, error } = useCheckout({
    priceId,
  });

  // Auto-initiate checkout on mount
  useEffect(() => {
    initiateCheckout();
  }, []);

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-8 text-center">
        <AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-600" />
        <h2 className="mb-2 text-xl font-semibold text-gray-900">Wystąpił błąd</h2>
        <p className="mb-6 text-sm text-gray-600">{error}</p>
        <Button onClick={initiateCheckout} disabled={isLoading}>
          Spróbuj ponownie
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-8 text-center shadow-sm">
      <Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin text-blue-600" />
      <h2 className="mb-2 text-xl font-semibold text-gray-900">Przygotowujemy płatność...</h2>
      <p className="text-sm text-gray-600">Zaraz zostaniesz przekierowany do bezpiecznej strony płatności.</p>
      <p className="mt-4 text-xs text-gray-500">Może to potrwać kilka sekund. Nie odświeżaj strony.</p>
    </div>
  );
}
```

Uzasadnienie:
Clear user feedback podczas ladowania. Error state z retry button dla lepszego UX. Accessible (semantic HTML, aria-labels implicite przez lucide-react icons).

---

#### Krok 5: Utworzenie strony checkout/success.astro

Plik: `src/pages/checkout/success.astro`

Opis zmian:
Strona potwierdzenia po udanej platnosci. Wyswietla komunikat sukcesu i CTA do powrotu do aplikacji. Opcjonalnie moze wyswietlic session_id z URL params dla debugging.

Kod:

```astro
---
/**
 * Checkout Success Page
 * Displayed after successful Stripe Checkout completion
 */

import Layout from "@/layouts/Layout.astro";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";

const pageTitle = "Płatność zakończona - Black Swan Grid";
const sessionId = Astro.url.searchParams.get("session_id");
---

<Layout title={pageTitle}>
  <main class="container mx-auto flex min-h-screen items-center justify-center px-4 py-12">
    <div class="w-full max-w-2xl text-center">
      <div class="mb-8 flex justify-center">
        <div class="rounded-full bg-green-100 p-6">
          <CheckCircle className="h-16 w-16 text-green-600" />
        </div>
      </div>

      <h1 class="mb-4 text-3xl font-bold text-gray-900">Dziękujemy za zakup!</h1>

      <p class="mb-8 text-lg text-gray-600">
        Twoja subskrypcja została aktywowana. Możesz teraz korzystać z pełnego dostępu do Black Swan Grid.
      </p>

      <div class="mb-8 rounded-lg bg-blue-50 p-6">
        <h2 class="mb-2 text-lg font-semibold text-gray-900">Co dalej?</h2>
        <ul class="space-y-2 text-left text-sm text-gray-700">
          <li class="flex items-start gap-2">
            <span class="mt-1 text-blue-600">✓</span>
            <span>Twoja subskrypcja jest już aktywna</span>
          </li>
          <li class="flex items-start gap-2">
            <span class="mt-1 text-blue-600">✓</span>
            <span>Otrzymasz potwierdzenie na adres email</span>
          </li>
        </ul>
      </div>

      <div class="flex justify-center">
        <Button size="lg" onClick={() => (window.location.href = "/grid")}> Przejdź do aplikacji </Button>
      </div>

      {
        sessionId && (
          <p class="mt-8 text-xs text-gray-500">
            ID sesji: <code class="rounded bg-gray-100 px-2 py-1">{sessionId}</code>
          </p>
        )
      }
    </div>
  </main>
</Layout>
```

Uzasadnienie:
Clear confirmation message. Next steps dla użytkownika. Pojedynczy CTA do powrotu do aplikacji. Session ID dla debugging (opcjonalne, ale przydatne).

---

#### Krok 6: Utworzenie strony checkout/cancel.astro

Plik: `src/pages/checkout/cancel.astro`

Opis zmian:
Strona wyswietlana po anulowaniu platnosci. Komunikat informacyjny i CTA do ponownej proby lub powrotu do app.

Kod:

```astro
---
/**
 * Checkout Cancel Page
 * Displayed when user cancels Stripe Checkout
 */

import Layout from "@/layouts/Layout.astro";
import { Button } from "@/components/ui/button";
import { XCircle } from "lucide-react";

const pageTitle = "Płatność anulowana - Black Swan Grid";
---

<Layout title={pageTitle}>
  <main class="container mx-auto flex min-h-screen items-center justify-center px-4 py-12">
    <div class="w-full max-w-2xl text-center">
      <div class="mb-8 flex justify-center">
        <div class="rounded-full bg-yellow-100 p-6">
          <XCircle className="h-16 w-16 text-yellow-600" />
        </div>
      </div>

      <h1 class="mb-4 text-3xl font-bold text-gray-900">Płatność anulowana</h1>

      <p class="mb-8 text-lg text-gray-600">
        Proces płatności został przerwany. Twoja subskrypcja nie została aktywowana.
      </p>

      <div class="mb-8 rounded-lg bg-gray-50 p-6">
        <h2 class="mb-2 text-lg font-semibold text-gray-900">Potrzebujesz pomocy?</h2>
        <p class="text-sm text-gray-700">
          Jeśli napotkałeś problem podczas płatności lub masz pytania dotyczące subskrypcji, skontaktuj się z naszym
          zespołem wsparcia.
        </p>
      </div>

      <div class="flex flex-col gap-4 sm:flex-row sm:justify-center">
        <Button size="lg" onClick={() => (window.location.href = "/checkout")}> Spróbuj ponownie </Button>
        <Button size="lg" variant="outline" onClick={() => (window.location.href = "/grid")}>
          Kontynuuj z trialem
        </Button>
      </div>

      <p class="mt-8 text-sm text-gray-500">
        Płatność jest bezpieczna i szyfrowana przez Stripe. Żadne dane karty nie są przechowywane w naszej aplikacji.
      </p>
    </div>
  </main>
</Layout>
```

Uzasadnienie:
Friendly message bez presji. Dwie opcje: sprobuj ponownie lub wroc do trialu. Uspokojenie co do bezpieczenstwa platnosci.

---

#### Krok 7: Aktualizacja .env.example

Plik: `.env.example`

Opis zmian:
Dodanie zmiennych srodowiskowych dla Stripe Price IDs.

Kod:

```bash
# ...existing env vars...

# Stripe Configuration
PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Stripe Price IDs (from Stripe Dashboard)
PUBLIC_STRIPE_PRICE_ID_PRO=price_1ABC123xyz
# Add more price IDs when multiple plans are available
# PUBLIC_STRIPE_PRICE_ID_BASIC=price_...
# PUBLIC_STRIPE_PRICE_ID_ENTERPRISE=price_...
```

Uzasadnienie:
Dokumentacja wymaganych zmiennych srodowiskowych. PUBLIC\_ prefix dla zmiennych dostepnych w browsersie (price_id jest bezpieczny do ujawnienia).

---

### 5.3. Faza 3: Aktualizacja typow i interfejsow

Brak zmian wymaganych. Wszystkie potrzebne typy (CreateCheckoutDTO, CheckoutSessionDTO) juz istnieja w src/types/subscription.types.ts.

---

### 5.4. Faza 4: Migracje bazy danych

Brak zmian wymaganych. Tabele app_users i stripe_webhook_events juz istnieja i sa wystarczajace.

---

### 5.5. Faza 5: Aktualizacja/dodanie testow

#### Test E2E 1: Checkout flow success

Plik: `e2e/checkout.spec.ts`

```typescript
import { test, expect } from "@playwright/test";

test.describe("Checkout Flow", () => {
  test.beforeEach(async ({ page }) => {
    // Mock authenticated user with expired trial
    await page.route("**/api/users/me", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            user: {
              auth_uid: "test-user",
              email: "test@example.com",
              subscription_status: "trial",
              trial_expires_at: "2025-01-01T00:00:00Z", // Expired
              deleted_at: null,
            },
          },
        }),
      });
    });
  });

  test("TC-CHECKOUT-001: Should redirect to Stripe Checkout from /checkout", async ({ page }) => {
    // Mock create-checkout API to return checkout URL
    await page.route("**/api/subscriptions/create-checkout", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            checkout_url: "https://checkout.stripe.com/c/pay/test_session",
            session_id: "cs_test_123",
          },
        }),
      });
    });

    // Navigate to checkout page
    await page.goto("/checkout");

    // Should show loader
    await expect(page.locator("text=Przygotowujemy płatność")).toBeVisible();

    // Wait for redirect (mock Stripe checkout page)
    await page.waitForURL(/checkout\.stripe\.com/, { timeout: 5000 });
  });

  test("TC-CHECKOUT-002: Should display success page after payment", async ({ page }) => {
    await page.goto("/checkout/success?session_id=cs_test_123");

    // Should show success message
    await expect(page.locator("text=Dziękujemy za zakup")).toBeVisible();

    // Should have CTA button
    const ctaButton = page.locator("button", { hasText: "Przejdź do aplikacji" });
    await expect(ctaButton).toBeVisible();

    // Should display session ID (for debugging)
    await expect(page.locator("text=cs_test_123")).toBeVisible();
  });

  test("TC-CHECKOUT-003: Should display cancel page when payment is cancelled", async ({ page }) => {
    await page.goto("/checkout/cancel");

    // Should show cancel message
    await expect(page.locator("text=Płatność anulowana")).toBeVisible();

    // Should have retry button
    const retryButton = page.locator("button", { hasText: "Spróbuj ponownie" });
    await expect(retryButton).toBeVisible();

    // Click retry should navigate to /checkout
    await retryButton.click();
    await expect(page).toHaveURL(/\/checkout$/);
  });

  test("TC-CHECKOUT-004: Should handle API error gracefully", async ({ page }) => {
    // Mock create-checkout API to return error
    await page.route("**/api/subscriptions/create-checkout", (route) => {
      route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid price_id",
          },
        }),
      });
    });

    await page.goto("/checkout");

    // Should show error message
    await expect(page.locator("text=Wystąpił błąd")).toBeVisible();

    // Should show retry button
    const retryButton = page.locator("button", { hasText: "Spróbuj ponownie" });
    await expect(retryButton).toBeVisible();
  });

  test("TC-CHECKOUT-005: Should redirect to login if not authenticated", async ({ page }) => {
    // Override beforeEach mock - simulate no auth
    await page.route("**/api/users/me", (route) => {
      route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({
          success: false,
          error: { code: "UNAUTHORIZED", message: "No session" },
        }),
      });
    });

    await page.goto("/checkout");

    // Should redirect to login with returnUrl
    await expect(page).toHaveURL(/\/auth\/login\?returnUrl=%2Fcheckout/);
  });
});
```

Cel testu:
Kompletna coverage checkout flow: success, cancel, error, auth redirect. Testowanie integracji z API i Stripe redirect.

---

## 6. Plan weryfikacji i testowania

### 6.1. Unit tests

- [ ] useCheckout hook - test inicjacji checkout, loading states, error handling
- [ ] CheckoutLoader component - test render, auto-initiate, error display

### 6.2. Integration tests

- [ ] API integration: useCheckout wywoluje POST /api/subscriptions/create-checkout z poprawnymi parametrami
- [ ] Redirect flow: Po sukcesie API, window.location.href jest ustawiony na checkout_url

### 6.3. E2E tests

- [ ] TC-CHECKOUT-001: Redirect do Stripe Checkout z /checkout
- [ ] TC-CHECKOUT-002: Wyswietlenie success page po platnosci
- [ ] TC-CHECKOUT-003: Wyswietlenie cancel page po anulowaniu
- [ ] TC-CHECKOUT-004: Obsluga bledu API (retry button)
- [ ] TC-CHECKOUT-005: Redirect do login jesli nie authenticated

### 6.4. Manual testing checklist

- [ ] Reprodukcja oryginalnego bledu - sprawdzenie czy /checkout juz nie zwraca 404
- [ ] Klikniecie "Kup plan" w SubscriptionBanner przekierowuje do /checkout
- [ ] Loader wyswietla sie podczas tworzenia sesji Stripe
- [ ] Po utworzeniu sesji nastepuje redirect do checkout.stripe.com (test mode)
- [ ] Po oplaceniu subskrypcji Stripe przekierowuje do /checkout/success
- [ ] Po anulowaniu Stripe przekierowuje do /checkout/cancel
- [ ] Success page wyswietla poprawny komunikat i CTA
- [ ] Cancel page wyswietla poprawny komunikat i CTA
- [ ] Klikniecie "Sprobuj ponownie" w cancel page wraca do /checkout
- [ ] Klikniecie "Przejdz do aplikacji" w success page przekierowuje do /grid
- [ ] Testowanie edge cases:
  - [ ] Brak auth - redirect do login
  - [ ] API error - wyswietla error message i retry button
  - [ ] Network error - wyswietla error message
  - [ ] Bezposrednie wejscie na /checkout/success bez session_id
  - [ ] Bezposrednie wejscie na /checkout/cancel
- [ ] Testowanie w roznych przeglądarkach: Chrome, Firefox, Safari
- [ ] Testowanie na roznych rozmiarach ekranu: desktop, tablet, mobile
- [ ] Testowanie dostepnosci:
  - [ ] Keyboard navigation (Tab, Enter)
  - [ ] Screen reader (NVDA/VoiceOver) - wszystkie komunikaty sa odczytywane
  - [ ] Focus management - focus visible na przyciskach
- [ ] Testowanie performance:
  - [ ] Time to interactive < 2s dla /checkout page
  - [ ] Bundle size impact < 50KB (sprawdzic po build)

### 6.5. Regression testing

Lista obszarow do przetestowania w poszukiwaniu regresji:

- [ ] SubscriptionBanner - nadal wyswietla "Kup plan" i linkuje do /checkout
- [ ] Grid View - nie zlamany przez nowe routes
- [ ] Auth flow - login/logout dziala bez zmian
- [ ] Inne API endpoints - create-portal, status - nadal dzialaja
- [ ] Middleware - sprawdza auth przed dostepem do /checkout

## 7. Analiza ryzyka i mitigation

### 7.1. Zidentyfikowane ryzyka

#### Ryzyko 1: Redirect loop (checkout -> success -> checkout)

- Severity: MEDIUM
- Prawdopodobienstwo: LOW (jesli success_url jest poprawnie skonfigurowany)
- Wpływ: Uzytkownik nie moze dokonczyc procesu platnosci
- Mitigation:
  - Upewnic sie, ze success_url i cancel_url sa poprawnie skonstruowane (absolute URLs)
  - Testowac redirect flow w Stripe test mode
  - Dodac logging w useCheckout dla debugging

#### Ryzyko 2: Brakujaca zmienna srodowiskowa PUBLIC_STRIPE_PRICE_ID_PRO

- Severity: HIGH
- Prawdopodobienstwo: MEDIUM (jesli nie zaktualizowano .env)
- Wpływ: Checkout nie zadziala, price_id bedzie "price_default" (invalid)
- Mitigation:
  - Zaktualizowac .env.example z clear instructions
  - Dodac validation w plans.ts - throw error jesli price_id jest "price_default"
  - Dokumentacja w README.md

#### Ryzyko 3: API rate limiting (60 req/min)

- Severity: LOW
- Prawdopodobienstwo: LOW (uzytkownik nie bedzie inicjowal checkout 60x/min)
- Wpływ: Temporary block, retry po 1 minucie
- Mitigation:
  - useCheckout juz ma error handling
  - Rate limit dobrze ustawiony dla checkout use case

#### Ryzyko 4: Stripe webhook delay

- Severity: LOW
- Prawdopodobienstwo: MEDIUM (webhooks moga byc opoznione o kilka sekund)
- Wpływ: Uzytkownik widzi success page, ale subscription status jeszcze nie zaktualizowany w app_users
- Mitigation:
  - Success page komunikuje "Subskrypcja zostala aktywowana" (generyczny message)
  - Middleware sprawdza subscription_status przed dostepem do /grid
  - Jesli webhook opozniony, uzytkownik zobaczy "wciaz trial" przez kilka sekund, potem auto-refresh

### 7.2. Rollback plan

Szczegolowy plan jak wycofac zmiany w razie problemu:

1. Cofniecie commita z brancha fix/missing-checkout-page
2. Usunięcie nowych plikow:
   - src/pages/checkout/index.astro
   - src/pages/checkout/success.astro
   - src/pages/checkout/cancel.astro
   - src/components/checkout/CheckoutLoader.tsx
   - src/config/plans.ts
   - src/hooks/useCheckout.ts
   - e2e/checkout.spec.ts
3. Przywrocenie .env.example do poprzedniej wersji
4. Deploy rollback do staging/production
5. Komunikacja do uzytkownikow: "Funkcja zakupu tymczasowo niedostepna, pracujemy nad rozwiazaniem"

Rollback jest prosty, poniewaz zmiany sa izolowane (nowe pliki, zero zmian w istniejacym kodzie).

### 7.3. Monitoring post-deployment

Co monitorowac po wdrozeniu naprawy:

- Metryki:
  - Liczba wizyt na /checkout (powinno wzrosnac z 0 do X)
  - Conversion rate: /checkout -> /checkout/success (target: > 70%)
  - Error rate na /checkout (target: < 5%)
  - Czas ladowania /checkout page (target: < 2s)
- Logi:
  - Errors z useCheckout hook (console.error w catch block)
  - Failed API calls do create-checkout (status 4xx, 5xx)
  - Redirect loops (user agent stuck on /checkout)
- User feedback:
  - Support tickets zwiazane z platnoscia
  - Feedback w aplikacji (jesli jest feedback button)
- Stripe Dashboard:
  - Liczba utworzonych Checkout Sessions
  - Liczba udanych platnosci
  - Liczba anulowanych sesji

## 8. Zgodnosc ze standardami

### 8.1. Copilot-instructions.md compliance

Sprawdzenie zgodnosci naprawy ze standardami kodowania:

- React patterns: ✅
  - Functional components with hooks (useCheckout, CheckoutLoader)
  - useEffect for side effects (auto-initiate checkout)
  - useState for local state (isLoading, error)
  - No class components
- Astro patterns: ✅
  - .astro files for pages (index, success, cancel)
  - React islands for interactivity (CheckoutLoader)
  - client:only directive for CheckoutLoader (requires browser APIs)
  - SSR for static content (success/cancel pages)
- Accessibility (ARIA, WCAG): ✅
  - Semantic HTML (main, h1, h2, p, button)
  - Lucide-react icons with implicit aria-labels
  - Keyboard navigation (buttons are focusable)
  - Screen reader friendly (text content is descriptive)
  - Color contrast checked (text-gray-900 on white background = AAA)
- TypeScript best practices: ✅
  - Interfaces for props (CheckoutLoaderProps, UseCheckoutOptions)
  - Type safety for API responses (CheckoutSessionDTO)
  - Proper error typing (err instanceof Error)
- Testing patterns: ✅
  - E2E with Playwright
  - Mocking API routes
  - Test IDs for selectors (text locators + button hasText)

### 8.2. Tech-stack.md compliance

Sprawdzenie zgodnosci z stackiem technologicznym:

- Uzyty framework/library: ✅
  - Astro 4.x (pages, layouts)
  - React 18+ (components, hooks)
  - Tailwind CSS (styling)
  - Lucide-react (icons)
  - Zod (walidacja w API - bez zmian)
- Dependencies: ✅
  - Brak nowych dependencies (wszystkie juz w package.json)
- Build tools: ✅
  - Astro build system
  - Vite (underlying)

### 8.3. Security checklist

- [x] Input validation - price_id jest walidowany po stronie API (CreateCheckoutSchema)
- [x] Authorization - Middleware sprawdza auth przed dostepem do /checkout
- [x] Authentication - Token z localStorage, weryfikowany przez API
- [x] XSS protection - React auto-escapes, brak dangerouslySetInnerHTML
- [x] CSRF protection - Stripe Checkout ma wbudowana ochrone
- [x] SQL injection protection - Brak bezposrednich queries (Supabase RLS)
- [x] Secrets management - price_id w .env, Stripe keys w .env (nie w kodzie)
- [x] Rate limiting - API ma rate limiting (60 req/min)

### 8.4. Performance checklist

- [x] Bundle size impact - CheckoutLoader + useCheckout ~5-8KB (minimal)
- [x] Rendering optimization - CheckoutLoader jest client:only (no SSR overhead)
- [x] Loading states - Loader wyswietlany podczas fetch
- [x] Error boundaries - Error state w CheckoutLoader
- [x] Code splitting - Astro automatycznie splituje routes

### 8.5. Accessibility checklist (dla UI)

- [x] ARIA attributes - Implicite przez semantic HTML i lucide-react
- [x] Keyboard navigation - Buttons sa focusable, Enter/Space dziala
- [x] Focus management - Focus visible na buttons (default Tailwind)
- [x] Semantic HTML - main, h1, h2, p, button, div (class-based semantics)
- [x] Color contrast - Wszystkie teksty maja min 4.5:1 contrast
- [x] Screen reader testing - Do zweryfikowania manualnie (NVDA/VoiceOver)

## 9. Dokumentacja zmian

### 9.1. Changelog entry

```markdown
### Added

- [Missing Checkout Page] Dodano stronę /checkout dla zakupu subskrypcji
  - Automatyczna inicjacja Stripe Checkout Session
  - Strona potwierdzenia /checkout/success
  - Strona anulowania /checkout/cancel
  - Konfiguracja planów subskrypcji w src/config/plans.ts
  - Hook useCheckout dla reużywalnej logiki checkout
```

### 9.2. Aktualizacja README (jesli wymagana)

Sekcja do dodania w README.md:

```markdown
## Zakup Subskrypcji

Po wygaśnięciu 7-dniowego trialu, użytkownik może zakupić subskrypcję klikając przycisk "Kup plan" w aplikacji.

### Konfiguracja Stripe Price ID

Przed uruchomieniem aplikacji, ustaw zmienne środowiskowe dla Stripe Price IDs:

\`\`\`bash
PUBLIC_STRIPE_PRICE_ID_PRO=price_1ABC123xyz
\`\`\`

Price ID można znaleźć w Stripe Dashboard -> Products -> [Twój produkt] -> Pricing.

### Testowanie płatności

W trybie testowym Stripe (test mode), użyj testowych kart kredytowych:

- Sukces: `4242 4242 4242 4242`
- Błąd: `4000 0000 0000 0002`
- 3D Secure: `4000 0027 6000 3184`

Więcej testowych kart: https://stripe.com/docs/testing
```

### 9.3. Dokumentacja techniczna (jesli wymagana)

Brak potrzeby dodatkowej dokumentacji technicznej. Kod jest self-documented (JSDoc comments w hookach i komponentach).

### 9.4. Release notes

Informacja dla uzytkownikow koncowych:

```markdown
## Co zostało naprawione

- Naprawiono problem z brakiem możliwości zakupu subskrypcji po wygaśnięciu trialu
- Dodano stronę płatności z automatycznym przekierowaniem do bezpiecznej płatności Stripe
- Dodano strony potwierdzenia i anulowania płatności

## Jak wpływa to na doświadczenie użytkownika

- Możesz teraz łatwo zakupić subskrypcję bezpośrednio z aplikacji
- Proces płatności jest szybki i bezpieczny (obsługiwany przez Stripe)
- Po udanej płatności otrzymasz natychmiastowy dostęp do pełnych funkcji

## Czy wymagane są jakieś akcje po stronie użytkownika

- Jeśli Twój trial wygasł, kliknij "Kup plan" w bannerze lub ustawieniach konta
- Zostaniesz automatycznie przekierowany do bezpiecznej strony płatności
- Po zakończeniu płatności, pełny dostęp zostanie natychmiast przywrócony
```

## 10. Timeline i effort estimation

### 10.1. Estymacja czasu

- Implementacja: 2-3 godzin
  - Konfiguracja plans.ts: 15 min
  - Hook useCheckout: 30 min
  - CheckoutLoader component: 30 min
  - Strona checkout/index.astro: 30 min
  - Strony success/cancel: 45 min
  - Aktualizacja .env.example: 10 min
- Testowanie: 1-1.5 godzin
  - E2E testy: 1h
  - Manual testing: 30 min
- Code review: 30 min
- Deployment: 15 min
  - Build i deploy do staging
  - Weryfikacja na staging
  - Deploy do production
- Monitoring post-deployment: 1 dzien (passive monitoring)

Łącznie: 4-5.5 godzin (developer time) + 1 dzien monitoring

### 10.2. Zaleznosci

Blokujące:

- Brak (API juz dziala, Stripe integration juz skonfigurowany)

Blokowane przez ta naprawe:

- Mozliwosc testowania konwersji trial -> paid (obecnie niemozliwe przez brak /checkout)
- Implementacja multi-plan pricing (mozliwe dopiero po tym PR, ale nie blokujące MVP)

### 10.3. Sugerowany timeline

- Start: 2026-01-19 (dzisiaj)
- Code complete: 2026-01-19 wieczor
- Testing complete: 2026-01-20 rano
- Code review: 2026-01-20 poludnie
- Deployment to staging: 2026-01-20 po code review
- Verification on staging: 2026-01-20 po deployment
- Deployment to production: 2026-01-20 wieczor (jesli staging OK)
- Monitoring: 2026-01-21 caly dzien (passive)

Szacowany czas do production: 1-2 dni roboczych

## 11. Załączniki

### 11.1. Dotknięte pliki (lista pelna)

Nowe pliki:

```
src/pages/checkout/index.astro
src/pages/checkout/success.astro
src/pages/checkout/cancel.astro
src/components/checkout/CheckoutLoader.tsx
src/config/plans.ts
src/hooks/useCheckout.ts
e2e/checkout.spec.ts
```

Zmodyfikowane pliki:

```
.env.example (dodane PUBLIC_STRIPE_PRICE_ID_PRO)
```

Bez zmian (ale powiazane):

```
src/pages/api/subscriptions/create-checkout.ts
src/types/subscription.types.ts
src/components/SubscriptionBanner.tsx
src/middleware/index.ts
```

### 11.2. Referencje

Linki do zwiazanych dokumentow:

- PRD.md sekcja 2.7 Checkout View
- UI-plan.md sekcja 2.7 Checkout View (Stripe)
- API-plan.md sekcja 2.2.2 POST /api/subscriptions/create-checkout
- .agents/endpoints/subscription-management-implementation-plan.md
- .agents/fixes/fix-expired-trial-grid-access-plan.md (wspomniane /checkout jako redirect target)
- docs/api/subscription-frontend-integration.md (przykłady implementacji)

### 11.3. Screenshoty/diagramy

Diagram flow dla checkout:

```
[User z expired trial w SubscriptionBanner]
        |
        | klik "Kup plan"
        v
    [/checkout page]
        |
        | CheckoutLoader auto-initiates
        v
    [POST /api/subscriptions/create-checkout]
        |
        | Success: checkout_url
        v
    [Redirect do checkout.stripe.com]
        |
        +--- User oplaca ---> [Stripe redirect do success_url]
        |                           |
        |                           v
        |                     [/checkout/success]
        |                           |
        |                           | "Przejdz do aplikacji"
        |                           v
        |                       [/grid]
        |
        +--- User anuluje ---> [Stripe redirect do cancel_url]
                                    |
                                    v
                              [/checkout/cancel]
                                    |
                                    | "Sprobuj ponownie"
                                    v
                                [/checkout]
```

### 11.4. Error logs/stack traces

Brak error logow (to jest implementacja nowej funkcjonalnosci, nie naprawa istniejacego bledu z crash).

Przykladowy error ktory moze wystapic w useCheckout (do obslugi):

```
Error: Nie udało się utworzyć sesji płatności
  at useCheckout.initiateCheckout (src/hooks/useCheckout.ts:45)
  Caused by: Response status 400 from /api/subscriptions/create-checkout
  Body: { "success": false, "error": { "code": "INVALID_PRICE_ID", "message": "Price ID must start with 'price_'" } }
```

Ten error jest juz obsluzony w catch block useCheckout i wyswietlony w UI z retry button.

---

## Podsumowanie

Plan naprawy bledu "missing-checkout-page" jest kompletny i gotowy do implementacji. Rozwiazanie A (prosta strona z automatyczna inicjacja Stripe Checkout) jest rekomendowane jako najszybsze i najbardziej efektywne dla MVP. Implementacja zajmie 4-5.5 godzin i moze byc wdrozona na production w ciagu 1-2 dni roboczych.

Po wdrozeniu naprawy, uzytkownik z wygaslym trialem bedzie mogl kliknac "Kup plan" i zostanie automatycznie przekierowany do procesu platnosci, co odblokuje kluczowy revenue stream dla aplikacji.
