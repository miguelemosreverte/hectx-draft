# ─── Step 1: Initialize Ledger ───
POST {{base_url}}/api/setup
HTTP 200
[Asserts]
jsonpath "$.ok" == true
jsonpath "$.registryCid" exists
jsonpath "$.transferFactoryCid" exists

# ─── Step 2: Mint HECTX Tokens ───
POST {{base_url}}/api/mint
HTTP 200
[Asserts]
jsonpath "$.ok" == true
jsonpath "$.requestCid" exists

# ─── Step 3: Transfer via Splice Standard ───
POST {{base_url}}/api/transfer
HTTP 200
[Asserts]
jsonpath "$.ok" == true

# ─── Step 4: Verify Final State ───
GET {{base_url}}/api/status
HTTP 200
[Asserts]
jsonpath "$.ready" == true
jsonpath "$.parties.admin" exists
jsonpath "$.parties.alice" exists
jsonpath "$.parties.bob" exists
jsonpath "$.balances.alice" == 900
jsonpath "$.balances.bob" == 100
jsonpath "$.totalSupply" >= 1000
jsonpath "$.holdingsCount" >= 2

# ─── Step 5: Compliance Rejection ───
POST {{base_url}}/api/rejection
HTTP 200
[Asserts]
jsonpath "$.ok" == true
jsonpath "$.blocked" == true
jsonpath "$.investor" == "Charlie"
jsonpath "$.jurisdiction" == "United States"
jsonpath "$.reason" exists

# ─── Verify supply unchanged after rejection ───
GET {{base_url}}/api/status
HTTP 200
[Asserts]
jsonpath "$.balances.alice" == 900
jsonpath "$.balances.bob" == 100
jsonpath "$.totalSupply" >= 1000
jsonpath "$.holdingsCount" >= 2

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
