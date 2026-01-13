# Architektura UI dla Black Swan Grid (MVP)

## 1. Przegląd struktury UI

Black Swan Grid to aplikacja webowa do przeglądania i analizowania historycznych anomalii cenowych na GPW. Architektura UI została zaprojektowana jako responsywna, touch-friendly aplikacja single-page z minimalną nawigacją i fokusem na interaktywnym gridzie jako głównym elemencie interfejsu.

### Kluczowe założenia architektoniczne

- **Routing**: TanStack Router z type-safe routes i deep-linking
- **Zarządzanie stanem**: React Context + URL params + localStorage (bez zewnętrznych bibliotek state management)
- **Overlay/Modale**: React Portal dla modali, sidebarów i drawers
- **Responsywność**: Pełna responsywność z gridem na wszystkich rozdzielczościach (desktop, tablet, mobile)
- **Cache**: Zunifikowana strategia cache'owania w localStorage + in-memory (stale-while-revalidate)
- **Nawigacja wstecz**: History API do przywracania poprzednich widoków ze stanem
- **Dostępność**: Podstawowe ARIA labels, keyboard navigation, focus management
- **Performance**: Progressive loading, lazy rendering komórek, React.memo/useCallback/useMemo

### Stack technologiczny UI

- **Framework**: Astro z React islands dla interaktywności
- **Routing**: TanStack Router
- **Styling**: Tailwind CSS
- **Komponenty UI**: shadcn/ui (button, dialog, dropdown-menu, drawer)
- **Wirtualizacja**: react-window lub @tanstack/react-virtual dla gridu
- **Uwierzytelnianie**: Supabase Auth UI + custom components

---

## 2. Lista widoków

### 2.1. Landing View (Home)

**Ścieżka**: `/`

**Główny cel**: Przedstawienie produktu i przekierowanie do logowania/rejestracji dla nowych użytkowników

**Kluczowe informacje**:

- Hero section z opisem produktu
- Value proposition (szybka identyfikacja anomalii GPW z AI summaries)
- CTA do rejestracji/logowania
- Informacja o 7-dniowym trialu

**Kluczowe komponenty**:

- `Hero.astro` - główna sekcja z CTA
- `Features.astro` - lista kluczowych funkcji
- `CTAButtons.tsx` - przyciski "Zarejestruj się" / "Zaloguj"
- `Header.astro` - minimalistyczny header z logo

**UX, dostępność i bezpieczeństwo**:

- Semantyczny HTML (section, header, nav)
- Kontrasty tekstu zgodne z WCAG AA
- CTA buttons z min. 44x44px touch targets
- Fast loading (< 2s LCP) - statyczna strona Astro

---

### 2.2. Auth View (Login/Register)

**Ścieżka**: `/auth/login`, `/auth/register`

**Główny cel**: Uwierzytelnianie użytkowników przez Supabase Auth

**Kluczowe informacje**:

- Email i hasło (lub OAuth - opcjonalne)
- Informacja o 7-dniowym trialu przy rejestracji
- Link do odzyskiwania hasła
- returnUrl dla deep-linkingu po zalogowaniu

**Kluczowe komponenty**:

- `AuthForm.tsx` - formularz logowania/rejestracji (React island)
- `SupabaseAuthUI.tsx` - wrapper dla Supabase Auth UI
- `PasswordReset.tsx` - flow odzyskiwania hasła

**UX, dostępność i bezpieczeństwo**:

- Walidacja email i hasła po stronie klienta (Zod)
- Clear error messages przy nieudanym logowaniu
- ARIA labels dla pól formularza
- Keyboard navigation (Tab order, Enter to submit)
- Autocomplete attributes (email, current-password, new-password)
- Redirect po zalogowaniu do returnUrl lub domyślnie do Grid View
- HTTPS only, secure cookie storage dla session tokens
- Trial automatycznie uruchamiany po rejestracji (POST /api/users/initialize)

---

### 2.3. Grid View (Main App View)

**Ścieżka**: `/grid` (lub `/` po zalogowaniu - alias)

**Główny cel**: Główny widok aplikacji - interaktywny grid z historycznymi anomaliami GPW

**Kluczowe informacje**:

- Grid z osiami: X = daty sesyjne, Y = tickery spółek GPW
- Kafelki z kolorowaniem wg typu zdarzenia (BLACK_SWAN_UP/DOWN, VOLATILITY_UP/DOWN, BIG_MOVE)
- Percent_change wyświetlony na kafelku
- Puste kafelki gdy brak zdarzenia
- Filtry tickerów (dropdown/multi-select)
- Zakres czasowy (tydzień/miesiąc/kwartał) - selector
- Status subskrypcji w headerze (avatar menu)

**Kluczowe komponenty**:

- `GridLayout.tsx` - layout główny z headerem i gridem
- `GridHeader.tsx` - logo, range selector, filters, avatar menu
- `VirtualizedGrid.tsx` - wirtualizowany grid (react-window lub @tanstack/react-virtual)
- `GridCell.tsx` - pojedyncza komórka gridu z event data
- `RangeSelector.tsx` - przełącznik tydzień/miesiąc/kwartał
- `TickerFilter.tsx` - multi-select dla tickerów
- `AvatarMenu.tsx` - dropdown z opcjami konta (React Portal)
- `SubscriptionBanner.tsx` - banner informujący o wygasającym trialu/subskrypcji

**UX, dostępność i bezpieczeństwo**:

- **Responsywność**:
  - Desktop (>1024px): pełny grid, wszystkie dane w komórkach, sidebar 33% szerokości
  - Tablet (768-1023px): grid z mniejszą czcionką, sidebar 40%
  - Mobile (<768px): grid z minimalnymi danymi w komórce (tylko symbol i %), bottom drawer zamiast sidebar
- **Touch-friendly**: min. 44x44px dla komórek, swipe do przewijania
- **Progressive loading**: Skeleton loaders dla komórek podczas fetch, lazy rendering tylko widocznych wierszy
- **Cache**: Odczyt z localStorage/in-memory on mount → render natychmiast → rewalidacja w tle → update UI
- **Keyboard navigation**: Arrow keys do poruszania się po gridzie, Enter do otwarcia sidebaru, Escape do zamknięcia
- **ARIA**: aria-label dla komórek (`${symbol} ${date} ${event_type} ${percent_change}%`), aria-selected dla focused cell
- **Empty state**: Gdy brak zdarzeń dla wybranego zakresu/filtrów → komunikat "Brak zdarzeń w wybranym zakresie"
- **Error handling**: Error boundary dla całego gridu, retry button po 3 nieudanych próbach fetch
- **Security**: Middleware sprawdza subscription status przed renderem, redirect do payment jeśli brak dostępu

**Stany widoku**:

- Loading (skeleton grid)
- Loaded (pełne dane)
- Error (error message + retry button)
- Empty (brak zdarzeń)

---

### 2.4. Summary Detail View (Sidebar/Drawer)

**Ścieżka**: `/grid?eventId=<id>` (URL param) lub `/summary/:id` (permalink, standalone)

**Główny cel**: Wyświetlenie szczegółów pojedynczego zdarzenia z pierwszym AI summary

**Kluczowe informacje**:

- Symbol, occurrence_date, typ eventu, percent_change
- Pierwsze AI summary (summary text)
- Article sentiment, identified causes, predicted trend probability
- Recommended action (BUY/SELL/HOLD + justification)
- Keywords
- Link do source article
- Przycisk "Zobacz więcej summaries" (przejście do Full Detail View)

**Kluczowe komponenty**:

- `SummarySidebar.tsx` (desktop) - sidebar 33% szerokości z prawej strony
- `SummaryDrawer.tsx` (mobile) - bottom drawer z swipe-to-dismiss
- `SummaryCard.tsx` - formatowane wyświetlenie AI summary
- `EventHeader.tsx` - nagłówek z symbolem, datą, typem i percent_change
- `SentimentBadge.tsx` - badge dla article_sentiment
- `TrendProbabilityChart.tsx` - prosty bar chart dla predicted_trend_probability
- `RecommendedActionCard.tsx` - karta z akcją (BUY/SELL/HOLD)
- `SourceLink.tsx` - link do artykułu źródłowego

**UX, dostępność i bezpieczeństwo**:

- **Layout**:
  - Desktop: Sidebar po prawej, 33% szerokości, overlay dim 20% opacity na grid
  - Tablet: Sidebar 40% szerokości
  - Mobile: Bottom drawer, 70% wysokości ekranu, swipe-to-dismiss
- **Open/Close**:
  - Otwieranie: klik na komórkę gridu → URL param `?eventId=<id>` → sidebar/drawer otwiera się
  - Zamykanie: klik na X, ESC, klik na overlay (desktop), swipe down (mobile)
- **Deep-linking**: Permalink `/summary/:id` → renderuje standalone view z tym samym layoutem co sidebar
- **Focus management**: Po otwarciu focus na pierwszym interaktywnym elemencie (close button), po zamknięciu powrót do grid cell
- **ARIA**: aria-labelledby dla sidebaru, role="dialog", aria-modal="true", focus trap
- **Loading**: Skeleton loader dla summary podczas fetch
- **Error handling**: Placeholder gdy brak AI summary ("Brak podsumowania - spróbuj później" + Retry button)
- **Cache**: Odczyt z cache → render natychmiast → rewalidacja w tle
- **History API**: Przy zamknięciu sidebaru history.back() jeśli URL zawiera eventId (przywraca stan gridu)

---

### 2.5. Full Detail View (Event Details)

**Ścieżka**: `/event/:id` (dedykowana strona)

**Główny cel**: Pełny widok wydarzenia z listą wszystkich AI summaries i artykułów

**Kluczowe informacje**:

- Wszystkie informacje z Summary Detail View
- Lista wszystkich AI summaries (sortowalna po dacie)
- Każdy summary w rozwijanej sekcji (accordion)
- Linki do wszystkich artykułów źródłowych
- Historic data (open, close, high, low, volume)

**Kluczowe komponenty**:

- `EventDetailLayout.tsx` - pełna strona z headerem i breadcrumb
- `EventHeader.tsx` - reużycie z Summary Detail View
- `SummaryList.tsx` - lista AI summaries (accordion)
- `SummaryAccordionItem.tsx` - pojedyncze rozwijane summary
- `HistoricDataTable.tsx` - tabela z danymi historycznymi (OHLCV)
- `ArticlesList.tsx` - lista artykułów źródłowych z linkami
- `Breadcrumb.tsx` - nawigacja: Grid > Event Detail

**UX, dostępność i bezpieczeństwo**:

- **Layout**: Full-page view, max-width 1200px, centered
- **Navigation**: Breadcrumb + przycisk "Powrót do gridu"
- **Accordion**: Pierwszy summary rozwinięty domyślnie, pozostałe collapsed
- **Sortowanie**: Dropdown "Sortuj po: Data (najnowsze/najstarsze), Sentiment"
- **Deep-linking**: URL `/event/:id` + hash dla konkretnego summary (`/event/:id#summary-2`)
- **History API**: Przycisk "Powrót" używa history.back() z zachowaniem stanu gridu (range, filters)
- **Keyboard navigation**: Tab order, Enter/Space do rozwijania accordion, focus visible
- **ARIA**: aria-expanded dla accordion items, aria-controls
- **Loading**: Progressive loading - first summary loaded immediately, reszta lazy
- **Error handling**: Jeśli event nie istnieje → 404 page z linkiem do gridu
- **Security**: Middleware sprawdza subscription status przed dostępem

---

### 2.6. Account Modal/Sidebar

**Ścieżka**: Modal/Sidebar otwarty przez klik na avatar w headerze (nie dedykowana strona w MVP)

**Główny cel**: Wyświetlenie danych użytkownika i statusu subskrypcji

**Kluczowe informacje**:

- Email użytkownika
- Status subskrypcji (trial/active/expired)
- Trial expires at (dla trial)
- Current period end (dla active)
- Plan ID (np. pro_monthly)
- Przycisk "Zarządzaj subskrypcją" (Stripe Portal)
- Przycisk "Wyloguj"

**Kluczowe komponenty**:

- `AccountModal.tsx` (desktop) - modal centered, 400px szerokości (React Portal)
- `AccountDrawer.tsx` (mobile) - bottom drawer (React Portal)
- `UserInfo.tsx` - email + avatar
- `SubscriptionStatus.tsx` - status badge + data wygaśnięcia
- `ManageSubscriptionButton.tsx` - CTA do Stripe Portal (POST /api/subscriptions/create-portal)
- `LogoutButton.tsx` - wylogowanie (Supabase signOut)

**UX, dostępność i bezpieczeństwo**:

- **Layout**:
  - Desktop: Modal centered, 400px width, overlay 40% opacity
  - Mobile: Bottom drawer, 60% wysokości ekranu
- **Open/Close**:
  - Otwieranie: klik na avatar w headerze
  - Zamykanie: klik na X, ESC, klik na overlay
- **Focus management**: Focus trap w modalu, po zamknięciu powrót do avatar button
- **ARIA**: role="dialog", aria-labelledby="account-modal-title", aria-modal="true"
- **Loading**: Skeleton podczas fetch user data (GET /api/users/me)
- **Error handling**: Jeśli błąd przy fetch → error message + Retry button
- **Stripe Portal**: Po kliknięciu "Zarządzaj subskrypcją" → redirect do Stripe Portal URL (return_url z powrotem do app)
- **Logout**: Po wylogowaniu → redirect do landing page

---

### 2.7. Checkout View (Stripe)

**Ścieżka**: `/checkout` (lub redirect do Stripe Checkout URL)

**Główny cel**: Inicjacja płatności za subskrypcję przez Stripe Checkout

**Kluczowe informacje**:

- Wybór planu (price_id)
- Informacje o płatności (Stripe Checkout obsługuje)
- Success/Cancel URLs

**Kluczowe komponenty**:

- `CheckoutPage.tsx` - strona z wyborem planu (opcjonalne w MVP jeśli tylko 1 plan)
- `PlanCard.tsx` - karta z planem (cena, features)
- `CheckoutButton.tsx` - CTA "Wybierz plan" (POST /api/subscriptions/create-checkout → redirect)

**UX, dostępność i bezpieczeństwo**:

- **Flow**: Użytkownik klika "Wybierz plan" → POST do API → redirect do Stripe Checkout → po płatności redirect do success_url
- **Success URL**: `/checkout/success` - strona potwierdzenia z "Powrót do aplikacji" (Grid View)
- **Cancel URL**: `/checkout/cancel` - strona anulowania z "Powrót do wyboru planu"
- **Loading**: Spinner podczas redirect do Stripe
- **Error handling**: Jeśli błąd przy tworzeniu checkout session → error message
- **Security**: Success/Cancel URLs weryfikowane po stronie serwera (webhook confirmation), nie trusted po stronie klienta

---

### 2.8. Success/Cancel Pages

**Ścieżka**: `/checkout/success`, `/checkout/cancel`

**Główny cel**: Feedback po procesie płatności

**Success Page**:

- Komunikat potwierdzający aktywację subskrypcji
- CTA "Przejdź do aplikacji" (Grid View)

**Cancel Page**:

- Komunikat informujący o anulowaniu
- CTA "Wróć do wyboru planu" lub "Kontynuuj z trialem"

**Kluczowe komponenty**:

- `CheckoutSuccess.astro` - statyczna strona z komunikatem
- `CheckoutCancel.astro` - statyczna strona z komunikatem

---

### 2.9. Error Pages (404, 403, 500)

**Ścieżka**: `/404`, `/403`, `/500`

**Główny cel**: Obsługa błędów i komunikacja z użytkownikiem

**404 (Not Found)**:

- Komunikat "Strona nie znaleziona"
- CTA "Powrót do strony głównej"

**403 (Forbidden / No Access)**:

- Komunikat "Brak dostępu - wymagana aktywna subskrypcja"
- CTA "Sprawdź status subskrypcji" (Account Modal) lub "Kup plan"

**500 (Server Error)**:

- Komunikat "Coś poszło nie tak"
- CTA "Odśwież stronę" lub "Powrót do strony głównej"

**Kluczowe komponenty**:

- `ErrorPage.astro` - reużywalny komponent z dynamicznym komunikatem

---

## 3. Mapa podróży użytkownika

### 3.1. Nowy użytkownik (Rejestracja i Trial)

1. **Landing Page** (`/`)
   - Użytkownik widzi hero section z value proposition
   - Klik CTA "Zarejestruj się"
2. **Register View** (`/auth/register`)
   - Wypełnienie formularza (email, hasło)
   - Supabase Auth rejestracja → automatyczne uruchomienie 7-day trial (POST /api/users/initialize)
3. **Grid View** (`/grid`)
   - Po zalogowaniu redirect do głównego widoku
   - Pierwszy render z cache (pusty) → skeleton loaders
   - Fetch danych w tle → render gridu
   - Banner informujący o trialu: "Trial aktywny do [data]"
4. **Eksploracja gridu**
   - Użytkownik przewija grid, zmienia zakres (tydzień/miesiąc), filtruje tickery
   - Preferencje zapisywane w localStorage
5. **Klik w komórkę**
   - Otwarcie **Summary Sidebar** z pierwszym AI summary
   - Odczyt z cache → skeleton → fetch w tle → update
6. **Klik "Zobacz więcej"**
   - Przejście do **Full Detail View** (`/event/:id`)
   - Lista wszystkich AI summaries dla wydarzenia
7. **Powrót do gridu**
   - Klik breadcrumb lub przycisk "Powrót" → History API → przywrócenie stanu gridu
8. **Trial wygasa**
   - Banner w Grid View: "Trial wygasa za 1 dzień - kup plan"
   - Klik "Kup plan" → **Checkout View**
9. **Checkout**
   - Wybór planu → redirect do Stripe Checkout
   - Płatność → Stripe webhook aktualizuje status subskrypcji
   - Redirect do `/checkout/success`
10. **Success**
    - Komunikat "Subskrypcja aktywna"
    - Klik "Przejdź do aplikacji" → Grid View (pełny dostęp)

---

### 3.2. Istniejący użytkownik (Login i korzystanie)

1. **Landing Page** (`/`)
   - Klik "Zaloguj się"
2. **Login View** (`/auth/login`)
   - Wprowadzenie email i hasła
   - Supabase Auth logowanie
3. **Grid View** (`/grid`)
   - Redirect po zalogowaniu
   - Odczyt cache z poprzedniej sesji → natychmiastowy render
   - Rewalidacja w tle → update UI
   - Przywrócenie ostatnich filtrów i zakresu (z localStorage)
4. **Eksploracja i analiza**
   - Użytkownik otwiera summary sidebary, przegląda pełne widoki
   - History API zachowuje stan nawigacji
5. **Klik avatar → Account Modal**
   - Sprawdzenie statusu subskrypcji
   - Klik "Zarządzaj subskrypcją" → redirect do Stripe Portal
6. **Stripe Portal**
   - Zmiana planu, aktualizacja karty, anulowanie subskrypcji
   - Powrót do aplikacji (return_url)
7. **Wylogowanie**
   - Klik "Wyloguj" w Account Modal
   - Redirect do Landing Page

---

### 3.3. Permalink sharing (Udostępnianie)

1. **Użytkownik A** (zalogowany) otwiera summary (`/summary/:id`)
   - Kopiuje URL
2. **Użytkownik B** (niezalogowany) otwiera skopiowany URL
   - Middleware sprawdza session → brak sesji
   - Redirect do `/auth/login?returnUrl=/summary/:id`
3. **Użytkownik B loguje się**
   - Po zalogowaniu redirect do `/summary/:id`
   - Middleware sprawdza subscription status → brak aktywnej subskrypcji
   - Redirect do `/checkout` lub `/403` z komunikatem
4. **Użytkownik B** kupuje subskrypcję
   - Stripe Checkout → płatność → success
   - Redirect z powrotem do aplikacji
   - Permalink teraz dostępny (subscription active)

---

### 3.4. Wygaśnięcie subskrypcji

1. **Użytkownik** z aktywną subskrypcją
   - Używa aplikacji normalnie
2. **Subskrypcja wygasa** (invoice.payment_failed webhook)
   - Webhook aktualizuje status na `past_due`
3. **Użytkownik** otwiera aplikację
   - Middleware sprawdza status → `past_due`
   - Redirect do `/403` lub modal "Subskrypcja wygasła - odnów"
4. **Klik "Odnów"**
   - Redirect do Stripe Portal lub Checkout
   - Płatność → webhook aktualizuje status na `active`
5. **Powrót do aplikacji**
   - Pełny dostęp przywrócony

---

## 4. Układ i struktura nawigacji

### 4.1. Główny layout (po zalogowaniu)

```
┌─────────────────────────────────────────────────┐
│ Header (fixed top)                               │
│ [Logo]                    [Range] [Filter] [👤]  │
├─────────────────────────────────────────────────┤
│                                                  │
│                                                  │
│              Grid (scrollable)                   │
│                                                  │
│                                                  │
└─────────────────────────────────────────────────┘
```

**Desktop z otwartym sidebarrem**:

```
┌─────────────────────────────────────────────────┐
│ Header                                           │
├────────────────────────────┬────────────────────┤
│                             │  Summary Sidebar   │
│         Grid               │  (33% width)       │
│      (overlay dim)         │                     │
│                             │  [Close X]         │
│                             │                     │
└────────────────────────────┴────────────────────┘
```

**Mobile z otwartym drawerem**:

```
┌────────────────────┐
│ Header             │
├────────────────────┤
│                     │
│      Grid          │
│                     │
│                     │
├────────────────────┤
│                     │
│  Summary Drawer    │
│  (bottom, 70%)     │
│                     │
│  [Swipe handle]    │
└────────────────────┘
```

### 4.2. Nawigacja główna

**Brak tradycyjnej głównej nawigacji** (zgodnie z decyzją):

- **Logo** (top-left): Klik → powrót do Grid View (lub home)
- **Avatar** (top-right): Klik → otwarcie Account Modal/Drawer (React Portal)
  - Opcje w menu:
    - Moje konto (status subskrypcji, dane użytkownika)
    - Zarządzaj subskrypcją (Stripe Portal)
    - Wyloguj

**Breadcrumb** (tylko w Full Detail View):

- Grid > Event Detail
- Klik na "Grid" → powrót do Grid View z zachowaniem stanu

### 4.3. Nawigacja wewnętrzna

- **Grid → Summary Sidebar**: Klik na komórkę
- **Summary Sidebar → Full Detail View**: Klik "Zobacz więcej"
- **Full Detail View → Grid**: Breadcrumb lub przycisk "Powrót" (History API)
- **Sidebar Close**: X button, ESC, overlay click → History API back
- **URL params**: `?eventId=<id>&range=week&symbols=CPD,PKN` do deep-linkingu i przywracania stanu

### 4.4. History API integration

**Strategia**:

- Każda zmiana widoku (otwarcie sidebaru, zmiana zakresu, filtrów) aktualizuje URL params przez `history.pushState`
- Przykład: Klik na komórkę → `history.pushState({}, '', '/grid?eventId=123')`
- Zamknięcie sidebaru → `history.back()` → przywrócenie poprzedniego URL bez eventId
- State object w history może zawierać: `{ range, symbols, scrollPosition }`
- TanStack Router obsługuje synchronizację URL params z React state

**Implementacja**:

```typescript
// Otwieranie sidebaru
router.navigate({
  search: { ...currentSearch, eventId: "123" },
});

// Zamykanie sidebaru
router.navigate({
  search: { ...currentSearch, eventId: undefined },
});
```

---

## 5. Kluczowe komponenty

### 5.1. Layout Components

#### `AppLayout.tsx`

- **Opis**: Główny layout aplikacji (authenticated)
- **Props**: `children: ReactNode`
- **Zawartość**: Header + main content area
- **Używany w**: Grid View, Full Detail View

#### `Header.tsx`

- **Opis**: Header z logo, kontrolkami i avatar menu
- **Props**: `showRangeSelector: boolean`, `showFilters: boolean`
- **Zawartość**: Logo, RangeSelector, TickerFilter, AvatarMenu
- **Responsywność**: Na mobile range selector i filtry w hamburger menu

#### `AvatarMenu.tsx`

- **Opis**: Dropdown menu z avatarem użytkownika
- **Props**: `user: User`
- **Zawartość**: Avatar button → dropdown (React Portal) → opcje konta
- **Akcje**: Klik avatar → toggle dropdown, klik "Moje konto" → otwarcie Account Modal

---

### 5.2. Grid Components

#### `VirtualizedGrid.tsx`

- **Opis**: Główny grid z wirtualizacją
- **Props**: `events: Event[]`, `range: Range`, `symbols: string[]`, `onCellClick: (eventId) => void`
- **Technologia**: react-window (VariableSizeGrid) lub @tanstack/react-virtual
- **Zawartość**: Renderuje tylko widoczne wiersze i kolumny
- **Performance**: Memo na komórkach, useCallback dla handlery

#### `GridCell.tsx`

- **Opis**: Pojedyncza komórka gridu
- **Props**: `event: Event | null`, `onClick: () => void`
- **Zawartość**:
  - Jeśli event istnieje: kolorowe tło wg event_type, percent_change
  - Jeśli brak eventu: pusta komórka (neutral background)
- **Stylowanie**: Tailwind classes dla kolorów (bg-red-100, bg-green-100, etc.)
- **Accessibility**: aria-label, tabindex, keyboard handlers

#### `RangeSelector.tsx`

- **Opis**: Przełącznik zakresu czasowego (tydzień/miesiąc/kwartał)
- **Props**: `value: Range`, `onChange: (range) => void`
- **Zawartość**: Segmented control lub dropdown
- **URL sync**: onChange aktualizuje URL param `?range=week`

#### `TickerFilter.tsx`

- **Opis**: Multi-select dla tickerów
- **Props**: `symbols: string[]`, `selected: string[]`, `onChange: (selected) => void`
- **Zawartość**: Dropdown z checkboxami (shadcn/ui DropdownMenu)
- **Persistence**: Zapisuje wybrane tickery w localStorage
- **URL sync**: onChange aktualizuje URL param `?symbols=CPD,PKN`

---

### 5.3. Summary Components

#### `SummarySidebar.tsx` (Desktop)

- **Opis**: Sidebar z prawej strony z AI summary
- **Props**: `eventId: string`, `onClose: () => void`
- **Zawartość**: EventHeader, SummaryCard, SourceLink, "Zobacz więcej" button
- **Layout**: Fixed position, 33% width, overlay dim na grid
- **Portal**: Renderowany przez React Portal
- **Focus trap**: Keyboard navigation zamknięta w sidebar

#### `SummaryDrawer.tsx` (Mobile)

- **Opis**: Bottom drawer z AI summary
- **Props**: `eventId: string`, `onClose: () => void`
- **Zawartość**: Identyczna jak SummarySidebar
- **Layout**: Fixed bottom, 70% height, swipe-to-dismiss
- **Gesture**: react-use-gesture dla swipe down to close

#### `SummaryCard.tsx`

- **Opis**: Formatowana karta z AI summary
- **Props**: `summary: AISummary`
- **Zawartość**: Summary text, sentiment badge, identified causes (lista), trend probability, recommended action
- **Stylowanie**: Card z sections, czytelna typografia

#### `EventHeader.tsx`

- **Opis**: Nagłówek wydarzenia
- **Props**: `event: Event`
- **Zawartość**: Symbol, occurrence_date, event_type badge, percent_change (large text)
- **Stylowanie**: Kolorowanie wg event_type

#### `TrendProbabilityChart.tsx`

- **Opis**: Prosty bar chart dla predicted_trend_probability
- **Props**: `probability: { further_decline: number, recovery: number }`
- **Zawartość**: Dwa horizontal bars z wartościami % (opcjonalnie biblioteka chart.js lub custom CSS)

#### `RecommendedActionCard.tsx`

- **Opis**: Karta z rekomendowaną akcją
- **Props**: `action: { action: string, justification: string }`
- **Zawartość**: Badge z akcją (BUY/SELL/HOLD), justification text
- **Stylowanie**: Kolorowanie wg akcji (green=BUY, red=SELL, yellow=HOLD)

---

### 5.4. Account Components

#### `AccountModal.tsx` (Desktop)

- **Opis**: Modal z danymi użytkownika
- **Props**: `user: User`, `onClose: () => void`
- **Zawartość**: UserInfo, SubscriptionStatus, ManageSubscriptionButton, LogoutButton
- **Portal**: React Portal
- **Focus trap**: ESC to close

#### `AccountDrawer.tsx` (Mobile)

- **Opis**: Bottom drawer z danymi użytkownika
- **Props**: Identyczne jak AccountModal
- **Zawartość**: Identyczna jak AccountModal

#### `UserInfo.tsx`

- **Opis**: Email i avatar użytkownika
- **Props**: `user: User`

#### `SubscriptionStatus.tsx`

- **Opis**: Status badge i daty
- **Props**: `subscription: Subscription`
- **Zawartość**:
  - Trial: "Trial aktywny do [data]" + badge
  - Active: "Subskrypcja aktywna do [data]" + badge
  - Expired: "Subskrypcja wygasła" + CTA "Odnów"

#### `ManageSubscriptionButton.tsx`

- **Opis**: CTA do Stripe Portal
- **Props**: `onClick: () => void`
- **Akcja**: POST /api/subscriptions/create-portal → redirect

---

### 5.5. Auth Components

#### `AuthForm.tsx`

- **Opis**: Formularz logowania/rejestracji
- **Props**: `mode: 'login' | 'register'`, `returnUrl?: string`
- **Zawartość**: Email input, password input, submit button, toggle link (login/register)
- **Walidacja**: Zod schema, inline error messages
- **Accessibility**: Autocomplete attributes, aria-invalid

#### `SupabaseAuthUI.tsx`

- **Opis**: Wrapper dla Supabase Auth UI
- **Props**: `mode: 'login' | 'register'`, `returnUrl?: string`
- **Zawartość**: Supabase Auth UI z customizacją stylów (Tailwind)

---

### 5.6. UI Utilities

#### `ErrorBoundary.tsx`

- **Opis**: Error boundary dla całej aplikacji lub sekcji (grid)
- **Props**: `fallback: ReactNode`
- **Zawartość**: Catch errors → render fallback UI z retry button

#### `Skeleton.tsx`

- **Opis**: Reużywalny skeleton loader
- **Props**: `width`, `height`, `className`
- **Stylowanie**: Animated pulse effect (Tailwind)

#### `Toast.tsx`

- **Opis**: Toast notifications (success, error, info)
- **Props**: `message: string`, `type: 'success' | 'error' | 'info'`
- **Biblioteka**: shadcn/ui toast lub react-hot-toast

---

### 5.7. Hooks

#### `useClientCache.ts`

- **Opis**: Custom hook do zarządzania cache (localStorage + in-memory)
- **API**: `{ data, isLoading, error, revalidate }`
- **Logika**:
  1. Odczyt z in-memory cache
  2. Fallback do localStorage
  3. Render data natychmiast
  4. Fetch w tle (revalidation)
  5. Update cache i state po fetch
- **Parametry**: `key: string`, `fetcher: () => Promise<T>`, `options: { ttl, retry }`

#### `useAuth.ts`

- **Opis**: Hook do dostępu do user context
- **API**: `{ user, session, isLoading, signOut }`
- **Provider**: AuthContext (React Context)

#### `useSubscription.ts`

- **Opis**: Hook do sprawdzania statusu subskrypcji
- **API**: `{ subscription, hasAccess, isLoading }`
- **Logika**: Fetch /api/subscriptions/status, cache w context

#### `useGridState.ts`

- **Opis**: Hook do zarządzania stanem gridu (range, filters, scroll position)
- **API**: `{ range, symbols, setRange, setSymbols, scrollPosition, saveScrollPosition }`
- **Persistence**: Synchronizacja z URL params (TanStack Router) i localStorage

#### `useKeyboardNavigation.ts`

- **Opis**: Hook do obsługi nawigacji klawiaturowej w gridzie
- **API**: `{ focusedCell, handleArrowKeys, handleEnter, handleEscape }`
- **Logika**: Arrow keys → zmiana focusedCell, Enter → otwarcie sidebaru, ESC → zamknięcie

---

### 5.8. Context Providers

#### `AuthProvider.tsx`

- **Opis**: Context dla uwierzytelniania
- **State**: `{ user, session, isLoading }`
- **Akcje**: `signIn`, `signOut`, `signUp`
- **Źródło**: Supabase Auth

#### `SubscriptionProvider.tsx`

- **Opis**: Context dla statusu subskrypcji
- **State**: `{ subscription, hasAccess, isLoading }`
- **Źródło**: GET /api/subscriptions/status (cached)

#### `GridStateProvider.tsx`

- **Opis**: Context dla stanu gridu (opcjonalny, może być zastąpiony przez TanStack Router state)
- **State**: `{ range, symbols, scrollPosition }`
- **Persistence**: URL params + localStorage

---

## 6. Mapowanie API do widoków

### Grid View

- **GET /api/nocodb/grid**: Fetch danych gridu (range, symbols)
- **Cache key**: `gpw:cache:v1:grid|range=${range}|symbols=${symbols}`
- **Retry**: 3 próby z exponential backoff

### Summary Sidebar/Detail

- **GET /api/nocodb/events/:id**: Fetch szczegółów wydarzenia z pierwszym summary
- **Cache key**: `gpw:cache:v1:black_swans|id=${id}`
- **Retry**: 3 próby

### Full Detail View

- **GET /api/nocodb/summaries**: Fetch wszystkich summaries dla wydarzenia
- **Cache key**: `gpw:cache:v1:summaries|symbol=${symbol}|date=${date}`
- **Retry**: 3 próby

### Account Modal

- **GET /api/users/me**: Fetch danych użytkownika i subskrypcji
- **Cache**: React Context (revalidate on mount)

### Subscription Management

- **POST /api/subscriptions/create-checkout**: Inicjacja checkout (redirect do Stripe)
- **POST /api/subscriptions/create-portal**: Otwarcie Stripe Portal (redirect)

---

## 7. Strategia cache i rewalidacji (Client-side)

### 7.1. Cache structure

**In-memory cache** (priorytet):

```typescript
const memoryCache = new Map<string, { data: any; updatedAt: number }>();
```

**LocalStorage cache** (fallback + persistence):

```typescript
// Klucz: gpw:cache:v1:grid|range=week|symbols=CPD,PKN
// Wartość: { data: {...}, updatedAt: "2025-12-12T12:00:00Z", updatedAtEpoch: 1702382400000 }
```

### 7.2. Cache flow (useClientCache)

1. **Component mount**: Call `useClientCache(key, fetcher, options)`
2. **Read from memory**: Check `memoryCache.get(key)`
3. **If hit**: Return data immediately, set `isLoading = false`
4. **If miss**: Read from localStorage
5. **If hit in localStorage**: Parse data, set in memory, return immediately
6. **Start background fetch**: Call `fetcher()` (always, regardless of cache hit)
7. **On fetch success**:
   - Update memory cache
   - Update localStorage
   - Update component state
8. **On fetch error**:
   - Retry with exponential backoff (1s, 2s, 4s)
   - After 3 failures: Set `error` state, show retry button
9. **Eviction**: LRU with maxEntries = 200 (check on every set)

### 7.3. TTL i invalidation

- **TTL**: Brak hard TTL w MVP (zawsze rewalidacja on mount)
- **Manual invalidation**: `clearCache(key)` lub `clearAllCache()` (opcjonalne w UI)
- **Event-based invalidation**: Po webhook Stripe aktualizującym subskrypcję → clear subscription cache

---

## 8. Responsywność i breakpointy

### Breakpointy (Tailwind defaults)

- **Mobile**: < 640px (sm)
- **Tablet**: 640px - 1023px (sm - md)
- **Desktop**: >= 1024px (lg+)

### Grid responsywność

- **Desktop (lg+)**:
  - Pełne dane w komórkach (symbol, %, typ)
  - 20-25 wierszy widocznych
  - Sidebar 33% szerokości po prawej
- **Tablet (md)**:
  - Mniejsza czcionka w komórkach
  - 15-20 wierszy widocznych
  - Sidebar 40% szerokości
- **Mobile (< md)**:
  - Minimalne dane w komórce (symbol + %)
  - Komórki większe dla touch (min 44x44px)
  - 8-12 wierszy widocznych
  - Bottom drawer zamiast sidebaru (70% wysokości)

### Header responsywność

- **Desktop**: Logo | Range | Filters | Avatar (wszystko w jednym wierszu)
- **Mobile**: Logo | Hamburger | Avatar
  - Range i Filters w hamburger menu (drawer)

---

## 9. Dostępność (Accessibility)

### 9.1. Keyboard Navigation

- **Grid**:
  - Tab do wejścia w grid
  - Arrow keys (↑↓←→) do poruszania się między komórkami
  - Enter do otwarcia sidebaru dla focused cell
  - ESC do zamknięcia sidebaru i powrotu do grid
- **Sidebar/Modal**:
  - Focus trap (Tab cycle wewnątrz sidebaru)
  - ESC do zamknięcia
  - Focus powrót do triggering element (grid cell) po zamknięciu
- **Forms**:
  - Tab order logiczny
  - Enter do submitu

### 9.2. ARIA Attributes

- **Grid**:
  - `role="grid"` na kontenerze
  - `role="row"` na wierszach
  - `role="gridcell"` na komórkach
  - `aria-label` na każdej komórce (np. "CPD, 2025-12-10, BLACK_SWAN_DOWN, -15.2%")
  - `aria-selected="true"` na focused cell
- **Sidebar/Modal**:
  - `role="dialog"`
  - `aria-modal="true"`
  - `aria-labelledby` wskazuje na header ID
  - `aria-describedby` wskazuje na summary text ID
- **Buttons**:
  - `aria-label` dla icon buttons (np. close X)
- **Dropdown/Accordion**:
  - `aria-expanded` dla trigger buttons
  - `aria-controls` wskazuje na content ID

### 9.3. Focus Management

- **Sidebar open**: Focus na close button lub pierwszy interaktywny element
- **Sidebar close**: Focus powrót do grid cell który wywołał sidebar
- **Modal open**: Focus na pierwszy element w modal
- **Modal close**: Focus powrót do trigger element (avatar button)

### 9.4. Color Contrast

- Wszystkie teksty z kontrastem min 4.5:1 (WCAG AA)
- Event type colors:
  - BLACK_SWAN_DOWN: red-100 background, red-900 text
  - BLACK_SWAN_UP: green-100 background, green-900 text
  - etc. (sprawdzić kontrast dla każdego)

### 9.5. Screen Reader Support

- Semantic HTML (header, main, section, article)
- Alt text dla wszystkich images (jeśli są)
- ARIA live regions dla dynamicznych komunikatów (toast notifications): `aria-live="polite"`

---

## 10. Performance Optimization

### 10.1. Grid Virtualization

- **Biblioteka**: react-window (VariableSizeGrid) lub @tanstack/react-virtual
- **Cel**: Renderować tylko widoczne wiersze i kolumny (viewport)
- **Próg**: Włączyć wirtualizację dla >= 50 wierszy
- **Overscan**: Renderować +5 wierszy poza viewport dla smooth scrolling

### 10.2. Component Memoization

- **React.memo**: GridCell, SummaryCard, EventHeader (render tylko gdy props się zmieniają)
- **useMemo**: Expensive calculations (np. sorting, filtering danych)
- **useCallback**: Event handlers przekazywane do child components (onCellClick, onClose)

### 10.3. Code Splitting

- **React.lazy**: Lazy load heavy components (Full Detail View, Account Modal)
- **Suspense**: Fallback loaders podczas lazy loading
- **Route-based splitting**: TanStack Router automatycznie splituje routes

### 10.4. Progressive Loading

- **Grid**: Skeleton loaders dla komórek podczas fetch
- **Sidebar**: Skeleton dla summary content podczas fetch
- **Images**: Lazy loading z `loading="lazy"` attribute (jeśli są images)

### 10.5. Bundle Optimization

- **Tree shaking**: Webpack/Vite automatycznie
- **Minimize dependencies**: Używać tylko potrzebnych funkcji z bibliotek (np. lodash-es)
- **Tailwind CSS**: PurgeCSS w production (automatyczne z Tailwind + Astro)

---

## 11. Security Considerations

### 11.1. Client-side

- **No sensitive data in URL**: Unikać auth tokens w URL params
- **Sanitize URL params**: Walidacja wszystkich params przed fetch (Zod)
- **HTTPS only**: Enforce HTTPS w production
- **Secure localStorage**: Nie przechowywać wrażliwych tokenów (Supabase session w httpOnly cookies)
- **XSS prevention**: React automatycznie escapuje, ale uważać na dangerouslySetInnerHTML

### 11.2. Middleware

- **Session validation**: Każde żądanie do protected routes sprawdza Supabase session
- **Subscription check**: Middleware sprawdza `hasAccess` przed renderem Grid/Summaries
- **Rate limiting**: Zaimplementowane w API (60 req/min), UI może pokazać error 429

### 11.3. Deep-linking

- **Permalink protection**: Middleware sprawdza auth + subscription przed dostępem do `/summary/:id`
- **returnUrl validation**: Walidować returnUrl (whitelist dozwolonych paths) przed redirect

---

## 12. Nierozwiązane kwestie i rekomendacje

### 12.1. Nierozwiązane

1. **Account Modal vs dedykowana strona**: MVP używa modal/drawer; można dodać `/account` route w przyszłości jeśli potrzeba więcej funkcji
2. **Cache eviction policy**: Proponowane 200 wpisów LRU; do doprecyzowania po testach wydajnościowych
3. **History API szczegóły**: Jakie dokładnie pola state trzymać (scrollPosition, filters, range) - do ustalenia podczas implementacji
4. **Grid wirtualizacja próg**: Włączyć dla >= 50 wierszy - do weryfikacji performance testem
5. **Animations/Transitions**: Brak specyfikacji dla otwierania/zamykania sidebaru, modal - wdrożyć podstawowe fade/slide transitions (0.3s ease)

### 12.2. Rekomendacje dla następnego etapu

1. **Implementacja w fazach**:
   - **Faza 1**: Auth + Grid View (bez sidebar) + podstawowy cache
   - **Faza 2**: Summary Sidebar + permalink
   - **Faza 3**: Full Detail View + Account Modal
   - **Faza 4**: Checkout flow + Stripe integration
   - **Faza 5**: Polish (accessibility, performance optimization, error handling)

2. **Testing priorities**:
   - E2E: Registration → trial → grid → click cell → sidebar → logout
   - E2E: Permalink flow (niezalogowany → redirect → login → access)
   - Performance: Grid render < 1.5s dla 1-tyg zakresu
   - Accessibility: Keyboard navigation w gridzie i sidebar

3. **Design system**:
   - Utworzyć figma mockups dla kluczowych widoków przed implementacją
   - Ustalić color palette dla event types (testować kontrast)
   - Zdefiniować spacing i typography scale (Tailwind config)

4. **Monitoring (post-MVP)**:
   - Sentry dla error tracking
   - Analytics dla user flows (które eventy najczęściej klikane)
   - Performance monitoring (Lighthouse CI)

---

## 13. Podsumowanie struktury plików (Sugerowana)

```
src/
├── components/
│   ├── layout/
│   │   ├── AppLayout.tsx
│   │   ├── Header.tsx
│   │   └── AvatarMenu.tsx
│   ├── grid/
│   │   ├── VirtualizedGrid.tsx
│   │   ├── GridCell.tsx
│   │   ├── RangeSelector.tsx
│   │   └── TickerFilter.tsx
│   ├── summary/
│   │   ├── SummarySidebar.tsx
│   │   ├── SummaryDrawer.tsx
│   │   ├── SummaryCard.tsx
│   │   ├── EventHeader.tsx
│   │   ├── TrendProbabilityChart.tsx
│   │   └── RecommendedActionCard.tsx
│   ├── account/
│   │   ├── AccountModal.tsx
│   │   ├── AccountDrawer.tsx
│   │   ├── UserInfo.tsx
│   │   ├── SubscriptionStatus.tsx
│   │   └── ManageSubscriptionButton.tsx
│   ├── auth/
│   │   ├── AuthForm.tsx
│   │   └── SupabaseAuthUI.tsx
│   └── ui/ (shadcn/ui components)
│       ├── button.tsx
│       ├── dialog.tsx
│       ├── drawer.tsx
│       └── ...
├── hooks/
│   ├── useClientCache.ts
│   ├── useAuth.ts
│   ├── useSubscription.ts
│   ├── useGridState.ts
│   └── useKeyboardNavigation.ts
├── contexts/
│   ├── AuthProvider.tsx
│   └── SubscriptionProvider.tsx
├── lib/
│   ├── cache.ts (cache utilities)
│   ├── api-client.ts (fetch wrappers)
│   └── utils.ts
├── pages/
│   ├── index.astro (Landing/Home)
│   ├── grid.astro (Grid View)
│   ├── event/
│   │   └── [id].astro (Full Detail View)
│   ├── summary/
│   │   └── [id].astro (Permalink)
│   ├── auth/
│   │   ├── login.astro
│   │   └── register.astro
│   ├── checkout/
│   │   ├── index.astro
│   │   ├── success.astro
│   │   └── cancel.astro
│   └── errors/
│       ├── 404.astro
│       ├── 403.astro
│       └── 500.astro
└── middleware/
    └── index.ts (Auth + Subscription check)
```

---

**Koniec dokumentu architektury UI**
