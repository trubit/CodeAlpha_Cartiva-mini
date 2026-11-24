# Cartiva Mini — Delivery Exception Handling
**Phase 14: Order Fulfilment & Tracking**

---

## 1. Exception Types & Scenarios

The system handles legitimate real-world delivery disruptions via `DeliveryExceptionType`:

- `CUSTOMER_UNAVAILABLE`: Recipient unreachable via phone or intercom at delivery location.
- `INCORRECT_ADDRESS`: Missing street, landmark, or invalid apartment number.
- `DELIVERY_DELAYED`: Traffic congestion, vehicle breakdown, or road closure.
- `RESCHEDULED_DELIVERY`: Customer requested a different delivery date/time.
- `RETURN_TO_SENDER`: Undeliverable after maximum retry attempts.
- `DAMAGED_IN_TRANSIT`: Package compromised during courier transport.
- `WEATHER_DELAY`: Severe weather preventing transit.

---

## 2. Handling Rules & Integrity

1. **Non-Destructive Exception Recording:**
   - Recording an exception **never** automatically cancels the order or triggers an unauthorized refund.
   - The shipment status moves to `DELIVERY_ATTEMPTED` (or `EXCEPTION`).
   - The order status moves to `DELIVERY_FAILED` or retains its active state with an updated `estimatedDeliveryDate`.

2. **Customer Visibility:**
   - Exception notices are prominently displayed at the top of the customer tracking view.
   - A clear explanation and rescheduled delivery date are communicated to reduce customer anxiety.

3. **Re-Attempt Workflow:**
   - Once the issue is resolved (e.g. correct phone number confirmed), authorized staff re-dispatch the package.
   - Status transitions from `DELIVERY_FAILED` back to `OUT_FOR_DELIVERY`.
