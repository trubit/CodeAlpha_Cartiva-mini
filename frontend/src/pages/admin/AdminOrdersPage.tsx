/**
 * Cartiva Mini — Administrator Order Management Dashboard
 * Centralized interface for order inspection, search, filtering, status transitions, and audit trails.
 */
import React, { useState } from 'react';
import {
  Container,
  Card,
  Table,
  Badge,
  Button,
  Form,
  Row,
  Col,
  Spinner,
  Alert,
  Modal,
  Pagination,
} from 'react-bootstrap';
import {
  useAdminOrders,
  useUpdateAdminOrderStatusMutation,
  useAdminOrderAudit,
} from '@/hooks/useOrders';
import { OrderStatus, PaymentStatus } from '@shared/enums';
import type { OrderDetailDto } from '@shared/api.types';
import { formatDateTime } from '@/utils/date.util';

/**
 * Strict Order Status State Machine (Aligned with Backend)
 */
const PERMITTED_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PENDING_PAYMENT]: [
    OrderStatus.PAYMENT_PROCESSING,
    OrderStatus.CONFIRMED,
    OrderStatus.CANCELLED,
    OrderStatus.PAYMENT_FAILED,
  ],
  [OrderStatus.PAYMENT_PROCESSING]: [
    OrderStatus.CONFIRMED,
    OrderStatus.PAYMENT_FAILED,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.CONFIRMED]: [
    OrderStatus.PROCESSING,
    OrderStatus.CANCELLED,
    OrderStatus.REFUND_PENDING,
  ],
  [OrderStatus.PROCESSING]: [
    OrderStatus.PACKED,
    OrderStatus.READY_FOR_SHIPMENT,
    OrderStatus.CANCELLED,
    OrderStatus.REFUND_PENDING,
  ],
  [OrderStatus.PACKED]: [
    OrderStatus.READY_FOR_SHIPMENT,
    OrderStatus.SHIPPED,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.READY_FOR_SHIPMENT]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
  [OrderStatus.SHIPPED]: [
    OrderStatus.OUT_FOR_DELIVERY,
    OrderStatus.DELIVERED,
    OrderStatus.REFUND_PENDING,
  ],
  [OrderStatus.OUT_FOR_DELIVERY]: [
    OrderStatus.DELIVERED,
    OrderStatus.DELIVERY_FAILED,
    OrderStatus.REFUND_PENDING,
  ],
  [OrderStatus.DELIVERY_FAILED]: [
    OrderStatus.OUT_FOR_DELIVERY,
    OrderStatus.READY_FOR_SHIPMENT,
    OrderStatus.REFUND_PENDING,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.DELIVERED]: [OrderStatus.REFUND_PENDING],
  [OrderStatus.CANCELLED]: [],
  [OrderStatus.PAYMENT_FAILED]: [OrderStatus.PENDING_PAYMENT, OrderStatus.CANCELLED],
  [OrderStatus.REFUND_PENDING]: [OrderStatus.REFUNDED, OrderStatus.CONFIRMED],
  [OrderStatus.REFUNDED]: [],
};

export const AdminOrdersPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);

  const { data, isLoading, error, refetch } = useAdminOrders({
    search: search.trim() || undefined,
    orderStatus: (selectedStatus as OrderStatus) || undefined,
    paymentStatus: (selectedPaymentStatus as PaymentStatus) || undefined,
    page: currentPage,
    limit: 10,
  });

  const orders = data?.data || [];
  const meta = data?.meta;

  // Selected order for status update modal
  const [selectedOrderForStatus, setSelectedOrderForStatus] = useState<OrderDetailDto | null>(null);
  const [newStatus, setNewStatus] = useState<OrderStatus>(OrderStatus.PROCESSING);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [carrier, setCarrier] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [statusModalError, setStatusModalError] = useState<string | null>(null);

  // Selected order for audit modal
  const [auditOrderId, setAuditOrderId] = useState<string | null>(null);
  const { data: auditData, isLoading: isAuditLoading } = useAdminOrderAudit(
    auditOrderId || '',
    Boolean(auditOrderId)
  );
  const auditEntries = auditData?.data || [];

  const updateStatusMutation = useUpdateAdminOrderStatusMutation();

  const permittedNextStatuses = selectedOrderForStatus
    ? PERMITTED_STATUS_TRANSITIONS[selectedOrderForStatus.orderStatus] || []
    : [];
  const isTerminalStatus = Boolean(selectedOrderForStatus && permittedNextStatuses.length === 0);

  const handleOpenStatusModal = (order: OrderDetailDto) => {
    setSelectedOrderForStatus(order);
    const validTransitions = PERMITTED_STATUS_TRANSITIONS[order.orderStatus] || [];
    setNewStatus(validTransitions[0] ?? order.orderStatus);
    setTrackingNumber(order.trackingNumber || '');
    setCarrier(order.carrier || '');
    setAdminNotes('');
    setStatusModalError(null);
  };

  const handleUpdateStatus = async () => {
    if (!selectedOrderForStatus || isTerminalStatus) return;
    try {
      setStatusModalError(null);
      await updateStatusMutation.mutateAsync({
        identifier: selectedOrderForStatus.orderNumber,
        data: {
          orderStatus: newStatus,
          trackingNumber: trackingNumber.trim() || undefined,
          carrier: carrier.trim() || undefined,
          notes: adminNotes.trim() || undefined,
        },
      });
      setSelectedOrderForStatus(null);
      refetch();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } }; message?: string };
      setStatusModalError(
        axiosErr.response?.data?.message || axiosErr.message || 'Failed to update order status.'
      );
    }
  };

  const formatPrice = (amount: number, currency = 'NGN') => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.PENDING_PAYMENT:
        return (
          <Badge bg="warning" text="dark">
            PENDING PAYMENT
          </Badge>
        );
      case OrderStatus.CONFIRMED:
        return <Badge bg="info">CONFIRMED</Badge>;
      case OrderStatus.PROCESSING:
        return <Badge bg="primary">PROCESSING</Badge>;
      case OrderStatus.PACKED:
        return <Badge bg="secondary">PACKED</Badge>;
      case OrderStatus.READY_FOR_SHIPMENT:
        return (
          <Badge bg="info" text="dark">
            READY FOR SHIPMENT
          </Badge>
        );
      case OrderStatus.SHIPPED:
        return <Badge bg="primary">SHIPPED</Badge>;
      case OrderStatus.OUT_FOR_DELIVERY:
        return <Badge bg="info">OUT FOR DELIVERY</Badge>;
      case OrderStatus.DELIVERED:
        return <Badge bg="success">DELIVERED</Badge>;
      case OrderStatus.CANCELLED:
        return <Badge bg="danger">CANCELLED</Badge>;
      default:
        return <Badge bg="secondary">{status}</Badge>;
    }
  };

  return (
    <Container fluid className="py-4 px-lg-5">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <span className="badge bg-primary-subtle text-primary fw-semibold px-3 py-1 rounded-pill mb-2">
            Administrator Portal
          </span>
          <h1 className="font-editorial h2 fw-bold mb-1">
            Order <span className="italic-accent">Management</span>
          </h1>
          <p className="text-muted small mb-0">
            Authoritative order monitoring, status lifecycle execution, and audit tracking.
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <Card className="border shadow-sm mb-4">
        <Card.Body className="p-3">
          <Row className="g-3 align-items-end">
            <Col md={4}>
              <Form.Label className="small fw-semibold text-secondary">Search Orders</Form.Label>
              <Form.Control
                type="text"
                placeholder="Search by order #, email, phone, name..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </Col>

            <Col md={3}>
              <Form.Label className="small fw-semibold text-secondary">Order Status</Form.Label>
              <Form.Select
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="">All Order Statuses</option>
                {Object.values(OrderStatus).map((status) => (
                  <option key={status} value={status}>
                    {status.toUpperCase().replace('_', ' ')}
                  </option>
                ))}
              </Form.Select>
            </Col>

            <Col md={3}>
              <Form.Label className="small fw-semibold text-secondary">Payment Status</Form.Label>
              <Form.Select
                value={selectedPaymentStatus}
                onChange={(e) => {
                  setSelectedPaymentStatus(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="">All Payment Statuses</option>
                {Object.values(PaymentStatus).map((status) => (
                  <option key={status} value={status}>
                    {status.toUpperCase()}
                  </option>
                ))}
              </Form.Select>
            </Col>

            <Col md={2}>
              <Button
                variant="outline-secondary"
                className="w-100"
                onClick={() => {
                  setSearch('');
                  setSelectedStatus('');
                  setSelectedPaymentStatus('');
                  setCurrentPage(1);
                }}
              >
                Reset Filters
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Orders Table */}
      <Card className="border shadow-sm">
        <Card.Body className="p-0">
          {isLoading ? (
            <div className="py-5 text-center">
              <Spinner animation="border" variant="primary" />
              <p className="mt-3 text-muted">Loading administrative orders...</p>
            </div>
          ) : error ? (
            <Alert variant="danger" className="m-4">
              Failed to load administrative orders. Check permissions.
            </Alert>
          ) : orders.length === 0 ? (
            <div className="py-5 text-center text-muted">
              <p className="mb-0">No orders match the current filter criteria.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <Table hover className="align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Order Reference</th>
                    <th>Customer Contact</th>
                    <th>Destination</th>
                    <th>Items</th>
                    <th>Total Amount</th>
                    <th>Order Status</th>
                    <th>Payment</th>
                    <th>Reservation Ref</th>
                    <th>Created At</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id}>
                      <td>
                        <span className="fw-bold font-monospace text-primary">
                          {order.orderNumber}
                        </span>
                      </td>
                      <td>
                        <div className="small">
                          <span className="fw-semibold text-dark d-block">
                            {order.customerEmail}
                          </span>
                          <span className="text-muted">{order.customerPhone}</span>
                        </div>
                      </td>
                      <td>
                        <div className="small">
                          <span className="fw-semibold text-dark d-block">
                            {order.shippingAddress.recipientName}
                          </span>
                          <span className="text-muted">
                            {order.shippingAddress.city}, {order.shippingAddress.state}
                          </span>
                        </div>
                      </td>
                      <td className="text-center fw-semibold">
                        {order.items.reduce((acc, it) => acc + it.quantity, 0)}
                      </td>
                      <td className="fw-bold text-dark">
                        {formatPrice(order.totalAmount, order.currency)}
                      </td>
                      <td>{getStatusBadge(order.orderStatus)}</td>
                      <td>
                        <Badge
                          bg={order.paymentStatus === 'paid' ? 'success' : 'secondary'}
                          className="text-uppercase"
                        >
                          {order.paymentStatus}
                        </Badge>
                      </td>
                      <td>
                        <code className="small text-dark">
                          {order.reservationReference
                            ? order.reservationReference.slice(0, 16) + '...'
                            : 'N/A'}
                        </code>
                      </td>
                      <td className="text-muted small">
                        {formatDateTime(order.createdAt)}
                      </td>
                      <td className="text-end">
                        <div className="d-inline-flex gap-2">
                          <Button
                            variant="outline-primary"
                            size="sm"
                            onClick={() => handleOpenStatusModal(order)}
                          >
                            Update
                          </Button>
                          <Button
                            variant="outline-secondary"
                            size="sm"
                            onClick={() => setAuditOrderId(order.orderNumber)}
                          >
                            Audit
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </Card.Body>

        {meta && meta.totalPages > 1 && (
          <Card.Footer className="bg-white py-3 d-flex justify-content-between align-items-center">
            <span className="text-muted small">
              Showing page {meta.page} of {meta.totalPages} ({meta.total} total orders)
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
          </Card.Footer>
        )}
      </Card>

      {/* Admin Status Transition Modal */}
      <Modal
        show={Boolean(selectedOrderForStatus)}
        onHide={() => setSelectedOrderForStatus(null)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title className="fw-bold">
            Update Status: {selectedOrderForStatus?.orderNumber}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {statusModalError && <Alert variant="danger">{statusModalError}</Alert>}

          <div className="p-3 bg-light rounded border mb-3 small">
            <div className="d-flex justify-content-between mb-1">
              <span>Current Status:</span>
              <span className="fw-bold text-dark">{selectedOrderForStatus?.orderStatus}</span>
            </div>
            <div className="d-flex justify-content-between">
              <span>Payment Status:</span>
              <span className="fw-bold text-dark">{selectedOrderForStatus?.paymentStatus}</span>
            </div>
          </div>

          {isTerminalStatus ? (
            <Alert variant="secondary" className="mb-3">
              Order <strong>{selectedOrderForStatus?.orderNumber}</strong> is currently{' '}
              <strong>{selectedOrderForStatus?.orderStatus.toUpperCase().replace('_', ' ')}</strong>,
              which is a terminal state. No further status transitions are permitted.
            </Alert>
          ) : (
            <Form.Group className="mb-3">
              <Form.Label className="small fw-semibold">New Order Status</Form.Label>
              <Form.Select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as OrderStatus)}
              >
                {permittedNextStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status.toUpperCase().replace('_', ' ')}
                  </option>
                ))}
              </Form.Select>
              <Form.Text className="text-muted small">
                Permitted transitions: {permittedNextStatuses.map((s) => s.toUpperCase().replace('_', ' ')).join(', ')}
              </Form.Text>
            </Form.Group>
          )}

          <Row className="g-2 mb-3">
            <Col sm={6}>
              <Form.Label className="small fw-semibold">Carrier Name</Form.Label>
              <Form.Control
                type="text"
                placeholder="e.g. GIG Logistics, DHL"
                value={carrier}
                onChange={(e) => setCarrier(e.target.value)}
                disabled={isTerminalStatus}
              />
            </Col>
            <Col sm={6}>
              <Form.Label className="small fw-semibold">Tracking Number</Form.Label>
              <Form.Control
                type="text"
                placeholder="e.g. TRK-98127394"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                disabled={isTerminalStatus}
              />
            </Col>
          </Row>

          <Form.Group>
            <Form.Label className="small fw-semibold">Administrative Notes (Audit log)</Form.Label>
            <Form.Control
              as="textarea"
              rows={2}
              placeholder="Reason for change or dispatch notes..."
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              disabled={isTerminalStatus}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => setSelectedOrderForStatus(null)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleUpdateStatus}
            disabled={isTerminalStatus || updateStatusMutation.isPending}
          >
            {updateStatusMutation.isPending ? 'Updating...' : 'Save Status Update'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Audit Log Modal */}
      <Modal show={Boolean(auditOrderId)} onHide={() => setAuditOrderId(null)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title className="fw-bold">Audit Log History: {auditOrderId}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {isAuditLoading ? (
            <div className="py-4 text-center">
              <Spinner animation="border" size="sm" variant="primary" />
              <span className="ms-2 text-muted">Retrieving audit trail...</span>
            </div>
          ) : auditEntries.length === 0 ? (
            <p className="text-muted mb-0">No audit events recorded for this order yet.</p>
          ) : (
            <div className="table-responsive">
              <Table size="sm" className="mb-0">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Action</th>
                    <th>User / Performer</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {auditEntries.map((log, idx: number) => (
                    <tr key={idx}>
                      <td className="small text-muted">
                        {new Date(log.createdAt).toLocaleString('en-NG')}
                      </td>
                      <td>
                        <Badge bg="secondary">{log.action}</Badge>
                      </td>
                      <td className="small">
                        {log.userId?.email || log.userId?.firstName || 'System'}
                      </td>
                      <td className="small font-monospace text-secondary">
                        {JSON.stringify(log.details)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setAuditOrderId(null)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};
