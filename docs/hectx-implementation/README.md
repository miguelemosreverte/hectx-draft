**Abstract**
This folder contains a stepwise, executable implementation plan for HectX using Daml and Splice. Chapters increase in detail, and subchapters (e.g., `01.a`, `01.b`) drill down into concrete files and code.

**Body**
I. Reading Order
I.a `00-abstract.md`
I.b `01-architecture-overview.md`
I.c `01.a-architecture-files.md`
I.d `01.b-architecture-runtime.md`
I.e `02-daml-data-model.md`
I.f `02.a-daml-templates.md`
I.g `02.b-daml-policies.md`
I.h `03-workflows-and-ledger-actions.md`
I.i `03.a-mint-flow.md`
I.j `03.b-transfer-flow.md`
I.k `04-pricing-oracles-and-nav.md`
I.l `04.a-nav-snapshots.md`
I.m `04.b-fees-and-mint-calculation.md`
I.n `05-compliance-and-transferability.md`
I.o `05.a-compliance-records.md`
I.p `05.b-jurisdiction-policy.md`
I.q `06-splice-token-standard.md`
I.r `06.a-token-standard-interfaces.md`
I.s `06.b-data-dependencies.md`
I.t `07-ledger-api-and-services.md`
I.u `07.a-json-api-usage.md`
I.v `07.b-service-code.md`
I.w `08-testing-and-automation.md`
I.x `08.a-daml-tests.md`
I.y `08.b-localnet-automation.md`
I.z `09-deployment-and-ops.md`
I.aa `09.a-runbook.md`
I.ab `09.b-release-checklist.md`

II. Implementation Principle
II.a All referenced files exist in the repository and are executable with the provided scripts.
II.b No placeholders are used; update values only if policy changes are published.

**References**
- `hectx-daml/`
- `hectx-services/`
- `scripts/`
