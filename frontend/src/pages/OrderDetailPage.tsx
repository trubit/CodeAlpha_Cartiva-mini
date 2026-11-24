/**
 * Cartiva Mini — Customer Order Detail Page
 * Full historical order inspection with delivery address, carrier, items, and status breakdown.
 */
import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Container,
  Row,
  Col,
  Card,
  Badge,
  Button,
  Spinner,
  Alert,
  Modal,
  Form,
} from 'react-bootstrap';
import { useOrderDetail, useCancelOrderMutation } from '@/hooks/useOrders';
import { getMediaUrl, handleImageError } from '@/utils/media.util';
import { formatDateTime } from '@/utils/date.util';
import { OrderStatus } from '@shared/enums';

export const OrderDetailPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const { data, isLoading, error } = useOrderDetail(orderId || '', Boolean(orderId));
  const order = data?.data;

  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState<{
    type: 'success' | 'danger';
    text: string;
  } | null>(null);

  const cancelMutation = useCancelOrderMutation();

  const handleConfirmCancel = async () => {
    if (!order) return;
    try {
      setFeedbackMessage(null);
      await cancelMutation.mutateAsync({
        identifier: order.orderNumber,
        reason: cancelReason.trim() || undefined,
      });
      setFeedbackMessage({
        type: 'success',
        text: 'Order cancelled successfully. Reserved inventory has been released.',
      });
      setIsCancelModalOpen(false);
    } catch (err: unknown) {
      setFeedbackMessage({
        type: 'danger',
        text: (err as Error).message || 'Failed to cancel order.',
      });
    }
  };

  const formatPrice = (amount: number, currency = 'NGN') => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  if (isLoading) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3 text-muted">Retrieving order details...</p>
      </Container>
    );
  }

  if (error || !order) {
    return (
      <Container className="py-5">
        <Alert variant="danger">
          <Alert.Heading>Order Not Found</Alert.Heading>
          <p>The requested order could not be found or you do not have permission to view it.</p>
          <Link to="/orders" className="btn btn-primary">
            Back to Orders
          </Link>
        </Alert>
      </Container>
    );
  }

  const isCancellable =
    order.orderStatus === OrderStatus.PENDING_PAYMENT ||
    order.orderStatus === OrderStatus.PAYMENT_FAILED;

  return (
    <Container className="py-5">
      {/* Header breadcrumb & actions */}
      <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-3 mb-4">
        <div>
          <Link to="/orders" className="text-decoration-none small text-muted mb-2 d-inline-block">
            ← Back to All Orders
          </Link>
          <div className="d-flex align-items-center gap-3">
            <h1 className="font-editorial h2 fw-bold mb-0">
              Order <span className="font-monospace text-primary">{order.orderNumber}</span>
            </h1>
            <Badge
              bg={order.orderStatus === 'cancelled' ? 'danger' : 'primary'}
              className="text-uppercase"
            >
              {order.orderStatus.replace('_', ' ')}
            </Badge>
          </div>
          <span className="text-muted small">
            Placed on {formatDateTime(order.createdAt)}
          </span>
        </div>

        <div className="d-flex gap-2">
          <Link to={`/orders/${order.id}/tracking`} className="btn btn-outline-primary btn-sm d-flex align-items-center gap-1">
            <span>🚚</span> Track Package
          </Link>
          {isCancellable && (
            <Button variant="outline-danger" size="sm" onClick={() => setIsCancelModalOpen(true)}>
              Cancel Order
            </Button>
          )}
        </div>
      </div>

      {feedbackMessage && (
        <Alert variant={feedbackMessage.type} dismissible onClose={() => setFeedbackMessage(null)}>
          {feedbackMessage.text}
        </Alert>
      )}

      {/* Phase 13 Pending Payment Banner */}
      {order.orderStatus === OrderStatus.PENDING_PAYMENT && (
        <Alert variant="warning" className="border-warning-subtle shadow-sm mb-4 p-3">
          <div className="d-flex align-items-center gap-3">
            <span style={{ fontSize: 24 }}>⏳</span>
            <div>
              <span className="fw-bold d-block text-dark">Payment Stage: Pending Verification</span>
              <span className="text-secondary small">
                Inventory reserved for this order (Ref:{' '}
                <code>{order.reservationReference || 'N/A'}</code>). Payment settlement will be
                handled in Phase 13.
              </span>
            </div>
          </div>
        </Alert>
      )}

      <Row className="g-4">
        {/* Left Column: Delivery & Items */}
        <Col lg={8}>
          {/* Destination Snapshot */}
          <Row className="g-3 mb-4">
            <Col sm={6}>
              <Card className="border shadow-sm h-100">
                <Card.Header className="bg-white py-2 fw-bold text-dark small">
                  Delivery Destination
                </Card.Header>
                <Card.Body className="small text-secondary">
                  <span className="fw-bold text-dark d-block mb-1">
                    {order.shippingAddress.recipientName}
                  </span>
                  {order.shippingAddress.streetAddress}
                  {order.shippingAddress.apartmentSuite &&
                    `, ${order.shippingAddress.apartmentSuite}`}
                  <br />
                  {order.shippingAddress.city}, {order.shippingAddress.state}
                  <br />
                  {order.shippingAddress.country}
                  <br />
                  <span className="text-muted">Phone: {order.shippingAddress.phone}</span>
                </Card.Body>
              </Card>
            </Col>

            <Col sm={6}>
              <Card className="border shadow-sm h-100">
                <Card.Header className="bg-white py-2 fw-bold text-dark small">
                  Shipping & Delivery Info
                </Card.Header>
                <Card.Body className="small text-secondary">
                  <span className="fw-bold text-dark d-block mb-1">
                    {order.shippingMethodName || 'Standard Delivery'}
                  </span>
                  <span>
                    Estimated Transit: {order.estimatedDeliveryText || '2–4 business days'}
                  </span>
                  <br />
                  {order.carrier && (
                    <span>
                      Carrier: {order.carrier}
                      <br />
                    </span>
                  )}
                  {order.trackingNumber && (
                    <span className="font-monospace text-primary fw-semibold">
                      Tracking #: {order.trackingNumber}
                      <br />
                    </span>
                  )}
                  <span className="text-primary fw-semibold mt-1 d-block">
                    Fee: {formatPrice(order.shippingFee, order.currency)}
                  </span>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* Purchased Items Table */}
          <Card className="border shadow-sm mb-4">
            <Card.Header className="bg-white py-3 border-bottom">
              <h5 className="mb-0 fw-bold">Ordered Items ({order.items.length})</h5>
            </Card.Header>
            <Card.Body className="p-0">
              <div className="table-responsive">
                <table className="table align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Product</th>
                      <th className="text-center">Quantity</th>
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
                              style={{ width: 48, height: 48 }}
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
            </Card.Body>
          </Card>

          {order.notes && (
            <Card className="border shadow-sm mb-4">
              <Card.Header className="bg-white py-2 fw-bold text-dark small">
                Order Notes
              </Card.Header>
              <Card.Body className="small text-secondary">{order.notes}</Card.Body>
            </Card>
          )}
        </Col>

        {/* Right Column: Financial Summary */}
        <Col lg={4}>
          <Card className="border shadow-sm sticky-top" style={{ top: 90 }}>
            <Card.Header className="bg-white py-3 border-bottom">
              <h5 className="mb-0 fw-bold">Financial Summary</h5>
            </Card.Header>
            <Card.Body className="p-4">
              <div className="d-flex justify-content-between mb-2">
                <span className="text-muted">Items Subtotal</span>
                <span className="fw-semibold">{formatPrice(order.subtotal, order.currency)}</span>
              </div>
              <div className="d-flex justify-content-between mb-2">
                <span className="text-muted">Shipping Fee</span>
                <span className="fw-semibold">
                  {formatPrice(order.shippingFee, order.currency)}
                </span>
              </div>
              {order.discountAmount > 0 && (
                <div className="d-flex justify-content-between mb-2 text-success">
                  <span>Discount</span>
                  <span>-{formatPrice(order.discountAmount, order.currency)}</span>
                </div>
              )}
              {order.taxAmount > 0 && (
                <div className="d-flex justify-content-between mb-2">
                  <span className="text-muted">Taxes</span>
                  <span className="fw-semibold">
                    {formatPrice(order.taxAmount, order.currency)}
                  </span>
                </div>
              )}
              <hr />
              <div className="d-flex justify-content-between align-items-baseline mb-4">
                <span className="h6 fw-bold mb-0">Total</span>
                <span className="h4 fw-bold text-primary mb-0">
                  {formatPrice(order.totalAmount, order.currency)}
                </span>
              </div>

              <div className="p-3 bg-light rounded border text-muted small">
                <div className="d-flex justify-content-between mb-1">
                  <span>Payment Status:</span>
                  <Badge
                    bg={order.paymentStatus === 'paid' ? 'success' : 'secondary'}
                    className="text-uppercase"
                  >
                    {order.paymentStatus}
                  </Badge>
                </div>
                <div className="d-flex justify-content-between">
                  <span>Reservation Ref:</span>
                  <code className="text-dark">{order.reservationReference || 'N/A'}</code>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Cancellation Modal */}
      <Modal show={isCancelModalOpen} onHide={() => setIsCancelModalOpen(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="fw-bold text-danger">Cancel Order</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>
            Are you sure you want to cancel order <strong>{order.orderNumber}</strong>?
          </p>
          <p className="text-secondary small">
            This will release the reserved inventory and stop processing.
          </p>
          <Form.Group className="mt-3">
            <Form.Label className="small fw-semibold">
              Reason for cancellation (Optional)
            </Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              placeholder="e.g. Changed my mind..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              maxLength={300}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => setIsCancelModalOpen(false)}>
            Keep Order
          </Button>
          <Button
            variant="danger"
            onClick={handleConfirmCancel}
            disabled={cancelMutation.isPending}
          >
            {cancelMutation.isPending ? 'Cancelling...' : 'Confirm Cancellation'}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};
