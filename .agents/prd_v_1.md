# Dokument wymagań produktu (PRD) - 10xDevs Grid Analytics MVP

## 1. Przegląd produktu

Projekt: 10xDevs Grid Analytics MVP

Opis: Aplikacja webowa do przeglądania danych rynkowych w formie grida z możliwością filtrowania i wyboru zakresu dat w oddzielnych panelach. Dla wybranej instancji danych użytkownik widzi ostatnie podsumowanie AI (summary_ai) w panelu bocznym, a po rozwinięciu na pełny ekran może przejrzeć wszystkie dostępne podsumowania jeden pod drugim. Dostęp kontrolowany przez Supabase Auth z rolami demo, Paid i master. Po wygaśnięciu okresu demo użytkownik widzi paywall z jednym CTA prowadzącym do płatności Stripe. Dane ładowane są przez API NocoDB z podejściem cache-first i leniwym dociąganiem. Język interfejsu wyłącznie polski. Telemetria GA/GTM poza zakresem MVP.

## 2. Problem użytkownika

Użytkownicy potrzebują szybkiego, przejrzystego widoku danych rynkowych z możliwością zawężania zakresu czasowego i filtrowania po kluczowych atrybutach. Dodatkowo chcą szybko uzyskać syntetyczne podsumowanie AI dla aktualnie analizowanej instancji bez nadmiernego obciążania interfejsu. Część użytkowników korzysta w trybie demo, po którym powinni mieć prostą ścieżkę do zakupu dostępu płatnego. Aplikacja powinna działać wydajnie, zapewniać spójny wzorzec błędu i wyświetlać treści po polsku.

## 3. Wymagania funkcjonalne

3.1. Panele sterujące

- Oddzielny panel Filtry uruchamiany własnym przyciskiem.
- Oddzielny panel Daty uruchamiany własnym przyciskiem, służący do ustawiania zakresu czasowego grida.
- Panel Filtry: rekomendowane pola do potwierdzenia (np. indeks, typ zmienności; rozszerzenia możliwe po weryfikacji atrybutów NocoDB).

  3.2. Widok danych

- Grid danych pobieranych z NocoDB przez API.
- Strategia cache-first; dane historyczne (wczoraj, przedwczoraj) traktowane jako niezmienne.
- Leniwe dociąganie danych podczas interakcji użytkownika.
- Stan danych zarządzany w React Context, współdzielony między komponentami.

  3.3. Podsumowania AI (summary_ai)

- Dla danej instancji domyślnie wyświetlane jest ostatnie podsumowanie AI w panelu bocznym zajmującym około 1/3 szerokości ekranu.
- Po kliknięciu „więcej” otwierany jest widok pełnoekranowy, który ładuje i wyświetla wszystkie dostępne podsumowania jeden pod drugim.
- Leniwe wczytywanie pozostałych podsumowań dopiero w widoku pełnym.

  3.4. Dostęp i role

- Uwierzytelnianie i autoryzacja przez Supabase Auth.
- Role: demo (pełen dostęp w okresie próbnym), Paid (pełen dostęp po opłaceniu), master (pełen dostęp bez płatności).
- Po zakończeniu okresu demo użytkownik widzi wyłącznie ekran paywall z jednym CTA kierującym do Stripe Checkout.

  3.5. Płatności

- Integracja z Stripe Checkout jako ścieżka konwersji z paywall.
- Po udanej płatności aktualizacja statusu użytkownika do roli Paid (szczegóły integracji technicznej w backlogu: webhooki, mapowanie ról).

  3.6. Obsługa błędów i stany bez danych

- Jeden spójny widok błędu dla braku danych i awarii pobierania.
- Czytelny komunikat po polsku, możliwość ponowienia próby.

  3.7. Język interfejsu

- Całość interfejsu w języku polskim.

  3.8. Analityka

- GA/GTM możliwe w późniejszej fazie; poza zakresem MVP.

## 4. Granice produktu

Zakres MVP

- Grid danych z NocoDB z panelami Filtry i Daty.
- Panel boczny z ostatnim summary_ai i widok pełny z wszystkimi podsumowaniami.
- Supabase Auth z rolami demo, Paid, master; egzekwowanie dostępu.
- Paywall z jednym CTA do Stripe po wygaśnięciu demo.
- Strategia cache-first dla danych, leniwe dociąganie, zarządzanie stanem w React Context.
- Spójny widok błędu i komunikaty po polsku.

Poza zakresem MVP

- GA/GTM.
- Zaawansowane raportowanie analityczne.
- Rozbudowane taksonomie filtrów ponad podstawowy zestaw (do potwierdzenia po weryfikacji danych).
- Międzynarodowe wersje językowe.

Otwarte kwestie

- Dokładna lista pól filtrów; wymaga potwierdzenia na podstawie schematu NocoDB.
- KPI konwersji i cele liczbowo; do ustalenia.
- Parametry okresu demo (czas trwania, zasady wygaśnięcia) i pełne detale integracji Stripe ↔ Supabase (webhooki, mapowanie ról).
- Polityka cache (TTL, rewalidacja w tle) dla najnowszych danych.
- Projekt treści widoku błędu (copy, kody błędów, akcje).

## 5. Historyjki użytkowników

US-001
Tytuł: Logowanie i role
Opis: Jako użytkownik chcę logować się przez Supabase i mieć przypisaną rolę (demo, Paid, master), aby uzyskać odpowiedni poziom dostępu.
Kryteria akceptacji:

- Można utworzyć i zalogować konto w Supabase.
- Po zalogowaniu aplikacja odczytuje rolę i stosuje odpowiednie uprawnienia.
- Użytkownik z rolą master ma pełen dostęp bez płatności.

US-002
Tytuł: Paywall po wygaśnięciu demo
Opis: Jako użytkownik, któremu wygasł dostęp demo, widzę ekran paywall z jednym CTA do Stripe, aby wykupić subskrypcję.
Kryteria akceptacji:

- Po wygaśnięciu demo aplikacja blokuje dostęp do funkcji.
- Wyświetlany jest ekran z jasnym komunikatem i przyciskiem CTA do Stripe Checkout.
- Po udanym powrocie ze Stripe rola zmienia się na Paid, dostęp zostaje przywrócony.

US-003
Tytuł: Widok grida danych
Opis: Jako użytkownik chcę widzieć grid z danymi z NocoDB, aby analizować informacje w czasie.
Kryteria akceptacji:

- Dane są pobierane z API NocoDB i prezentowane w gridzie.
- Przy pierwszym wejściu stosowana jest strategia cache-first.
- Gdy brak danych, pokazywany jest spójny widok błędu/empty state.

US-004
Tytuł: Panel Filtry
Opis: Jako użytkownik chcę otworzyć panel Filtry i zawęzić zestaw danych po dostępnych atrybutach.
Kryteria akceptacji:

- Panel Filtry otwierany i zamykany osobnym przyciskiem.
- Dostępne co najmniej pola: indeks, typ zmienności (plus ewentualne inne po potwierdzeniu).
- Zastosowanie filtrów odświeża grid zgodnie z cache-first i dociąganiem brakujących danych.

US-005
Tytuł: Panel Daty
Opis: Jako użytkownik chcę ustawić zakres dat w osobnym panelu, aby sterować obrazowaniem grida.
Kryteria akceptacji:

- Panel Daty otwierany i zamykany osobnym przyciskiem.
- Zakres dat ogranicza zapytania i widok grida.
- Ustawienia są respektowane przez cache i logikę pobierania.

US-006
Tytuł: Ostatnie podsumowanie AI w panelu bocznym
Opis: Jako użytkownik chcę zobaczyć ostatnie summary_ai w panelu bocznym o szerokości około 1/3 ekranu.
Kryteria akceptacji:

- Panel boczny otwierany z widoku grida; pokazuje jedno ostatnie podsumowanie.
- Gdy brak podsumowania, wyświetlany jest stosowny komunikat.
- Panel jest responsywny i dostępny (klawiatura, aria-attributes).

US-007
Tytuł: Pełny widok wszystkich podsumowań
Opis: Jako użytkownik chcę po kliknięciu „więcej” zobaczyć wszystkie podsumowania dla instancji w widoku pełnoekranowym.
Kryteria akceptacji:

- Widok pełny ładuje resztę podsumowań leniwie.
- Podsumowania wyświetlane jeden pod drugim w kolejności chronologicznej lub logicznej.
- Możliwość powrotu do widoku z panelem bocznym.

US-008
Tytuł: Obsługa błędów i braków danych
Opis: Jako użytkownik chcę zobaczyć jeden spójny widok błędu w przypadku awarii lub braku danych.
Kryteria akceptacji:

- Komunikat po polsku z możliwością ponowienia próby.
- Widok błędu pojawia się w sekcjach grida i podsumowań.
- Zdarzenia błędów są opcjonalnie logowane lokalnie dla diagnostyki.

US-009
Tytuł: Wydajność i cache-first
Opis: Jako użytkownik chcę szybkie ładowanie danych oraz responsywne panele.
Kryteria akceptacji:

- Dane historyczne są serwowane z cache bez zbędnych odświeżeń.
- Interakcje paneli nie blokują UI; leniwe dociąganie działa w tle.
- Czas TTI i panele spełniają ustalone progi wydajnościowe.

US-010
Tytuł: Integracja Stripe Checkout
Opis: Jako użytkownik chcę bezpiecznie opłacić dostęp przez Stripe i wrócić do aplikacji z aktywną subskrypcją.
Kryteria akceptacji:

- Kliknięcie CTA przekierowuje do Stripe Checkout.
- Po udanej płatności rola w systemie zmienia się na Paid.
- W przypadku niepowodzenia użytkownik wraca do paywall z komunikatem.

US-011
Tytuł: Dostęp master
Opis: Jako użytkownik z rolą master chcę mieć pełny dostęp bez konieczności płatności.
Kryteria akceptacji:

- Logowanie jako master pomija paywall.
- Wszystkie funkcje są dostępne niezależnie od statusu subskrypcji.

US-012
Tytuł: Nawigacja i dostępność paneli
Opis: Jako użytkownik chcę wygodnie nawigować między gridem, panelami i widokami podsumowań z zachowaniem zasad dostępności.
Kryteria akceptacji:

- Panele mają poprawne aria-expanded, aria-controls i focus management.
- Skrót klawiaturowy lub przycisk do zamykania paneli (np. Esc).

US-013
Tytuł: Sesyjny kontekst danych
Opis: Jako użytkownik chcę, aby moje filtry i zakres dat utrzymywały się podczas nawigacji.
Kryteria akceptacji:

- React Context przechowuje bieżące ustawienia do czasu odświeżenia/wylogowania.
- Zmiany są propagowane do widoków bez przeładowania strony.

US-014
Tytuł: Granice skrajne pobierania
Opis: Jako użytkownik chcę, aby aplikacja poprawnie reagowała na skrajne warunki sieci i brak odpowiedzi.
Kryteria akceptacji:

- Timeout zapytań skutkuje spójnym widokiem błędu.
- Retry ograniczony i kontrolowany, bez pętli nieskończonych.

US-015
Tytuł: Uwierzytelnianie i autoryzacja zabezpieczająca dostęp
Opis: Jako system chcę egzekwować dostęp do zasobów na podstawie roli użytkownika przez Supabase Auth.
Kryteria akceptacji:

- Próba wejścia bez autoryzacji skutkuje przekierowaniem do logowania lub paywall.
- Zasoby API respektują rolę użytkownika.

US-016
Tytuł: Pełny język polski
Opis: Jako użytkownik chcę, aby interfejs był w pełni po polsku.
Kryteria akceptacji:

- Wszystkie komunikaty, etykiety i błędy w języku polskim.

## 6. Metryki sukcesu

- Konwersja z demo do Paid: KPI do ustalenia; mierzone przez liczbę kliknięć CTA i udanych checkoutów.
- Wydajność: p75 TTFB/TTI widoku grida < 2.5 s; p75 interakcje paneli < 100 ms po rozgrzaniu cache.
- Stabilność: odsetek błędów pobierania < 1% p75; skuteczne wyświetlenie widoku błędu w 100% przypadków braku danych.
- Użycie funkcji: CTR otwarcia panelu podsumowań i CTR „więcej”.
- Cache hit ratio dla danych historycznych: docelowo > 80% (do weryfikacji po wdrożeniu).
