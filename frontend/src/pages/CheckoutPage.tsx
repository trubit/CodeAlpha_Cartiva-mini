/**
 * Cartiva Mini — Complete Customer Checkout Experience
 * 5-Step responsive flow connecting Cart, Address, Shipping, and Authoritative Order Confirmation.
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Button, Form, Badge, Spinner, Alert } from 'react-bootstrap';
import {
  useCheckoutSession,
  useSetCheckoutAddressMutation,
  useSetCheckoutShippingMutation,
  useConfirmOrderMutation,
} from '@/hooks/useCheckout';
import { useAddresses } from '@/hooks/useAddresses';
import { useShippingMethods } from '@/hooks/useShipping';
import { useCart } from '@/hooks/useCart';
import { AddressSelectorModal } from '@/components/shipping/AddressSelectorModal';
import { getMediaUrl, handleImageError } from '@/utils/media.util';

export const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();

  const { data: cartData, isLoading: isCartLoading } = useCart();
  const cart = cartData?.data;
  const hasCartItems = Boolean(cart && cart.items && cart.items.length > 0);

  const {
    data: sessionData,
    isLoading: isSessionLoading,
    error: sessionError,
  } = useCheckoutSession(hasCartItems);
  const session = sessionData?.data;

  const { data: addressData } = useAddresses();
  const addresses = addressData || [];

  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [customerNotes, setCustomerNotes] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setAddressMutation = useSetCheckoutAddressMutation();
  const setShippingMutation = useSetCheckoutShippingMutation();
  const confirmOrderMutation = useConfirmOrderMutation();

  const selectedAddress = session?.shippingAddressSnapshot;
  const destinationCountry = selectedAddress?.country || 'Nigeria';
  const destinationState = selectedAddress?.state;

  // Query available shipping methods for this destination
  const { data: methodsData, isLoading: isMethodsLoading } = useShippingMethods(
    destinationCountry,
    destinationState
  );
  const availableMethods = methodsData || [];

  const handleSelectAddress = async (addressId: string) => {
    try {
      setErrorMessage(null);
      await setAddressMutation.mutateAsync(addressId);
    } catch (err: unknown) {
      setErrorMessage((err as Error).message || 'Failed to select delivery address.');
    }
  };

  const handleSelectShipping = async (methodId: string) => {
    try {
      setErrorMessage(null);
      await setShippingMutation.mutateAsync(methodId);
    } catch (err: unknown) {
      setErrorMessage((err as Error).message || 'Failed to select shipping method.');
    }
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acceptTerms) {
      setErrorMessage('Please accept the terms and conditions to proceed with your order.');
      return;
    }

    if (isSubmitting || confirmOrderMutation.isPending) {
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      const res = await confirmOrderMutation.mutateAsync({
        acceptTerms: true,
        customerNotes: customerNotes.trim() || undefined,
      });

      const orderNumber =
        res?.data?.orderNumber ||
        (res as unknown as Record<string, unknown>)?.orderNumber;
      if (typeof orderNumber === 'string' && orderNumber) {
        navigate(`/checkout/confirmation/${orderNumber}`);
      } else {
        // Fallback to customer orders portal
        navigate('/orders');
      }
    } catch (err: unknown) {
      setErrorMessage(
        (err as Error).message || 'Failed to place order. Please check availability.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isCartLoading || (hasCartItems && isSessionLoading)) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3 text-muted">Initializing secure checkout session...</p>
      </Container>
    );
  }

  if (!hasCartItems || sessionError || !session) {
    return (
      <Container className="py-5">
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          <Card className="border shadow-sm text-center p-4 p-md-5">
            <Card.Body>
              <div className="mb-3" style={{ fontSize: 44 }}>
                🛒
              </div>
              <h3 className="font-editorial fw-bold mb-2">Checkout Notice</h3>
              <p className="text-secondary mb-4">
                {sessionError instanceof Error
                  ? sessionError.message
                  : 'Your cart is currently empty. Add products before proceeding to checkout.'}
              </p>
              <Button
                variant="primary"
                size="lg"
                className="px-4 fw-bold"
                onClick={() => navigate('/')}
              >
                Continue Shopping
              </Button>
            </Card.Body>
          </Card>
        </div>
      </Container>
    );
  }

  const formatPrice = (amountMinor: number, currency = 'NGN') => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(amountMinor / 100);
  };

  return (
    <Container className="py-4 py-lg-5">
      {/* Checkout Header & Steps */}
      <div className="mb-4 text-center">
        <span className="badge bg-primary-subtle text-primary fw-semibold px-3 py-1 rounded-pill mb-2">
          Secure Server Checkout
        </span>
        <h1 className="font-editorial display-6 fw-bold mb-1">
          Complete Your <span className="italic-accent">Order</span>
        </h1>
        <p className="text-muted small">
          Step-by-step verification with real-time stock and shipping protection.
        </p>
      </div>

      {errorMessage && (
        <Alert variant="danger" dismissible onClose={() => setErrorMessage(null)}>
          {errorMessage}
        </Alert>
      )}

      <Row className="g-4">
        {/* Main Checkout Columns: Left Steps */}
        <Col lg={8}>
          {/* STEP 1: DELIVERY DESTINATION */}
          <Card className="border shadow-sm mb-4">
            <Card.Header className="bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
              <div className="d-flex align-items-center gap-2">
                <span className="badge bg-primary text-white rounded-circle p-2 px-3 fw-bold">
                  1
                </span>
                <h5 className="mb-0 fw-bold">Delivery Address</h5>
              </div>
              <Button
                variant="outline-primary"
                size="sm"
                onClick={() => setIsAddressModalOpen(true)}
              >
                {selectedAddress ? 'Change Address' : 'Select Address'}
              </Button>
            </Card.Header>
            <Card.Body className="p-4">
              {selectedAddress ? (
                <div className="p-3 bg-light rounded border">
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <span className="fw-bold">{selectedAddress.recipientName}</span>
                    <Badge bg="success">Selected Destination</Badge>
                  </div>
                  <div className="text-secondary small">
                    {selectedAddress.streetAddress}
                    {selectedAddress.apartmentSuite && `, ${selectedAddress.apartmentSuite}`}
                    <br />
                    {selectedAddress.city}, {selectedAddress.state}{' '}
                    {selectedAddress.postalCode && `(${selectedAddress.postalCode})`}
                    <br />
                    {selectedAddress.country} • Phone: {selectedAddress.phone}
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 bg-light rounded border border-dashed">
                  <p className="text-muted mb-3">No delivery address selected yet.</p>
                  <Button variant="primary" size="sm" onClick={() => setIsAddressModalOpen(true)}>
                    {addresses.length > 0 ? 'Choose from Saved Addresses' : 'Add New Address'}
                  </Button>
                </div>
              )}
            </Card.Body>
          </Card>

          {/* STEP 2: SHIPPING & DELIVERY METHOD */}
          <Card className="border shadow-sm mb-4">
            <Card.Header className="bg-white py-3 border-bottom d-flex align-items-center gap-2">
              <span className="badge bg-primary text-white rounded-circle p-2 px-3 fw-bold">2</span>
              <h5 className="mb-0 fw-bold">Shipping Method</h5>
            </Card.Header>
            <Card.Body className="p-4">
              {!selectedAddress ? (
                <div className="text-muted text-center py-3">
                  Please select a delivery address above to view available shipping options.
                </div>
              ) : isMethodsLoading ? (
                <div className="text-center py-3">
                  <Spinner animation="border" size="sm" variant="primary" />
                  <span className="ms-2 text-muted small">
                    Loading delivery options for your area...
                  </span>
                </div>
              ) : availableMethods.length === 0 ? (
                <Alert variant="warning" className="mb-0">
                  Delivery is currently not available to {selectedAddress.state},{' '}
                  {selectedAddress.country}. Please select a different address.
                </Alert>
              ) : (
                <div className="d-flex flex-column gap-3">
                  {availableMethods.map((method) => {
                    const isSelected = session.shippingMethodId === method.id;
                    return (
                      <div
                        key={method.id}
                        onClick={() => handleSelectShipping(method.id)}
                        className={`p-3 rounded border cursor-pointer transition-all ${
                          isSelected
                            ? 'border-primary bg-primary-subtle shadow-sm'
                            : 'border-light-subtle bg-white hover-shadow'
                        }`}
                        style={{ cursor: 'pointer' }}
                      >
                        <div className="d-flex justify-content-between align-items-center mb-1">
                          <div className="d-flex align-items-center gap-2">
                            <Form.Check
                              type="radio"
                              name="shippingMethod"
                              id={`method-${method.id}`}
                              checked={isSelected}
                              onChange={() => handleSelectShipping(method.id)}
                            />
                            <label
                              htmlFor={`method-${method.id}`}
                              className="fw-bold mb-0 cursor-pointer"
                              style={{ cursor: 'pointer' }}
                            >
                              {method.methodName}
                            </label>
                            {method.carrierName && (
                              <Badge bg="secondary" className="small">
                                {method.carrierName}
                              </Badge>
                            )}
                          </div>
                          <span className="fw-bold text-primary">
                            {formatPrice(Math.round(method.baseRate * 100), method.currency)}
                          </span>
                        </div>
                        <div className="ps-4 text-muted small d-flex justify-content-between">
                          <span>Estimated Transit: {method.estimatedDeliveryText}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card.Body>
          </Card>

          {/* STEP 3: ORDER ITEMS REVIEW */}
          <Card className="border shadow-sm mb-4">
            <Card.Header className="bg-white py-3 border-bottom d-flex align-items-center gap-2">
              <span className="badge bg-primary text-white rounded-circle p-2 px-3 fw-bold">3</span>
              <h5 className="mb-0 fw-bold">Review Purchased Items ({session.cart.itemCount})</h5>
            </Card.Header>
            <Card.Body className="p-0">
              <div className="table-responsive">
                <table className="table align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th style={{ width: '50%' }}>Product</th>
                      <th className="text-center">Quantity</th>
                      <th className="text-end">Line Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {session.cart.items.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <div className="d-flex align-items-center gap-3">
                            <img
                              src={getMediaUrl(item.thumbnailUrl)}
                              alt={item.title}
                              onError={handleImageError}
                              className="rounded border object-fit-cover"
                              style={{ width: 50, height: 50 }}
                            />
                            <div>
                              <div className="fw-semibold text-dark">{item.title}</div>
                              <div className="text-muted small">
                                SKU: {item.sku} • {formatPrice(item.unitPriceMinor, item.currency)}{' '}
                                each
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="text-center fw-semibold">{item.quantity}</td>
                        <td className="text-end fw-bold text-dark">
                          {formatPrice(item.lineTotalMinor, item.currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card.Body>
          </Card>
        </Col>

        {/* Right Sidebar: Order Summary & Confirmation */}
        <Col lg={4}>
          <Card className="border shadow-sm sticky-top" style={{ top: 90 }}>
            <Card.Header className="bg-white py-3 border-bottom">
              <h5 className="mb-0 fw-bold">Authoritative Order Summary</h5>
            </Card.Header>
            <Card.Body className="p-4">
              <div className="d-flex justify-content-between mb-2">
                <span className="text-muted">Subtotal ({session.cart.itemCount} items)</span>
                <span className="fw-semibold">
                  {formatPrice(session.subtotalMinor, session.currency)}
                </span>
              </div>

              <div className="d-flex justify-content-between mb-2">
                <span className="text-muted">Shipping Fee</span>
                <span className="fw-semibold">
                  {session.shippingFeeMinor > 0 ? (
                    formatPrice(session.shippingFeeMinor, session.currency)
                  ) : session.shippingMethodSnapshot?.isFreeShipping ? (
                    <Badge bg="success">Free Delivery</Badge>
                  ) : (
                    'Calculated at step 2'
                  )}
                </span>
              </div>

              {session.discountAmountMinor > 0 && (
                <div className="d-flex justify-content-between mb-2 text-success">
                  <span>Discount Applied</span>
                  <span>-{formatPrice(session.discountAmountMinor, session.currency)}</span>
                </div>
              )}

              <hr />

              <div className="d-flex justify-content-between align-items-baseline mb-4">
                <span className="h6 mb-0 fw-bold">Total Amount Due</span>
                <div className="text-end">
                  <span className="h4 mb-0 fw-bold text-primary">
                    {formatPrice(session.totalAmountMinor, session.currency)}
                  </span>
                  <div className="text-muted small">VAT / Taxes included</div>
                </div>
              </div>

              {/* Customer Notes */}
              <Form.Group className="mb-3">
                <Form.Label className="small fw-semibold text-secondary">
                  Delivery / Order Notes (Optional)
                </Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  placeholder="Special instructions for our dispatch team..."
                  value={customerNotes}
                  onChange={(e) => setCustomerNotes(e.target.value)}
                  maxLength={500}
                />
              </Form.Group>

              {/* Terms Acceptance */}
              <Form.Check
                type="checkbox"
                id="terms-check"
                className="mb-4 small text-muted"
                label="I agree to Cartiva Mini's Terms of Sale & Privacy Policy."
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
              />

              {/* Confirmation Action Button */}
              <Button
                variant="primary"
                size="lg"
                className="w-100 fw-bold py-3 shadow-sm"
                disabled={
                  !selectedAddress ||
                  !session.shippingMethodId ||
                  !acceptTerms ||
                  confirmOrderMutation.isPending ||
                  isSubmitting
                }
                onClick={handlePlaceOrder}
              >
                {confirmOrderMutation.isPending || isSubmitting ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" />
                    Reserving Stock & Placing Order...
                  </>
                ) : (
                  'Place Order & Proceed to Payment'
                )}
              </Button>

              <div className="mt-3 text-center text-muted small">
                <span className="d-block mb-1">🔒 256-Bit Encrypted Order Pipeline</span>
                <span>Payment authorization via Paystack occurs in Phase 13.</span>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Address Management Modals */}
      <AddressSelectorModal
        open={isAddressModalOpen}
        onClose={() => setIsAddressModalOpen(false)}
        onSelectAddress={(addr) => {
          handleSelectAddress(addr.id);
          setIsAddressModalOpen(false);
        }}
        selectedAddressId={session.shippingAddressId}
      />
    </Container>
  );
};
