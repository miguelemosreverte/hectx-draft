# HECTX Client Demo Preparation — Session Plan

**Goal:** Prepare a polished, interactive demo showcasing HECTX's architecture, compliance, and smart contract implementation for client presentation. Validate all requirements against implementation.

**Timeline:** 5 sessions, ~8 hours total (March 13, 2026, 02:00–10:00)

---

## Session 1 — Foundation & Traceability Matrix (~02:10)
**Focus:** Requirements-to-implementation mapping and compliance validation framework

### Tasks
- [ ] Build requirements traceability matrix (requirement → Daml source → test evidence)
- [ ] Create compliance white paper document
- [ ] Audit Daml contracts against each documented requirement
- [ ] Identify compliance gaps with severity ratings
- [ ] Set up Playwright screenshot tooling for demo iteration

### Outputs
- `sessions/01-report.md` — Session report with findings
- `docs/hectx-compliance/requirements-traceability.md` — Full traceability matrix
- `docs/hectx-compliance/compliance-white-paper.md` — White paper draft
- Commit with all changes

---

## Session 2 — Demo UI Enhancement & Architecture Showcase (~03:40)
**Focus:** Make the demo interactive, beautiful, and architecture-aware

### Tasks
- [ ] Enhance demo server with interactive UI (not just API endpoints)
- [ ] Add architecture decision table to demo (requirement ↔ implementation)
- [ ] Add step-by-step walkthrough flow (setup → mint → transfer → verify)
- [ ] Take Playwright screenshots, iterate on visuals
- [ ] Add NAV and compliance status panels

### Outputs
- `sessions/02-report.md` — Session report
- Enhanced `hectx-services/src/demo-server.ts` with UI
- Demo screenshots in `sessions/screenshots/`
- Commit with all changes

---

## Session 3 — Smart Contract Compliance Deep Dive (~05:10)
**Focus:** Validate and strengthen Daml contract compliance

### Tasks
- [ ] Add jurisdiction enforcement to mint/transfer flows
- [ ] Expand Daml test coverage (edge cases, rejection paths, jurisdiction checks)
- [ ] Validate fee calculations against spec
- [ ] Add missing compliance checks identified in Session 1
- [ ] Run full test suite, document results

### Outputs
- `sessions/03-report.md` — Session report
- Enhanced Daml contracts with compliance enforcement
- Expanded test suite
- Commit with all changes

---

## Session 4 — End-to-End Demo & Reporting (~06:50)
**Focus:** Polish the full demo flow, generate compliance reports

### Tasks
- [ ] Build compliance report generation (automated from traceability matrix)
- [ ] Create interactive demo walkthrough with Playwright screenshots
- [ ] Integration test the full flow (localnet → setup → mint → transfer → verify)
- [ ] Add portfolio composition display to demo
- [ ] Update traceability matrix with Session 3 improvements

### Outputs
- `sessions/04-report.md` — Session report
- Generated compliance report
- Demo walkthrough screenshots
- Commit with all changes

---

## Session 5 — Final Polish & Client Readiness (~08:20)
**Focus:** Final validation, polish, and presentation readiness

### Tasks
- [ ] Final demo UI polish based on screenshot review
- [ ] Complete traceability documentation (all gaps addressed or documented)
- [ ] Final validation pass on all Daml contracts
- [ ] Generate final compliance report
- [ ] Create demo presentation guide (how to run the demo for clients)
- [ ] Final commit with complete state

### Outputs
- `sessions/05-report.md` — Final session report
- `docs/hectx-compliance/final-compliance-report.md`
- `docs/demo-guide.md` — How to run the demo
- Final commit

---

## Handoff Protocol

Each session:
1. **Reads** the previous session's report (`sessions/NN-report.md`)
2. **Reads** the SESSION-PLAN.md to know its scope
3. **Develops** its own detailed task list from the plan
4. **Executes** the work
5. **Writes** its report with: what was done, what changed, blockers, recommendations for next session
6. **Commits** all changes with a descriptive message
