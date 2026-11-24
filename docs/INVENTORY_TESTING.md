# Cartiva Mini — Inventory Testing Guide

## 1. Test Overview

Phase 8 automated test suites validate inventory initialization, operational stock modifications, variation-level isolation, reservation lifecycle, overselling protection under high concurrency, alert generation with deduplication, and administrative authorization guards.

---

## 2. Test Suites Summary

| Test Suite File                                    | Focus Area                                                                        | Tests  |
| :------------------------------------------------- | :-------------------------------------------------------------------------------- | :----: |
| `tests/inventory/inventory-initialization.test.ts` | Initial stock setup, duplicate rejection, negative input prevention               |   4    |
| `tests/inventory/inventory-operations.test.ts`     | Stock receive, deduction, adjustment, threshold updates, movements                |   6    |
| `tests/inventory/inventory-variations.test.ts`     | Variation isolation, SKU resolution, parent sync, invalid refs                    |   4    |
| `tests/inventory/inventory-reservations.test.ts`   | Atomic reservations, idempotency, release, auto-expiry                            |   6    |
| `tests/inventory/inventory-concurrency.test.ts`    | Concurrent reservations (`Promise.all`), overselling guard, race condition safety |   2    |
| `tests/inventory/inventory-alerts.test.ts`         | Low-stock trigger, 12h alert deduplication, out-of-stock detection, RBAC          |   5    |
| **Total Phase 8 Test Coverage**                    |                                                                                   | **27** |

---

## 3. Running Automated Tests

### Run Inventory Tests Only

```bash
npm test tests/inventory/
```

### Run Full Repository Test Suite (Phases 1–8)

```bash
npm test
```

### Run TypeScript Verification

```bash
npm run typecheck
```

### Run Linter & Formatter Verification

```bash
npm run lint
npm run format:check
```

### Run Production Build

```bash
npm run build
```

---

## 4. Test Environment Isolation

All tests connect to isolated, ephemeral test databases (e.g., `cartiva-mini-inventory-init-test`, `cartiva-mini-inventory-concurrency-test`). Collections are wiped before each suite runs (`beforeAll`) and teardown hooks clean up documents and close database connections upon completion (`afterAll`).
