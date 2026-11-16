# AGENTS.md — Auto Annex J

> Authoritative guide for AI agents working on this codebase.
> Read this file in full before making any changes.

---

## 1. Project Overview

**Auto Annex J** is a local-first, client-side web application that helps Portuguese taxpayers calculate stock and ETF capital gains/losses for the **IRS Anexo J (Quadro 9.2)** declaration. It parses Trading212 CSV exports, applies the FIFO (First-In, First-Out) matching method mandated by the Portuguese Tax Authority (AT), and outputs a copy-ready table.

**Zero backend.** All data stays in the browser via IndexedDB. No data is ever transmitted to a server (Vercel Analytics/Speed Insights are the only external calls).

---

## 2. Setup

| Item                | Value                                  |
| ------------------- | -------------------------------------- |
| Language            | TypeScript (strict, ES2023 target)     |
| Framework           | React 19                               |
| Bundler             | Vite 8                                 |
| Package manager     | npm (lockfile: `package-lock.json`)    |
| Node.js             | ≥ 22 (developed on v25)               |
| Module system       | ESM (`"type": "module"` in package.json) |

### Install & Run

```bash
# Install dependencies
npm install

# Start development server (http://localhost:5173)
npm run dev

# Type-check + production build → dist/
npm run build

# Preview the production build
npm run preview

# Lint (ESLint, flat config)
npm run lint

# Unit & component tests (Vitest + jsdom + React Testing Library)
npm run test

# End-to-end browser tests (Playwright, Chromium only)
# Automatically starts dev server on :5173 if not already running
npm run test:e2e
```

### First-time Playwright setup

```bash
npx playwright install --with-deps chromium
```

---

## 3. Architecture

```
src/
├── main.tsx               # Entry point. Mounts <App />, applies pointer-tracking for glass refraction sheen.
├── App.tsx                # Root component. Orchestrates file upload, IndexedDB persistence, FIFO processing.
├── index.css              # Single global stylesheet. All styling lives here — no CSS modules, no Tailwind.
├── setupTests.ts          # Vitest setup — imports @testing-library/jest-dom matchers.
├── components/
│   ├── Dropzone.tsx       # Drag-and-drop / click-to-browse CSV upload component.
│   ├── ResultsTable.tsx   # Year-selector, tax summary panel, results table, copy/export actions.
│   └── Footer.tsx         # Static footer with author links.
└── utils/
    ├── fifoParser.ts      # Core FIFO engine: CSV parsing (PapaParse), transaction normalization, FIFO matching, year grouping.
    ├── db.ts              # IndexedDB wrapper (via `idb` library). Stores raw CSV file content for multi-year persistence.
    └── exporter.ts        # CSV export: standard (comma, dot decimals) and Excel-PT (semicolon, comma decimals, UTF-8 BOM).

e2e/
└── app.spec.ts            # Playwright E2E test: upload → results → export → persistence → clear.

public/
├── favicon.svg
└── icons.svg
```

### Data Flow

```
CSV file(s) → Dropzone → IndexedDB (raw text) → fifoParser.parseMultipleCSVsByYear()
                                                      │
                                                      ├── PapaParse (header mode, dynamic typing)
                                                      ├── Normalize & filter buy/sell rows
                                                      ├── Sort chronologically (across all files)
                                                      ├── Group by ISIN
                                                      ├── FIFO match each sell against oldest buys
                                                      ├── Pro-rate fees across split lots
                                                      └── Group output rows by realization year
                                                              │
                                                              ▼
                                              Map<year, AnexoJRow[]> → ResultsTable
                                                                         │
                                                                         ├── Year pill selector
                                                                         ├── Tax summary panel (holding period brackets)
                                                                         ├── Results table
                                                                         └── Copy TSV / Export CSV actions
```

### Key Libraries

| Library                   | Purpose                                                                 |
| ------------------------- | ----------------------------------------------------------------------- |
| `papaparse`               | CSV parsing (header mode, dynamic typing, skip empty lines)             |
| `idb`                     | Typed IndexedDB wrapper for persistent file storage                     |
| `@vercel/analytics`       | Page-view analytics (production only, no user data)                     |
| `@vercel/speed-insights`  | Core Web Vitals reporting (production only)                             |
| `vitest`                  | Unit/component test runner (jsdom environment)                          |
| `@testing-library/react`  | Component test utilities                                                |
| `@playwright/test`        | E2E browser testing                                                     |
| `fake-indexeddb`          | Not directly imported yet, but available for unit-testing IndexedDB     |

---

## 4. Conventions & Style Guide

### TypeScript

- **Strict by default.** `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`, `erasableSyntaxOnly` are all enabled.
- **`verbatimModuleSyntax: true`** — always use `import type { … }` for type-only imports. A bare `import { SomeType }` will fail the build if `SomeType` is only a type.
- Target is **ES2023** — modern JS features (array `.at()`, `Object.groupBy` etc.) are fine, no need for polyfills.

### React

- **React 19** with the automatic JSX transform (`"jsx": "react-jsx"`) — never `import React from 'react'` unless you actually use the `React` namespace.
- **No state management library.** State is local `useState`/`useEffect` in `App.tsx` and `ResultsTable.tsx`. Keep it that way unless complexity genuinely demands otherwise.
- **No router.** This is a single-page tool. Don't add `react-router`.
- **Function components only.** No class components.
- **Named exports** for components (`export function Dropzone`), **default export** only for `App`.

### CSS

- **Single global stylesheet** (`src/index.css`). No CSS modules, no CSS-in-JS, no Tailwind.
- **Design language:** Apple-inspired dark-mode glassmorphism. Uses `backdrop-filter`, custom properties (CSS variables), and spring-curve transitions.
- **Refraction sheen system:** `main.tsx` tracks the pointer position and sets `--mouse-x` / `--mouse-y` CSS variables on interactive elements. The `::after` pseudo-elements render a radial-gradient "sheen" that follows the cursor. Do not break this by adding `overflow: hidden` to parent containers or by restructuring the pseudo-element chain.
- **Accessibility media queries** are in place at the bottom of `index.css` for `prefers-reduced-motion`, `prefers-reduced-transparency`, and `prefers-contrast`. Respect and extend them when adding new animated/transparent elements.

### Testing

- **Co-located tests:** Component tests live next to their component (`Dropzone.test.tsx`, `ResultsTable.test.tsx`). Utility tests live next to their utility (`fifoParser.test.ts`, `exporter.test.ts`).
- **Vitest globals** are enabled (`globals: true` in `vite.config.ts`), so `describe`, `it`, `expect`, `vi` are available without imports — but the existing tests import them explicitly from `vitest` for clarity. **Follow the existing pattern: use explicit imports.**
- **E2E tests** are in `e2e/` and excluded from Vitest via the `exclude` config. They run through Playwright against `localhost:5173`.
- **Always run `npm run test` after logic changes** to confirm nothing is broken.

### File & Naming Conventions

- Components: `PascalCase.tsx` (e.g., `ResultsTable.tsx`)
- Utilities: `camelCase.ts` (e.g., `fifoParser.ts`)
- Tests: `<filename>.test.ts(x)` co-located with source
- Portuguese field names in domain types (`AnexoJRow`): `ativo`, `pais`, `dataRealizacao`, `valorRealizacao`, `dataAquisicao`, `valorAquisicao`, `despesas`, `tempoDetencaoAnos`, `lucro`. **Do not anglicize these** — they map directly to the IRS Anexo J form fields.

---

## 5. Gotchas & Silent Invariants

These will break things in non-obvious ways if violated:

### FIFO Algorithm (`fifoParser.ts`)

1. **FIFO matching is global across files.** All CSVs are merged, sorted chronologically, grouped by ISIN, then FIFO-matched. A buy in `file_2022.csv` and a sell in `file_2023.csv` must match correctly. Never process files in isolation.

2. **Buy-lot exhaustion uses a float epsilon.** `oldestBuy.shares < 0.000001` is treated as zero (line 234). This guards against floating-point dust from fractional-share arithmetic. Do not change this to `=== 0`.

3. **The `Result` column takes priority over `Total`.** When both `Result (EUR)` and `Total (EUR)` exist, `Result` is used for `valueBase`. `Total` includes fees; `Result` does not. Reversing this silently inflates acquisition/realization values.

4. **Trading212 renamed `Time` to `Time (UTC)`.** The parser finds the time column by matching any key that starts with `"time"` (case-insensitive). Adding a column like `"Timezone"` would create a false match — be careful with test CSV headers.

5. **Fee extraction is prefix-based and cumulative.** `getNum()` sums all columns whose keys contain `"charge"`, `"stamp"`, `"conversion fee"`, or `"fee"`. A column named `"Referral fee"` would be silently included. This is intentional for T212's format but fragile if adapting to other brokers.

6. **`Math.abs()` is applied everywhere.** T212 represents buys as negative values and sells as positive (or vice versa depending on the column). The parser normalizes via `Math.abs()`. Never pass pre-negated values into the FIFO engine.

7. **Country code is derived from ISIN, not a separate column.** `isin.substring(0, 2)` extracts the country. This is correct per the ISIN standard (ISO 6166) but means a malformed ISIN will produce a wrong country code silently.

8. **Final sort is descending by realization date.** The output `AnexoJRow[]` is sorted newest-sale-first. Tests that check array position must account for this.

### Tax Calculation (`ResultsTable.tsx`)

9. **Holding-period tax brackets are hardcoded** to Portuguese 2024 rules (Art. 43.º CIRS): ≤2 years → 100%, 2–5 years → 90%, 5–8 years → 80%, >8 years → 70% of gains taxed. The 28% flat rate is then applied. If tax law changes, update `calculateTaxStats()`.

10. **Negative total taxable income → zero tax.** `impostoEstimado` is set to 0 when `totalTributado <= 0`. Losses cannot generate a negative tax estimate.

### Dates

11. **All dates are DD/MM/YYYY in output.** The `formatDate()` function produces Portuguese-locale dates. The parser expects T212's `YYYY-MM-DD HH:MM:SS` input format. Mixing these up will cause silent mismatches in year-grouping.

12. **`getHoldingPeriodYears()` normalizes to midnight** before calculating. Intraday timestamps do not affect the holding period. This is by design (tax law counts calendar days, not hours).

### IndexedDB (`db.ts`)

13. **DB schema version is 1.** If you change the object store structure, you must bump the version number in `openDB()` and provide an `upgrade` handler. Forgetting this will silently fail in browsers that already have v1.

14. **File IDs are `${Date.now()}-${name}`.** Uploading the same file twice creates two entries (different timestamps). This is intentional — the FIFO engine deduplicates by transaction content, not by filename.

15. **The `dbPromise` singleton is module-scoped.** In tests, this means the DB connection persists across test cases within the same module. Use `fake-indexeddb` to isolate tests if needed.

### CSS / UI

16. **The `::after` pseudo-element is reserved for the refraction sheen** on `.glass-panel`, `.dropzone`, `.btn-secondary`, `.file-chip`, `.table-container`, and `.dropdown-menu`. Do not add your own `::after` to these selectors — it will overwrite the sheen effect.

17. **The `::before` pseudo-element on `.glass-panel`** renders the top-edge specular highlight line. Same rule: do not override it.

18. **Inline styles are used liberally** in `App.tsx` and `ResultsTable.tsx` for layout. This is intentional — the project favors one-off layout props over creating dozens of utility classes. Follow the existing pattern.

### Clipboard / Export (`ResultsTable.tsx`, `exporter.ts`)

19. **Clipboard output replaces `.` with `,` for decimal separators.** This is critical for Portuguese tax portal compatibility. The copy-to-clipboard functions produce TSV with comma decimals. The CSV exporter has two modes (standard with dots, Excel-PT with commas). Do not unify these — they serve different purposes.

20. **CSV export prepends a UTF-8 BOM (`\uFEFF`).** Without it, Excel on Windows will mangle accented characters (e.g., `Realização` → garbled text). Never remove the BOM.

### Build & Deploy

21. **Deployed on Vercel** (inferred from `@vercel/analytics` and `@vercel/speed-insights`). The build output goes to `dist/`. No custom Vercel configuration file exists — it auto-detects Vite.

22. **E2E tests expect `localhost:5173`.** Playwright's config starts `npm run dev` automatically and points at that port. If Vite's port changes (e.g., due to a conflict), E2E tests will fail silently.

23. **ESLint uses the flat config format** (`eslint.config.js`, not `.eslintrc`). It enforces `react-hooks` and `react-refresh` rules. Do not switch to legacy config.

---

## 6. Domain Glossary

| Term                 | Meaning                                                              |
| -------------------- | -------------------------------------------------------------------- |
| Anexo J              | Annex J of the Portuguese IRS declaration — for foreign-source income |
| Quadro 9.2           | Section 9.2 of Anexo J — capital gains on securities                 |
| FIFO                 | First-In, First-Out — mandatory lot matching method for AT           |
| AT                   | Autoridade Tributária — Portuguese Tax Authority                     |
| CIRS                 | Código do Imposto sobre o Rendimento das Pessoas Singulares (Portuguese income tax code) |
| Realização           | Sale / disposition of an asset                                       |
| Aquisição            | Purchase / acquisition of an asset                                   |
| Despesas             | Expenses (broker fees, FX fees, stamp duties)                        |
| Lucro / Prejuízo     | Profit / Loss                                                        |
| Mais-Valias          | Capital gains                                                        |
| ISIN                 | International Securities Identification Number (first 2 chars = country) |
| T212                 | Trading212 — the broker whose CSV format this tool currently supports |
