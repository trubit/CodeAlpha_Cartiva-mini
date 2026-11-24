# Notification Events & Business Integrations — Cartiva Mini

## 1. Overview

Every notification in Cartiva Mini is triggered by a real, verified backend business event. No fake or placeholder notifications are ever emitted.

## 2. Event Registry & Domain Mappings

| Domain | Business Trigger | Notification Type | Channels Dispatched | Recipient |
|---|---|---|---|---|
| **Auth** | Customer registers new account | `ACCOUNT_WELCOME` | In-App, Email | Customer |
| **Auth** | User requests password reset | `PASSWORD_RESET` | Email | Customer |
| **Auth** | User changes password | `PASSWORD_CHANGED` | In-App, Email | Customer |
| **Auth** | Password reset token verified | `SECURITY_ALERT` | In-App, Email | Customer |
| **Checkout** | Order placed & confirmed | `ORDER_CONFIRMED` | In-App, Email | Customer |
| **Payment** | Paystack webhook / verification passes | `PAYMENT_SUCCESS` | In-App, Email | Customer |
| **Payment** | Payment transaction fails | `PAYMENT_FAILED` | In-App, Email | Customer |
| **Payment** | Admin initiates refund | `REFUND_UPDATE` | In-App, Email | Customer |
| **Fulfilment**| Shipment created with dispatch | `ORDER_DISPATCHED` | In-App, Email | Customer |
| **Fulfilment**| Shipment marked delivered | `DELIVERY_COMPLETED`| In-App, Email | Customer |
| **Support** | Staff replies to customer ticket | `SUPPORT_RESPONSE` | In-App, Email | Customer |
| **Inventory** | Stock quantity reaches reorder point | `LOW_STOCK` | Email, In-App (if admin)| Administrator |

## 3. Integration Code Examples

### Checkout Confirmation (`checkout.service.ts`)
```ts
void notificationService.notify({
  eventType: NotificationType.ORDER_CONFIRMED,
  recipientId: order.userId.toString(),
  recipientEmail: customer.email,
  title: `Order Confirmed — #${order.orderNumber}`,
  message: `Your order #${order.orderNumber} for ${order.currency} ${order.totalAmount.toFixed(2)} has been confirmed.`,
  actionUrl: `/orders/${order.orderNumber}`,
  channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
  templateVariables: {
    customerName: customer.firstName,
    orderNumber: order.orderNumber,
    totalAmount: `${order.currency} ${order.totalAmount.toFixed(2)}`,
    actionUrl: `${config.FRONTEND_URL}/orders/${order.orderNumber}`,
  },
});
```

### Verified Payment (`payment.service.ts`)
```ts
void notificationService.notify({
  eventType: NotificationType.PAYMENT_SUCCESS,
  recipientId: payment.userId.toString(),
  recipientEmail: payment.customerEmail,
  title: `Payment Verified — #${payment.transactionReference}`,
  message: `Payment of ${payment.currency} ${payment.amount.toFixed(2)} was successfully verified.`,
  actionUrl: `/orders/${payment.orderNumber}`,
  channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
  templateVariables: {
    customerName: payment.customerName,
    orderNumber: payment.orderNumber,
    amount: `${payment.currency} ${payment.amount.toFixed(2)}`,
    transactionRef: payment.transactionReference,
    actionUrl: `${config.FRONTEND_URL}/orders/${payment.orderNumber}`,
  },
});
```
