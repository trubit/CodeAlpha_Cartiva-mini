# Cartiva Mini — Delivery Tracking System
**Phase 14: Order Fulfilment & Tracking**

---

## 1. Customer Tracking Experience

Customers can monitor their packages through two dedicated interfaces:
1. **Dedicated Tracking Page (`/orders/:orderId/tracking`):**
   - 5-stage milestone stepper (`Confirmed` → `Processing` → `Packed` → `Dispatched` → `Delivered`).
   - Active waypoint alerts (e.g. exception notices with rescheduling info).
   - Carrier snapshot: Carrier name, tracking number, and optional external courier link.
   - Chronological event timeline.
   - Destination address and ordered items summary.
2. **Order Details Page (`/orders/:orderId`):**
   - Includes direct "Track Package" action and status indicators.

---

## 2. Tracking Event Structure

Every tracking update is persisted as an append-only event:

```typescript
export interface ITrackingEvent {
  eventId: string;
  status: ShipmentStatus;
  title: string;
  description: string;
  location?: string;
  timestamp: Date;
  source: TrackingEventSource; // 'manual' | 'carrier' | 'system'
  actorId?: string;
  actorName?: string;
  metadata?: Record<string, unknown>;
}
```

---

## 3. Event Source Transparency

To guarantee transparency and trust:
- **`manual`:** Events entered by authorized Cartiva Mini fulfilment staff are tagged as `Verified Dispatch Event` along with the staff member's name.
- **`carrier`:** Automated third-party webhook updates are tagged as `Automated Courier Sync`.
- **`system`:** Automated order lifecycle events (e.g. payment verified) are tagged as system events.
- Manual entries are never misrepresented as live GPS or automated courier API feeds.
