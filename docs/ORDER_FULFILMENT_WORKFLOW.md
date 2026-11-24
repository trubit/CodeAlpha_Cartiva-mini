# Cartiva Mini — Order Fulfilment Workflow
**Phase 14: Order Fulfilment & Tracking**

---

## 1. Fulfilment Lifecycle Sequence

The Cartiva Mini fulfilment lifecycle follows a controlled state machine:

```
[ PENDING_PAYMENT ] ──► (Payment Verification via Paystack)
         │
         ▼
    [ CONFIRMED ] (Eligible for Fulfilment)
         │
         ▼
   [ PROCESSING ] (Items collected and staged in warehouse)
         │
         ▼
     [ PACKED ] (Sealed, verified, and packaged)
         │
         ▼
[ READY_FOR_SHIPMENT ] (Staged in dispatch bay with carrier label)
         │
         ▼
     [ SHIPPED ] (Dispatched to carrier with waybill reference)
         │
         ▼
[ OUT_FOR_DELIVERY ] (Courier in transit to destination)
         │
         ├──────────────────────────────────────────┐
         ▼                                          ▼
   [ DELIVERED ]                          [ DELIVERY_FAILED ]
 (Signed with Proof of Delivery)         (Exception: Re-attempt scheduled)
                                                    │
                                                    ▼
                                          [ OUT_FOR_DELIVERY ]
```

---

## 2. Permitted Status Transitions

| From Status | Permitted Next Statuses | Business Rule |
| :--- | :--- | :--- |
| `CONFIRMED` | `PROCESSING`, `CANCELLED`, `REFUND_PENDING` | Initiates warehouse picking. |
| `PROCESSING` | `PACKED`, `READY_FOR_SHIPMENT`, `CANCELLED` | Packaging completed. |
| `PACKED` | `READY_FOR_SHIPMENT`, `SHIPPED` | Sealed and boxed. |
| `READY_FOR_SHIPMENT` | `SHIPPED`, `CANCELLED` | Carrier handover. |
| `SHIPPED` | `OUT_FOR_DELIVERY`, `DELIVERED` | Waybill issued and in transit. |
| `OUT_FOR_DELIVERY` | `DELIVERED`, `DELIVERY_FAILED` | Last-mile courier run. |
| `DELIVERY_FAILED` | `OUT_FOR_DELIVERY`, `READY_FOR_SHIPMENT` | Rescheduled delivery attempt. |
| `DELIVERED` | `REFUND_PENDING` | Terminal state; casual rollbacks blocked. |

---

## 3. Mandatory Guardrails
- **No Unpaid Progression:** Attempting to move an unpaid order to `PROCESSING` or create a shipment throws `ORDER_NOT_ELIGIBLE_FOR_FULFILMENT`.
- **No Skipping Stages:** Transitions cannot skip intermediate stages (e.g. `CONFIRMED -> DELIVERED` directly is rejected).
- **Audit Trails:** Every status transition automatically creates a persistent `AuditLog` entry attributing the action to the authenticated staff member.
