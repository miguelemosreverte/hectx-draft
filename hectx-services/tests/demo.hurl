# ─── Step 1: Initialize Ledger ───
POST {{base_url}}/api/setup
HTTP 200
[Asserts]
jsonpath "$.ok" == true
jsonpath "$.registryCid" exists
jsonpath "$.transferFactoryCid" exists
jsonpath "$.investorCount" == 20
jsonpath "$.jurisdictionCount" == 10

# ─── Step 2: Mint HECTX Tokens (16 approved investors) ───
POST {{base_url}}/api/mint
HTTP 200
[Asserts]
jsonpath "$.ok" == true
jsonpath "$.totalMinted" == 16
jsonpath "$.totalSupply" > 1000000

# ─── Step 3: Transfer via Splice Standard (8 transfers) ───
POST {{base_url}}/api/transfer
HTTP 200
[Asserts]
jsonpath "$.ok" == true
jsonpath "$.transferCount" == 8

# ─── Step 4: Verify Final State ───
GET {{base_url}}/api/status
HTTP 200
[Asserts]
jsonpath "$.ready" == true
jsonpath "$.totalSupply" > 1000000
jsonpath "$.holdingsCount" >= 16

# ─── Step 5: Compliance Rejection (4 prohibited investors) ───
POST {{base_url}}/api/rejection
HTTP 200
[Asserts]
jsonpath "$.ok" == true
jsonpath "$.rejections" count == 4

# ─── Verify supply unchanged after rejection ───
GET {{base_url}}/api/status
HTTP 200
[Asserts]
jsonpath "$.totalSupply" > 1000000
jsonpath "$.holdingsCount" >= 16

# ─── Reset ───
POST {{base_url}}/api/reset
HTTP 200
[Asserts]
jsonpath "$.ok" == true

# ─── Verify reset ───
GET {{base_url}}/api/status
HTTP 200
[Asserts]
jsonpath "$.ready" == false
