/**
 * Cartiva Mini — Customer Shopping Cart Review Page (Stage 1)
 * Matches the customer journey mockup:
 * Customers check products, quantities (- 1 +), item removal, subtotal,
 * and proceed directly into the multi-step checkout pipeline.
 */
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Container,
  Row,
  Col,
  Card,
  Button,
  Spinner,
  Alert,
  Form,
  Badge,
} from 'react-bootstrap';
import {
  useCart,
  useUpdateCartQuantity,
  useRemoveCartItem,
  useClearCart,
} from '@/hooks/useCart';
import { getMediaUrl, handleImageError } from '@/utils/media.util';
import { couponService } from '@/services/coupon.service';
import { useUiStore } from '@/stores/uiStore';
import { useAuthStore } from '@/stores/authStore';

export const CartPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const { showToast } = useUiStore();
  const { data: cartData, isLoading, error, refetch } = useCart();
  const updateQuantityMutation = useUpdateCartQuantity();
  const removeItemMutation = useRemoveCartItem();
  const clearCartMutation = useClearCart();

  const [couponCode, setCouponCode] = useState('');
  const [couponApplied, setCouponApplied] = useState<string | null>(null);
  const [couponDiscount, setCouponDiscount] = useState<number>(0);
  const [couponError, setCouponError] = useState<string | null>(null);

  const cart = cartData?.data;
  const items = cart?.items || [];
  const itemCount = cart?.itemCount || 0;
  const subtotal = cart?.subtotal || 0;
  const currency = cart?.currency || 'NGN';

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const handleUpdateQuantity = (itemId: string, currentQty: number, delta: number) => {
    const newQty = currentQty + delta;
    if (newQty <= 0) {
      removeItemMutation.mutate(itemId);
    } else {
      updateQuantityMutation.mutate({ itemId, data: { quantity: newQty } });
    }
  };

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim()) return;

    try {
      const res = await couponService.validateCoupon(couponCode.trim().toUpperCase(), subtotal);
      if (res.valid) {
        setCouponApplied(couponCode.trim().toUpperCase());
        setCouponDiscount(res.discountAmount || subtotal * 0.1);
        setCouponError(null);
      } else {
        setCouponError(res.message || 'Coupon code is invalid or expired.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Coupon validation failed.';
      setCouponError(msg);
    }
  };

  if (isLoading) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3 text-muted">Loading your shopping cart...</p>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="py-5">
        <Alert variant="danger">
          <Alert.Heading>Error loading cart</Alert.Heading>
          <p>{(error as Error).message || 'Unable to retrieve your shopping cart.'}</p>
          <Button variant="outline-danger" onClick={() => void refetch()}>
            Retry
          </Button>
        </Alert>
      </Container>
    );
  }

  return (
    <Container className="py-4 py-lg-5">
      {/* Breadcrumbs & Header */}
      <nav aria-label="breadcrumb" className="mb-3">
        <ol className="breadcrumb small">
          <li className="breadcrumb-item">
            <Link to="/" className="text-decoration-none text-muted">
              Home
            </Link>
          </li>
          <li className="breadcrumb-item active text-dark fw-semibold" aria-current="page">
            Shopping Cart
          </li>
        </ol>
      </nav>

      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4 pb-2 border-bottom">
        <div>
          <h1 className="font-editorial display-6 fw-bold mb-1">Your Shopping Cart</h1>
          <p className="text-muted mb-0">Make sure everything looks right before checkout.</p>
        </div>
        <div className="mt-3 mt-md-0">
          <Link to="/" className="btn btn-outline-secondary px-3">
            ← Continue shopping
          </Link>
        </div>
      </div>

      {items.length === 0 ? (
        <Card className="border text-center py-5 shadow-sm">
          <Card.Body>
            <div style={{ fontSize: 56 }} className="mb-3">
              🛍️
            </div>
            <h3 className="fw-bold mb-2 font-editorial">Your cart is empty</h3>
            <p className="text-muted mb-4">
              Explore our catalogue to discover premium lifestyle and tech products.
            </p>
            <Button
              variant="primary"
              size="lg"
              className="px-4 fw-bold"
              onClick={() => navigate('/')}
            >
              Start Shopping
            </Button>
          </Card.Body>
        </Card>
      ) : (
        <Row className="g-4">
          {/* Left Column: Product List */}
          <Col lg={8}>
            <Card className="border shadow-sm mb-4">
              <Card.Header className="bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
                <span className="fw-bold">Cart Items ({itemCount})</span>
                <Button
                  variant="outline-danger"
                  size="sm"
                  disabled={clearCartMutation.isPending}
                  onClick={() => {
                    clearCartMutation.mutate(undefined, {
                      onSuccess: () => showToast('Shopping cart cleared', 'info'),
                      onError: () => showToast('Failed to clear cart', 'error'),
                    });
                  }}
                >
                  Clear Cart
                </Button>
              </Card.Header>

              <Card.Body className="p-0">
                <div className="list-group list-group-flush">
                  {items.map((item) => (
                    <div key={item.id} className="list-group-item p-4">
                      <Row className="align-items-center g-3">
                        {/* Thumbnail */}
                        <Col xs={3} sm={2} className="text-center">
                          <img
                            src={getMediaUrl(item.thumbnailUrl)}
                            alt={item.title}
                            onError={handleImageError}
                            className="img-fluid rounded border object-fit-cover"
                            style={{ width: 72, height: 72 }}
                          />
                        </Col>

                        {/* Title & Metadata */}
                        <Col xs={9} sm={4}>
                          <h6 className="fw-bold text-dark mb-1">{item.title}</h6>
                          <div className="text-muted small mb-1">SKU: {item.sku}</div>
                          <div className="text-primary fw-semibold small">
                            {formatPrice(item.unitPrice)} each
                          </div>
                        </Col>

                        {/* Quantity Controls (- 1 +) */}
                        <Col xs={6} sm={3}>
                          <div className="d-flex align-items-center border rounded p-1 w-fit">
                            <Button
                              variant="light"
                              size="sm"
                              className="px-2 py-0 border-0 fw-bold"
                              disabled={updateQuantityMutation.isPending}
                              onClick={() => handleUpdateQuantity(item.id, item.quantity, -1)}
                              aria-label="Decrease quantity"
                            >
                              -
                            </Button>
                            <span className="px-3 fw-bold small">{item.quantity}</span>
                            <Button
                              variant="light"
                              size="sm"
                              className="px-2 py-0 border-0 fw-bold"
                              disabled={updateQuantityMutation.isPending}
                              onClick={() => handleUpdateQuantity(item.id, item.quantity, 1)}
                              aria-label="Increase quantity"
                            >
                              +
                            </Button>
                          </div>
                          <Button
                            variant="link"
                            className="text-danger p-0 mt-2 small text-decoration-none d-flex align-items-center gap-1"
                            disabled={removeItemMutation.isPending}
                            onClick={() => removeItemMutation.mutate(item.id)}
                          >
                            <span>🗑️</span> Remove
                          </Button>
                        </Col>

                        {/* Line Total */}
                        <Col xs={6} sm={3} className="text-end">
                          <span className="fw-bold text-dark h5 mb-0">
                            {formatPrice(item.lineTotal)}
                          </span>
                        </Col>
                      </Row>
                    </div>
                  ))}
                </div>
              </Card.Body>
            </Card>

            {/* Reassurance Features */}
            <div className="row g-3 text-center mb-4">
              <div className="col-md-4">
                <div className="p-3 bg-white rounded border shadow-sm">
                  <div className="fs-4 mb-1">🔒</div>
                  <h6 className="fw-bold mb-1">Secure Shopping</h6>
                  <p className="text-muted small mb-0">Protected by 256-bit encryption</p>
                </div>
              </div>
              <div className="col-md-4">
                <div className="p-3 bg-white rounded border shadow-sm">
                  <div className="fs-4 mb-1">🔄</div>
                  <h6 className="fw-bold mb-1">Free & Easy Return</h6>
                  <p className="text-muted small mb-0">Hassle-free 30-day return policy</p>
                </div>
              </div>
              <div className="col-md-4">
                <div className="p-3 bg-white rounded border shadow-sm">
                  <div className="fs-4 mb-1">⭐</div>
                  <h6 className="fw-bold mb-1">Verified Quality</h6>
                  <p className="text-muted small mb-0">100% authentic curated inventory</p>
                </div>
              </div>
            </div>
          </Col>

          {/* Right Column: Order Summary */}
          <Col lg={4}>
            <Card className="border shadow-sm sticky-top" style={{ top: 90 }}>
              <Card.Header className="bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
                <h5 className="mb-0 fw-bold">Order summary</h5>
                <Badge bg="secondary">{itemCount} items</Badge>
              </Card.Header>

              <Card.Body className="p-4">
                {/* Financial Lines */}
                <div className="d-flex justify-content-between mb-2">
                  <span className="text-muted">Subtotal</span>
                  <span className="fw-semibold">{formatPrice(subtotal)}</span>
                </div>

                <div className="d-flex justify-content-between mb-2">
                  <span className="text-muted">Estimated Shipping</span>
                  <span className="fw-semibold text-success">
                    {subtotal >= 50000 ? 'Free' : 'Calculated at checkout'}
                  </span>
                </div>

                <div className="d-flex justify-content-between mb-2">
                  <span className="text-muted">Estimated Tax</span>
                  <span className="fw-semibold">Included</span>
                </div>

                {couponApplied && (
                  <div className="d-flex justify-content-between mb-2 text-success">
                    <span>Coupon ({couponApplied})</span>
                    <span>-{formatPrice(couponDiscount)}</span>
                  </div>
                )}

                <hr />

                <div className="d-flex justify-content-between align-items-baseline mb-4">
                  <span className="h6 fw-bold mb-0">Total</span>
                  <span className="h4 fw-bold text-primary mb-0">
                    {couponApplied ? formatPrice(Math.max(0, subtotal - couponDiscount)) : formatPrice(subtotal)}
                  </span>
                </div>

                {/* Coupon Input Form */}
                <Form onSubmit={handleApplyCoupon} className="mb-4">
                  <div className="input-group">
                    <Form.Control
                      type="text"
                      placeholder="Coupon or promo code"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      disabled={Boolean(couponApplied)}
                    />
                    <Button
                      variant="outline-dark"
                      type="submit"
                      disabled={Boolean(couponApplied) || !couponCode.trim()}
                    >
                      {couponApplied ? 'Applied ✓' : 'Apply'}
                    </Button>
                  </div>
                  {couponError && (
                    <div className="text-danger small mt-1">{couponError}</div>
                  )}
                  {couponApplied && (
                    <div className="text-success small mt-1">
                      Coupon <strong>{couponApplied}</strong> applied successfully!
                    </div>
                  )}
                </Form>

                {/* Primary CTA */}
                <Button
                  variant="primary"
                  size="lg"
                  className="w-100 fw-bold py-3 shadow-sm mb-3"
                  onClick={() => {
                    if (!isAuthenticated) {
                      navigate('/login', { state: { from: { pathname: '/checkout' } } });
                    } else {
                      navigate('/checkout');
                    }
                  }}
                >
                  Proceed to Checkout →
                </Button>

                <div className="text-center text-muted small">
                  <span>Guaranteed safe & secure checkout</span>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}
    </Container>
  );
};
