# HECTX Draft

High-level documentation, implementation notes, and reports for the HECTX project.

## What's Here

- `docs/`  — Documentation and reports. GitHub Pages serves `docs/index.html`.
- `docs/hectx-report/` — "First Implementation" report (Markdown, HTML, PNG).
- `scripts/` — Report rendering and screenshot tools.
- `hectx-daml/` — Daml sources and related assets.
- `hectx-services/` — Service layer scaffolding and helpers.
- `vendor/` — External dependencies (submodule: `hyperledger-labs/splice`).

## Quick Start

Install report tooling and render the HTML report:

```bash
npm install
npm run render:report
```

Open the report locally:

```bash
open docs/hectx-report/hectx-implementation-report.html
```

Take a full-page screenshot:

```bash
npm run screenshot:report
```

## GitHub Pages

The report is published as `docs/index.html`. Enable Pages in repo settings:

- Source: `main` branch
- Folder: `/docs`

Once enabled, the report is available at:

<https://lambda-ecom.github.io/hectx-draft/>

## Notes

- The report HTML is generated from `docs/hectx-report/hectx-implementation-report.md`.
- `scripts/render-report.mjs` also copies the rendered HTML to `docs/index.html`.
- `vendor/splice` is a submodule pinned to a specific commit in `hyperledger-labs/splice`.

## Commands

- `npm run render:report` — Build HTML report
- `npm run screenshot:report` — Generate a full-page PNG of the report
