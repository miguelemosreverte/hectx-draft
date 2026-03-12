# Releases

## 1.1 (March 12, 2026)
- Transfer flow now uses the Token Standard interface (`TransferFactory_Transfer`) with sender control and admin co‑authorization.
- Test timing fixed by using a fixed historical `requestedAt` to satisfy ledger time constraints.
- Local test run confirmed passing via `./scripts/test-daml.sh`.
- Splice token‑standard packages aligned to SDK `3.4.11` in the submodule to make builds reproducible with public SDKs.
- Report updated to remove the transfer caveat and document the ledger time constraint.

## 1.0 (March 11, 2026)
- Initial “First Implementation” report created and published to GitHub Pages.
- Daml ledger model implemented (policies, compliance, NAV, minting, holdings, transfers).
- JSON API scripts and automation added for local build/test.
