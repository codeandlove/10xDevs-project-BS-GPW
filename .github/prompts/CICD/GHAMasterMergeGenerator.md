Jesteś specjalistą GitHub Actions w stacku {{@tech-stack.md}} oraz {{@package.json}}

Utwórz scenariusz "master-merge.yml" na podstawie {{@github-action-helper.md}} dla workflow GitHub Actions,
który będzie uruchamiany przy każdym merge do brancha master na githubie.

Workflow:
Scenariusz "master-merge.yml" powinien działać następująco:

- Wykonać build aplikacji
- Uruchomić testy jednostkowe i e2e równolegle
- Wdrożyć aplikację na środowisko produkcyjne jeśli wszystkie testy przejdą pomyślnie
- Dodać komentarz do PR z informacją o wdrożeniu

Dodatkowe uwagi:

- deployment na środowisko produkcyjne uruchamia się tylko kiedy poprzedni zestaw zadań przejdzie poprawnie
- unit-test i e2e-test uruchamiają się równolegle
- w jobie e2e pobieraj przeglądarki wg @playwright.config.ts
- w jobie e2e ustaw środowisko "integration" i zmienne z sekretów wg {{@.env.example}}
- połącz się z serwerem produkcyjnym używając sekretów z GitHub Secrets
- wyślij build na serwer produkcyjny za pomocą rsync lub innego narzędzia wskazanego w {{@github-action-helper.md}}
- wykonaj restart pm2 na serwerze produkcyjnym po wdrożeniu

Wygeneruj kompletny plik YAML zgodnie z powyższymi wytycznymi i zapisz go w lokacji ".github/workflows/master-merge.yml".
