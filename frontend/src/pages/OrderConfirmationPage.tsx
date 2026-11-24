/**
 * Cartiva Mini — Order Confirmation Page
 * High-trust order confirmation displaying authoritative snapshot, atomic stock reservation,
 * and transparent pending-payment disclosure (Phase 13 boundary).
 */
import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { Container, Row, Col, Card, Badge, Spinner, Alert } from 'react-bootstrap';
import { useOrderDetail } from '@/hooks/useOrders';
import { getMediaUrl, handleImageError } from '@/utils/media.util';
import { formatDateTime } from '@/utils/date.util';

export const OrderConfirmationPage: React.FC = () => {
  const { orderNumber } = useParams<{ orderNumber: string }>();
  const { data, isLoading, error } = useOrderDetail(orderNumber || '', Boolean(orderNumber));
  const order = data?.data;

  if (isLoading) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3 text-muted">Retrieving order confirmation details...</p>
      </Container>
    );
  }

  if (error || !order) {
    return (
      <Container className="py-5">
        <Alert variant="danger">
          <Alert.Heading>Order Not Found</Alert.Heading>
          <p>We could not find the order reference you requested.</p>
          <Link to="/orders" className="btn btn-primary">
            View My Orders
          </Link>
        </Alert>
      </Container>
    );
  }

  const formatPrice = (amount: number, currency = 'NGN') => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <Container className="py-5">
      <div className="max-w-3xl mx-auto" style={{ maxWidth: 800, margin: '0 auto' }}>
        {/* Success Header */}
        <div className="text-center mb-5">
          <div
            className="d-inline-flex align-items-center justify-content-center bg-success-subtle text-success rounded-circle mb-3 shadow-sm"
            style={{ width: 72, height: 72, fontSize: 32 }}
          >
            ✓
          </div>
          <span className="d-block badge bg-primary-subtle text-primary fw-semibold px-3 py-1 rounded-pill mb-2">
            Order Reference: {order.orderNumber}
          </span>
          <h1 className="font-editorial display-6 fw-bold mb-2">
            Thanks for your <span className="italic-accent">order!</span>
          </h1>
          <p className="text-muted">
            Thank you for shopping with Cartiva Mini. A confirmation snapshot has been registered.
          </p>
        </div>

        {/* Phase 13 Pending Payment Disclosure Alert */}
        <Alert variant="warning" className="border-warning-subtle shadow-sm mb-4 p-4">
          <div className="d-flex align-items-start gap-3">
            <span style={{ fontSize: 24 }}>⏳</span>
            <div>
              <h5 className="fw-bold mb-1 text-dark">Payment Stage: Pending Verification</h5>
              <p className="mb-2 text-secondary small">
                In accordance with Cartiva Mini&apos;s strict financial isolation rules, your order
                has been created with inventory atomically reserved for 30 minutes (Ref:{' '}
                <code>{order.reservationReference || 'N/A'}</code>).
              </p>
              <p className="mb-0 text-secondary small fw-semibold">
                Payment gateway settlement via Paystack will be activated in Phase 13. Your items
                remain guaranteed in stock during this window.
              </p>
            </div>
          </div>
        </Alert>

        {/* Order Details Card */}
        <Card className="border shadow-sm mb-4">
          <Card.Header className="bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
            <div>
              <span className="text-muted small d-block">Order Placed</span>
              <span className="fw-semibold text-dark">
                {formatDateTime(order.createdAt)}
              </span>
            </div>
            <div className="text-end">
              <span className="text-muted small d-block mb-1">Status</span>
              <div className="d-flex gap-2">
                <Badge bg="warning" text="dark">
                  {order.orderStatus.toUpperCase()}
                </Badge>
                <Badge bg="secondary">{order.paymentStatus.toUpperCase()}</Badge>
              </div>
            </div>
          </Card.Header>

          <Card.Body className="p-4">
            {/* Delivery Destination Snapshot */}
            <Row className="mb-4 g-3">
              <Col md={6}>
                <div className="p-3 bg-light rounded border h-100">
                  <h6 className="fw-bold text-dark mb-2">Delivery Destination</h6>
                  <div className="text-secondary small">
                    <span className="fw-semibold text-dark d-block">
                      {order.shippingAddress.recipientName}
                    </span>
                    {order.shippingAddress.streetAddress}
                    {order.shippingAddress.apartmentSuite &&
                      `, ${order.shippingAddress.apartmentSuite}`}
                    <br />
                    {order.shippingAddress.city}, {order.shippingAddress.state}
                    <br />
                    {order.shippingAddress.country} • Phone: {order.shippingAddress.phone}
                  </div>
                </div>
              </Col>
              <Col md={6}>
                <div className="p-3 bg-light rounded border h-100">
                  <h6 className="fw-bold text-dark mb-2">Shipping Information</h6>
                  <div className="text-secondary small">
                    <span className="fw-semibold text-dark d-block">
                      {order.shippingMethodName || 'Standard Delivery'}
                    </span>
                    <span>
                      Transit Estimate: {order.estimatedDeliveryText || '2–4 business days'}
                    </span>
                    <br />
                    <span className="mt-1 d-block text-primary fw-semibold">
                      Fee: {formatPrice(order.shippingFee, order.currency)}
                    </span>
                  </div>
                </div>
              </Col>
            </Row>

            {/* What you ordered */}
            <h6 className="fw-bold text-dark mb-3">What you ordered:</h6>
            <div className="table-responsive mb-4">
              <table className="table align-middle">
                <thead className="table-light">
                  <tr>
                    <th>Item</th>
                    <th className="text-center">Qty</th>
                    <th className="text-end">Unit Price</th>
                    <th className="text-end">Line Total</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item, idx) => (
                    <tr key={idx}>
                      <td>
                        <div className="d-flex align-items-center gap-3">
                          <img
                            src={getMediaUrl(item.thumbnailUrl)}
                            alt={item.title}
                            onError={handleImageError}
                            className="rounded border object-fit-cover"
                            style={{ width: 44, height: 44 }}
                          />
                          <div>
                            <div className="fw-semibold text-dark">{item.title}</div>
                            <div className="text-muted small">SKU: {item.sku}</div>
                          </div>
                        </div>
                      </td>
                      <td className="text-center fw-semibold">{item.quantity}</td>
                      <td className="text-end text-muted">
                        {formatPrice(item.unitPrice, order.currency)}
                      </td>
                      <td className="text-end fw-bold text-dark">
                        {formatPrice(item.subtotal, order.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Financial Breakdown */}
            <div className="p-3 bg-light rounded border ms-auto" style={{ maxWidth: 360 }}>
              <div className="d-flex justify-content-between mb-2 small">
                <span className="text-muted">Subtotal</span>
                <span className="fw-semibold">{formatPrice(order.subtotal, order.currency)}</span>
              </div>
              <div className="d-flex justify-content-between mb-2 small">
                <span className="text-muted">Shipping Charges</span>
                <span className="fw-semibold">
                  {formatPrice(order.shippingFee, order.currency)}
                </span>
              </div>
              {order.discountAmount > 0 && (
                <div className="d-flex justify-content-between mb-2 small text-success">
                  <span>Discounts</span>
                  <span>-{formatPrice(order.discountAmount, order.currency)}</span>
                </div>
              )}
              <hr className="my-2" />
              <div className="d-flex justify-content-between fw-bold text-dark">
                <span>Grand Total</span>
                <span className="text-primary">
                  {formatPrice(order.totalAmount, order.currency)}
                </span>
              </div>
            </div>
          </Card.Body>
        </Card>

        {/* Action Buttons */}
        <div className="d-flex flex-column flex-sm-row gap-3 justify-content-center">
          {order.paymentStatus !== 'paid' && order.paymentStatus !== 'successful' && (
            <Link
              to={`/checkout/payment/${order.orderNumber}`}
              className="btn btn-success btn-lg px-4 fw-bold shadow-sm"
            >
              Pay Now with Paystack →
            </Link>
          )}
          <Link to="/orders" className="btn btn-primary btn-lg px-4 fw-bold">
            View My Orders
          </Link>
          <Link to="/" className="btn btn-outline-secondary btn-lg px-4">
            Continue Shopping
          </Link>
        </div>
      </div>
    </Container>
  );
};
