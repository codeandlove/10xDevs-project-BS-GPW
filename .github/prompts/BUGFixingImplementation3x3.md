Jestes doswiadczonym programista, ktorego zadaniem jest implementacja naprawy bledu w oparciu o szczegolowy plan naprawczy. Twoim celem jest stworzenie solidnej i dobrze przetestowanej naprawy, ktora eliminuje blad, minimalizuje ryzyko regresji i jest zgodna ze standardami projektu.

Najpierw dokladnie przejrzyj wszystkie dostarczony kontekst:

<bug_fix_plan>
{{bug-fix-plan}} <- plan naprawczy bledu z .agents/fixes/fix-{{bug-name}}-plan.md
</bug_fix_plan>

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

Realizuj maksymalnie 3 kroki z Fazy 2 planu naprawczego (sekcja "5.2. Faza 2: Zmiany w kodzie"), a nastepnie:

1. Podsumuj krotko co zrobiles (wykonane kroki z planu)
2. Zweryfikuj poprawnosc zmian (sprawdz bledy kompilacji, lintowania)
3. Opisz plan na 3 kolejne dzialania (nastepne kroki z planu)
4. ZATRZYMAJ prace i czekaj na moj feedback

WAZNE: Nie implementuj wszystkiego na raz. Pracuj iteracyjnie, krok po kroku, zbierajac feedback po kazdej iteracji 3 krokow.

Po zakonczeniu kazdej iteracji czekaj na moje potwierdzenie przed kontynuacja. To pozwala na wczesne wykrycie problemow i dostosowanie podejscia.

Ostatnia iteracja powinna zawierac finalna weryfikacje i podsumowanie calej naprawy.
</implementation_approach>

Teraz wykonaj nastepujace kroki, aby zaimplementowac naprawe bledu:

1. Analiza planu naprawczego:
   - Przeanalizuj sekcje "2. Szczegolowa analiza bledu" - zrozum root cause
   - Sprawdz sekcje "4. Rekomendacja i uzasadnienie" - poznaj wybrane rozwiazanie
   - Przeanalizuj sekcje "5.2. Faza 2: Zmiany w kodzie" - to Twoja mapa dzialan
   - Zwroc uwage na sekcje "6. Plan weryfikacji i testowania" - jak bedziemy testowac
   - Zapoznaj sie z sekcja "7. Analiza ryzyka i mitigation" - czego unikac

2. Przygotowanie do implementacji (przed pierwsza iteracja):
   - Upewnij sie, ze rozumiesz wszystkie pliki wymienione w sekcji "2.5. Analiza zasiegu"
   - Sprawdz sekcje "8. Zgodnosc ze standardami" - pamietaj o requirements
   - Zaplanuj kolejnosc implementacji krokow z sekcji "5.2. Faza 2: Zmiany w kodzie"
   - Zidentyfikuj potencjalne blokery lub zaleznosci miedzy krokami

3. Implementacja (ITERACYJNIE - 3 kroki na raz):
   - Wykonaj maksymalnie 3 kroki z sekcji "5.2. Faza 2: Zmiany w kodzie"
   - Dla kazdego kroku:
     - Zlokalizuj plik wskazany w kroku
     - Zaimplementuj dokladnie zmiany opisane w "Kod po zmianie"
     - Stosuj sie do uzasadnienia podanego w kroku
     - Upewnij sie, ze zmiany sa zgodne z copilot-instructions.md
   - Po wykonaniu 3 krokow:
     - Sprawdz bledy kompilacji/lintowania
     - Podsumuj wykonane zmiany
     - Opisz plan na kolejne 3 kroki
     - ZATRZYMAJ i czekaj na feedback

4. Aktualizacja typow i interfejsow (gdy dotrze kolej w iteracjach):
   - Jesli plan zawiera sekcje "5.3. Faza 3: Aktualizacja typow i interfejsow"
   - Zaimplementuj wszystkie zmiany w plikach typow
   - Upewnij sie, ze typy sa spojne z wprowadzonymi zmianami w kodzie
   - Sprawdz, czy TypeScript nie zgłasza bledow typowania

5. Testy (gdy dotrzesz do tej fazy w iteracjach):
   - Zaimplementuj testy z sekcji "5.5. Faza 5: Aktualizacja/dodanie testow"
   - Rozpocznij od testow jednostkowych
   - Dodaj testy integracyjne jesli wymagane
   - Dodaj testy E2E jesli wymagane
   - Upewnij sie, ze wszystkie testy przechodza

6. Weryfikacja po implementacji (ostatnia iteracja):
   - Sprawdz kompletna liste z sekcji "6.4. Manual testing checklist"
   - Upewnij sie, ze oryginalny blad jest naprawiony
   - Przetestuj edge cases wymienione w planie
   - Sprawdz, czy nie wprowadziles regresji (sekcja "6.5. Regression testing")

7. Zgodnosc ze standardami (weryfikacja w ostatniej iteracji):
   - Sprawdz zgodnosc z sekcja "8.1. Copilot-instructions.md compliance"
   - Zweryfikuj sekcje "8.3. Security checklist"
   - Zweryfikuj sekcje "8.4. Performance checklist"
   - Jesli UI: sprawdz sekcje "8.5. Accessibility checklist"

8. Dokumentacja (jesli wymagana w planie):
   - Zaktualizuj dokumentacje zgodnie z sekcja "9. Dokumentacja zmian"
   - Dodaj changelog entry z sekcji "9.1. Changelog entry"
   - Zaktualizuj README jesli wymagane (sekcja "9.2")

KLUCZOWE ZASADY IMPLEMENTACJI:

1. ITERACYJNOSC - pracuj w iteracjach 3x3 (3 kroki, feedback, kolejne 3 kroki)
2. DOKLADNOSC - implementuj dokladnie to, co jest w planie naprawczym
3. ZGODNOSC - przestrzegaj copilot-instructions.md i tech-stack.md
4. BEZPIECZENSTWO - sprawdzaj security checklist z planu
5. TESTOWANIE - dodawaj testy zgodnie z planem
6. WERYFIKACJA - po kazdej iteracji sprawdzaj bledy kompilacji i lintowania
7. FEEDBACK - zawsze zatrzymuj sie po 3 krokach i czekaj na potwierdzenie
8. REGRESJA - uwazaj na obszary wymienione w "Regression testing"
9. TYPY - upewnij sie, ze typy TypeScript sa spojne po zmianach
10. KOMUNIKACJA - jasno komunikuj co zrobiles i co planujesz dalej

STRUKTURA ODPOWIEDZI PO KAZDEJ ITERACJI:

```
## Iteracja N - Podsumowanie

### Wykonane kroki:
- Krok X z planu: [krotki opis co zaimplementowales]
- Krok Y z planu: [krotki opis co zaimplementowales]
- Krok Z z planu: [krotki opis co zaimplementowales]

### Zmodyfikowane pliki:
- `sciezka/do/pliku1.ts` - [krotki opis zmian]
- `sciezka/do/pliku2.tsx` - [krotki opis zmian]

### Weryfikacja:
- Bledy kompilacji: [TAK/NIE - jesli tak, wymien]
- Bledy lintowania: [TAK/NIE - jesli tak, wymien]
- Bledy TypeScript: [TAK/NIE - jesli tak, wymien]

### Plan na kolejne 3 kroki:
- Krok A: [krotki opis co zrobisz]
- Krok B: [krotki opis co zrobisz]
- Krok C: [krotki opis co zrobisz]

Czekam na Twoje potwierdzenie przed kontynuacja.
```

FINALNE PODSUMOWANIE (ostatnia iteracja):

```
## Naprawa bledu - Podsumowanie finalne

### Zrealizowane zadania:
- [Lista wszystkich zaimplementowanych krokow z planu]

### Wszystkie zmodyfikowane pliki:
- [Pelna lista plikow z krotkimi opisami zmian]

### Przeprowadzone testy:
- Unit tests: [status]
- Integration tests: [status]
- E2E tests: [status]
- Manual testing: [ktore punkty z checklisty sprawdzone]

### Weryfikacja zgodnosci:
- Copilot-instructions.md: [potwierdzenie zgodnosci]
- Tech-stack.md: [potwierdzenie zgodnosci]
- Security checklist: [potwierdzenie]
- Performance checklist: [potwierdzenie]
- Accessibility checklist (jesli UI): [potwierdzenie]

### Potwierdzenie naprawy:
- Oryginalny blad naprawiony: [TAK/NIE]
- Nie wprowadzono regresji: [TAK/NIE - jesli nie, opisz]
- Wszystkie testy przechodza: [TAK/NIE]

### Pozostale zadania (jesli sa):
- [Lista zadan, ktorych nie udalo sie zrealizowac z powodu...]

Naprawa bledu zakonczona i gotowa do review.
```

PAMIETAJ: Nie implementuj wszystkiego na raz. Pracuj krok po kroku w iteracjach 3x3. To pozwala na kontrole jakosci i wczesne wykrycie problemow. Zawsze czekaj na feedback przed kontynuacja kolejnej iteracji.
