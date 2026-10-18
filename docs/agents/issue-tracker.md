# Issue tracker: GitHub

Attività e specifiche di FinanceBot vivono nelle GitHub Issues. Usa la CLI `gh` dalla directory del clone: ricava il repository dal remote Git (attualmente `roby222/financebot`).

## Autenticazione

Se `gh` non è autenticato ma Git dispone già di credenziali per questo repository, recuperale tramite `git credential fill` e passa il token come `GH_TOKEN` soltanto al processo `gh`. Questa modalità usa i permessi già concessi anche quando `gh auth login` richiede ulteriori scope. Mantieni il token in memoria, senza stamparlo o salvarlo nei file del progetto. Se le credenziali non consentono l'operazione richiesta, segnala il permesso mancante.

## Convenzioni

- Crea una issue con `gh issue create --title "..." --body-file <file>`. Prepara il corpo in un file temporaneo, preservando le interruzioni di riga.
- Leggi una issue con `gh issue view <numero> --json number,title,body,labels,comments`.
- Elenca le issue con `gh issue list --state open --json number,title,body,labels,assignees`, aggiungendo i filtri `--label` e `--state` pertinenti.
- Commenta con `gh issue comment <numero> --body-file <file>`.
- Aggiungi o rimuovi etichette con `gh issue edit <numero> --add-label "..."` oppure `--remove-label "..."`. Per il triage usa `docs/agents/triage-labels.md`.
- Chiudi una issue con `gh issue close <numero>`, dopo aver documentato l'esito.
- Quando una skill chiede di pubblicare nel tracker, crea una GitHub Issue; quando chiede il ticket pertinente, leggilo con `gh issue view`.

## Pull requests as a triage surface

**PRs as a request surface: no.**

Questa impostazione governa l'inclusione delle PR esterne nella coda di triage. Si può modificare in questo file.
GitHub condivide la numerazione fra issue e PR: per un riferimento ambiguo, prova `gh pr view <numero>` e, se non identifica una PR, `gh issue view <numero>`.

## Sotto-issue e dipendenze

Usa le relazioni native di GitHub. Ricava l'ID numerico interno di una issue con `gh api repos/{owner}/{repo}/issues/<numero> --jq .id`: è distinto dal numero visibile e dal `node_id`.

- Collega una sotto-issue con `gh api --method POST repos/{owner}/{repo}/issues/<padre>/sub_issues -F sub_issue_id=<id-interno-figlio>`.
- Aggiungi un blocco con `gh api --method POST repos/{owner}/{repo}/issues/<ticket>/dependencies/blocked_by -F issue_id=<id-interno-bloccante>`.
- Se le sotto-issue non sono disponibili, inserisci `Part of #<padre>` all'inizio del corpo del figlio e aggiungilo alla lista attività del padre.
- Se le dipendenze non sono disponibili, inserisci `Blocked by: #<numero>, #<numero>` all'inizio del corpo del ticket. Il ticket è sbloccato quando tutti i bloccanti sono chiusi.

## Wayfinding

Per `/wayfinder`, la mappa è una issue con etichetta `wayfinder:map` e sezioni Notes, Decisions-so-far e Fog.

- I ticket sono sotto-issue della mappa, con etichette `wayfinder:research`, `wayfinder:prototype`, `wayfinder:grilling` o `wayfinder:task`. Crea queste etichette quando servono.
- Per scegliere il prossimo ticket, considera i figli aperti nell'ordine della mappa; escludi quelli assegnati o con bloccanti aperti. Per le dipendenze native consulta `issue_dependencies_summary.blocked_by`; per il ripiego testuale verifica lo stato dei riferimenti `Blocked by`.
- Rivendica il ticket con `gh issue edit <numero> --add-assignee @me`, come prima modifica della sessione wayfinder.
- Alla risoluzione, commenta l'esito, chiudi il ticket e aggiungi una sintesi con link a Decisions-so-far della mappa.
