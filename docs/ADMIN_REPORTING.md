# Cartiva Mini — Admin Reporting & Financial Analytics

## 1. Overview
The reporting engine provides business intelligence and export capabilities, computed from verified database transactions and orders.

## 2. Financial Accounting Rules
1. **Gross Sales:** The sum of all order totals whose payment status is verified as `PAID`. Unpaid, failed, or cancelled orders are strictly excluded from sales figures.
2. **Refund Deductions:** Total minor units refunded via the Paystack gateway during the specified reporting interval.
3. **Net Sales:** Calculated as `Gross Sales - Total Refunds`.
4. **Average Order Value (AOV):** `Gross Sales / Total Paid Orders`.
5. **No Profit Inflation:** The system does not claim gross or net profit metrics because supplier product acquisition costs are not tracked in the platform database. Only verifiable sales and refund figures are presented.

## 3. CSV Export Security & Formula Injection Defense
When generating CSV exports of orders and merchandise catalogs, the backend applies RFC 4180 sanitization:
- **Formula Prefix Neutralization:** If any text cell begins with an executable calculation operator (`=`, `+`, `-`, `@`, `\t`, or `\r`), it is prepended with a single quote (`'`). This prevents Excel and Google Sheets from interpreting customer names, SKU numbers, or addresses as dynamic formulas (CSV Injection / Formula Injection).
- **Internal Quote Escaping:** Double quotes within string cells are escaped as `""` and wrapped in quotes.

## 4. Endpoints & Export Interfaces
- `GET /api/v1/admin/reports/sales`: Daily financial breakdown and aggregated KPI metrics.
- `GET /api/v1/admin/reports/export/orders`: Sanitized CSV download of customer order records.
- `GET /api/v1/admin/reports/export/products`: Sanitized CSV export of product catalog and stock levels.
