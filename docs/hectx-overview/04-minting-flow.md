**Abstract**
Minting follows a deterministic flow: onboarding approval, subscription receipt, conversion when required, NAV recognition, and minting at the pre-mint NAV per token. NAV recognition is the gating condition; portfolio deployment can follow later.

**Body**
I. Minting Lifecycle (High-Level)
I.a Minting can occur once subscription funds are received, converted into the base reserve asset (if needed), and recognized in NAV.
I.b Portfolio deployment into pre-IPO holdings can happen after minting; it does not block minting once NAV recognition is complete.

II. Stepwise Flow
II.a Onboarding complete and wallet approved.
II.b Subscriber deposits funds into the HectX vault.
II.c If payment is via CC, funds are converted into the base reserve asset.
II.d NAV recognition: converted funds are counted in NAV as reserve assets.
II.e Mint HectX at the pre-mint NAV per token.
II.f Reserve sleeve retains assets until deployed.
II.g Portfolio deployment updates NAV composition as reserves move into holdings.
II.h NAV is continuously updated for valuation changes, fees, liabilities, and reserves.
II.i No redemption rights; liquidity is via secondary markets or discretionary buybacks.

III. Mint Calculation
III.a Pre-mint NAV per token = NAV_before_subscription / circulating_supply_before_subscription.
III.b Net subscription amount = subscription amount minus fees and conversion costs.
III.c Minted amount = net subscription amount / pre-mint NAV per token.

IV. Operational Safeguards
IV.a Delay or reject minting for compliance flags, failed settlement, failed conversion, pricing anomalies, or oracle disruption.
IV.b Allow emergency suspension for legal, regulatory, or operational risk events.
IV.c Log reason codes for every delay, rejection, or suspension.

**References**
- HectX minting flow: https://hecto-1.gitbook.io/hectx-docs/hextx/minting-flow
- HectX token & mint pricing: https://hecto-1.gitbook.io/hectx-docs/hextx/token-and-mint-pricing
- HectX glossary (reserve assets, base reserve asset, circulating supply): https://hecto-1.gitbook.io/hectx-docs/hextx/glossary
