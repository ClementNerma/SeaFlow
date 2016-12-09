# List of errors

Here is the list of all errors used by the SeaFlow engine.

| No  | Description |
|-----|-------------|
|  -1 | Table name must be a not-empty string |
|  -2 | An array is expected as the keys |
|  -3 | This name is a reserved keyword |
|  -4 | A table with this name already exists |
|  -5 | An object is expected as the key |
|  -6 | Unknown type |
|  -7 | Key size must be a positive integer |
|  -8 | Key size is outisde range |
|  -9 | Duplicate value: Key is unique, but value was inserted two times |
| -10 | The key name must be a not-empty string |
| -11 | Invalid key name |
| -12 | Invalid table name |
| -13 | Expecting a type for the key |
| -14 | Minimal key size must be a positive integer |
| -15 | Maximal key size must be a positive integer |
| -16 | Key name is already used |
| -17 | At least one key is needed for tables |
| -18 | The table does not exist
| -19 | A valid object is expected for the .insert() function |
| -20 | Unknown key at insertion |
| -21 | Too many data given at insertion |
| -22 | Expecting a string, number or boolean value for key |
| -23 | Invalid value given for key |
| -24 | Data must be an array |
| -25 | .get: Argument must be an object |
| -26 | .get: "keys" must be an array |
| -27 | .get: "order" must be a string or an array |
| -28 | .get: Each field in "order" must be a string |
| -29 | .get: Unsupported order method, must be "ASC" or "DESC" |
| -30 | .get: Table doesn't have this key |
| -31 | .get: Each field in "keys" must be a string |
| -32 | .get: Key is specified two times in "key" |
| -33 | .get: "where" must be a string or an array |
| -34 | .get: Each field in "where" must be a string |
| -35 | .get: Unsupported condition given |
| -36 | .get: Missing a condition at the end of the "where" field (can't stop after an operator) |
| -37 | .get: Unsupported comparator in condition |
| -38 | .get: Invalid comparative value given in condition |
| -39 | .get: "limit" must be a number |
| -40 | .get: Limit must be a positive integer |`
| -41 | .get: "method" must be a string |
| -42 | .get: Unsupported method |
| -43 | Data row must be an array |
| -44 | Condition must be an object |
| -45 | Missing field(s) in the condition object (needs "key", "check" and "value" as strings) |
| -46 | Unknown comparator |
| -47 | The "count" method is incompatible with the "order" field |
| -48 | Content is too long for this key |
| -49 | A value is expected for this key |
