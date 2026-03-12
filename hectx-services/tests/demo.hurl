POST {{base_url}}/api/setup
HTTP 200
[Asserts]
jsonpath "$.ok" == true
jsonpath "$.registryCid" exists
jsonpath "$.transferFactoryCid" exists

POST {{base_url}}/api/mint
HTTP 200
[Asserts]
jsonpath "$.ok" == true
jsonpath "$.requestCid" exists

POST {{base_url}}/api/transfer
HTTP 200
[Asserts]
jsonpath "$.ok" == true

GET {{base_url}}/api/status
HTTP 200
[Asserts]
jsonpath "$.ready" == true
jsonpath "$.parties.admin" exists
jsonpath "$.parties.alice" exists
jsonpath "$.parties.bob" exists
jsonpath "$.balances.alice" == 900
jsonpath "$.balances.bob" == 100
jsonpath "$.holdingsCount" >= 2
