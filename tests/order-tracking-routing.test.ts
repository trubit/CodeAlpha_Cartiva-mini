import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('Order Tracking Route & Fulfilment Integration Verification', () => {
  const routesPath = resolve(__dirname, '../frontend/src/routes/index.tsx');
  const trackingPagePath = resolve(__dirname, '../frontend/src/pages/OrderTrackingPage.tsx');
  const orderDetailPath = resolve(__dirname, '../frontend/src/pages/OrderDetailPage.tsx');
  const ordersPagePath = resolve(__dirname, '../frontend/src/pages/OrdersPage.tsx');

  it('registers canonical tracking route under orders layout in AppRoutes', () => {
    const content = readFileSync(routesPath, 'utf-8');
    // Must contain canonical child route under orders
    expect(content).toContain('path=":orderId/tracking"');
    expect(content).toContain('element={<OrderTrackingPage />}');
  });

  it('registers tracking aliases for resilient URL matching', () => {
    const content = readFileSync(routesPath, 'utf-8');
    expect(content).toContain('path=":orderId/track"');
    expect(content).toContain('path="track/:orderId"');
  });

  it('registers account-scoped tracking aliases for backwards compatibility', () => {
    const content = readFileSync(routesPath, 'utf-8');
    expect(content).toContain('path="orders/:orderId/tracking"');
    expect(content).toContain('path="orders/:orderId/track"');
    expect(content).toContain('path="orders/track/:orderId"');
  });

  it('supports resilient parameter resolution in OrderTrackingPage', () => {
    const content = readFileSync(trackingPagePath, 'utf-8');
    // Extracts both orderId and orderNumber
    expect(content).toContain('params.orderId || params.orderNumber');
    expect(content).toContain('useCustomerTracking');
  });

  it('provides direct tracking links in OrderDetailPage', () => {
    const content = readFileSync(orderDetailPath, 'utf-8');
    expect(content).toContain('/orders/${order.id}/tracking');
  });

  it('provides direct tracking action button in OrdersPage list', () => {
    const content = readFileSync(ordersPagePath, 'utf-8');
    expect(content).toContain('/orders/${order.id}/tracking');
  });
});

