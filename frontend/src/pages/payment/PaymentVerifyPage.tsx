/**
 * Cartiva Mini — Customer Payment Verification & Confirmation Page (Stage 3 & 4)
 * Matches the reference mockups:
 * Stage 3: Live verification directly with Paystack, order reservation countdown timer, stepper.
 * Stage 4: Authoritative confirmation screen showing items snapshot, green checkmark,
 * verified amount, PAID badge, payment method, reference ID, receipt download, and order tracking.
 */
import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Container, Row, Col, Card, Button, Spinner, Alert, Badge } from 'react-bootstrap';
import { useVerifyPayment, useRetryPaymentMutation } from '@/hooks/usePayment';
import { useOrderDetail } from '@/hooks/useOrders';
import { PaymentStatus } from '@shared/enums';
import { formatDate } from '@/utils/date.util';

export const PaymentVerifyPage: React.FC = () => {
  const { reference: routeRef } = useParams<{ reference: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Reference can come from URL params or Paystack query params (?reference=... or ?trxref=...)
  const reference =
    routeRef || searchParams.get('reference') || searchParams.get('trxref') || '';

  // Polling: refetch every 3.5s while pending
  const [pollInterval, setPollInterval] = useState<number | false>(3500);

  const {
    data: verifyData,
    isLoading: isVerifying,
    error: verifyError,
    refetch: refetchVerification,
  } = useVerifyPayment(reference, Boolean(reference), pollInterval);

  const payment = verifyData?.data;
  const isPaid = payment?.status === PaymentStatus.PAID || payment?.status === PaymentStatus.SUCCESSFUL;
  const isFailed = payment?.status === PaymentStatus.FAILED;
  const isAbandoned = payment?.status === PaymentStatus.ABANDONED;

  // Retrieve full order details for receipt and item snapshots
  const { data: orderData } = useOrderDetail(payment?.orderNumber || '', Boolean(payment?.orderNumber));
  const order = orderData?.data;

  const retryMutation = useRetryPaymentMutation();
  const [retryError, setRetryError] = useState<string | null>(null);

  // Stop polling once terminal state is reached
  useEffect(() => {
    if (isPaid || isFailed || isAbandoned) {
      setPollInterval(false);
    }
  }, [isPaid, isFailed, isAbandoned]);

  // 30-Minute Reservation Countdown Timer (Visual compliance with Mockup 3)
  const [secondsRemaining, setSecondsRemaining] = useState(29 * 60 + 45);
  useEffect(() => {
    if (isPaid) return;
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [isPaid]);

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;

  const formatPrice = (amount: number, currency = 'NGN') => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const handleDownloadReceipt = () => {
    window.print();
  };

  const handleRetryPayment = async () => {
    if (!reference) return;
    try {
      setRetryError(null);
      const res = await retryMutation.mutateAsync(reference);
      const initData = res.data;
      if (initData?.orderNumber) {
        navigate(`/payment/review/${encodeURIComponent(initData.orderNumber)}`);
      } else if (initData?.authorizationUrl) {
        window.location.href = initData.authorizationUrl;
      } else {
        navigate('/orders');
      }
    } catch (err: unknown) {
      const msg =
        (err as Error)?.message ||
        'Failed to re-initialize payment session with gateway. Please check connection and retry.';
      setRetryError(msg);
    }
  };

  if (!reference) {
    return (
      <Container className="py-5 text-center">
        <Alert variant="warning">
          <Alert.Heading>Missing Transaction Reference</Alert.Heading>
          <p>No payment reference was supplied in the callback.</p>
          <Link to="/orders" className="btn btn-primary">
            View My Orders
          </Link>
        </Alert>
      </Container>
    );
  }

  // ==========================================================================
  // STAGE 4: PAYMENT SUCCESSFUL CONFIRMATION VIEW (Matching Mockup 4)
  // ==========================================================================
  if (isPaid) {
    return (
      <Container className="py-4 py-lg-5">
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <Row className="g-4 align-items-stretch">
            {/* Left Column: Order Details & Shipping Method (Matching Mockup 4) */}
            <Col lg={7}>
              <Card className="border shadow-sm h-100 rounded-4">
                <Card.Body className="p-4 p-md-5">
                  <h5 className="fw-bold text-dark mb-4">Order Details</h5>

                  {/* Purchased Items List */}
                  <div className="d-flex flex-column gap-3 mb-4">
                    {order ? (
                      order.items.map((item, idx) => (
                        <div
                          key={idx}
                          className="d-flex justify-content-between align-items-center py-2 border-bottom"
                        >
                          <div className="d-flex align-items-center gap-3">
                            <span className="fw-bold text-muted">{idx + 1}.</span>
                            {item.thumbnailUrl && (
                              <img
                                src={item.thumbnailUrl}
                                alt={item.title}
                                className="rounded border object-fit-cover"
                                style={{ width: 44, height: 44 }}
                              />
                            )}
                            <div>
                              <div className="fw-semibold text-dark">{item.title}</div>
                              <div className="text-muted small">Qty: {item.quantity}</div>
                            </div>
                          </div>
                          <span className="fw-bold text-dark">
                            {formatPrice(item.subtotal, order.currency)}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="text-muted small">
                        Reference: {payment?.orderNumber} • Amount: {payment?.amount}
                      </div>
                    )}
                  </div>

                  {/* Shipping Method Snapshot */}
                  <div className="p-3 bg-light rounded-3 border">
                    <h6 className="fw-bold text-dark mb-1">Shipping Method</h6>
                    <div className="text-muted small">
                      {order?.shippingMethodName || 'Standard Delivery'} (
                      {order?.estimatedDeliveryText || '2–4 business days'})
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </Col>

            {/* Right Column: Payment Successful Badge Card (Matching Mockup 4) */}
            <Col lg={5}>
              <Card className="border shadow-sm h-100 rounded-4 text-center">
                <Card.Body className="p-4 p-md-5 d-flex flex-column justify-content-between">
                  <div>
                    {/* Big Green Circle Checkmark */}
                    <div
                      className="d-inline-flex align-items-center justify-content-center bg-success text-white rounded-circle mb-3 shadow"
                      style={{ width: 68, height: 68, fontSize: 32 }}
                    >
                      ✓
                    </div>
                    <h4 className="fw-bold text-dark mb-1">Payment Successful</h4>
                    <p className="text-muted small mb-3">Your transaction was completed</p>

                    {/* Exact Verified Amount */}
                    <div className="display-6 fw-bold text-dark mb-2">
                      {formatPrice(payment.amount, payment.currency)}
                    </div>
                    <Badge bg="success" className="px-3 py-1 mb-4 text-uppercase">
                      PAID
                    </Badge>

                    {/* Transaction Details Metadata */}
                    <div className="text-start p-3 bg-light rounded-3 border mb-4 small">
                      <div className="d-flex justify-content-between mb-2">
                        <span className="text-muted">Date</span>
                        <span className="fw-semibold text-dark">
                          {formatDate(payment.paidAt || new Date())}
                        </span>
                      </div>
                      <div className="d-flex justify-content-between mb-2">
                        <span className="text-muted">Method</span>
                        <span className="fw-semibold text-dark text-capitalize">
                          {payment.channel ? `${payment.channel} (Paystack)` : 'Card (Paystack)'}
                        </span>
                      </div>
                      <div className="d-flex justify-content-between">
                        <span className="text-muted">Reference ID</span>
                        <span className="fw-bold text-primary">{payment.paymentReference}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions: Download Receipt & Track Order */}
                  <div className="d-flex flex-column gap-2 mt-auto">
                    <Button
                      variant="secondary"
                      size="lg"
                      className="w-100 fw-bold py-2 shadow-sm text-white"
                      style={{ backgroundColor: '#6c827c', borderColor: '#6c827c' }}
                      onClick={handleDownloadReceipt}
                    >
                      Download Receipt
                    </Button>
                    <Button
                      variant="outline-secondary"
                      size="lg"
                      className="w-100 fw-bold py-2"
                      onClick={() =>
                        navigate(order ? `/orders/${order.id}` : `/orders`)
                      }
                    >
                      Track Order
                    </Button>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </div>
      </Container>
    );
  }

  // ==========================================================================
  // FAILED / ABANDONED VIEW
  // ==========================================================================
  if (isFailed || isAbandoned) {
    return (
      <Container className="py-5 text-center">
        <div style={{ maxWidth: 540, margin: '0 auto' }}>
          <Card className="border shadow-sm p-4 p-md-5 rounded-4">
            <Card.Body>
              <div
                className="d-inline-flex align-items-center justify-content-center bg-danger-subtle text-danger rounded-circle mb-3"
                style={{ width: 64, height: 64, fontSize: 28 }}
              >
                ✕
              </div>
              <h3 className="fw-bold mb-2">
                {isAbandoned ? 'Payment Abandoned' : 'Payment Failed'}
              </h3>
              <p className="text-muted mb-4">
                {isAbandoned
                  ? 'Your transaction was cancelled or left incomplete on Paystack.'
                  : 'The payment could not be processed by your bank or the gateway.'}
              </p>

              {retryError && (
                <Alert
                  variant="danger"
                  dismissible
                  onClose={() => setRetryError(null)}
                  className="text-start small mb-3"
                >
                  {retryError}
                </Alert>
              )}

              <div className="d-flex flex-column gap-2">
                <Button
                  variant="primary"
                  size="lg"
                  className="fw-bold"
                  disabled={retryMutation.isPending}
                  onClick={handleRetryPayment}
                >
                  {retryMutation.isPending ? (
                    <>
                      <Spinner animation="border" size="sm" className="me-2" />
                      Re-initializing...
                    </>
                  ) : (
                    'Retry Payment Now'
                  )}
                </Button>
                {payment?.orderNumber && (
                  <Link
                    to={`/payment/review/${encodeURIComponent(payment.orderNumber)}`}
                    className="btn btn-outline-primary"
                  >
                    Return to Order Review
                  </Link>
                )}
                <Link to="/orders" className="btn btn-outline-secondary">
                  Return to Order History
                </Link>
              </div>
            </Card.Body>
          </Card>
        </div>
      </Container>
    );
  }

  // ==========================================================================
  // STAGE 3: PAYMENT VERIFICATION IN PROGRESS (Matching Mockup 3)
  // ==========================================================================
  return (
    <Container className="py-4 py-lg-5">
      <div style={{ maxWidth: 840, margin: '0 auto' }}>
        {/* Stepper Progress Bar (Matching Mockup 3: Login, Contact, Shipment, Payment, Confirm) */}
        <div className="d-flex justify-content-between align-items-center mb-5 px-3">
          {['Login', 'Contact', 'Shipment', 'Payment', 'Confirm'].map((step, idx) => {
            const stepNum = idx + 1;
            const isCompleted = stepNum < 4;
            const isActive = stepNum === 4;

            return (
              <div key={step} className="text-center flex-grow-1 position-relative">
                <div
                  className={`rounded-circle d-inline-flex align-items-center justify-content-center fw-bold mb-1 shadow-sm ${
                    isCompleted
                      ? 'bg-primary text-white'
                      : isActive
                      ? 'bg-primary text-white ring'
                      : 'bg-light text-muted border'
                  }`}
                  style={{ width: 36, height: 36, fontSize: 14 }}
                >
                  {isCompleted ? '✓' : stepNum}
                </div>
                <div
                  className={`small d-block ${
                    isActive ? 'fw-bold text-primary' : 'text-muted'
                  }`}
                >
                  {step}
                </div>
              </div>
            );
          })}
        </div>

        {/* Verification Status Card */}
        <Card className="border shadow-sm rounded-4 p-4 p-md-5 text-center mb-4">
          <Card.Body>
            {/* Live Countdown Timer (Matching Mockup 3) */}
            <div className="mb-4">
              <span className="badge bg-warning-subtle text-warning-emphasis px-3 py-2 rounded-pill fw-semibold">
                ⏳ Order reserved for:{' '}
                <strong>
                  {String(minutes).padStart(2, '0')} Minutes {String(seconds).padStart(2, '0')}{' '}
                  Seconds
                </strong>
              </span>
            </div>

            <div className="mb-4">
              <Spinner animation="border" variant="primary" style={{ width: 56, height: 56 }} />
            </div>

            <h3 className="fw-bold text-dark mb-2">Your order is pending verification</h3>
            <p className="text-muted mb-4" style={{ maxWidth: 500, margin: '0 auto' }}>
              Cartiva Mini is checking payment status directly with Paystack. Please do not close or
              refresh this window.
            </p>

            {/* Order snapshot summary */}
            <div
              className="p-3 bg-light rounded-3 border mb-4 text-start small mx-auto"
              style={{ maxWidth: 480 }}
            >
              <div className="d-flex justify-content-between mb-1">
                <span className="text-muted">Transaction Ref:</span>
                <span className="fw-bold">{reference}</span>
              </div>
              {order && (
                <>
                  <div className="d-flex justify-content-between mb-1">
                    <span className="text-muted">Order Number:</span>
                    <span className="fw-semibold">{order.orderNumber}</span>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span className="text-muted">Payable Total:</span>
                    <span className="fw-bold text-primary">
                      {formatPrice(order.totalAmount, order.currency)}
                    </span>
                  </div>
                </>
              )}
            </div>

            <Button
              variant="outline-primary"
              className="px-4 fw-bold"
              disabled={isVerifying}
              onClick={() => refetchVerification()}
            >
              {isVerifying ? 'Checking Gateway...' : 'Check Status Now'}
            </Button>
          </Card.Body>
        </Card>

        {verifyError && (
          <Alert variant="info" className="text-center small">
            Waiting for gateway confirmation. If you completed payment, your transaction will settle
            shortly.
          </Alert>
        )}
      </div>
    </Container>
  );
};
