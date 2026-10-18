# Modular dashboard implementation plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refactor FinancePalmirioBot into a tested, modular static application and publish it to the existing GitHub Pages site.

**Architecture:** Native ES modules with feature-owned state, shared core services, explicit bootstrap, external styles, and delegated UI actions. Preserve existing behavior and storage compatibility.

**Tech Stack:** HTML, CSS, JavaScript ES modules, Node.js 20+ tests, Playwright browser smoke checks, Cloudflare Worker, GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-10-18-modular-dashboard-design.md`

## Global constraints

- Preserve all existing localStorage keys and stored data formats.
- Preserve current formulas, thresholds, prices, and signal labels.
- Use relative asset URLs so `/financebot/` on GitHub Pages works.
- Keep GitHub Pages deployment static; Node.js 20+ is needed only for development checks.
- Leave unrelated untracked briefings, spreadsheet scripts, and data files untouched and unpublished.

## Review focus

1. Malformed/blocked browser storage must not prevent initialization (storage unit + browser tests).
2. Dynamic buttons must work after rerender and language changes (browser interaction tests).
3. Proxy failures must fall through and release busy states (transport unit + browser fixtures).
4. Module initialization must not introduce cyclic-import startup failures (browser smoke).
5. BTP signed changes and saved purchase prices must survive refactor (parser + browser tests).

## Task 1: Baseline and regression harness

- [ ] Commit the existing signed-number parsing fix separately.
- [ ] Add `package.json`, Node tests, and browser fixture harness; observe missing-module failures before extracting implementations.
- [ ] Capture baseline behavior and document relevant external-data limitations.

## Task 2: Modular application

Files: `static/index.html`, `static/css/*`, `static/js/core/*`, `static/js/features/*`, `static/js/ui/*`, `static/js/app.js`.

Interfaces: `storage.getItem/setItem/removeItem`, `readJSON(key, fallback, validate)`, `proxiedFetch(url, opts, timeoutMs)`, `pMap(items, fn, concurrency)`, existing indicator signatures, feature exports, explicit `init()` bootstrap.

- [ ] Extract styles, translations, defaults, transport, indicators, features, chart rendering, and bootstrap into focused modules.
- [ ] Convert inline actions to delegated listeners with explicit handler registration.
- [ ] Add storage recovery and preserve user state; vendor the existing Chart.js version.
- [ ] Verify unit contracts and browser workflows; commit the coherent refactor.

## Task 3: Documentation, automation, and delivery

- [ ] Update README, BTP documentation, and repository skill paths for the new structure.
- [ ] Add CI checks before GitHub Pages deployment, preserving static hosting.
- [ ] Run unit, browser, source integrity, and real-data checks.
- [ ] Request one independent whole-branch review, address material findings with regression coverage.
- [ ] Commit, fast-forward main, push, and verify remote revision and deployment.
