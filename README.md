# HECTX Draft

High-level documentation, implementation notes, and reports for the HECTX project.

## What's Here

- `docs/`  — Documentation and reports. GitHub Pages serves `docs/index.html`.
- `docs/hectx-report/` — "First Implementation" report (Markdown, HTML, PNG).
- `scripts/` — Report rendering and screenshot tools.
- `hectx-daml/` — Daml sources and related assets. These are first-class source code (ledger model and choices) and must be versioned and reviewed like application code.
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

## Live Demo (JSON API + Docker)

The demo UI is now backed by a live JSON API server. It requires the Splice localnet docker environment.

Start the localnet and run the demo server (Colima supported):

```bash
./scripts/demo-run.sh
```

Open the demo UI:

```bash
open http://localhost:5177
```

The demo server talks to the localnet JSON API at `http://json-ledger-api.localhost:2000`.

Run end‑to‑end demo checks (Hurl):

```bash
brew install hurl
./scripts/demo-e2e.sh
```

The E2E script starts localnet, runs the demo server, executes the Hurl lifecycle test, and shuts everything down.

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
