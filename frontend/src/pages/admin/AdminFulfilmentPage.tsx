/**
 * Cartiva Mini — Administrator Fulfilment & Delivery Operations Portal
 * Comprehensive management of paid orders, warehouse preparation, carrier booking,
 * append-only tracking events, delivery confirmations, and exception handling.
 */
import React, { useState } from 'react';
import {
  Container,
  Row,
  Col,
  Card,
  Table,
  Badge,
  Button,
  Form,
  Spinner,
  Alert,
  Modal,
  Nav,
  Tab,
} from 'react-bootstrap';
import {
  useAdminFulfilmentOrders,
  useAdminFulfilmentOrderDetail,
  useUpdateFulfilmentStatusMutation,
  useCreateShipmentMutation,
  useAddTrackingEventMutation,
  useConfirmDeliveryMutation,
  useRecordDeliveryExceptionMutation,
} from '@/hooks/useFulfilment';
import {
  OrderStatus,
  PaymentStatus,
  ShipmentStatus,
  DeliveryExceptionType,
} from '@shared/enums';
import type {
  OrderFulfilmentDetailDto,
} from '@shared/api.types';
import { formatDateTime } from '@/utils/date.util';

export const AdminFulfilmentPage: React.FC = () => {
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [page, setPage] = useState<number>(1);

  // Modal State
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('overview');

  // Form States for Modal
  const [advanceStatus, setAdvanceStatus] = useState<OrderStatus>(OrderStatus.PROCESSING);
  const [advanceNotes, setAdvanceNotes] = useState<string>('');

  // Shipment Form
  const [carrierName, setCarrierName] = useState<string>('Cartiva In-House Logistics');
  const [carrierService, setCarrierService] = useState<string>('Express Direct');
  const [trackingNumber, setTrackingNumber] = useState<string>('');
  const [trackingUrl, setTrackingUrl] = useState<string>('');
  const [estimatedDeliveryDate, setEstimatedDeliveryDate] = useState<string>('');
  const [dispatchNow, setDispatchNow] = useState<boolean>(false);
  const [shipmentNotes, setShipmentNotes] = useState<string>('');

  // Event Form
  const [eventStatus, setEventStatus] = useState<ShipmentStatus>(ShipmentStatus.IN_TRANSIT);
  const [eventTitle, setEventTitle] = useState<string>('');
  const [eventDescription, setEventDescription] = useState<string>('');
  const [eventLocation, setEventLocation] = useState<string>('Lagos Sorting Hub');

  // Confirmation Form
  const [deliveredTo, setDeliveredTo] = useState<string>('');
  const [deliveryNotes, setDeliveryNotes] = useState<string>('');
  const [actualDeliveryDate, setActualDeliveryDate] = useState<string>('');

  // Exception Form
  const [exceptionType, setExceptionType] = useState<DeliveryExceptionType>(
    DeliveryExceptionType.CUSTOMER_UNAVAILABLE
  );
  const [exceptionDesc, setExceptionDesc] = useState<string>('');
  const [exceptionLocation, setExceptionLocation] = useState<string>('');
  const [rescheduledDate, setRescheduledDate] = useState<string>('');

  // Feedback Banner
  const [feedback, setFeedback] = useState<{ type: 'success' | 'danger'; text: string } | null>(
    null
  );

  // Queries & Mutations
  const { data, isLoading, error, refetch } = useAdminFulfilmentOrders({
    status: (selectedStatus as OrderStatus) || undefined,
    search: searchTerm.trim() || undefined,
    page,
    limit: 15,
  });

  const { data: detailData, isLoading: isDetailLoading } = useAdminFulfilmentOrderDetail(
    selectedOrderId || '',
    Boolean(selectedOrderId)
  );

  const activeOrder: OrderFulfilmentDetailDto | undefined = detailData?.data;

  const updateStatusMutation = useUpdateFulfilmentStatusMutation();
  const createShipmentMutation = useCreateShipmentMutation();
  const addEventMutation = useAddTrackingEventMutation();
  const confirmDeliveryMutation = useConfirmDeliveryMutation();
  const recordExceptionMutation = useRecordDeliveryExceptionMutation();

  const orders = data?.data || [];
  const meta = data?.meta;

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateStr?: string) => {
    return formatDateTime(dateStr, 'N/A');
  };

  const handleOpenModal = (orderId: string, initialTab = 'overview') => {
    setSelectedOrderId(orderId);
    setActiveTab(initialTab);
    setFeedback(null);
  };

  const handleCloseModal = () => {
    setSelectedOrderId(null);
    setFeedback(null);
  };

  // Actions
  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderId) return;
    try {
      setFeedback(null);
      await updateStatusMutation.mutateAsync({
        orderId: selectedOrderId,
        data: {
          status: advanceStatus,
          notes: advanceNotes.trim() || undefined,
        },
      });
      setFeedback({ type: 'success', text: `Order status advanced to ${advanceStatus}.` });
      setAdvanceNotes('');
      refetch();
    } catch (err: unknown) {
      setFeedback({ type: 'danger', text: (err as Error).message || 'Failed to update status.' });
    }
  };

  const handleCreateShipment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderId) return;
    try {
      setFeedback(null);
      await createShipmentMutation.mutateAsync({
        orderId: selectedOrderId,
        data: {
          carrierName: carrierName.trim(),
          carrierService: carrierService.trim() || undefined,
          trackingNumber: trackingNumber.trim() || undefined,
          trackingUrl: trackingUrl.trim() || undefined,
          estimatedDeliveryDate: estimatedDeliveryDate
            ? new Date(estimatedDeliveryDate).toISOString()
            : undefined,
          deliveryNotes: shipmentNotes.trim() || undefined,
          dispatchNow,
        },
      });
      setFeedback({
        type: 'success',
        text: 'Shipment created and tracking reference initialized.',
      });
      refetch();
    } catch (err: unknown) {
      setFeedback({ type: 'danger', text: (err as Error).message || 'Failed to create shipment.' });
    }
  };

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrder?.shipment?.id) return;
    try {
      setFeedback(null);
      await addEventMutation.mutateAsync({
        shipmentId: activeOrder.shipment.id,
        data: {
          status: eventStatus,
          title: eventTitle.trim(),
          description: eventDescription.trim(),
          location: eventLocation.trim() || undefined,
        },
      });
      setFeedback({ type: 'success', text: 'Tracking event recorded to immutable timeline.' });
      setEventTitle('');
      setEventDescription('');
      refetch();
    } catch (err: unknown) {
      setFeedback({ type: 'danger', text: (err as Error).message || 'Failed to add event.' });
    }
  };

  const handleConfirmDelivery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrder?.shipment?.id) return;
    try {
      setFeedback(null);
      await confirmDeliveryMutation.mutateAsync({
        shipmentId: activeOrder.shipment.id,
        data: {
          deliveredTo: deliveredTo.trim(),
          deliveryNotes: deliveryNotes.trim() || undefined,
          actualDeliveryDate: actualDeliveryDate
            ? new Date(actualDeliveryDate).toISOString()
            : undefined,
        },
      });
      setFeedback({ type: 'success', text: 'Delivery confirmed and order marked DELIVERED.' });
      setDeliveredTo('');
      setDeliveryNotes('');
      refetch();
    } catch (err: unknown) {
      setFeedback({
        type: 'danger',
        text: (err as Error).message || 'Failed to confirm delivery.',
      });
    }
  };

  const handleRecordException = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrder?.shipment?.id) return;
    try {
      setFeedback(null);
      await recordExceptionMutation.mutateAsync({
        shipmentId: activeOrder.shipment.id,
        data: {
          exceptionType,
          description: exceptionDesc.trim(),
          location: exceptionLocation.trim() || undefined,
          rescheduledDeliveryDate: rescheduledDate
            ? new Date(rescheduledDate).toISOString()
            : undefined,
        },
      });
      setFeedback({
        type: 'success',
        text: 'Delivery exception logged and recorded in audit trail.',
      });
      setExceptionDesc('');
      refetch();
    } catch (err: unknown) {
      setFeedback({
        type: 'danger',
        text: (err as Error).message || 'Failed to record exception.',
      });
    }
  };

  return (
    <Container fluid className="py-5 px-lg-5">
      {/* Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h1 className="h2 fw-bold mb-1">Fulfilment & Delivery Operations</h1>
          <p className="text-muted small mb-0">
            Process paid orders, book couriers, append real-time tracking events, and confirm
            deliveries.
          </p>
        </div>
        <div className="d-flex gap-2 align-items-center">
          <Button variant="outline-primary" size="sm" onClick={() => refetch()}>
            ↻ Refresh Data
          </Button>
        </div>
      </div>

      {/* Filter Tabs */}
      <Card className="border shadow-sm mb-4">
        <Card.Body className="p-3">
          <Nav
            variant="pills"
            className="flex-wrap gap-2"
            activeKey={selectedStatus}
            onSelect={(k) => {
              setSelectedStatus(k || '');
              setPage(1);
            }}
          >
            <Nav.Item>
              <Nav.Link eventKey="" className="py-1 px-3 small">
                All Orders
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey={OrderStatus.CONFIRMED} className="py-1 px-3 small">
                Ready for Preparation (Confirmed)
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey={OrderStatus.PROCESSING} className="py-1 px-3 small">
                In Processing
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey={OrderStatus.PACKED} className="py-1 px-3 small">
                Packed
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey={OrderStatus.READY_FOR_SHIPMENT} className="py-1 px-3 small">
                Ready for Dispatch
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey={OrderStatus.SHIPPED} className="py-1 px-3 small">
                Shipped / In Transit
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey={OrderStatus.OUT_FOR_DELIVERY} className="py-1 px-3 small">
                Out for Delivery
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey={OrderStatus.DELIVERED} className="py-1 px-3 small">
                Delivered
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey={OrderStatus.DELIVERY_FAILED} className="py-1 px-3 small">
                Delivery Failed / Exceptions
              </Nav.Link>
            </Nav.Item>
          </Nav>

          <hr className="my-3 text-muted" />

          {/* Search bar */}
          <Form
            onSubmit={(e) => {
              e.preventDefault();
              setPage(1);
              refetch();
            }}
          >
            <Row className="g-2">
              <Col md={6}>
                <Form.Control
                  placeholder="Search by Order # (e.g. ORD-), Customer Email, or Waybill..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  size="sm"
                />
              </Col>
              <Col md={3}>
                <Button variant="primary" size="sm" type="submit" className="w-100">
                  Search Fulfilment Orders
                </Button>
              </Col>
              {searchTerm && (
                <Col md={2}>
                  <Button
                    variant="outline-secondary"
                    size="sm"
                    onClick={() => {
                      setSearchTerm('');
                      setPage(1);
                    }}
                  >
                    Clear Filter
                  </Button>
                </Col>
              )}
            </Row>
          </Form>
        </Card.Body>
      </Card>

      {/* Main Table */}
      <Card className="border shadow-sm">
        <Card.Header className="bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
          <span className="fw-bold">Fulfilment Queue</span>
          <span className="text-muted small">
            Showing {orders.length} of {meta?.total || 0} order(s)
          </span>
        </Card.Header>

        <Card.Body className="p-0">
          {isLoading ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" />
              <p className="mt-2 text-muted small">Loading fulfilment records...</p>
            </div>
          ) : error ? (
            <Alert variant="danger" className="m-3">
              Failed to load fulfilment records. Please try again.
            </Alert>
          ) : orders.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <p className="mb-1">No orders found matching the selected filter criteria.</p>
              <small>Orders must have verified payments to qualify for fulfilment.</small>
            </div>
          ) : (
            <div className="table-responsive">
              <Table hover className="align-middle mb-0">
                <thead className="table-light small text-uppercase">
                  <tr>
                    <th>Order #</th>
                    <th>Customer</th>
                    <th>Date Placed</th>
                    <th>Items</th>
                    <th>Amount</th>
                    <th>Payment</th>
                    <th>Fulfilment Status</th>
                    <th>Carrier / Tracking</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody className="small">
                  {orders.map(({ order, shipment }) => {
                    const isPaid =
                      order.paymentStatus === PaymentStatus.PAID ||
                      order.paymentStatus === PaymentStatus.SUCCESSFUL;
                    const isDelivered = order.orderStatus === OrderStatus.DELIVERED;
                    const isException = order.orderStatus === OrderStatus.DELIVERY_FAILED;

                    return (
                      <tr key={order.id}>
                        <td>
                          <span className="fw-bold font-monospace text-primary">
                            {order.orderNumber}
                          </span>
                        </td>
                        <td>
                          <div>{order.shippingAddress.recipientName}</div>
                          <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                            {order.customerEmail}
                          </div>
                        </td>
                        <td>{formatDate(order.createdAt)}</td>
                        <td>{order.items.reduce((acc, it) => acc + it.quantity, 0)} pcs</td>
                        <td className="fw-bold">{formatPrice(order.totalAmount)}</td>
                        <td>
                          <Badge bg={isPaid ? 'success' : 'warning'} className="text-uppercase">
                            {order.paymentStatus}
                          </Badge>
                        </td>
                        <td>
                          <Badge
                            bg={
                              isDelivered
                                ? 'success'
                                : isException
                                ? 'danger'
                                : order.orderStatus === OrderStatus.CONFIRMED
                                ? 'info'
                                : 'primary'
                            }
                            className="text-uppercase"
                          >
                            {order.orderStatus.replace(/_/g, ' ')}
                          </Badge>
                        </td>
                        <td>
                          {shipment ? (
                            <div>
                              <strong className="d-block">{shipment.carrierName}</strong>
                              <span className="text-muted font-monospace" style={{ fontSize: '0.75rem' }}>
                                {shipment.trackingNumber}
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted fst-italic">No shipment booked</span>
                          )}
                        </td>
                        <td className="text-end">
                          <Button
                            variant="primary"
                            size="sm"
                            className="me-2"
                            onClick={() => handleOpenModal(order.id, 'overview')}
                          >
                            Manage
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </div>
          )}
        </Card.Body>

        {/* Pagination footer */}
        {meta && meta.totalPages > 1 && (
          <Card.Footer className="bg-white py-3 d-flex justify-content-between align-items-center">
            <span className="text-muted small">
              Page {meta.page} of {meta.totalPages}
            </span>
            <div className="d-flex gap-2">
              <Button
                variant="outline-secondary"
                size="sm"
                disabled={!meta.hasPrevPage}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                variant="outline-secondary"
                size="sm"
                disabled={!meta.hasNextPage}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </Card.Footer>
        )}
      </Card>

      {/* Comprehensive Fulfilment Management Modal */}
      <Modal show={Boolean(selectedOrderId)} onHide={handleCloseModal} size="xl" centered>
        <Modal.Header closeButton className="border-bottom">
          <Modal.Title className="h5 fw-bold mb-0">
            Fulfilment Operations —{' '}
            <span className="text-primary font-monospace">{activeOrder?.order.orderNumber}</span>
          </Modal.Title>
        </Modal.Header>

        <Modal.Body className="p-4">
          {isDetailLoading || !activeOrder ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" />
              <p className="mt-2 text-muted">Retrieving order details...</p>
            </div>
          ) : (
            <>
              {feedback && (
                <Alert
                  variant={feedback.type}
                  dismissible
                  onClose={() => setFeedback(null)}
                  className="mb-4"
                >
                  {feedback.text}
                </Alert>
              )}

              {/* Status Banner */}
              <div className="bg-light p-3 rounded-3 mb-4 d-flex flex-wrap justify-content-between align-items-center gap-2">
                <div>
                  <span className="text-muted small d-block">Order Fulfilment Status</span>
                  <Badge bg="primary" className="text-uppercase fs-6">
                    {activeOrder.order.orderStatus.replace(/_/g, ' ')}
                  </Badge>
                </div>
                <div>
                  <span className="text-muted small d-block">Verified Payment</span>
                  <Badge
                    bg={
                      activeOrder.order.paymentStatus === PaymentStatus.PAID ? 'success' : 'warning'
                    }
                    className="text-uppercase fs-6"
                  >
                    {activeOrder.order.paymentStatus}
                  </Badge>
                </div>
                <div>
                  <span className="text-muted small d-block">Total Payable</span>
                  <strong className="h6 mb-0 text-dark">
                    {formatPrice(activeOrder.order.totalAmount)}
                  </strong>
                </div>
              </div>

              {/* Navigation Tabs */}
              <Tab.Container activeKey={activeTab} onSelect={(k) => setActiveTab(k || 'overview')}>
                <Nav variant="tabs" className="mb-4">
                  <Nav.Item>
                    <Nav.Link eventKey="overview">Overview & Advance Status</Nav.Link>
                  </Nav.Item>
                  <Nav.Item>
                    <Nav.Link eventKey="shipment">
                      {activeOrder.shipment ? 'Shipment Details' : 'Book Shipment'}
                    </Nav.Link>
                  </Nav.Item>
                  <Nav.Item>
                    <Nav.Link eventKey="event" disabled={!activeOrder.shipment}>
                      + Append Tracking Event
                    </Nav.Link>
                  </Nav.Item>
                  <Nav.Item>
                    <Nav.Link
                      eventKey="delivery"
                      disabled={
                        !activeOrder.shipment ||
                        activeOrder.order.orderStatus === OrderStatus.DELIVERED
                      }
                    >
                      Confirm Delivery
                    </Nav.Link>
                  </Nav.Item>
                  <Nav.Item>
                    <Nav.Link eventKey="exception" disabled={!activeOrder.shipment}>
                      Report Exception
                    </Nav.Link>
                  </Nav.Item>
                  <Nav.Item>
                    <Nav.Link eventKey="timeline">Timeline History ({activeOrder.timeline.length})</Nav.Link>
                  </Nav.Item>
                </Nav>

                <Tab.Content>
                  {/* Tab 1: Overview & Advance Status */}
                  <Tab.Pane eventKey="overview">
                    <Row className="g-4">
                      <Col lg={7}>
                        <h6 className="fw-bold mb-3">Purchased Items</h6>
                        <div className="list-group list-group-flush border rounded-3 mb-4">
                          {activeOrder.order.items.map((it, idx) => (
                            <div
                              key={idx}
                              className="list-group-item d-flex justify-content-between align-items-center py-2"
                            >
                              <div>
                                <span className="fw-bold d-block text-dark">{it.title}</span>
                                <span className="text-muted small">
                                  SKU: <code>{it.sku}</code> • Qty: {it.quantity}
                                </span>
                              </div>
                              <span className="fw-bold small">{formatPrice(it.subtotal)}</span>
                            </div>
                          ))}
                        </div>

                        <h6 className="fw-bold mb-2">Delivery Destination</h6>
                        <Card className="bg-light border-0 p-3 mb-4">
                          <strong className="text-dark">
                            {activeOrder.order.shippingAddress.recipientName} (
                            {activeOrder.order.shippingAddress.phone})
                          </strong>
                          <div className="text-secondary small mt-1">
                            {activeOrder.order.shippingAddress.streetAddress}
                            {activeOrder.order.shippingAddress.apartmentSuite &&
                              `, ${activeOrder.order.shippingAddress.apartmentSuite}`}
                            , {activeOrder.order.shippingAddress.city},{' '}
                            {activeOrder.order.shippingAddress.state},{' '}
                            {activeOrder.order.shippingAddress.country}
                          </div>
                        </Card>
                      </Col>

                      <Col lg={5}>
                        <Card className="border p-3 shadow-sm">
                          <h6 className="fw-bold mb-3">Advance Fulfilment Milestone</h6>
                          <Form onSubmit={handleUpdateStatus}>
                            <Form.Group className="mb-3">
                              <Form.Label className="small fw-semibold">Target Status</Form.Label>
                              <Form.Select
                                value={advanceStatus}
                                onChange={(e) => setAdvanceStatus(e.target.value as OrderStatus)}
                                size="sm"
                              >
                                <option value={OrderStatus.PROCESSING}>Processing (Warehouse Staging)</option>
                                <option value={OrderStatus.PACKED}>Packed (Sealed & Verified)</option>
                                <option value={OrderStatus.READY_FOR_SHIPMENT}>
                                  Ready for Dispatch (Dispatch Bay)
                                </option>
                                <option value={OrderStatus.SHIPPED}>Shipped (In Transit)</option>
                                <option value={OrderStatus.OUT_FOR_DELIVERY}>Out for Delivery</option>
                                <option value={OrderStatus.DELIVERED}>Delivered</option>
                                <option value={OrderStatus.DELIVERY_FAILED}>Delivery Failed</option>
                              </Form.Select>
                            </Form.Group>

                            <Form.Group className="mb-3">
                              <Form.Label className="small fw-semibold">Internal Notes / Log</Form.Label>
                              <Form.Control
                                as="textarea"
                                rows={2}
                                placeholder="Optional packaging notes..."
                                value={advanceNotes}
                                onChange={(e) => setAdvanceNotes(e.target.value)}
                                size="sm"
                              />
                            </Form.Group>

                            <Button
                              variant="primary"
                              type="submit"
                              size="sm"
                              className="w-100"
                              disabled={updateStatusMutation.isPending}
                            >
                              {updateStatusMutation.isPending ? 'Advancing...' : 'Update Status'}
                            </Button>
                          </Form>
                        </Card>
                      </Col>
                    </Row>
                  </Tab.Pane>

                  {/* Tab 2: Shipment Details or Create Shipment */}
                  <Tab.Pane eventKey="shipment">
                    {activeOrder.shipment ? (
                      <Card className="border p-4 shadow-sm">
                        <div className="d-flex justify-content-between align-items-center mb-3">
                          <h6 className="fw-bold mb-0">Active Shipment Record</h6>
                          <Badge bg="success" className="text-uppercase">
                            {activeOrder.shipment.status}
                          </Badge>
                        </div>
                        <Row className="g-3 small">
                          <Col sm={6}>
                            <span className="text-muted d-block">Shipment Reference</span>
                            <strong className="font-monospace text-primary">
                              {activeOrder.shipment.shipmentReference}
                            </strong>
                          </Col>
                          <Col sm={6}>
                            <span className="text-muted d-block">Carrier Provider</span>
                            <strong>{activeOrder.shipment.carrierName}</strong>
                          </Col>
                          <Col sm={6}>
                            <span className="text-muted d-block">Tracking / Waybill #</span>
                            <strong className="font-monospace">
                              {activeOrder.shipment.trackingNumber}
                            </strong>
                          </Col>
                          <Col sm={6}>
                            <span className="text-muted d-block">Estimated Delivery</span>
                            <span>{formatDate(activeOrder.shipment.estimatedDeliveryDate)}</span>
                          </Col>
                          <Col sm={6}>
                            <span className="text-muted d-block">Dispatched At</span>
                            <span>{formatDate(activeOrder.shipment.dispatchedAt)}</span>
                          </Col>
                          <Col sm={6}>
                            <span className="text-muted d-block">Actual Delivery</span>
                            <span>{formatDate(activeOrder.shipment.actualDeliveryDate)}</span>
                          </Col>
                        </Row>
                      </Card>
                    ) : (
                      <Card className="border p-4 shadow-sm">
                        <h6 className="fw-bold mb-3">Book & Create Shipment</h6>
                        <Form onSubmit={handleCreateShipment}>
                          <Row className="g-3">
                            <Col md={6}>
                              <Form.Group>
                                <Form.Label className="small fw-semibold">Carrier Provider</Form.Label>
                                <Form.Select
                                  value={carrierName}
                                  onChange={(e) => setCarrierName(e.target.value)}
                                  size="sm"
                                >
                                  <option value="Cartiva In-House Logistics">Cartiva In-House Logistics</option>
                                  <option value="GIG Logistics">GIG Logistics</option>
                                  <option value="DHL Express">DHL Express</option>
                                  <option value="FedEx">FedEx</option>
                                  <option value="Standard Courier">Standard Courier</option>
                                </Form.Select>
                              </Form.Group>
                            </Col>

                            <Col md={6}>
                              <Form.Group>
                                <Form.Label className="small fw-semibold">Service Level</Form.Label>
                                <Form.Control
                                  value={carrierService}
                                  onChange={(e) => setCarrierService(e.target.value)}
                                  placeholder="e.g. Next-Day Express"
                                  size="sm"
                                />
                              </Form.Group>
                            </Col>

                            <Col md={6}>
                              <Form.Group>
                                <Form.Label className="small fw-semibold">
                                  Tracking Number (Optional — auto-generated if blank)
                                </Form.Label>
                                <Form.Control
                                  value={trackingNumber}
                                  onChange={(e) => setTrackingNumber(e.target.value)}
                                  placeholder="Leave empty for auto-generated reference"
                                  size="sm"
                                />
                              </Form.Group>
                            </Col>

                            <Col md={6}>
                              <Form.Group>
                                <Form.Label className="small fw-semibold">Estimated Delivery Date</Form.Label>
                                <Form.Control
                                  type="datetime-local"
                                  value={estimatedDeliveryDate}
                                  onChange={(e) => setEstimatedDeliveryDate(e.target.value)}
                                  size="sm"
                                />
                              </Form.Group>
                            </Col>

                            <Col md={12}>
                              <Form.Group>
                                <Form.Label className="small fw-semibold">External Tracking URL</Form.Label>
                                <Form.Control
                                  value={trackingUrl}
                                  onChange={(e) => setTrackingUrl(e.target.value)}
                                  placeholder="https://courier.com/track/..."
                                  size="sm"
                                />
                              </Form.Group>
                            </Col>

                            <Col md={12}>
                              <Form.Group>
                                <Form.Label className="small fw-semibold">Shipment & Packaging Notes</Form.Label>
                                <Form.Control
                                  as="textarea"
                                  rows={2}
                                  value={shipmentNotes}
                                  onChange={(e) => setShipmentNotes(e.target.value)}
                                  placeholder="Special packaging or dispatch instructions..."
                                  size="sm"
                                />
                              </Form.Group>
                            </Col>

                            <Col md={12}>
                              <Form.Check
                                type="checkbox"
                                label="Dispatch Immediately (Sets status to SHIPPED and departure timestamp)"
                                checked={dispatchNow}
                                onChange={(e) => setDispatchNow(e.target.checked)}
                                className="small fw-semibold"
                              />
                            </Col>

                            <Col md={12}>
                              <Button
                                variant="primary"
                                type="submit"
                                size="sm"
                                disabled={createShipmentMutation.isPending}
                              >
                                {createShipmentMutation.isPending ? 'Booking...' : 'Create Shipment'}
                              </Button>
                            </Col>
                          </Row>
                        </Form>
                      </Card>
                    )}
                  </Tab.Pane>

                  {/* Tab 3: Append Tracking Event */}
                  <Tab.Pane eventKey="event">
                    <Card className="border p-4 shadow-sm">
                      <h6 className="fw-bold mb-3">Record Real-Time Tracking Event</h6>
                      <Form onSubmit={handleAddEvent}>
                        <Row className="g-3">
                          <Col md={6}>
                            <Form.Group>
                              <Form.Label className="small fw-semibold">Milestone Status</Form.Label>
                              <Form.Select
                                value={eventStatus}
                                onChange={(e) => setEventStatus(e.target.value as ShipmentStatus)}
                                size="sm"
                              >
                                <option value={ShipmentStatus.IN_TRANSIT}>In Transit</option>
                                <option value={ShipmentStatus.OUT_FOR_DELIVERY}>Out for Delivery</option>
                                <option value={ShipmentStatus.DELIVERY_ATTEMPTED}>Delivery Attempted</option>
                                <option value={ShipmentStatus.DELIVERED}>Delivered</option>
                              </Form.Select>
                            </Form.Group>
                          </Col>

                          <Col md={6}>
                            <Form.Group>
                              <Form.Label className="small fw-semibold">Event Title</Form.Label>
                              <Form.Control
                                required
                                value={eventTitle}
                                onChange={(e) => setEventTitle(e.target.value)}
                                placeholder="e.g. Arrived at Ikeja Sorting Center"
                                size="sm"
                              />
                            </Form.Group>
                          </Col>

                          <Col md={6}>
                            <Form.Group>
                              <Form.Label className="small fw-semibold">Current Location</Form.Label>
                              <Form.Control
                                value={eventLocation}
                                onChange={(e) => setEventLocation(e.target.value)}
                                placeholder="City or Depot (e.g. Lagos Mainland)"
                                size="sm"
                              />
                            </Form.Group>
                          </Col>

                          <Col md={12}>
                            <Form.Group>
                              <Form.Label className="small fw-semibold">Event Description</Form.Label>
                              <Form.Control
                                as="textarea"
                                rows={2}
                                required
                                value={eventDescription}
                                onChange={(e) => setEventDescription(e.target.value)}
                                placeholder="Public description visible to customer tracking view..."
                                size="sm"
                              />
                            </Form.Group>
                          </Col>

                          <Col md={12}>
                            <Button
                              variant="primary"
                              type="submit"
                              size="sm"
                              disabled={addEventMutation.isPending}
                            >
                              {addEventMutation.isPending ? 'Logging...' : 'Append Tracking Event'}
                            </Button>
                          </Col>
                        </Row>
                      </Form>
                    </Card>
                  </Tab.Pane>

                  {/* Tab 4: Confirm Delivery */}
                  <Tab.Pane eventKey="delivery">
                    <Card className="border p-4 shadow-sm">
                      <h6 className="fw-bold mb-3">Record Proof of Delivery</h6>
                      <Form onSubmit={handleConfirmDelivery}>
                        <Row className="g-3">
                          <Col md={6}>
                            <Form.Group>
                              <Form.Label className="small fw-semibold">Recipient Name / Signed By</Form.Label>
                              <Form.Control
                                required
                                value={deliveredTo}
                                onChange={(e) => setDeliveredTo(e.target.value)}
                                placeholder="Full name of person who received goods"
                                size="sm"
                              />
                            </Form.Group>
                          </Col>

                          <Col md={6}>
                            <Form.Group>
                              <Form.Label className="small fw-semibold">Delivery Timestamp</Form.Label>
                              <Form.Control
                                type="datetime-local"
                                value={actualDeliveryDate}
                                onChange={(e) => setActualDeliveryDate(e.target.value)}
                                size="sm"
                              />
                            </Form.Group>
                          </Col>

                          <Col md={12}>
                            <Form.Group>
                              <Form.Label className="small fw-semibold">Delivery Notes</Form.Label>
                              <Form.Control
                                as="textarea"
                                rows={2}
                                value={deliveryNotes}
                                onChange={(e) => setDeliveryNotes(e.target.value)}
                                placeholder="Gate notes, recipient verification..."
                                size="sm"
                              />
                            </Form.Group>
                          </Col>

                          <Col md={12}>
                            <Button
                              variant="success"
                              type="submit"
                              size="sm"
                              disabled={confirmDeliveryMutation.isPending}
                            >
                              {confirmDeliveryMutation.isPending
                                ? 'Confirming...'
                                : 'Confirm Final Delivery'}
                            </Button>
                          </Col>
                        </Row>
                      </Form>
                    </Card>
                  </Tab.Pane>

                  {/* Tab 5: Report Delivery Exception */}
                  <Tab.Pane eventKey="exception">
                    <Card className="border p-4 shadow-sm">
                      <h6 className="fw-bold text-danger mb-3">Record Delivery Problem / Exception</h6>
                      <Form onSubmit={handleRecordException}>
                        <Row className="g-3">
                          <Col md={6}>
                            <Form.Group>
                              <Form.Label className="small fw-semibold">Exception Type</Form.Label>
                              <Form.Select
                                value={exceptionType}
                                onChange={(e) =>
                                  setExceptionType(e.target.value as DeliveryExceptionType)
                                }
                                size="sm"
                              >
                                <option value={DeliveryExceptionType.CUSTOMER_UNAVAILABLE}>
                                  Customer Unavailable
                                </option>
                                <option value={DeliveryExceptionType.INCORRECT_ADDRESS}>
                                  Incorrect Address
                                </option>
                                <option value={DeliveryExceptionType.DELIVERY_DELAYED}>
                                  Delivery Delayed
                                </option>
                                <option value={DeliveryExceptionType.RESCHEDULED_DELIVERY}>
                                  Rescheduled Delivery
                                </option>
                                <option value={DeliveryExceptionType.RETURN_TO_SENDER}>
                                  Return to Sender
                                </option>
                                <option value={DeliveryExceptionType.WEATHER_DELAY}>
                                  Weather / Transit Block
                                </option>
                              </Form.Select>
                            </Form.Group>
                          </Col>

                          <Col md={6}>
                            <Form.Group>
                              <Form.Label className="small fw-semibold">Rescheduled Date</Form.Label>
                              <Form.Control
                                type="datetime-local"
                                value={rescheduledDate}
                                onChange={(e) => setRescheduledDate(e.target.value)}
                                size="sm"
                              />
                            </Form.Group>
                          </Col>

                          <Col md={12}>
                            <Form.Group>
                              <Form.Label className="small fw-semibold">Depot / Incident Location</Form.Label>
                              <Form.Control
                                value={exceptionLocation}
                                onChange={(e) => setExceptionLocation(e.target.value)}
                                placeholder="e.g. Ikeja Dispatch Hub or Delivery Area"
                                size="sm"
                              />
                            </Form.Group>
                          </Col>

                          <Col md={12}>
                            <Form.Group>
                              <Form.Label className="small fw-semibold">Description / Reason</Form.Label>
                              <Form.Control
                                as="textarea"
                                rows={2}
                                required
                                value={exceptionDesc}
                                onChange={(e) => setExceptionDesc(e.target.value)}
                                placeholder="Explain delivery failure reason..."
                                size="sm"
                              />
                            </Form.Group>
                          </Col>

                          <Col md={12}>
                            <Button
                              variant="danger"
                              type="submit"
                              size="sm"
                              disabled={recordExceptionMutation.isPending}
                            >
                              {recordExceptionMutation.isPending
                                ? 'Recording...'
                                : 'Record Delivery Exception'}
                            </Button>
                          </Col>
                        </Row>
                      </Form>
                    </Card>
                  </Tab.Pane>

                  {/* Tab 6: Full Timeline History */}
                  <Tab.Pane eventKey="timeline">
                    <Card className="border p-4 shadow-sm">
                      <h6 className="fw-bold mb-3">Immutable Event Ledger</h6>
                      {activeOrder.timeline.length === 0 ? (
                        <p className="text-muted small">No events recorded yet.</p>
                      ) : (
                        <div className="list-group list-group-flush">
                          {activeOrder.timeline.map((ev, idx) => (
                            <div key={idx} className="list-group-item py-3">
                              <div className="d-flex justify-content-between align-items-center mb-1">
                                <strong className="text-dark">{ev.title}</strong>
                                <span className="text-muted small">{formatDate(ev.timestamp.toString())}</span>
                              </div>
                              <p className="text-secondary small mb-1">{ev.description}</p>
                              <div className="d-flex gap-2">
                                {ev.location && (
                                  <span className="badge bg-light text-dark border">
                                    📍 {ev.location}
                                  </span>
                                )}
                                <span className="badge bg-secondary text-uppercase" style={{ fontSize: '0.65rem' }}>
                                  {ev.source}
                                </span>
                                {ev.actorName && (
                                  <span className="text-muted" style={{ fontSize: '0.75rem' }}>
                                    Logged by: {ev.actorName}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </Card>
                  </Tab.Pane>
                </Tab.Content>
              </Tab.Container>
            </>
          )}
        </Modal.Body>
      </Modal>
    </Container>
  );
};
