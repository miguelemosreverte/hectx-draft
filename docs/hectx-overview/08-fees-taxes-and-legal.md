**Abstract**
Fees and taxes materially affect NAV and minting outcomes and must be implemented as configurable policy inputs. Legal and regulatory constraints define the permissioned nature of HectX and the limits of tokenholder rights.

**Body**
I. Fees (High-Level)
I.a Hecto may charge subscription, conversion, management, platform, and transaction-related fees.
I.b Third-party costs may apply, including custody, brokerage, settlement, FX, and network fees.
I.c Fees and costs are deducted from NAV and impact minting through the net subscription amount.

II. Fee Implementation Requirements
II.a Represent fees as policy objects with type, basis, accrual, and settlement parameters.
II.b Apply fees before mint calculation and persist fee breakdowns for auditability.
II.c If subscriptions are paid in CC, conversion fees and spreads must be applied prior to NAV recognition.

III. Taxes (High-Level)
III.a Tax treatment depends on jurisdiction, investor status, legal structure, and holding period.
III.b The system must support jurisdiction-aware tax metadata and reporting fields.
III.c Hecto does not provide tax advice; investors must consult their own advisors.

IV. Legal And Regulatory Constraints
IV.a HectX is a tokenized NAV-based product and does not confer direct ownership of portfolio companies.
IV.b Tokenholders do not receive voting rights, company information rights, or redemption rights.
IV.c Compliance with applicable securities and AML regulations is enforced via onboarding and transferability controls.

**References**
- HectX fees & taxes: https://hecto-1.gitbook.io/hectx-docs/hextx/fees-and-taxes
- HectX legal & regulatory: https://hecto-1.gitbook.io/hectx-docs/hextx/legal-and-regulatory
- HectX glossary (fees, redemption): https://hecto-1.gitbook.io/hectx-docs/hextx/glossary
