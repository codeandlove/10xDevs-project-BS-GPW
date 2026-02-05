````markdown
Jestes doswiadczonym programista, ktorego zadaniem jest implementacja nowej funkcjonalnosci w oparciu o szczegolowy plan implementacyjny. Twoim celem jest stworzenie solidnej, dobrze przetestowanej funkcjonalnosci, ktora spełnia wszystkie wymagania biznesowe i techniczne oraz jest zgodna ze standardami projektu.

Najpierw dokladnie przejrzyj wszystkie dostarczony kontekst:

<feature_implementation_plan>
{{feature-plan}} <- plan implementacyjny feature z .agents/features/feature-{{feature-name}}-plan.md
</feature_implementation_plan>

<tech_stack>
@tech-stack.md <- stack technologiczny projektu
</tech_stack>

<prd_reference>
@prd.md <- dokumentacja produktowa i wymagania biznesowe
</prd_reference>

<coding_standards>
@copilot-instructions.md <- standardy kodowania i best practices
</coding_standards>

<implementation_approach>
METODOLOGIA 3x3 - ITERACYJNA IMPLEMENTACJA Z FEEDBACKIEM:

Realizuj maksymalnie 3 kroki z Fazy 2 planu implementacyjnego (sekcja "6.2. Faza 2: Implementacja core functionality"), a nastepnie:

1. Podsumuj krotko co zrobiles (wykonane kroki z planu)
2. Zweryfikuj poprawnosc zmian (sprawdz bledy kompilacji, lintowania)
3. Przetestuj podstawowa funkcjonalnosc (manual smoke test)
4. Opisz plan na 3 kolejne dzialania (nastepne kroki z planu)
5. ZATRZYMAJ prace i czekaj na moj feedback

WAZNE: Nie implementuj wszystkiego na raz. Pracuj iteracyjnie, krok po kroku, zbierajac feedback po kazdej iteracji 3 krokow.

Po zakonczeniu kazdej iteracji czekaj na moje potwierdzenie przed kontynuacja. To pozwala na:

- Wczesne wykrycie problemow i nieporozumien
- Dostosowanie implementacji do ewolwujacych wymagan
- Kontrole jakosci kodu na biezaco
- Lepsze zrozumienie postepow

Ostatnia iteracja powinna zawierac finalna weryfikacje i podsumowanie calej implementacji.
</implementation_approach>

Teraz wykonaj nastepujace kroki, aby zaimplementowac nowa funkcjonalnosc:

1. Analiza planu implementacyjnego:
   - Przeanalizuj sekcje "2. Szczegolowa analiza wymagan" - zrozum wymagania funkcjonalne i niefunkcjonalne
   - Sprawdz sekcje "2.3. User stories i use cases" - poznaj perspektywe uzytkownika
   - Przeanalizuj sekcje "3. Architektura i design" - zrozum flow danych i strukture
   - Przeanalizuj sekcje "5. Rekomendacja i uzasadnienie" - poznaj wybrane podejscie
   - Przeanalizuj sekcje "6.2. Faza 2: Implementacja core functionality" - to Twoja mapa dzialan
   - Zwroc uwage na sekcje "7. Plan weryfikacji i testowania" - jak bedziemy testowac
   - Zapoznaj sie z sekcja "8. Analiza ryzyka i mitigation" - czego unikac

2. Przygotowanie do implementacji (przed pierwsza iteracja):
   - Wykonaj kroki z sekcji "6.1. Faza 1: Przygotowanie" jesli wymagane
   - Upewnij sie, ze rozumiesz wszystkie komponenty wymienione w sekcji "3.4. Komponenty i moduły"
   - Sprawdz sekcje "9. Zgodnosc ze standardami" - pamietaj o requirements
   - Zaplanuj kolejnosc implementacji krokow z sekcji "6.2. Faza 2: Implementacja core functionality"
   - Zidentyfikuj potencjalne blokery lub zaleznosci miedzy krokami

3. Implementacja core functionality (ITERACYJNIE - 3 kroki na raz):
   - Wykonaj maksymalnie 3 kroki z sekcji "6.2. Faza 2: Implementacja core functionality"
   - Dla kazdego kroku:
     - Stworz nowy plik lub zlokalizuj plik do modyfikacji
     - Zaimplementuj dokladnie funkcjonalnosc opisana w "Opis implementacji"
     - Stosuj sie do "Acceptance criteria dla tego kroku"
     - Upewnij sie, ze zmiany sa zgodne z copilot-instructions.md
     - Zastosuj wzorce i patterns zgodnie z architektura projektu
   - Po wykonaniu 3 krokow:
     - Sprawdz bledy kompilacji/lintowania/TypeScript
     - Wykonaj podstawowy manual test (smoke test)
     - Podsumuj wykonane zmiany
     - Opisz plan na kolejne 3 kroki
     - ZATRZYMAJ i czekaj na feedback

4. Typy i interfejsy (gdy dotrze kolej w iteracjach):
   - Jesli plan zawiera sekcje "6.3. Faza 3: Typy i interfejsy"
   - Zaimplementuj wszystkie typy TypeScript zgodnie z planem
   - Upewnij sie, ze typy sa spojne z implementacja
   - Sprawdz, czy TypeScript nie zgłasza bledow typowania
   - Uzywaj strict typing - unikaj 'any'

5. Migracje bazy danych (jesli wymagane):
   - Jesli plan zawiera sekcje "6.4. Faza 4: Migracje bazy danych"
   - Stworz pliki migracji zgodnie z planem
   - Przetestuj migracje na lokalnej bazie (UP i DOWN)
   - Upewnij sie, ze rollback działa poprawnie

6. Integracje (gdy dotrzesz do tej fazy):
   - Jesli plan zawiera sekcje "6.5. Faza 5: Integracje"
   - Zaimplementuj integracje z external APIs lub istniejacymi modulami
   - Dodaj proper error handling dla integration points
   - Dodaj retry logic i timeout handling (jesli dotyczy)

7. Stylizacja i UI polish (jesli UI feature):
   - Jesli plan zawiera sekcje "6.6. Faza 6: Stylizacja i UI polish"
   - Zaimplementuj responsive design
   - Dodaj loading states, error states, empty states
   - Przetestuj na roznych rozmiarach ekranu
   - Zastosuj dark mode (jesli aplikacja wspiera)

8. Testy (gdy dotrzesz do tej fazy w iteracjach):
   - Zaimplementuj testy z sekcji "6.7. Faza 7: Testy"
   - Rozpocznij od testow jednostkowych
     - Testuj wszystkie funkcje/metody
     - Pokryj edge cases i error scenarios
     - Uzywaj proper mocking dla dependencies
   - Dodaj testy integracyjne
     - Testuj flow danych miedzy modulami
     - Testuj integracje z APIs
   - Dodaj testy E2E
     - Testuj user journeys end-to-end
     - Testuj w kontekscie rzeczywistego uzytkownika
   - Upewnij sie, ze wszystkie testy przechodza
   - Sprawdz code coverage (cel: >80% dla nowego kodu)

9. Weryfikacja po implementacji (ostatnia iteracja):
   - Sprawdz kompletna liste z sekcji "7.4. Manual testing checklist"
   - Upewnij sie, ze wszystkie acceptance criteria sa spełnione
   - Przetestuj wszystkie user stories z sekcji "2.3"
   - Przetestuj edge cases wymienione w sekcji "2.4"
   - Sprawdz, czy nie wprowadziles regresji (sekcja "7.5. Regression testing")

10. Zgodnosc ze standardami (weryfikacja w ostatniej iteracji):
    - Sprawdz zgodnosc z sekcja "9.1. Copilot-instructions.md compliance"
    - Zweryfikuj sekcje "9.3. Security checklist"
    - Zweryfikuj sekcje "9.4. Performance checklist"
    - Jesli UI: sprawdz sekcje "9.5. Accessibility checklist"
    - Jesli ma wpływ na SEO: sprawdz sekcje "9.6. SEO checklist"

11. Dokumentacja (jesli wymagana w planie):
    - Zaktualizuj dokumentacje zgodnie z sekcja "10. Dokumentacja"
    - Dodaj changelog entry z sekcji "10.1. Changelog entry"
    - Zaktualizuj README jesli wymagane (sekcja "10.2")
    - Dodaj technical documentation (sekcja "10.3")
    - Przygotuj user documentation jesli wymagane (sekcja "10.4")

KLUCZOWE ZASADY IMPLEMENTACJI:

1. ITERACYJNOSC - pracuj w iteracjach 3x3 (3 kroki, feedback, kolejne 3 kroki)
2. DOKLADNOSC - implementuj zgodnie z planem i wymaganiami
3. ZGODNOSC - przestrzegaj copilot-instructions.md i tech-stack.md
4. QUALITY - kod musi byc clean, readable, maintainable
5. BEZPIECZENSTWO - sprawdzaj security checklist z planu
6. PERFORMANCE - optymalizuj od poczatku (lazy loading, memoization, etc.)
7. DOSTEPNOSC - implementuj zgodnie z WCAG (jesli UI)
8. TESTOWANIE - dodawaj testy na biezaco, nie zostawiaj na koniec
9. WERYFIKACJA - po kazdej iteracji sprawdzaj bledy i testuj funkcjonalnosc
10. FEEDBACK - zawsze zatrzymuj sie po 3 krokach i czekaj na potwierdzenie
11. COMMUNICATION - jasno komunikuj co zrobiles i co planujesz dalej
12. USER PERSPECTIVE - zawsze pamietaj o user experience

STRUKTURA ODPOWIEDZI PO KAZDEJ ITERACJI:

```
## Iteracja N - Podsumowanie

### Wykonane kroki:
- Krok X z planu: [krotki opis co zaimplementowales]
- Krok Y z planu: [krotki opis co zaimplementowales]
- Krok Z z planu: [krotki opis co zaimplementowales]

### Utworzone pliki:
- `sciezka/do/nowego-pliku1.ts` - [krotki opis co zawiera]
- `sciezka/do/nowego-pliku2.tsx` - [krotki opis co zawiera]

### Zmodyfikowane pliki:
- `sciezka/do/istniejacego-pliku.ts` - [krotki opis zmian]

### Weryfikacja:
- Bledy kompilacji: [TAK/NIE - jesli tak, wymien]
- Bledy lintowania: [TAK/NIE - jesli tak, wymien]
- Bledy TypeScript: [TAK/NIE - jesli tak, wymien]
- Smoke test: [PASSED/FAILED - krotki opis co przetestowales]

### Spełnione acceptance criteria:
- [ ] [Kryterium 1 z kroku X]
- [ ] [Kryterium 2 z kroku Y]
- [ ] [Kryterium N z kroku Z]

### Plan na kolejne 3 kroki:
- Krok A: [krotki opis co zrobisz]
- Krok B: [krotki opis co zrobisz]
- Krok C: [krotki opis co zrobisz]

### Pytania/Concerns (jesli sa):
- [Pytanie 1 lub concern - jesli potrzebujesz wyjasnien]

Czekam na Twoje potwierdzenie przed kontynuacja.
```

FINALNE PODSUMOWANIE (ostatnia iteracja):

```
## Implementacja feature - Podsumowanie finalne

### Zrealizowane zadania:
- [Lista wszystkich zaimplementowanych krokow z planu]

### Wszystkie utworzone pliki:
- [Pelna lista nowych plikow z krotkimi opisami]

### Wszystkie zmodyfikowane pliki:
- [Pelna lista zmodyfikowanych plikow z krotkimi opisami]

### Spełnione wymagania:

#### User Stories:
- [User Story 1]: ✅ COMPLETED - [krotki komentarz]
- [User Story 2]: ✅ COMPLETED - [krotki komentarz]

#### Acceptance Criteria:
- [Lista wszystkich spełnionych acceptance criteria z planu]

### Przeprowadzone testy:

#### Unit tests:
- Liczba testow: [X]
- Status: [PASSED/FAILED]
- Code coverage: [X%]

#### Integration tests:
- Liczba testow: [X]
- Status: [PASSED/FAILED]

#### E2E tests:
- Liczba testow: [X]
- Status: [PASSED/FAILED]

#### Manual testing:
- [Lista przetestowanych scenariuszy z checklisty]

### Weryfikacja zgodnosci:

#### Standards compliance:
- Copilot-instructions.md: ✅ [komentarz]
- Tech-stack.md: ✅ [komentarz]

#### Quality checks:
- Security checklist: ✅ [wszystkie punkty spełnione]
- Performance checklist: ✅ [wszystkie punkty spełnione]
- Accessibility checklist: ✅ [wszystkie punkty spełnione - jesli UI]
- SEO checklist: ✅ [wszystkie punkty spełnione - jesli dotyczy]

### Potwierdzenie implementacji:
- Wszystkie wymagania funkcjonalne zaimplementowane: [TAK/NIE]
- Wszystkie acceptance criteria spełnione: [TAK/NIE]
- Wszystkie testy przechodza: [TAK/NIE]
- Brak regresji w istniejacych funkcjonalnosciach: [TAK/NIE]
- Dokumentacja zaktualizowana: [TAK/NIE]

### Metryki:

#### Code quality:
- Linie kodu dodane: [+X]
- Linie kodu usuniete: [-X]
- Code coverage: [X%]
- Liczba plikow: [nowych: X, zmodyfikowanych: Y]

#### Performance (jesli dotyczy):
- Bundle size impact: [+X KB]
- Loading time: [X ms]
- First Contentful Paint: [X ms]

### Monitoring i next steps:

#### Co monitorowac po deploymencie:
- [Lista metryk z sekcji 8.4 planu]

#### Known limitations / Technical debt (jesli sa):
- [Lista swiadomych ograniczen lub technical debt]

#### Sugerowane enhancements (future work):
- [Nice-to-have features z planu, ktore nie weszly do MVP]
- [Pomysly na improvements znalezione podczas implementacji]

### Pozostale zadania (jesli sa):
- [Lista zadan, ktorych nie udalo sie zrealizowac i dlaczego]

Implementacja feature zakonczona i gotowa do code review.
```

DODATKOWE WSKAZOWKI DLA KAZDEJ FAZY:

FAZA: CORE FUNCTIONALITY

- Zacznij od najprostszych komponentow (bottom-up approach)
- Lub zacznij od user-facing components i mockuj dependencies (top-down approach)
- Wybierz podejscie zgodne z planem
- Testuj kazdy komponent oddzielnie zanim go integrujsz
- Uzywaj TypeScript strict mode
- Dodawaj proper JSDoc comments do publicznych APIs

FAZA: TYPY I INTERFEJSY

- Tworz typy blisko miejsca uzycia, chyba ze sa reused
- Uzywaj type guards dla runtime validation
- Unikaj type assertions (as) - preferuj type guards
- Exportuj tylko publiczne typy
- Uzywaj utility types (Pick, Omit, Partial, etc.)

FAZA: INTEGRACJE

- Zawsze dodawaj error handling
- Uzywaj try-catch dla async operations
- Implementuj retry logic dla network requests
- Dodawaj timeout dla external calls
- Loguj errors dla debugging
- Testuj error scenarios

FAZA: STYLIZACJA

- Uzywaj Tailwind utilities zgodnie z copilot-instructions.md
- Testuj responsive design na mobile/tablet/desktop
- Implementuj dark mode jesli aplikacja wspiera
- Dodaj proper loading states (skeletons preferowane nad spinners)
- Implementuj empty states i error states
- Testuj accessibility z keyboard navigation

FAZA: TESTY

- Unit tests: testuj logic w izolacji, mockuj dependencies
- Integration tests: testuj interactions miedzy modulami
- E2E tests: testuj user journeys w real browser
- Uzywaj AAA pattern (Arrange, Act, Assert)
- Testuj happy path i edge cases
- Testuj error scenarios
- Uzywaj descriptive test names
- Cel: >80% code coverage dla nowego kodu

ANTI-PATTERNS DO UNIKANIA:

1. NIE implementuj wszystkiego na raz - pracuj iteracyjnie
2. NIE skipuj testow - pisz testy na biezaco
3. NIE ignoruj TypeScript errors - napraw je od razu
4. NIE hardcoduj values - uzywaj config/constants
5. NIE commituj console.logs - usun debug code
6. NIE kopiuj-wklej kodu - reusuj components/functions
7. NIE uzywaj 'any' - uzywaj proper typing
8. NIE skipuj error handling - zawsze obsluguj errors
9. NIE zapomnij o accessibility - implementuj od poczatku
10. NIE skipuj code review checklist - sprawdz przed finalem

PAMIETAJ:

Nie implementuj wszystkiego na raz. Pracuj krok po kroku w iteracjach 3x3. To pozwala na:

- Kontrole jakosci na kazdym etapie
- Wczesne wykrycie problemow i nieporozumien
- Łatwiejsze debugowanie (mniejsze changesets)
- Lepsze code reviews (mniejsze PRs)
- Mozliwosc pivotu jesli wymagania sie zmienia
- Lepsza komunikacje z team

Zawsze czekaj na feedback przed kontynuacja kolejnej iteracji. Komunikuj jasno co zrobiles, co działa, co wymaga uwagi. Pytaj o clarifications gdy cos nie jest jasne.

Success tego feature zalezny od quality implementacji, nie od szybkosci. Better slow and solid than fast and broken.
````
