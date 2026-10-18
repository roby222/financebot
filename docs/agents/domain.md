# Domain docs

FinanceBot usa un unico contesto di dominio (single-context).

## Prima di esplorare il codice

Leggi `GLOSSARY.md` alla radice e le decisioni in `docs/adr/` pertinenti all'area di lavoro.

Se questi documenti non esistono, prosegui senza segnalare l'assenza o proporre di crearli in anticipo. La skill `domain-modeling`, anche tramite `grill-with-docs` e `improve-codebase-architecture`, li crea quando vengono definiti termini o decisioni concreti.

## Posizione dei documenti

- `GLOSSARY.md`: vocabolario del progetto.
- `docs/adr/NNNN-titolo.md`: decisioni architetturali numerate.

I percorsi sono relativi alla radice del repository.

## Vocabolario e decisioni

Usa i termini del glossario nei titoli delle issue, nelle proposte, nelle ipotesi e nei nomi dei test. Se manca un concetto, verifica prima se corrisponde a un termine già definito; segnala eventuali lacune reali per `domain-modeling`.

Quando una proposta contraddice una decisione architetturale esistente, cita esplicitamente l'ADR e spiega perché proponi di riaprirla.
