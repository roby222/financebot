# Modular dashboard design

## Intent and scope

The user requested a complete website refactor and authorized the necessary commits and pushes. Preserve the existing dashboard, calculations, watchlists, browser storage keys, language toggle, charts, and GitHub Pages hosting. The refactor improves maintainability and verification; it does not revise investment assumptions or introduce a framework.

## Architecture

Use native ES modules served directly from `static/`. Keep `index.html` as the accessible document shell. Separate CSS into base and feature stylesheets. Organize JavaScript by feature (ETF, Semis, Macro, Bond/Equity, BTP), shared UI (charts, help, navigation), and core services (storage, transport, indicators, translations). Each feature owns its state; shared dashboard state is explicit. Imports replace accidental global-variable dependencies. Bootstrap runs only after all modules initialize.

Replace inline JavaScript event attributes with declarative actions and a bounded event dispatcher. Preserve user interactions and delegated handling for dynamically rendered controls. Pure calculation and transport modules must be importable in Node without a browser.

Keep the Cloudflare Worker's public routes and standalone deployability. Extract parsing helpers where they can be tested without requiring a Cloudflare runtime. Retain the existing local signed-number parsing fix.

## Reliability and compatibility

- Preserve all existing localStorage keys and stored data formats.
- Recover from malformed or unavailable localStorage without preventing startup.
- Preserve current formulas, thresholds, prices, and signal labels.
- Use relative asset URLs so `/financebot/` on GitHub Pages works.
- Keep Chart.js pinned, and serve its existing version locally to remove runtime CDN dependence.
- Keep GitHub Pages deployment static; Node.js 20+ is needed only for development checks.
- Leave unrelated untracked briefings, spreadsheet scripts, and data files untouched and unpublished.

## Validation and delivery

Add Node tests for indicators, storage fallback, proxy failover, bounded concurrency, and signed BTP parsing. Browser smoke checks exercise all five tabs, language, watchlist controls, dialogs, BTP sorting and purchase-price persistence, corrupt storage, and narrow viewports with deterministic market fixtures. Also check a real-data session separately, distinguishing external outages from application failures. Run checks in CI before deployment. Commit cohesive stages, integrate the verified branch into main, push, and verify GitHub Pages deployment.

## Decisions

Native modules were chosen over a framework migration because the dashboard already has all required flows and GitHub Pages can serve modules without a build. A simple split into global script files was rejected because it preserves hidden coupling. Execution proceeds in the existing checkout on a dedicated branch to preserve local work and avoid relocating unrelated untracked artifacts. The user's explicit end-to-end authorization governs implementation and publishing without repeated approval gates.
