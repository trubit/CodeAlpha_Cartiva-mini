/**
 * Cartiva Mini — Customer Order History Page
 * Displays paginated order list with live status indicators, item previews, and self-service cancellation.
 * Adaptive responsive layout: Desktop table view & Mobile/Tablet touch-friendly card view.
 */
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Container,
  Table,
  Badge,
  Button,
  Card,
  Spinner,
  Alert,
  Modal,
  Form,
  Pagination,
} from 'react-bootstrap';
import { useMyOrders, useCancelOrderMutation } from '@/hooks/useOrders';
import { getMediaUrl, handleImageError } from '@/utils/media.util';
import { formatDate } from '@/utils/date.util';
import { OrderStatus } from '@shared/enums';

export const OrdersPage: React.FC = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const { data, isLoading, error } = useMyOrders(currentPage, 10);
  const orders = data?.data || [];
  const meta = data?.meta;

  const [orderToCancel, setOrderToCancel] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState<{
    type: 'success' | 'danger';
    text: string;
  } | null>(null);

  const cancelMutation = useCancelOrderMutation();

  const handleConfirmCancel = async () => {
    if (!orderToCancel) return;
    try {
      setFeedbackMessage(null);
      await cancelMutation.mutateAsync({
        identifier: orderToCancel,
        reason: cancelReason.trim() || undefined,
      });
      setFeedbackMessage({
        type: 'success',
        text: `Order ${orderToCancel} has been cancelled successfully. Any reserved stock has been released.`,
      });
      setOrderToCancel(null);
      setCancelReason('');
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

  const getStatusBadgeVariant = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.PENDING_PAYMENT:
        return 'warning';
      case OrderStatus.CONFIRMED:
      case OrderStatus.PROCESSING:
        return 'info';
      case OrderStatus.SHIPPED:
      case OrderStatus.OUT_FOR_DELIVERY:
        return 'primary';
      case OrderStatus.DELIVERED:
        return 'success';
      case OrderStatus.CANCELLED:
      case OrderStatus.PAYMENT_FAILED:
        return 'danger';
      default:
        return 'secondary';
    }
  };

  if (isLoading) {
    return (
      <Container className="py-4 py-sm-5 text-center">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3 text-muted">Loading your order history...</p>
      </Container>
    );
  }

  return (
    <Container className="py-3 py-sm-4 py-md-5 px-2 px-sm-3">
      {/* Header with breadcrumb and actions */}
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4">
        <div>
          <span className="badge bg-primary-subtle text-primary fw-semibold px-3 py-1 rounded-pill mb-2">
            Order Management
          </span>
          <h1 className="font-editorial display-6 fw-bold mb-0" style={{ fontSize: 'clamp(1.5rem, 4vw, 2.25rem)' }}>
            My <span className="italic-accent">Orders</span>
          </h1>
        </div>
        <Link to="/" className="btn btn-outline-primary btn-sm">
          Continue Shopping
        </Link>
      </div>

      {feedbackMessage && (
        <Alert variant={feedbackMessage.type} dismissible onClose={() => setFeedbackMessage(null)}>
          {feedbackMessage.text}
        </Alert>
      )}

      {error ? (
        <Alert variant="danger">
          Could not load your orders. Please sign in or refresh the page.
        </Alert>
      ) : orders.length === 0 ? (
        <Card className="border text-center py-5 shadow-sm">
          <Card.Body>
            <div className="text-muted mb-3" style={{ fontSize: 48 }}>
              📦
            </div>
            <h4 className="fw-bold mb-2">No Orders Found</h4>
            <p className="text-secondary mb-4">
              You have not placed any orders with Cartiva Mini yet.
            </p>
            <Link to="/" className="btn btn-primary">
              Discover Products
            </Link>
          </Card.Body>
        </Card>
      ) : (
        <>
          {/* ===================================================================
              1. MOBILE & TABLET PORTRAIT CARD VIEW (< 768px / d-md-none)
              Eliminates horizontal scrolling, clipping, and text truncation
              =================================================================== */}
          <div className="d-md-none d-flex flex-column gap-3 mb-4">
            {orders.map((order) => {
              const isCancellable =
                order.orderStatus === OrderStatus.PENDING_PAYMENT ||
                order.orderStatus === OrderStatus.PAYMENT_FAILED;

              return (
                <Card key={order.id} className="border shadow-sm rounded-3 overflow-hidden">
                  <Card.Header className="bg-light py-2 px-3 d-flex justify-content-between align-items-center">
                    <span className="fw-bold text-dark font-monospace small">
                      {order.orderNumber}
                    </span>
                    <Badge
                      bg={getStatusBadgeVariant(order.orderStatus)}
                      className="text-uppercase"
                      style={{ fontSize: '0.7rem' }}
                    >
                      {order.orderStatus.replace('_', ' ')}
                    </Badge>
                  </Card.Header>

                  <Card.Body className="p-3">
                    {/* Date placed & Payment Status */}
                    <div className="d-flex justify-content-between align-items-center mb-2 small">
                      <span className="text-muted">{formatDate(order.createdAt)}</span>
                      <Badge
                        bg={order.paymentStatus === 'paid' ? 'success' : 'secondary'}
                        className="text-uppercase"
                        style={{ fontSize: '0.65rem' }}
                      >
                        Payment: {order.paymentStatus}
                      </Badge>
                    </div>

                    {/* Product Preview & Total Amount */}
                    <div className="d-flex align-items-center gap-3 py-2 border-top border-bottom my-2">
                      <img
                        src={getMediaUrl(order.firstItemThumbnailUrl)}
                        alt={order.firstItemTitle}
                        onError={handleImageError}
                        className="rounded border object-fit-cover flex-shrink-0"
                        style={{ width: 56, height: 56 }}
                      />
                      <div className="min-w-0 flex-grow-1">
                        <span className="fw-semibold text-dark d-block text-truncate">
                          {order.firstItemTitle}
                        </span>
                        <span className="text-muted small d-block">
                          {order.itemCount} item{order.itemCount > 1 ? 's' : ''} total
                        </span>
                        <div className="fw-bold text-primary fs-6 mt-1">
                          {formatPrice(order.totalAmount, order.currency)}
                        </div>
                      </div>
                    </div>

                    {/* Actions Button Group (Touch-optimized >= 44px) */}
                    <div className="d-flex gap-2 mt-3">
                      <Link
                        to={`/orders/${order.id}/tracking`}
                        className="btn btn-outline-primary btn-sm flex-fill py-2 fw-semibold d-flex align-items-center justify-content-center gap-1"
                      >
                        <span>🚚</span> Track
                      </Link>
                      <Link
                        to={`/orders/${order.orderNumber}`}
                        className="btn btn-primary btn-sm flex-fill py-2 fw-semibold d-flex align-items-center justify-content-center"
                      >
                        Details
                      </Link>
                      {isCancellable && (
                        <Button
                          variant="outline-danger"
                          size="sm"
                          className="py-2 px-3 fw-semibold"
                          onClick={() => setOrderToCancel(order.orderNumber)}
                        >
                          Cancel
                        </Button>
                      )}
                    </div>
                  </Card.Body>
                </Card>
              );
            })}
          </div>

          {/* ===================================================================
              2. DESKTOP & TABLET LANDSCAPE TABLE VIEW (>= 768px / d-none d-md-block)
              =================================================================== */}
          <Card className="border shadow-sm mb-4 d-none d-md-block">
            <Card.Body className="p-0">
              <div className="table-responsive">
                <Table hover className="align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Order Reference</th>
                      <th>Date Placed</th>
                      <th>Items Preview</th>
                      <th>Total Amount</th>
                      <th>Order Status</th>
                      <th>Payment</th>
                      <th className="text-end">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => {
                      const isCancellable =
                        order.orderStatus === OrderStatus.PENDING_PAYMENT ||
                        order.orderStatus === OrderStatus.PAYMENT_FAILED;

                      return (
                        <tr key={order.id}>
                          <td>
                            <span className="fw-bold text-dark font-monospace">
                              {order.orderNumber}
                            </span>
                          </td>
                          <td className="text-secondary small">
                            {formatDate(order.createdAt)}
                          </td>
                          <td>
                            <div className="d-flex align-items-center gap-2">
                              <img
                                src={getMediaUrl(order.firstItemThumbnailUrl)}
                                alt={order.firstItemTitle}
                                onError={handleImageError}
                                className="rounded border object-fit-cover"
                                style={{ width: 36, height: 36 }}
                              />
                              <div>
                                <span
                                  className="fw-semibold text-dark d-block text-truncate"
                                  style={{ maxWidth: 200 }}
                                >
                                  {order.firstItemTitle}
                                </span>
                                <span className="text-muted small">
                                  {order.itemCount} item{order.itemCount > 1 ? 's' : ''} total
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="fw-bold text-dark">
                            {formatPrice(order.totalAmount, order.currency)}
                          </td>
                          <td>
                            <Badge
                              bg={getStatusBadgeVariant(order.orderStatus)}
                              className="text-uppercase"
                            >
                              {order.orderStatus.replace('_', ' ')}
                            </Badge>
                          </td>
                          <td>
                            <Badge
                              bg={order.paymentStatus === 'paid' ? 'success' : 'secondary'}
                              className="text-uppercase"
                            >
                              {order.paymentStatus}
                            </Badge>
                          </td>
                          <td className="text-end">
                            <div className="d-inline-flex gap-2">
                              <Link
                                to={`/orders/${order.id}/tracking`}
                                className="btn btn-outline-secondary btn-sm"
                              >
                                Track
                              </Link>
                              <Link
                                to={`/orders/${order.orderNumber}`}
                                className="btn btn-outline-primary btn-sm"
                              >
                                Details
                              </Link>
                              {isCancellable && (
                                <Button
                                  variant="outline-danger"
                                  size="sm"
                                  onClick={() => setOrderToCancel(order.orderNumber)}
                                >
                                  Cancel
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>
              </div>
            </Card.Body>
          </Card>

          {/* Pagination Controls */}
          {meta && meta.totalPages > 1 && (
            <Card className="border shadow-sm mb-4">
              <Card.Body className="py-3 d-flex flex-column flex-sm-row justify-content-between align-items-center gap-2">
                <span className="text-muted small">
                  Showing page {meta.page} of {meta.totalPages} ({meta.total} orders)
                </span>
                <Pagination className="mb-0" size="sm">
                  <Pagination.Prev
                    disabled={!meta.hasPrevPage}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  />
                  {[...Array(meta.totalPages)].map((_, i) => (
                    <Pagination.Item
                      key={i + 1}
                      active={i + 1 === currentPage}
                      onClick={() => setCurrentPage(i + 1)}
                    >
                      {i + 1}
                    </Pagination.Item>
                  ))}
                  <Pagination.Next
                    disabled={!meta.hasNextPage}
                    onClick={() => setCurrentPage((p) => p + 1)}
                  />
                </Pagination>
              </Card.Body>
            </Card>
          )}
        </>
      )}

      {/* Cancellation Confirmation Modal */}
      <Modal show={Boolean(orderToCancel)} onHide={() => setOrderToCancel(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="fw-bold text-danger">Cancel Order</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>
            Are you sure you want to cancel order <strong>{orderToCancel}</strong>?
          </p>
          <p className="text-secondary small">
            Cancelling this order will immediately release any reserved inventory back into stock.
          </p>
          <Form.Group className="mt-3">
            <Form.Label className="small fw-semibold">
              Reason for cancellation (Optional)
            </Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              placeholder="e.g. Changed my mind, ordered by mistake..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              maxLength={300}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => setOrderToCancel(null)}>
            Keep Order
          </Button>
          <Button
            variant="danger"
            onClick={handleConfirmCancel}
            disabled={cancelMutation.isPending}
          >
            {cancelMutation.isPending ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Cancelling...
              </>
            ) : (
              'Confirm Cancellation'
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};
