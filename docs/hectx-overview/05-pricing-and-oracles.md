**Abstract**
Pricing is NAV-based and grounded in portfolio fair values plus reserves, minus fees and liabilities. Valuation data is sourced from Notice and corroborated by other market evidence as needed. Guardrails address stale or anomalous data and drive minting delays or suspensions.

**Body**
I. NAV Methodology (High-Level)
I.a NAV per token = NAV / circulating HectX supply.
I.b Stake value = fair value × ownership percent.
I.c GAV = sum of stake values + cash + receivables.
I.d NAV = GAV − accrued fees − reserves − liabilities.
I.e Minting uses the pre-mint NAV per token, measured before adding the subscription amount.

II. Valuation Inputs
II.a Notice is the primary valuation data provider for private-company marks.
II.b Additional corroborating inputs may include recent orderly private transactions, independent valuations, and public-market evidence when a company lists.
II.c Hecto does not necessarily update NAV for every intraday mark; valuation updates must pass internal review and validation before NAV recognition.

III. Data Frequency And Access
III.a Notice data is updated frequently; the documentation notes a 3-second update cadence and API access at approximately once per minute for subscribers.
III.b The valuation pipeline must cache and timestamp inputs, and enforce freshness windows before minting.

IV. Guardrails And Anomalies
IV.a Stale data, missing inputs, or large unexplained deviations trigger pricing anomaly flags.
IV.b Pricing anomalies or oracle disruptions delay or suspend minting until resolved.

V. Elastic Mint Fee
V.a Elastic mint fee is inactive at launch and activates when reliable market price data exists.
V.b If market price <= NAV, fee is 0.
V.c If market price > NAV, fee is 1% of the premium, where premium = market price − NAV.
V.d The market price data source and activation criteria must be disclosed by Hecto before activation.

**References**
- HectX token & mint pricing: https://hecto-1.gitbook.io/hectx-docs/hextx/token-and-mint-pricing
- HectX glossary (NAV, GAV, fair value, premium, reserve assets): https://hecto-1.gitbook.io/hectx-docs/hextx/glossary
