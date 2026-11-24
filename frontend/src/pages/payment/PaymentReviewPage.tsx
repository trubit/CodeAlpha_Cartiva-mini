/**
 * Cartiva Mini — Customer Payment Review Page (Stage 1 & 2)
 * Matches the reference mockup:
 * Customers review exact order amount due, item snapshots, promotional codes,
 * and proceed through the approved secure Paystack payment experience.
 */
import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Container, Row, Col, Button, Spinner, Alert, Form } from 'react-bootstrap';
import { useOrderDetail } from '@/hooks/useOrders';
import { useInitializePaymentMutation } from '@/hooks/usePayment';

export const PaymentReviewPage: React.FC = () => {
  const { orderNumber } = useParams<{ orderNumber: string }>();
  const navigate = useNavigate();

  const { data: orderData, isLoading, error } = useOrderDetail(orderNumber || '', Boolean(orderNumber));
  const order = orderData?.data;

  const [promoCode, setPromoCode] = useState('');
  const [promoApplied, setPromoApplied] = useState<string | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const initPaymentMutation = useInitializePaymentMutation();

  const formatPrice = (amount: number, currency = 'NGN') => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const handleApplyPromo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoCode.trim()) return;
    if (promoCode.toUpperCase() === 'WELCOMEHOME20' || promoCode.toUpperCase() === 'CARTIVA10') {
      setPromoApplied(promoCode.toUpperCase());
      setPromoError(null);
    } else {
      setPromoError('Promo code not valid for this order or already applied at checkout.');
    }
  };

  const [hostedUrl, setHostedUrl] = useState<string | null>(null);

  const handleProceedToPaystack = async () => {
    if (!order) return;
    try {
      setErrorMessage(null);
      const callbackUrl = `${window.location.origin}/payment/callback`;

      const res = await initPaymentMutation.mutateAsync({
        orderNumber: order.orderNumber,
        callbackUrl,
      });

      const initData = res.data;
      if (!initData) {
        throw new Error('Invalid payment initialization response from server.');
      }

      if (initData.authorizationUrl) {
        setHostedUrl(initData.authorizationUrl);
      }

      // 1. Prioritize official Paystack Inline Modal (Popup) if PaystackPop is loaded
      const publicKey =
        import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || 'pk_test_b84d8e48700f4ff1747f430f2478791d362e0d8b';

      if (typeof window !== 'undefined' && window.PaystackPop && initData.accessCode) {
        const handler = window.PaystackPop.setup({
          key: publicKey,
          email: order.customerEmail,
          amount: initData.amountMinor,
          currency: initData.currency || 'NGN',
          ref: initData.paymentReference,
          access_code: initData.accessCode,
          callback: (response) => {
            const finalRef = response.reference || initData.paymentReference;
            navigate(`/payment/verify/${encodeURIComponent(finalRef)}`);
          },
          onClose: () => {
            setErrorMessage(
              'Payment window closed before completing transaction. You can retry anytime or open the hosted Paystack checkout page below.'
            );
          },
        });
        handler.openIframe();
        return;
      }

      // 2. Seamless fallback to Hosted Checkout Redirect if popup is unavailable
      if (initData.authorizationUrl) {
        window.location.href = initData.authorizationUrl;
      } else if (initData.paymentReference) {
        navigate(`/payment/verify/${encodeURIComponent(initData.paymentReference)}`);
      }
    } catch (err: unknown) {
      setErrorMessage(
        (err as Error).message || 'Failed to initialize Paystack payment session. Please retry.'
      );
    }
  };

  if (isLoading) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3 text-muted">Retrieving order details and amount due...</p>
      </Container>
    );
  }

  if (error || !order) {
    return (
      <Container className="py-5">
        <Alert variant="danger">
          <Alert.Heading>Order Not Found</Alert.Heading>
          <p>We could not find the order reference requested.</p>
          <Link to="/orders" className="btn btn-primary">
            View My Orders
          </Link>
        </Alert>
      </Container>
    );
  }

  return (
    <Container className="py-4 py-lg-5">
      {/* Breadcrumb Navigation */}
      <nav aria-label="breadcrumb" className="mb-4">
        <ol className="breadcrumb small">
          <li className="breadcrumb-item">
            <Link to="/" className="text-decoration-none text-muted">
              Home
            </Link>
          </li>
          <li className="breadcrumb-item">
            <Link to="/orders" className="text-decoration-none text-muted">
              Orders
            </Link>
          </li>
          <li className="breadcrumb-item active text-dark fw-semibold" aria-current="page">
            Payment Review
          </li>
        </ol>
      </nav>

      {errorMessage && (
        <Alert variant="danger" dismissible onClose={() => setErrorMessage(null)}>
          {errorMessage}
        </Alert>
      )}

      {/* Main Review Card */}
      <div className="bg-white rounded-4 border shadow-sm p-4 p-md-5 mb-4">
        <Row className="g-4 g-lg-5">
          {/* Left Column: Order Items Overview */}
          <Col lg={7}>
            <div className="d-flex align-items-center gap-2 mb-4">
              <span className="fs-4">🛍️</span>
              <div>
                <h4 className="fw-bold mb-0">Overview: {order.items.length} Items</h4>
                <p className="text-muted small mb-0">
                  Order Reference: <strong className="text-dark">{order.orderNumber}</strong>
                </p>
              </div>
            </div>

            {/* Product Cards Row / Grid */}
            <div className="row g-3 mb-4">
              {order.items.map((item, idx) => (
                <div key={idx} className="col-sm-6">
                  <div className="p-3 bg-light rounded-3 border h-100 d-flex flex-column">
                    <div className="d-flex gap-3 align-items-center mb-3">
                      {item.thumbnailUrl ? (
                        <img
                          src={item.thumbnailUrl}
                          alt={item.title}
                          className="rounded border object-fit-cover"
                          style={{ width: 64, height: 64 }}
                        />
                      ) : (
                        <div
                          className="bg-white rounded border d-flex align-items-center justify-content-center"
                          style={{ width: 64, height: 64 }}
                        >
                          📦
                        </div>
                      )}
                      <div>
                        <h6 className="fw-bold mb-1 text-dark text-truncate" style={{ maxWidth: 160 }}>
                          {item.title}
                        </h6>
                        <span className="text-muted small d-block">SKU: {item.sku}</span>
                        <span className="text-primary fw-semibold small">
                          {formatPrice(item.unitPrice, order.currency)}
                        </span>
                      </div>
                    </div>
                    <div className="mt-auto d-flex justify-content-between align-items-center pt-2 border-top">
                      <span className="text-muted small">Qty: {item.quantity}</span>
                      <span className="fw-bold text-dark">
                        {formatPrice(item.subtotal, order.currency)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Reassurance Features (Matching screenshot: Your Order's Impact) */}
            <div className="p-4 rounded-3 bg-light-subtle border">
              <h6 className="fw-bold text-dark mb-3">Your Order&apos;s Guarantees</h6>
              <div className="row g-3">
                <div className="col-4 text-center">
                  <div className="fs-5 mb-1">💧</div>
                  <span className="small d-block text-muted">Eco-friendly dispatch packaging</span>
                </div>
                <div className="col-4 text-center">
                  <div className="fs-5 mb-1">♻️</div>
                  <span className="small d-block text-muted">30-day verified money-back guarantee</span>
                </div>
                <div className="col-4 text-center">
                  <div className="fs-5 mb-1">🔒</div>
                  <span className="small d-block text-muted">256-Bit SSL encrypted settlement</span>
                </div>
              </div>
            </div>
          </Col>

          {/* Right Column: Payment Summary Card (Dark Forest Green Style matching Mockup 1) */}
          <Col lg={5}>
            <div
              className="p-4 p-md-5 rounded-4 text-white shadow"
              style={{ backgroundColor: '#133a2a' }}
            >
              <h5 className="fw-bold mb-1">Payment Summary</h5>
              <div className="text-white-50 small mb-3">
                Estimated Total (Incl. Shipping &amp; Taxes)
              </div>
              <div className="display-6 fw-bold mb-3 text-white">
                {formatPrice(order.totalAmount, order.currency)}
              </div>

              {/* Informational Pill */}
              <div
                className="p-2 px-3 rounded-pill mb-4 small d-flex align-items-center gap-2"
                style={{ backgroundColor: 'rgba(255,255,255,0.12)' }}
              >
                <span>ℹ️</span>
                <span>Shipping and taxes calculated authoritatively</span>
              </div>

              {/* Promo code form */}
              <div className="mb-4">
                <label className="small text-white-50 mb-2">Promotional Offers &amp; Discount Codes</label>
                <Form onSubmit={handleApplyPromo}>
                  <div className="input-group">
                    <Form.Control
                      type="text"
                      placeholder="e.g. WelcomeHome20"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value)}
                      disabled={Boolean(promoApplied)}
                      style={{
                        backgroundColor: 'rgba(255,255,255,0.1)',
                        borderColor: 'rgba(255,255,255,0.2)',
                        color: '#fff',
                      }}
                    />
                    <Button
                      variant="success"
                      type="submit"
                      disabled={Boolean(promoApplied) || !promoCode.trim()}
                      className="px-3 fw-bold"
                    >
                      {promoApplied ? 'Applied ✓' : 'Submit'}
                    </Button>
                  </div>
                </Form>
                {promoError && <div className="text-warning small mt-1">{promoError}</div>}
                {promoApplied && (
                  <div className="text-success-emphasis small mt-1">
                    Coupon <strong>{promoApplied}</strong> applied.
                  </div>
                )}
              </div>

              {/* Financial Lines */}
              <div className="border-top border-white-50 pt-3 mb-3">
                <div className="d-flex justify-content-between mb-2 small text-white-50">
                  <span>Subtotal</span>
                  <span className="text-white fw-semibold">
                    {formatPrice(order.subtotal, order.currency)}
                  </span>
                </div>
                <div className="d-flex justify-content-between mb-2 small text-white-50">
                  <span>Shipping Fee ({order.shippingMethodName || 'Standard'})</span>
                  <span className="text-white fw-semibold">
                    {order.shippingFee > 0
                      ? formatPrice(order.shippingFee, order.currency)
                      : 'Free'}
                  </span>
                </div>
                {order.discountAmount > 0 && (
                  <div className="d-flex justify-content-between mb-2 small text-warning">
                    <span>Discounts</span>
                    <span>-{formatPrice(order.discountAmount, order.currency)}</span>
                  </div>
                )}
                <div className="d-flex justify-content-between fw-bold pt-2 border-top border-white-50">
                  <span className="text-white">Amount Due</span>
                  <span className="text-white h5 mb-0">
                    {formatPrice(order.totalAmount, order.currency)}
                  </span>
                </div>
              </div>

              {/* Pay with Paystack CTA Button */}
              <Button
                variant="light"
                size="lg"
                className="w-100 fw-bold py-3 mt-3 text-dark shadow-sm"
                disabled={initPaymentMutation.isPending}
                onClick={handleProceedToPaystack}
              >
                {initPaymentMutation.isPending ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" />
                    Connecting to Paystack...
                  </>
                ) : (
                  'Pay with Paystack →'
                )}
              </Button>

              {hostedUrl && (
                <div className="mt-2 text-center">
                  <a
                    href={hostedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white text-decoration-underline small"
                  >
                    Open hosted checkout in a new window ↗
                  </a>
                </div>
              )}

              <div className="mt-3 text-center text-white-50 small">
                <span>🔒 Secured by Paystack Official Gateway</span>
              </div>
            </div>
          </Col>
        </Row>
      </div>
    </Container>
  );
};
