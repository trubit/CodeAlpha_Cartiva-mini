import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Container, Card, Table, Badge, Spinner, Alert, Button, Form } from 'react-bootstrap';
import { useMyPayments } from '@/hooks/usePayment';
import { formatDateTime } from '@/utils/date.util';
import type { PaymentListItemDto } from '@shared/api.types';
import { PaymentStatus } from '@shared/enums';

export const PaymentHistoryPage: React.FC = () => {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('');

  const { data: response, isLoading, error } = useMyPayments({
    page,
    limit: 10,
    status: statusFilter ? (statusFilter as PaymentStatus) : undefined,
  });
  const payments: PaymentListItemDto[] = response?.data || [];
  const meta = response?.meta;

  const formatPrice = (amount: number, currency = 'NGN') => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateStr?: string) => {
    return formatDateTime(dateStr, 'Pending');
  };

  const getStatusBadge = (status: PaymentStatus | string) => {
    const s = String(status).toLowerCase();
    switch (s) {
      case 'paid':
      case 'success':
        return <Badge bg="success">PAID</Badge>;
      case 'pending':
        return <Badge bg="warning" text="dark">PENDING</Badge>;
      case 'failed':
        return <Badge bg="danger">FAILED</Badge>;
      case 'refunded':
        return <Badge bg="info">REFUNDED</Badge>;
      default:
        return <Badge bg="secondary">{s.toUpperCase()}</Badge>;
    }
  };

  return (
    <Container className="py-3 py-sm-4 py-md-5 px-2 px-sm-3">
      {/* Header and Filter */}
      <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-3 mb-4">
        <div>
          <span className="badge bg-primary-subtle text-primary fw-semibold px-3 py-1 rounded-pill mb-2">
            Payment Audit
          </span>
          <h1 className="font-editorial display-6 fw-bold mb-0" style={{ fontSize: 'clamp(1.5rem, 4vw, 2.25rem)' }}>
            Payment <span className="italic-accent">History</span>
          </h1>
          <p className="text-secondary small mb-0 mt-1">
            Authoritative financial transaction logs and payment receipts.
          </p>
        </div>

        {/* Filter by Status */}
        <div style={{ minWidth: 160 }}>
          <Form.Select
            size="sm"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Filter transactions by payment status"
          >
            <option value="">All Transactions</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
            <option value="refunded">Refunded</option>
          </Form.Select>
        </div>
      </div>

      {isLoading ? (
        <div className="py-5 text-center">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3 text-muted">Retrieving transaction ledger...</p>
        </div>
      ) : error ? (
        <Alert variant="danger">
          Failed to load payment history. Please try refreshing or re-logging into your account.
        </Alert>
      ) : payments.length === 0 ? (
        <Card className="border shadow-sm text-center py-5">
          <Card.Body>
            <div className="text-muted mb-3" style={{ fontSize: 48 }}>
              💳
            </div>
            <h4 className="fw-bold mb-2">No payment transactions found</h4>
            <p className="text-muted mb-4">
              You haven&apos;t completed any payments yet. Explore our store to place an order!
            </p>
            <Link to="/" className="btn btn-primary fw-bold px-4">
              Browse Products
            </Link>
          </Card.Body>
        </Card>
      ) : (
        <>
          {/* Mobile & Tablet Card View (< 768px / d-md-none) */}
          <div className="d-md-none d-flex flex-column gap-3 mb-4">
            {payments.map((p: PaymentListItemDto) => (
              <Card key={p.id} className="border shadow-sm rounded-3">
                <Card.Header className="bg-light py-2 px-3 d-flex justify-content-between align-items-center">
                  <span className="fw-bold text-dark font-monospace small">
                    {p.paymentReference}
                  </span>
                  {getStatusBadge(p.status)}
                </Card.Header>
                <Card.Body className="p-3">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="text-secondary small">Order #{p.orderNumber}</span>
                    <span className="text-muted small">{formatDate(p.createdAt)}</span>
                  </div>
                  <div className="d-flex justify-content-between align-items-center py-2 border-top border-bottom my-2">
                    <div>
                      <span className="text-muted small d-block">Channel</span>
                      <strong className="text-capitalize small">{p.channel || 'Paystack'}</strong>
                    </div>
                    <div className="text-end">
                      <span className="text-muted small d-block">Amount</span>
                      <strong className="fs-6 text-primary">{formatPrice(p.amount, p.currency)}</strong>
                    </div>
                  </div>
                  <Link
                    to={`/payment/verify/${p.paymentReference}`}
                    className="btn btn-outline-primary btn-sm w-100 py-2 fw-semibold mt-2 d-flex align-items-center justify-content-center"
                  >
                    View Official Receipt
                  </Link>
                </Card.Body>
              </Card>
            ))}
          </div>

          {/* Desktop & Tablet Landscape Table (>= 768px / d-none d-md-block) */}
          <Card className="border shadow-sm mb-4 d-none d-md-block">
            <div className="table-responsive">
              <Table hover className="align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Payment Ref</th>
                    <th>Order Number</th>
                    <th>Amount</th>
                    <th>Channel</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p: PaymentListItemDto) => (
                    <tr key={p.id}>
                      <td>
                        <span className="fw-bold text-dark font-monospace">{p.paymentReference}</span>
                      </td>
                      <td>
                        <span className="fw-semibold text-secondary">{p.orderNumber}</span>
                      </td>
                      <td className="fw-bold text-dark">{formatPrice(p.amount, p.currency)}</td>
                      <td className="text-capitalize text-muted small">{p.channel || 'Paystack'}</td>
                      <td>{getStatusBadge(p.status)}</td>
                      <td className="text-muted small">
                        {formatDate(p.createdAt)}
                      </td>
                      <td className="text-end">
                        <Link
                          to={`/payment/verify/${p.paymentReference}`}
                          className="btn btn-outline-primary btn-sm fw-semibold"
                        >
                          Receipt
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          </Card>

          {/* Pagination */}
          {meta && meta.totalPages > 1 && (
            <Card className="border shadow-sm mb-4">
              <Card.Body className="bg-white d-flex flex-column flex-sm-row justify-content-between align-items-center gap-2 py-3">
                <span className="small text-muted">
                  Page {meta.page} of {meta.totalPages} ({meta.total} transactions)
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
              </Card.Body>
            </Card>
          )}
        </>
      )}
    </Container>
  );
};
