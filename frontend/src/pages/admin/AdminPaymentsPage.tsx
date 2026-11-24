/**
 * Cartiva Mini — Administrator Payment Management Portal
 * RBAC protected management for platform transactions, issuing Paystack refunds,
 * and running ledger reconciliation against Paystack.
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
  Tabs,
  Tab,
} from 'react-bootstrap';
import {
  useAdminPayments,
  useCreateRefundMutation,
  useAdminRefunds,
  useAdminReconciliation,
} from '@/hooks/usePayment';
import { PaymentStatus, RefundStatus } from '@shared/enums';
import type { PaymentListItemDto } from '@shared/api.types';
import { formatDate } from '@/utils/date.util';

export const AdminPaymentsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('payments');

  // Transaction Filters
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | undefined>(undefined);

  const {
    data: paymentsData,
    isLoading: isPaymentsLoading,
    error: paymentsError,
    refetch: refetchPayments,
  } = useAdminPayments({
    page,
    limit: 15,
    search: search.trim() || undefined,
    status: statusFilter,
  });

  const payments = paymentsData?.data || [];
  const meta = paymentsData?.meta;

  // Refunds Query
  const { data: refundsData, isLoading: isRefundsLoading } = useAdminRefunds();
  const refunds = refundsData?.data || [];

  // Reconciliation Trigger
  const [runReconciliation, setRunReconciliation] = useState(false);
  const {
    data: reconData,
    isLoading: isReconLoading,
    refetch: refetchRecon,
  } = useAdminReconciliation(undefined, runReconciliation);
  const reconciliationResults = reconData?.data || [];

  // Refund Modal State
  const [selectedPayment, setSelectedPayment] = useState<PaymentListItemDto | null>(null);
  const [refundAmount, setRefundAmount] = useState<number | ''>('');
  const [refundReason, setRefundReason] = useState('');
  const [customerNote, setCustomerNote] = useState('');
  const [refundError, setRefundError] = useState<string | null>(null);

  const refundMutation = useCreateRefundMutation();

  const formatPrice = (amount: number, currency = 'NGN') => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const getStatusBadge = (status: PaymentStatus) => {
    switch (status) {
      case PaymentStatus.PAID:
      case PaymentStatus.SUCCESSFUL:
        return <Badge bg="success">PAID</Badge>;
      case PaymentStatus.PENDING:
      case PaymentStatus.INITIALIZED:
        return <Badge bg="warning" text="dark">{status.toUpperCase()}</Badge>;
      case PaymentStatus.FAILED:
      case PaymentStatus.ABANDONED:
        return <Badge bg="danger">{status.toUpperCase()}</Badge>;
      case PaymentStatus.REFUNDED:
      case PaymentStatus.PARTIALLY_REFUNDED:
        return <Badge bg="info">{status.toUpperCase()}</Badge>;
      default:
        return <Badge bg="secondary">{status}</Badge>;
    }
  };

  const handleOpenRefundModal = (payment: PaymentListItemDto) => {
    setSelectedPayment(payment);
    setRefundAmount('');
    setRefundReason('');
    setCustomerNote('');
    setRefundError(null);
  };

  const handleSubmitRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPayment) return;
    if (!refundReason.trim()) {
      setRefundError('Please provide a reason for the refund.');
      return;
    }

    try {
      setRefundError(null);
      await refundMutation.mutateAsync({
        paymentId: selectedPayment.id,
        data: {
          amount: refundAmount !== '' ? Number(refundAmount) : undefined,
          reason: refundReason.trim(),
          customerNote: customerNote.trim() || undefined,
        },
      });

      setSelectedPayment(null);
      refetchPayments();
    } catch (err: unknown) {
      setRefundError((err as Error).message || 'Failed to issue refund.');
    }
  };

  return (
    <Container className="py-4 py-lg-5">
      {/* Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 pb-3 border-bottom">
        <div>
          <span className="badge bg-secondary text-white fw-semibold px-3 py-1 rounded-pill mb-2">
            Administrator Gateway Hub
          </span>
          <h1 className="font-editorial display-6 fw-bold mb-1">Payment &amp; Financial Management</h1>
          <p className="text-muted mb-0">
            Real-time Paystack transaction monitoring, refund execution, and ledger reconciliation.
          </p>
        </div>
      </div>

      <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k || 'payments')} className="mb-4">
        {/* TAB 1: ALL TRANSACTIONS */}
        <Tab eventKey="payments" title="All Transactions">
          {/* Search & Filters */}
          <Card className="border shadow-sm mb-4">
            <Card.Body className="p-3">
              <Row className="g-3 align-items-center">
                <Col md={5}>
                  <Form.Control
                    type="text"
                    placeholder="Search by Payment Reference or Customer Email..."
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                  />
                </Col>
                <Col md={4}>
                  <Form.Select
                    value={statusFilter || ''}
                    onChange={(e) => {
                      setStatusFilter((e.target.value as PaymentStatus) || undefined);
                      setPage(1);
                    }}
                  >
                    <option value="">All Payment Statuses</option>
                    <option value={PaymentStatus.PAID}>Paid</option>
                    <option value={PaymentStatus.INITIALIZED}>Pending</option>
                    <option value={PaymentStatus.FAILED}>Failed</option>
                    <option value={PaymentStatus.ABANDONED}>Abandoned</option>
                    <option value={PaymentStatus.REFUNDED}>Refunded</option>
                  </Form.Select>
                </Col>
                <Col md={3} className="text-end">
                  <Button variant="outline-primary" onClick={() => refetchPayments()}>
                    ↻ Refresh
                  </Button>
                </Col>
              </Row>
            </Card.Body>
          </Card>

          {isPaymentsLoading ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" />
              <p className="mt-2 text-muted small">Loading gateway records...</p>
            </div>
          ) : paymentsError ? (
            <Alert variant="danger">
              Failed to load transactions: {(paymentsError as Error).message}
            </Alert>
          ) : payments.length === 0 ? (
            <Card className="border text-center py-5">
              <Card.Body>
                <p className="text-muted mb-0">No payment transactions match the active criteria.</p>
              </Card.Body>
            </Card>
          ) : (
            <Card className="border shadow-sm">
              <div className="table-responsive">
                <Table hover className="align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Reference</th>
                      <th>Order #</th>
                      <th>Customer Email</th>
                      <th>Amount</th>
                      <th>Channel</th>
                      <th>Status</th>
                      <th>Date</th>
                      <th className="text-end">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p) => {
                      const canRefund =
                        p.status === PaymentStatus.PAID ||
                        p.status === PaymentStatus.PARTIALLY_REFUNDED;

                      return (
                        <tr key={p.id}>
                          <td>
                            <span className="fw-bold text-dark font-monospace">
                              {p.paymentReference}
                            </span>
                          </td>
                          <td>
                            <span className="fw-semibold text-secondary">{p.orderNumber}</span>
                          </td>
                          <td className="small">{p.customerEmail}</td>
                          <td className="fw-bold text-dark">{formatPrice(p.amount, p.currency)}</td>
                          <td className="text-capitalize small text-muted">
                            {p.channel || 'Paystack'}
                          </td>
                          <td>{getStatusBadge(p.status)}</td>
                          <td className="text-muted small">
                            {formatDate(p.createdAt)}
                          </td>
                          <td className="text-end">
                            {canRefund ? (
                              <Button
                                variant="outline-danger"
                                size="sm"
                                onClick={() => handleOpenRefundModal(p)}
                              >
                                Refund
                              </Button>
                            ) : (
                              <span className="text-muted small">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>
              </div>

              {meta && meta.totalPages > 1 && (
                <Card.Footer className="bg-white d-flex justify-content-between align-items-center py-3">
                  <span className="small text-muted">
                    Page {meta.page} of {meta.totalPages} ({meta.total} records)
                  </span>
                  <div className="d-flex gap-2">
                    <Button
                      variant="outline-secondary"
                      size="sm"
                      disabled={!meta.hasPrevPage}
                      onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline-secondary"
                      size="sm"
                      disabled={!meta.hasNextPage}
                      onClick={() => setPage((prev) => prev + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </Card.Footer>
              )}
            </Card>
          )}
        </Tab>

        {/* TAB 2: REFUND LEDGER */}
        <Tab eventKey="refunds" title={`Refunds (${refunds.length})`}>
          {isRefundsLoading ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" />
            </div>
          ) : refunds.length === 0 ? (
            <Card className="border text-center py-5">
              <Card.Body>
                <p className="text-muted mb-0">No refund records recorded on this platform.</p>
              </Card.Body>
            </Card>
          ) : (
            <Card className="border shadow-sm">
              <div className="table-responsive">
                <Table hover className="align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Refund Ref</th>
                      <th>Payment Ref</th>
                      <th>Order #</th>
                      <th>Amount</th>
                      <th>Reason</th>
                      <th>Status</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {refunds.map((r) => (
                      <tr key={r.id}>
                        <td className="fw-bold font-monospace">{r.refundReference}</td>
                        <td className="small">{r.paymentReference}</td>
                        <td className="fw-semibold">{r.orderNumber}</td>
                        <td className="fw-bold text-danger">-{formatPrice(r.amount, r.currency)}</td>
                        <td className="small text-muted">{r.reason}</td>
                        <td>
                          <Badge
                            bg={
                              r.status === RefundStatus.COMPLETED
                                ? 'success'
                                : r.status === RefundStatus.PENDING
                                ? 'warning'
                                : 'danger'
                            }
                          >
                            {r.status.toUpperCase()}
                          </Badge>
                        </td>
                        <td className="small text-muted">
                          {formatDate(r.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            </Card>
          )}
        </Tab>

        {/* TAB 3: FINANCIAL RECONCILIATION */}
        <Tab eventKey="reconciliation" title="Financial Reconciliation">
          <Card className="border shadow-sm mb-4">
            <Card.Body className="p-4">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div>
                  <h5 className="fw-bold mb-1">Paystack Ledger Reconciliation</h5>
                  <p className="text-muted small mb-0">
                    Compares internal payment balances against Paystack API settlement records to
                    surface any discrepancies.
                  </p>
                </div>
                <Button
                  variant="primary"
                  className="fw-bold"
                  disabled={isReconLoading}
                  onClick={() => {
                    setRunReconciliation(true);
                    refetchRecon();
                  }}
                >
                  {isReconLoading ? (
                    <>
                      <Spinner animation="border" size="sm" className="me-2" />
                      Running Reconciliation...
                    </>
                  ) : (
                    'Run Full Reconciliation'
                  )}
                </Button>
              </div>

              {reconciliationResults.length > 0 && (
                <div className="table-responsive mt-4">
                  <Table bordered hover className="align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Payment Ref</th>
                        <th>Order Ref</th>
                        <th>Internal Status</th>
                        <th>Gateway Status</th>
                        <th>Internal Minor</th>
                        <th>Gateway Minor</th>
                        <th>Alignment</th>
                        <th>Discrepancy Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reconciliationResults.map((rec, idx) => (
                        <tr key={idx} className={rec.matched ? '' : 'table-warning'}>
                          <td className="font-monospace small fw-bold">{rec.paymentReference}</td>
                          <td className="small">{rec.orderNumber}</td>
                          <td>
                            <Badge bg="secondary">{rec.internalStatus}</Badge>
                          </td>
                          <td>
                            <Badge bg="secondary">{rec.providerStatus}</Badge>
                          </td>
                          <td className="small">{rec.internalAmountMinor}</td>
                          <td className="small">{rec.providerAmountMinor}</td>
                          <td>
                            {rec.matched ? (
                              <Badge bg="success">MATCHED ✓</Badge>
                            ) : (
                              <Badge bg="danger">DISCREPANCY ⚠</Badge>
                            )}
                          </td>
                          <td className="small text-danger">
                            {rec.discrepancies.length > 0
                              ? rec.discrepancies.join('; ')
                              : 'None (Balanced)'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              )}
            </Card.Body>
          </Card>
        </Tab>
      </Tabs>

      {/* Refund Modal */}
      <Modal show={Boolean(selectedPayment)} onHide={() => setSelectedPayment(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="fw-bold">Issue Paystack Refund</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmitRefund}>
          <Modal.Body>
            {refundError && <Alert variant="danger">{refundError}</Alert>}

            {selectedPayment && (
              <div className="p-3 bg-light rounded-3 border mb-3 small">
                <div className="d-flex justify-content-between mb-1">
                  <span className="text-muted">Payment Ref:</span>
                  <span className="fw-bold">{selectedPayment.paymentReference}</span>
                </div>
                <div className="d-flex justify-content-between mb-1">
                  <span className="text-muted">Order Number:</span>
                  <span>{selectedPayment.orderNumber}</span>
                </div>
                <div className="d-flex justify-content-between">
                  <span className="text-muted">Total Paid:</span>
                  <span className="fw-bold text-dark">
                    {formatPrice(selectedPayment.amount, selectedPayment.currency)}
                  </span>
                </div>
              </div>
            )}

            <Form.Group className="mb-3">
              <Form.Label className="small fw-semibold">
                Refund Amount (Leave empty for full refund)
              </Form.Label>
              <Form.Control
                type="number"
                step="0.01"
                placeholder={selectedPayment ? String(selectedPayment.amount) : '0.00'}
                value={refundAmount}
                onChange={(e) =>
                  setRefundAmount(e.target.value === '' ? '' : parseFloat(e.target.value))
                }
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label className="small fw-semibold">Reason for Refund *</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                placeholder="e.g. Customer cancelled order before dispatch"
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label className="small fw-semibold">Customer Note (Optional)</Form.Label>
              <Form.Control
                type="text"
                placeholder="Message that may appear on customer statement"
                value={customerNote}
                onChange={(e) => setCustomerNote(e.target.value)}
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setSelectedPayment(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              type="submit"
              disabled={refundMutation.isPending}
              className="fw-bold"
            >
              {refundMutation.isPending ? 'Processing with Paystack...' : 'Confirm & Process Refund'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
};
