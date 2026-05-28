# Kashley PocketBase Schema

Kashley is a personal finance tracker backed by PocketBase at `http://100.111.93.26:8090`.
This document is the source of truth for the v1 database shape. Create the collections in the
PocketBase admin UI before using the app against the live server.

## Global Conventions

- Private finance data must never be readable or writable by unauthenticated visitors.
- Every finance collection has a required `user` relation to the `users` auth collection.
- Ownership rules use `@request.auth.id = user.id` for list, view, create, update, and delete.
- Amounts are stored in PocketBase `number` fields and the app validates two decimal places.
- v1 uses one user-level default currency. The default is `PHP`.
- Recommended indexes:
  - All collections with `user`: index `user`.
  - Date-driven collections: compound index `user, occurredAt` or `user, nextRunAt`.
  - Budget uniqueness: unique-ish operational rule of one budget per `user, category, month`.

## `users` Auth Collection

Use PocketBase's built-in auth collection named `users`.

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `name` | text | no | Display name. |
| `defaultCurrency` | select | yes | Default `PHP`; add more currency choices later only when reports support conversion. |
| `monthlyBudget` | number | no | Optional high-level spending target. |
| `timezone` | text | yes | Default `Asia/Manila`. |

## `accounts`

Tracks where money lives.

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `user` | relation -> `users` | yes | Max select: 1. |
| `name` | text | yes | Example: Cash, BDO Payroll, GCash. |
| `type` | select | yes | `cash`, `bank`, `credit_card`, `e_wallet`, `savings`, `investment`, `other`. |
| `startingBalance` | number | no | App supplies `0` by default. Do not mark required because PocketBase can treat `0` as blank. |
| `currentBalance` | number | no | App supplies `0` by default; updated by app logic from transactions. |
| `isArchived` | bool | no | App supplies `false` by default. Do not mark required because PocketBase can treat `false` as blank. |

Rules: list/view/create/update/delete all use `@request.auth.id = user.id`.

## `categories`

Classifies income and expenses. Seed defaults by creating user-owned records after registration.

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `user` | relation -> `users` | yes | Max select: 1. |
| `name` | text | yes | Category label. |
| `kind` | select | yes | `income` or `expense`. |
| `color` | text | yes | Hex color, app-level validation. |
| `icon` | text | no | Icon key used by the frontend. |
| `isSystem` | bool | no | App supplies `false`; default categories copied for each user can set `true`. |
| `isArchived` | bool | no | App supplies `false` by default. |

Rules: list/view/create/update/delete all use `@request.auth.id = user.id`.

Seed suggestions:

- Income: Salary, Freelance, Gift, Interest
- Expense: Food, Transport, Bills, Rent, Shopping, Health, Entertainment, Savings

## `transactions`

Manual income, expenses, and account transfers.

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `user` | relation -> `users` | yes | Max select: 1. |
| `account` | relation -> `accounts` | yes | Source account for expenses/transfers; destination for income. |
| `category` | relation -> `categories` | no | Required by app validation for income and expense. |
| `debt` | relation -> `debts` | no | Set when the transaction was created as a debt payment. |
| `type` | select | yes | `income`, `expense`, `transfer`. |
| `amount` | number | yes | Positive amount. |
| `occurredAt` | date | yes | Transaction date/time. |
| `merchant` | text | no | Payee/source label. |
| `notes` | editor or text | no | Use text if rich notes are unnecessary. |
| `transferAccount` | relation -> `accounts` | no | Required by app validation for transfers. |
| `isRecurringGenerated` | bool | no | App supplies `false` by default. |

Rules: list/view/create/update/delete all use `@request.auth.id = user.id`.

App validation:

- `amount` must be greater than `0` and have no more than two decimals.
- `income` and `expense` require `category`.
- `transfer` requires `transferAccount` and must not use the same account twice.

## `budgets`

Monthly category budgets.

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `user` | relation -> `users` | yes | Max select: 1. |
| `category` | relation -> `categories` | yes | Usually an expense category. |
| `period` | select | yes | v1 only uses `monthly`. |
| `month` | date | yes | Store the first day of the budget month. |
| `amount` | number | yes | Monthly budget amount. |
| `alertThreshold` | number | no | Percent threshold, default `80`. |

Rules: list/view/create/update/delete all use `@request.auth.id = user.id`.

## `debts`

Simple tracker for personal utang, credit card balances, and installments.

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `user` | relation -> `users` | yes | Max select: 1. |
| `name` | text | yes | Example: Gemuel, BPI Card, Phone installment. |
| `kind` | select | yes | `personal`, `credit_card`, or `installment`. |
| `amount` | number | yes | Original amount owed. |
| `paidAmount` | number | no | Amount paid so far. App supplies `0` by default. |
| `dueDate` | date | no | Optional due date. |
| `notes` | text | no | Optional context like `711 food last night`. |
| `isArchived` | bool | no | App supplies `false` by default. |

Rules: list/view/create/update/delete all use `@request.auth.id = user.id`.

Recommended indexes: `user`, `user, kind`, `user, dueDate`.

Debt payments increase `paidAmount`. If the user chooses to create an expense transaction, the frontend also stores a `transactions` row with the optional `debt` relation and updates the funding account balance.

## `recurring_transactions`

Templates for expected repeating income, bills, transfers, or savings moves.

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `user` | relation -> `users` | yes | Max select: 1. |
| `account` | relation -> `accounts` | yes | Primary account. |
| `category` | relation -> `categories` | no | Required by app validation for income and expense. |
| `type` | select | yes | `income`, `expense`, `transfer`. |
| `amount` | number | yes | Positive amount. |
| `merchant` | text | no | Payee/source label. |
| `notes` | editor or text | no | Use text if rich notes are unnecessary. |
| `frequency` | select | yes | `weekly`, `biweekly`, `monthly`, `yearly`. |
| `nextRunAt` | date | yes | Next expected generation date. |
| `isActive` | bool | no | App supplies `true` by default. |

Rules: list/view/create/update/delete all use `@request.auth.id = user.id`.

## `goals`

Savings or payoff targets.

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `user` | relation -> `users` | yes | Max select: 1. |
| `name` | text | yes | Goal name. |
| `targetAmount` | number | yes | Goal amount. |
| `currentAmount` | number | no | App supplies `0` by default. |
| `targetDate` | date | no | Optional deadline. |
| `account` | relation -> `accounts` | no | Linked savings/payment account. |
| `isCompleted` | bool | no | App supplies `false` by default. |

Rules: list/view/create/update/delete all use `@request.auth.id = user.id`.

## Frontend Smoke Test Checklist

- Register a user and confirm `defaultCurrency` is `PHP`.
- Login persists after refresh through the PocketBase auth store.
- Create at least one account and one category from the app.
- Create income, expense, and transfer transaction records.
- Confirm list screens only show records where `user` matches the authenticated user.
- Create a budget and goal linked to the expected category/account.
- Create a debt, record a payment, and confirm the transaction, account balance, and debt balance all update.
