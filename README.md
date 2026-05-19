# Auto Annex J 📊🇵🇹

A local-first, web-based tool designed to help Portuguese taxpayers effortlessly calculate their stock and ETF capital gains/losses for the **IRS Declaration (Anexo J, Quadro 9.2)** using the strict **FIFO (First-In, First-Out)** method.

## 🚀 Features

*   **Automated FIFO Calculation**: Upload your Trading212 CSVs, and the app mathematically matches sales to the oldest respective purchases, splitting rows accurately when required by AT.
*   **Persistent Storage (IndexedDB)**: Upload a new CSV each year. The app saves your raw data securely in your browser's local storage and merges it chronologically. No data is ever sent to a server.
*   **Country Code Extraction**: Automatically deduces the correct two-letter country code (e.g., `US`, `IE`) from the asset's ISIN.
*   **Frictionless UX**: Premium dark-mode interface with drag-and-drop support and a one-click "Copy Table" button that exports directly to TSV format for easy pasting into Excel or the IRS portal.
*   **Expense Apportionment**: Pro-rates broker fees, FX fees, and stamp duties across split sales accurately.

## 🛠️ Tech Stack

*   **Frontend**: React, TypeScript, Vite
*   **Styling**: Pure CSS (Custom properties, Glassmorphism)
*   **Data Processing**: PapaParse
*   **Storage**: IndexedDB (via `idb`)
*   **Testing**: Vitest, React Testing Library, Playwright

## 🏃‍♂️ Quick Start

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the development server:
   ```bash
   npm run dev
   ```
3. Open `http://localhost:5173` in your browser.

## 🧪 Testing

The project uses a robust dual-testing setup to guarantee accuracy:

```bash
# Run unit and component tests (Vitest)
npm run test

# Run End-to-End browser tests (Playwright)
npm run test:e2e
```

## 📋 Project Status Tracker

### ✅ Completed
- [x] Initial React + Vite setup
- [x] PapaParse integration for Trading212 CSVs
- [x] Core FIFO matching algorithm
- [x] Drag & drop file upload UI
- [x] Copy-to-clipboard functionality for TSV
- [x] IndexedDB integration for multi-year persistence
- [x] Vitest unit testing suite
- [x] Playwright E2E browser testing suite

### 🔄 In Progress
- *Pending user confirmation on next steps.*

### 📅 Planned (Future Improvements)
- [ ] **Multi-Broker Support**: Create adapters to support CSV exports from other popular brokers in Portugal like Degiro, XTB, and Interactive Brokers.
- [ ] **Dividends Reporting (Anexo E/J)**: Expand the parser to extract dividend payments and generate a separate copy-ready table for dividend reporting.
- [ ] **Direct Excel/CSV Export**: Add a feature to download the final Anexo J table as a direct `.xlsx` or `.csv` file.
