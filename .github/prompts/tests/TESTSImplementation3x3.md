Twoim zadaniem jest zaimplementowanie testów automatycznych w oparciu o podany plan testów i zasady testowania. Twoim celem jest stworzenie kompleksowej, szczegółowej i dokładnej implementacji testów, która jest zgodna z dostarczonym planem, poprawnie pokrywa wszystkie scenariusze testowe, weryfikuje kluczowe funkcjonalności i zapewnia wysoką jakość kodu.

Najpierw przejrzyj plan testów:

<test_plan>
{{test-plan}}
</test_plan>

Teraz przejrzyj zasady testowania i konfigurację narzędzi:

<testing_rules>
{{instructions}}
</testing_rules>

Przejrzyj zdefiniowane typy (jeśli dostępne):

<types>
{{types.md}}
</types>

Wdrażaj plan testów zgodnie z następującym podejściem:

<implementation_approach>
Realizuj maksymalnie 3 kroki planu testów, podsumuj krótko co zrobiłeś i opisz plan na 3 kolejne działania - zatrzymaj w tym momencie pracę i czekaj na mój feedback.
</implementation_approach>

Dokładnie przeanalizuj plan testów i zasady. Zwróć szczególną uwagę na typy testów (jednostkowe, integracyjne, E2E), scenariusze testowe, metryki wydajności i kryteria akceptacji opisane w planie.

Wykonaj następujące kroki, aby zaimplementować testy:

1. Konfiguracja środowiska testowego:
   - Zidentyfikuj narzędzia testowe wymienione w planie (Vitest, Playwright, MSW, etc.)
   - Skonfiguruj środowisko testowe zgodnie z wymaganiami projektu
   - Upewnij się, że wszystkie zależności są zainstalowane i poprawnie skonfigurowane
   - Zweryfikuj strukturę folderów testowych i konwencje nazewnictwa

2. Testy jednostkowe (Unit Tests):
   - Zidentyfikuj funkcje utility, serwisy i hooki wymienione w planie do przetestowania
   - Implementuj testy jednostkowe dla logiki biznesowej, walidacji i transformacji danych
   - Pokryj edge case'y i scenariusze błędów
   - Upewnij się, że testy są izolowane i wykorzystują mocki/stuby gdzie potrzeba
   - Dąż do osiągnięcia określonego poziomu pokrycia kodu (coverage)

3. Testy integracyjne (Integration Tests):
   - Zidentyfikuj punkty integracji: API, baza danych, cache, zewnętrzne serwisy
   - Implementuj testy integracji API z wykorzystaniem MSW lub podobnych narzędzi
   - Testuj przepływ danych między warstwami aplikacji
   - Weryfikuj zachowanie retry logic, rate limiting i error handling
   - Testuj integrację z cache (memory, localStorage) i mechanizmy rewalidacji

4. Testy End-to-End (E2E):
   - Zidentyfikuj kluczowe user journeys wymienione w planie
   - Implementuj scenariusze E2E z wykorzystaniem Playwright
   - Pokryj krytyczne ścieżki użytkownika od początku do końca
   - Weryfikuj navigation, routing i zarządzanie stanem
   - Testuj interakcje użytkownika: kliknięcia, nawigację klawiaturą, formularze

5. Testy wydajnościowe (Performance Tests):
   - Zidentyfikuj metryki wydajności określone w planie (FCP, LCP, TTI, CLS)
   - Implementuj testy wydajności dla krytycznych operacji (renderowanie gridu, ładowanie danych)
   - Weryfikuj budżety wydajnościowe określone w wymaganiach
   - Testuj cache hit rate i czas dostępu do cache
   - Monitoruj wykorzystanie pamięci i potencjalne wycieki

6. Testy dostępności (Accessibility Tests):
   - Weryfikuj nawigację klawiaturową (Tab, Arrow keys, Enter, Escape)
   - Testuj atrybuty ARIA (aria-label, aria-expanded, role, aria-modal)
   - Sprawdź focus management i focus trap w modalach/sidebar
   - Weryfikuj kontrast kolorów i widoczność focus indicators
   - Wykorzystaj narzędzia automatyczne (axe-core) do wykrywania problemów

7. Testy bezpieczeństwa (Security Tests):
   - Weryfikuj mechanizmy autentykacji i autoryzacji
   - Testuj middleware guards i redirect logic
   - Sprawdź rate limiting i walidację tokenów JWT
   - Weryfikuj czyszczenie cache przy wylogowaniu (GDPR)
   - Testuj ochronę przed SQL injection i XSS

8. Dokumentacja i raportowanie:
   - Dokumentuj scenariusze testowe i oczekiwane rezultaty
   - Implementuj asercje zgodne z planem testów
   - Upewnij się, że komunikaty błędów są jasne i pomocne
   - Generuj raporty pokrycia kodu i wyniki testów
   - Dokumentuj znalezione defekty zgodnie z procedurami projektu

W trakcie całego procesu implementacji testów należy ściśle przestrzegać dostarczonych zasad testowania. Zasady te mają pierwszeństwo przed wszelkimi ogólnymi najlepszymi praktykami, które mogą być z nimi sprzeczne.

Upewnij się, że twoja implementacja testów dokładnie odzwierciedla dostarczony plan testów i przestrzega wszystkich określonych zasad. Zwróć szczególną uwagę na pokrycie wszystkich scenariuszy testowych, weryfikację metryk wydajności, dostępność i bezpieczeństwo.
