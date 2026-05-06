# Finance Categorization Analysis

This analysis is based on the imported Fintable transaction structure in local Postgres. It intentionally avoids merchant names, account names, amounts, and transaction-level details.

## Historical Note

This is a historical/reference analysis for the original finance categorization
design. It remains useful for understanding raw provider signals, matching
strategy, and why AllMe stores user-owned categories, rules, and assignments.

Current implementation status and next finance candidates live in:

- `docs/DEVELOPMENT_STATUS.md`
- `docs/ai/NEXT_SLICES.md`

Treat the recommendations below as design context, not a current task list.

## Summary

The current normalized `finance_transactions.category` field is not enough for robust categorization.

Observed normalized categories:

```text
Uncategorized: 102
Restaurant: 12
Medical Expenses: 1
```

The richer categorization signal is in `finance_raw_records.payload`.

There are two raw transaction families:

- bank/card transactions: 81 records
- investment transactions: 34 records

Bank/card transactions include provider category fields such as:

- `category`
- `category_id`
- `personal_finance_category`
- `payment_channel`
- `transaction_type`
- `merchant_name`
- `name`
- `location`
- `website`
- `merchant_entity_id`

Investment transactions include fields such as:

- `type`
- `symbol`
- `institution`
- `units`
- `price`
- `fee`
- `trade_date`
- `settlement_date`

## Best Categorization Inputs

### 1. `personal_finance_category`

This is the strongest bank/card category signal.

Observed fields:

```text
primary
detailed
confidence_level
```

Examples of observed values:

```text
FOOD_AND_DRINK / FOOD_AND_DRINK_RESTAURANT
FOOD_AND_DRINK / FOOD_AND_DRINK_FAST_FOOD
FOOD_AND_DRINK / FOOD_AND_DRINK_COFFEE
FOOD_AND_DRINK / FOOD_AND_DRINK_GROCERIES
MEDICAL / MEDICAL_PHARMACIES_AND_SUPPLEMENTS
MEDICAL / MEDICAL_DENTAL_CARE
TRANSPORTATION / TRANSPORTATION_TAXIS_AND_RIDE_SHARES
TRANSPORTATION / TRANSPORTATION_PUBLIC_TRANSIT
GENERAL_MERCHANDISE / GENERAL_MERCHANDISE_ELECTRONICS
TRANSFER_OUT / TRANSFER_OUT_ACCOUNT_TRANSFER
LOAN_PAYMENTS / LOAN_PAYMENTS_CREDIT_CARD_PAYMENT
INCOME / INCOME_WAGES
```

This field should be first-class in the categorization system.

Recommended matching:

- exact match on `personal_finance_category.detailed`
- fallback match on `personal_finance_category.primary`
- optional minimum confidence threshold

### 2. Legacy `category` Array

The raw `category` field is a provider path-style array.

Observed examples:

```text
["Food and Drink", "Restaurants"]
["Food and Drink", "Restaurants", "Fast Food"]
["Food and Drink", "Restaurants", "Coffee Shop"]
["Service", "Food and Beverage"]
["Shops", "Pharmacies"]
["Travel", "Taxi"]
["Travel", "Public Transportation Services"]
["Transfer", "Third Party", "Venmo"]
["Payment", "Credit Card"]
```

This is useful as a secondary matcher because it captures human-readable category paths.

Recommended matching:

- category path contains any value
- category path starts with a value
- exact full path match

### 3. Merchant And Description Fields

Useful fields:

```text
merchant_name
name
description
website
merchant_entity_id
```

Coverage:

```text
merchant_name present on 53 of 81 bank/card raw records
merchant_entity_id present on 32 of 81 bank/card raw records
website present on 32 of 81 bank/card raw records
location present on 81 of 81 bank/card raw records
```

Merchant matching should support user overrides, but it should not be the only strategy. Provider categories are usually better for broad categories; merchant rules are better for correcting individual vendors.

Recommended matching:

- exact merchant entity id
- exact merchant name
- normalized merchant name contains
- description contains
- website domain equals

### 4. Investment Transaction Fields

Investment records are structurally different from bank/card transactions.

Observed investment `type` values:

```text
BUY: 12
CONTRIBUTION: 7
DIVIDEND: 5
SELL: 4
REI: 3
TRANSFER: 2
FEE: 1
```

Investment categorization should be separated from normal spending categorization because these are not ordinary expenses.

Recommended matching:

- `type = BUY` -> Investment Purchase
- `type = SELL` -> Investment Sale
- `type = DIVIDEND` -> Investment Income
- `type = CONTRIBUTION` -> Investment Contribution
- `type = TRANSFER` -> Investment Transfer
- `type = FEE` -> Investment Fee
- `type = REI` -> Reinvestment

## User-Defined Category Model

Users should be able to define categories independent of provider categories.

Example:

```text
User category: Ordering Out
Matches:
- personal_finance_category.detailed in:
  - FOOD_AND_DRINK_RESTAURANT
  - FOOD_AND_DRINK_FAST_FOOD
  - FOOD_AND_DRINK_COFFEE
- raw category path contains:
  - Food and Drink
  - Restaurants
  - Fast Food
  - Coffee Shop
  - Food and Beverage
```

This lets one user group restaurants, fast food, and coffee together, while another user could keep them separate.

## Recommended Rule Types

Rules should be user-owned and composable.

Rule fields:

```text
id
user_id
category_id
name
priority
is_active
match_logic
conditions
created_at
updated_at
```

`match_logic`:

```text
any
all
```

Condition examples:

```json
{
  "field": "personal_finance_category.detailed",
  "operator": "in",
  "value": ["FOOD_AND_DRINK_RESTAURANT", "FOOD_AND_DRINK_FAST_FOOD"]
}
```

```json
{
  "field": "raw.category",
  "operator": "contains_any",
  "value": ["Restaurants", "Fast Food", "Food and Beverage"]
}
```

```json
{
  "field": "investment.type",
  "operator": "equals",
  "value": "DIVIDEND"
}
```

Supported operators:

```text
equals
not_equals
in
contains
contains_any
starts_with
regex
exists
amount_less_than
amount_greater_than
```

## Matching Priority

Recommended categorization order:

1. Manual transaction override
2. Exact merchant/entity rule
3. User-defined raw category or personal finance category rule
4. Investment type rule
5. System default rule
6. Uncategorized

Manual overrides should always win.

If multiple rules match, use:

1. highest priority
2. most specific rule type
3. newest updated rule

Specificity ranking:

```text
transaction override > merchant_entity_id > merchant_name > personal_finance_category.detailed > raw category path > personal_finance_category.primary > description contains
```

## Suggested Initial User Categories

These are examples, not hard-coded final categories.

### Ordering Out

Potential matches:

```text
FOOD_AND_DRINK_RESTAURANT
FOOD_AND_DRINK_FAST_FOOD
FOOD_AND_DRINK_COFFEE
Food and Drink / Restaurants
Food and Drink / Restaurants / Fast Food
Food and Drink / Restaurants / Coffee Shop
Service / Food and Beverage
```

### Groceries

Potential matches:

```text
FOOD_AND_DRINK_GROCERIES
Shops / Supermarkets and Groceries
Shops / Food and Beverage Store
```

### Medical

Potential matches:

```text
MEDICAL
MEDICAL_PHARMACIES_AND_SUPPLEMENTS
MEDICAL_DENTAL_CARE
Shops / Pharmacies
```

### Transportation

Potential matches:

```text
TRANSPORTATION_TAXIS_AND_RIDE_SHARES
TRANSPORTATION_PUBLIC_TRANSIT
Travel / Taxi
Travel / Public Transportation Services
```

### Shopping And Lifestyle

Potential matches:

```text
GENERAL_MERCHANDISE
GENERAL_MERCHANDISE_CLOTHING_AND_ACCESSORIES
GENERAL_MERCHANDISE_ELECTRONICS
GENERAL_MERCHANDISE_ONLINE_MARKETPLACES
Shops / Department Stores
Shops / Computers and Electronics
Shops / Clothing and Accessories
PERSONAL_CARE
```

### Entertainment

Potential matches:

```text
ENTERTAINMENT
ENTERTAINMENT_VIDEO_GAMES
ENTERTAINMENT_TV_AND_MOVIES
ENTERTAINMENT_SPORTING_EVENTS_AMUSEMENT_PARKS_AND_MUSEUMS
Recreation / Arts and Entertainment
Recreation / Stadiums and Arenas
Service / Entertainment
```

### Transfers

Potential matches:

```text
TRANSFER_IN
TRANSFER_OUT
TRANSFER_OUT_ACCOUNT_TRANSFER
TRANSFER_IN_ACCOUNT_TRANSFER
Transfer / Third Party
Transfer / Credit
Transfer / Withdrawal
```

Transfers should usually be excluded from spending totals unless the user explicitly includes them.

### Credit Card Payments

Potential matches:

```text
LOAN_PAYMENTS_CREDIT_CARD_PAYMENT
Payment / Credit Card
```

Credit card payments should usually be treated as non-expense debt movement to avoid double-counting spending.

### Income

Potential matches:

```text
INCOME_WAGES
INCOME_TAX_REFUND
Transfer / Payroll
```

### Investing

Potential matches:

```text
investment.type = BUY
investment.type = SELL
investment.type = DIVIDEND
investment.type = CONTRIBUTION
investment.type = TRANSFER
investment.type = FEE
investment.type = REI
TRANSFER_OUT_INVESTMENT_AND_RETIREMENT_FUNDS
Service / Financial / Financial Planning and Investments
```

Investment activity should be summarized separately from daily spending.

## Proposed Database Additions

Add these tables:

```text
finance_user_categories
finance_category_rules
finance_transaction_category_assignments
```

### `finance_user_categories`

Purpose: user-defined display categories.

Fields:

```text
id
user_id
name
slug
color
icon
parent_id
include_in_spending
include_in_income
sort_order
created_at
updated_at
```

### `finance_category_rules`

Purpose: user-defined matching logic.

Fields:

```text
id
user_id
category_id
name
priority
match_logic
conditions
is_active
created_at
updated_at
```

Store `conditions` as JSONB so the rule engine can evolve without constant schema churn.

### `finance_transaction_category_assignments`

Purpose: materialized assignment result and audit trail.

Fields:

```text
id
user_id
transaction_id
category_id
source
matched_rule_id
confidence
created_at
updated_at
```

`source` values:

```text
manual
rule
system
uncategorized
```

Use a unique constraint on:

```text
user_id, transaction_id
```

## Recommended Implementation Order

1. Add category/rule/assignment tables.
2. Add rule evaluation functions with unit tests.
3. Seed default system categories and rules.
4. Add an assignment job/script that categorizes existing transactions.
5. Show assigned user category on `/finance`.
6. Add UI for editing categories.
7. Add UI for creating rules from a transaction.
8. Add manual transaction override.

## Important Product Decisions

Before finalizing the UI, decide:

- Should transfers be excluded from spending by default?
- Should investment buys/sells be excluded from daily spending by default?
- Should credit card payments be hidden or categorized as transfers to avoid double counting?
- Should categories support hierarchy, such as `Food -> Ordering Out` and `Food -> Groceries`?
- Should uncategorized transactions appear as an inbox/review queue?

## Key Takeaway

The strongest categorization system for AllMe should not use a single provider category. It should combine:

```text
raw provider categories
personal finance categories
merchant metadata
investment transaction types
user-defined matching rules
manual overrides
```

This gives the user the flexibility to define personal categories like `Ordering Out`, while still preserving provider metadata for future rule changes and reprocessing.

## Implementation Status

This section is intentionally not kept as the live status source. The first
categorization implementation has shipped and later finance tagging work added
self-serve tag management, manual assignments, uncategorized review entry
points, category filtering, and custom text-rule creation.

For current status, use `docs/DEVELOPMENT_STATUS.md`. For future finance
hardening candidates, use `docs/ai/NEXT_SLICES.md`.
