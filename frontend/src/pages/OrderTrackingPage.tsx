/**
 * Cartiva Mini — Customer Order Tracking Page
 * Displays real-time delivery milestones, append-only tracking timeline,
 * carrier information, destination address snapshot, and purchased items.
 */
import React from 'react';
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
} from 'react-bootstrap';
import { useCustomerTracking } from '@/hooks/useFulfilment';
import { getMediaUrl, handleImageError } from '@/utils/media.util';
import { formatDateTime } from '@/utils/date.util';
import { OrderStatus, ShipmentStatus } from '@shared/enums';

export const OrderTrackingPage: React.FC = () => {
  const params = useParams<{ orderId?: string; orderNumber?: string }>();
  const activeIdentifier = params.orderId || params.orderNumber || '';
  const { data, isLoading, error, refetch, isFetching } = useCustomerTracking(
    activeIdentifier,
    Boolean(activeIdentifier),
    15000 // auto-poll every 15s for live updates
  );

  const tracking = data?.data;

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateStr?: string) => {
    return formatDateTime(dateStr, 'Pending update');
  };

  if (isLoading) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3 text-muted">Retrieving live tracking information...</p>
      </Container>
    );
  }

  if (error || !tracking) {
    return (
      <Container className="py-5">
        <Alert variant="danger">
          <Alert.Heading>Tracking Information Unavailable</Alert.Heading>
          <p>
            We could not find tracking details for the requested order, or you do not have permission
            to view it.
          </p>
          <Link to="/orders" className="btn btn-primary">
            Back to Orders
          </Link>
        </Alert>
      </Container>
    );
  }

  // Milestone progression calculation
  const getMilestoneIndex = (status: OrderStatus | ShipmentStatus): number => {
    switch (status) {
      case OrderStatus.PENDING_PAYMENT:
      case OrderStatus.PAYMENT_PROCESSING:
        return 0;
      case OrderStatus.CONFIRMED:
        return 1;
      case OrderStatus.PROCESSING:
        return 2;
      case OrderStatus.PACKED:
      case OrderStatus.READY_FOR_SHIPMENT:
        return 3;
      case OrderStatus.SHIPPED:
      case OrderStatus.OUT_FOR_DELIVERY:
        return 4;
      case OrderStatus.DELIVERED:
        return 5;
      default:
        return 2;
    }
  };

  const currentStep = getMilestoneIndex(tracking.orderStatus);
  const isDelivered = tracking.orderStatus === OrderStatus.DELIVERED;
  const isException =
    tracking.orderStatus === OrderStatus.DELIVERY_FAILED ||
    tracking.fulfilmentStatus === ShipmentStatus.DELIVERY_ATTEMPTED ||
    tracking.fulfilmentStatus === ShipmentStatus.EXCEPTION;

  const milestones = [
    { label: 'Confirmed', desc: 'Payment verified' },
    { label: 'Processing', desc: 'Preparing order' },
    { label: 'Packed', desc: 'Items sealed' },
    { label: 'Dispatched', desc: 'In courier transit' },
    { label: 'Delivered', desc: 'Arrived at destination' },
  ];

  return (
    <Container className="py-5">
      {/* Header breadcrumb & actions */}
      <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-3 mb-4">
        <div>
          <Link
            to={`/orders/${tracking.orderId}`}
            className="text-decoration-none small text-muted mb-2 d-inline-block"
          >
            ← Back to Order #{tracking.orderNumber}
          </Link>
          <div className="d-flex align-items-center gap-3">
            <h1 className="h2 fw-bold mb-0">Delivery Tracking</h1>
            <Badge
              bg={
                isDelivered
                  ? 'success'
                  : isException
                  ? 'danger'
                  : 'primary'
              }
              className="text-uppercase px-3 py-2"
            >
              {tracking.orderStatus.replace(/_/g, ' ')}
            </Badge>
          </div>
          <span className="text-muted small">
            Order Reference:{' '}
            <strong className="text-dark font-monospace">{tracking.orderNumber}</strong> • Ordered
            on {formatDate(tracking.orderDate)}
          </span>
        </div>

        <div className="d-flex gap-2 align-items-center">
          {isFetching && (
            <span className="text-muted small d-flex align-items-center gap-1">
              <Spinner animation="grow" size="sm" variant="secondary" /> Syncing...
            </span>
          )}
          <Button variant="outline-secondary" size="sm" onClick={() => refetch()}>
            ↻ Refresh Status
          </Button>
        </div>
      </div>

      {/* Delivery Exception Alert if applicable */}
      {isException && (
        <Alert variant="warning" className="border-warning shadow-sm mb-4">
          <div className="d-flex gap-3 align-items-start">
            <span style={{ fontSize: 24 }}>⚠️</span>
            <div>
              <h6 className="fw-bold mb-1">Delivery Exception / Re-attempt Scheduled</h6>
              <p className="mb-0 small text-secondary">
                The courier reported an issue attempting delivery (e.g. customer unavailable or gate
                access). Our dispatch logistics team is rescheduling delivery. Check the timeline
                below for details.
              </p>
            </div>
          </div>
        </Alert>
      )}

      {/* Milestone Progress Bar */}
      <Card className="border shadow-sm mb-4">
        <Card.Body className="p-4">
          <h6 className="fw-bold text-uppercase text-muted small mb-4">Fulfilment Progress</h6>
          <div className="position-relative">
            {/* Horizontal Line */}
            <div
              className="position-absolute start-0 end-0 top-50 translate-middle-y bg-light"
              style={{ height: 4, zIndex: 1 }}
            />
            <div
              className="position-absolute start-0 top-50 translate-middle-y bg-primary"
              style={{
                height: 4,
                width: `${Math.min(100, Math.max(0, (currentStep - 1) * 25))}%`,
                zIndex: 2,
                transition: 'width 0.4s ease',
              }}
            />

            {/* Step circles */}
            <div className="d-flex justify-content-between position-relative" style={{ zIndex: 3 }}>
              {milestones.map((m, idx) => {
                const stepNum = idx + 1;
                const isPassed = currentStep >= stepNum;
                const isCurrent = currentStep === stepNum;

                return (
                  <div key={m.label} className="text-center px-1" style={{ flex: 1, minWidth: 0 }}>
                    <div
                      className={`rounded-circle mx-auto d-flex align-items-center justify-content-center shadow-sm fw-bold ${
                        isPassed
                          ? 'bg-primary text-white'
                          : 'bg-white text-muted border border-2'
                      } ${isCurrent ? 'ring ring-primary ring-opacity-50' : ''}`}
                      style={{
                        width: 'clamp(28px, 6vw, 38px)',
                        height: 'clamp(28px, 6vw, 38px)',
                        fontSize: 'clamp(11px, 2.5vw, 14px)',
                        transition: 'all 0.3s ease',
                      }}
                    >
                      {isPassed ? '✓' : stepNum}
                    </div>
                    <div className="mt-1 mt-sm-2 fw-bold text-dark text-truncate" style={{ fontSize: 'clamp(0.68rem, 2vw, 0.85rem)' }}>{m.label}</div>
                    <div className="text-muted d-none d-sm-block text-truncate" style={{ fontSize: '0.72rem' }}>
                      {m.desc}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Card.Body>
      </Card>

      <Row className="g-4">
        {/* Left Column: Timeline & Courier Info */}
        <Col lg={8}>
          {/* Courier Details Card */}
          <Card className="border shadow-sm mb-4">
            <Card.Header className="bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
              <span className="fw-bold">Logistics & Courier Assignment</span>
              <Badge bg="info" className="text-dark">
                {tracking.shippingMethod}
              </Badge>
            </Card.Header>
            <Card.Body>
              <Row className="g-3">
                <Col sm={6}>
                  <div className="p-3 bg-light rounded-3 h-100">
                    <span className="text-muted small d-block mb-1">Carrier Provider</span>
                    <strong className="h6 mb-0 text-dark">
                      {tracking.carrierName || 'Cartiva In-House Fleet'}
                    </strong>
                    {tracking.carrierService && (
                      <span className="d-block small text-secondary">
                        Service: {tracking.carrierService}
                      </span>
                    )}
                  </div>
                </Col>

                <Col sm={6}>
                  <div className="p-3 bg-light rounded-3 h-100">
                    <span className="text-muted small d-block mb-1">Waybill / Tracking Number</span>
                    <strong className="h6 mb-0 text-primary font-monospace">
                      {tracking.trackingNumber || 'Pending Courier Assignment'}
                    </strong>
                    {tracking.trackingUrl && (
                      <a
                        href={tracking.trackingUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-sm btn-outline-primary d-inline-block mt-2"
                      >
                        External Courier Tracker ↗
                      </a>
                    )}
                  </div>
                </Col>

                <Col sm={6}>
                  <div className="p-3 bg-light rounded-3 h-100">
                    <span className="text-muted small d-block mb-1">Estimated Delivery Date</span>
                    <strong className="text-dark">
                      {formatDate(tracking.estimatedDeliveryDate)}
                    </strong>
                  </div>
                </Col>

                <Col sm={6}>
                  <div className="p-3 bg-light rounded-3 h-100">
                    <span className="text-muted small d-block mb-1">Actual Delivery Status</span>
                    {tracking.actualDeliveryDate ? (
                      <span className="text-success fw-bold">
                        Delivered on {formatDate(tracking.actualDeliveryDate)}
                        {tracking.deliveredTo && ` to ${tracking.deliveredTo}`}
                      </span>
                    ) : (
                      <span className="text-secondary small">In transit to destination</span>
                    )}
                  </div>
                </Col>
              </Row>
            </Card.Body>
          </Card>

          {/* Tracking Events Timeline Card */}
          <Card className="border shadow-sm">
            <Card.Header className="bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
              <span className="fw-bold">Tracking Activity & History</span>
              <span className="text-muted small">{tracking.events.length} Recorded Milestone(s)</span>
            </Card.Header>
            <Card.Body className="p-4">
              {tracking.events.length === 0 ? (
                <div className="text-center py-4 text-muted">
                  <p>No tracking events recorded yet. Package is awaiting warehouse staging.</p>
                </div>
              ) : (
                <div className="timeline-container position-relative ps-4">
                  {/* Vertical Timeline bar */}
                  <div
                    className="position-absolute start-0 top-0 bottom-0 bg-light"
                    style={{ width: 3, left: 14 }}
                  />

                  {tracking.events
                    .slice()
                    .reverse()
                    .map((event, index) => {
                      const isLatest = index === 0;

                      return (
                        <div key={event.eventId} className="mb-4 position-relative">
                          {/* Dot indicator */}
                          <div
                            className={`position-absolute rounded-circle shadow-sm ${
                              isLatest ? 'bg-primary' : 'bg-secondary'
                            }`}
                            style={{
                              width: 14,
                              height: 14,
                              left: -22,
                              top: 4,
                              border: '2px solid #ffffff',
                            }}
                          />

                          <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-1 mb-1">
                            <span className={`fw-bold ${isLatest ? 'text-primary' : 'text-dark'}`}>
                              {event.title}
                            </span>
                            <span className="text-muted small" style={{ fontSize: '0.8rem' }}>
                              {formatDate(event.timestamp.toString())}
                            </span>
                          </div>

                          <p className="text-secondary small mb-1">{event.description}</p>

                          <div className="d-flex flex-wrap gap-2 align-items-center mt-1">
                            {event.location && (
                              <span className="badge bg-light text-dark border">
                                📍 {event.location}
                              </span>
                            )}
                            <Badge
                              bg={event.source === 'carrier' ? 'info' : 'secondary'}
                              className="text-uppercase"
                              style={{ fontSize: '0.65rem' }}
                            >
                              {event.source === 'carrier'
                                ? 'Automated Courier Sync'
                                : 'Verified Dispatch Event'}
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>

        {/* Right Column: Destination Snapshot & Package Contents */}
        <Col lg={4}>
          {/* Destination Snapshot Card */}
          <Card className="border shadow-sm mb-4">
            <Card.Header className="bg-white py-3 border-bottom fw-bold">
              Delivery Destination
            </Card.Header>
            <Card.Body className="small text-secondary">
              <strong className="d-block text-dark h6 mb-1">
                {tracking.destinationAddress.recipientName}
              </strong>
              <div className="mb-2 text-muted">{tracking.destinationAddress.phone}</div>
              <div>{tracking.destinationAddress.streetAddress}</div>
              {tracking.destinationAddress.apartmentSuite && (
                <div>{tracking.destinationAddress.apartmentSuite}</div>
              )}
              <div>
                {tracking.destinationAddress.city}, {tracking.destinationAddress.state}
              </div>
              {tracking.destinationAddress.postalCode && (
                <div>Postal Code: {tracking.destinationAddress.postalCode}</div>
              )}
              <div className="fw-semibold text-dark mt-1">
                {tracking.destinationAddress.country}
              </div>
            </Card.Body>
          </Card>

          {/* Purchased Items in Shipment */}
          <Card className="border shadow-sm">
            <Card.Header className="bg-white py-3 border-bottom fw-bold d-flex justify-content-between align-items-center">
              <span>Package Items</span>
              <span className="text-muted small">
                {tracking.items.reduce((acc, it) => acc + it.quantity, 0)} pcs
              </span>
            </Card.Header>
            <Card.Body className="p-0">
              <div className="list-group list-group-flush">
                {tracking.items.map((item, idx) => (
                  <div key={idx} className="list-group-item d-flex align-items-center gap-3 py-3">
                    <img
                      src={getMediaUrl(item.thumbnailUrl)}
                      alt={item.title}
                      onError={handleImageError}
                      className="rounded border"
                      style={{ width: 48, height: 48, objectFit: 'cover' }}
                    />
                    <div className="flex-grow-1 min-w-0">
                      <span className="fw-bold d-block text-truncate small text-dark">
                        {item.title}
                      </span>
                      <span className="text-muted small">
                        SKU: <code>{item.sku}</code> • Qty: {item.quantity}
                      </span>
                    </div>
                    <div className="text-end">
                      <span className="fw-bold small text-dark d-block">
                        {formatPrice(item.subtotal)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};
