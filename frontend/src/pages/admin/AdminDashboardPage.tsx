/**
 * Cartiva Mini — Centralized Administrative Control Centre
 * Phase 15: Admin Dashboard & Management System
 * Single unified management environment for all 17 commerce, operations, financial, and compliance domains.
 */
import React, { useState } from 'react';
import {
  Box,
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  IconButton,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
  Drawer,
  Divider,
  Rating,
  Tooltip,
} from '@mui/material';
import {
  DashboardOutlined as DashboardIcon,
  ShoppingCartOutlined as OrdersIcon,
  Inventory2Outlined as InventoryIcon,
  CategoryOutlined as CategoryIcon,
  LocalOfferOutlined as CouponIcon,
  RateReviewOutlined as ReviewIcon,
  LocalShippingOutlined as ShippingIcon,
  SupportAgentOutlined as SupportIcon,
  PaymentOutlined as PaymentIcon,
  AssessmentOutlined as ReportIcon,
  PeopleOutline as CustomerIcon,
  AdminPanelSettingsOutlined as TeamIcon,
  FactCheckOutlined as AuditIcon,
  SettingsOutlined as SettingsIcon,
  RefreshOutlined as RefreshIcon,
  FileDownloadOutlined as ExportIcon,
  AddOutlined as AddIcon,
  CheckCircleOutline as ApproveIcon,
  CancelOutlined as RejectIcon,
  DeleteOutline as DeleteIcon,
  SendOutlined as SendIcon,
  TrendingUpOutlined as RevenueIcon,
  CloudUploadOutlined as UploadIcon,
  ImageOutlined as ImageIcon,
} from '@mui/icons-material';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';
import {
  useAdminDashboardSummary,
  useAdminDashboardCharts,
  useAdminSalesReport,
  useAdminStaff,
  useCreateStaff,
  useUpdateStaffRole,
  useCoupons,
  useCreateCoupon,
  useToggleCouponStatus,
  useDeleteCoupon,
  useReviews,
  useUpdateReviewStatus,
  useDeleteReview,
  useAdminTickets,
  useAddAdminTicketMessage,
  useUpdateTicketStatus,
  useAuditLogs,
  useAdminSettings,
  useUpdateSettings,
} from '@/hooks/useAdmin';
import {
  useAdminProducts,
  useCreateProduct,
  useUpdateProductStatus,
  useUploadProductImage,
} from '@/hooks/useProducts';
import {
  useAdminCategories,
  useCreateCategory,
} from '@/hooks/useCategories';
import { useAdminOrders } from '@/hooks/useOrders';
import { useAdminPayments } from '@/hooks/usePayment';
import { useInventoryList, useAdjustStock } from '@/hooks/useInventory';
import { useAdminShippingConfigurations } from '@/hooks/useShipping';
import { adminService } from '@/services/admin.service';
import { getMediaUrl, handleImageError } from '@/utils/media.util';
import {
  UserRole,
  PaymentStatus,
  ReviewStatus,
  SupportTicketStatus,
  SupportTicketPriority,
  DiscountType,
  ProductStatus,
} from '@shared/enums';
import type {
  CreateCouponDto,
  SupportTicketDto,
  AuditLogItemDto,
  ProductListItemDto,
  CategoryDto,
  ShippingMethodDto,
  PaymentListItemDto,
  OrderDetailDto,
  InventoryItemDto,
} from '@shared/api.types';
import { formatDateTime, formatDate } from '@/utils/date.util';

type AdminTab =
  | 'overview'
  | 'orders'
  | 'products'
  | 'categories'
  | 'inventory'
  | 'coupons'
  | 'reviews'
  | 'fulfilment'
  | 'shipping'
  | 'support'
  | 'payments'
  | 'reports'
  | 'customers'
  | 'team'
  | 'audit'
  | 'settings';

export const AdminDashboardPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get('tab') as AdminTab) || 'overview';

  // Date filters for overview and reports
  const [period, setPeriod] = useState<'today' | 'yesterday' | '7d' | '30d' | 'this_month' | 'last_month'>('30d');

  // Queries
  const { data: summary, isLoading: summaryLoading, refetch: refetchSummary } = useAdminDashboardSummary({ period });
  const { data: charts } = useAdminDashboardCharts({ period });
  const { data: salesReport, isLoading: reportLoading } = useAdminSalesReport({ period });
  const { data: staffList } = useAdminStaff();
  const { data: couponsData } = useCoupons();
  const { data: reviewsData } = useReviews();
  const { data: ticketsData } = useAdminTickets();
  const { data: auditData } = useAuditLogs();
  const { data: settingsData } = useAdminSettings();
  const { data: productsData } = useAdminProducts({ page: 1, limit: 20 });
  const { data: categoriesData } = useAdminCategories();
  const { data: ordersData } = useAdminOrders({ page: 1, limit: 15 });
  const { data: paymentsData } = useAdminPayments({ page: 1, limit: 15 });
  const { data: inventoryData } = useInventoryList({ page: 1, limit: 20 });
  const { data: shippingConfigs } = useAdminShippingConfigurations();

  // Mutations
  const createCouponMutation = useCreateCoupon();
  const toggleCouponMutation = useToggleCouponStatus();
  const deleteCouponMutation = useDeleteCoupon();
  const updateReviewStatusMutation = useUpdateReviewStatus();
  const deleteReviewMutation = useDeleteReview();
  const addTicketMessageMutation = useAddAdminTicketMessage();
  const updateTicketStatusMutation = useUpdateTicketStatus();
  const updateSettingsMutation = useUpdateSettings();
  const createStaffMutation = useCreateStaff();
  const updateStaffRoleMutation = useUpdateStaffRole();
  const createProductMutation = useCreateProduct();
  const updateProductStatusMutation = useUpdateProductStatus();
  const uploadProductImageMutation = useUploadProductImage();
  const createCategoryMutation = useCreateCategory();
  const adjustStockMutation = useAdjustStock();

  // Modals state
  const [couponModalOpen, setCouponModalOpen] = useState(false);
  const [newCoupon, setNewCoupon] = useState<CreateCouponDto>({
    code: '',
    description: '',
    discountType: DiscountType.PERCENTAGE,
    discountValue: 10,
    minOrderValue: 0,
    startDate: new Date().toISOString(),
    expiryDate: new Date(Date.now() + 30 * 86400000).toISOString(),
    usageLimitTotal: 100,
  });

  const [staffModalOpen, setStaffModalOpen] = useState(false);
  const [newStaff, setNewStaff] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phone: '',
    role: UserRole.STAFF as UserRole.STAFF | UserRole.ADMIN,
  });

  const [productModalOpen, setProductModalOpen] = useState(false);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string>('');
  const [imageUrlInput, setImageUrlInput] = useState<string>('');
  const [isUploadingImage, setIsUploadingImage] = useState<boolean>(false);
  const [newProduct, setNewProduct] = useState({
    title: '',
    sku: '',
    regularPrice: 5000,
    salePrice: undefined as number | undefined,
    stockQuantity: 20,
    categoryId: '',
    shortDescription: 'Premium quality merchandise from Cartiva Mini.',
    fullDescription: 'Comprehensive product description crafted for optimal shopper satisfaction.',
  });

  const handleImageFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (PNG, JPG, WEBP).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('Image file size must be less than 5MB.');
      return;
    }
    setSelectedImageFile(file);
    const objectUrl = URL.createObjectURL(file);
    setImagePreviewUrl(objectUrl);
  };

  const handleClearSelectedImage = () => {
    setSelectedImageFile(null);
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
      setImagePreviewUrl('');
    }
    setImageUrlInput('');
  };

  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [newCategory, setNewCategory] = useState({ name: '', description: '', displayOrder: 1 });

  const [stockModalOpen, setStockModalOpen] = useState(false);
  const [stockAdjustData, setStockAdjustData] = useState({
    productId: '',
    sku: '',
    targetQuantity: 0,
    reason: 'Routine inventory reconciliation',
  });

  const [ticketDrawerOpen, setTicketDrawerOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicketDto | null>(null);
  const [ticketReplyText, setTicketReplyText] = useState('');

  const [auditDiffModalOpen, setAuditDiffModalOpen] = useState(false);
  const [selectedAuditLog, setSelectedAuditLog] = useState<AuditLogItemDto | null>(null);

  // CSV export handlers
  const handleExportOrders = async () => {
    try {
      const blob = await adminService.exportOrdersCsv({ period });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `orders-export-${period}-${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch {
      alert('Failed to export orders CSV.');
    }
  };

  const handleExportProducts = async () => {
    try {
      const blob = await adminService.exportProductsCsv();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `products-catalog-${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch {
      alert('Failed to export products CSV.');
    }
  };

  const getErrorMessage = (err: unknown, fallback: string): string => {
    if (err && typeof err === 'object') {
      const axiosErr = err as {
        response?: {
          status?: number;
          data?: { error?: { message?: string }; message?: string };
        };
        message?: string;
      };
      const res = axiosErr.response;
      if (res?.data?.error?.message) return res.data.error.message;
      if (res?.data?.message) return res.data.message;
      if (res?.status === 401) return 'Authentication required. Please log in as an administrator.';
      if (res?.status === 403) return 'Insufficient permissions. Administrator privileges required.';
      if (res?.status === 413) return 'File too large. Product photos must not exceed 5 MB.';
      if (res?.status === 415) return 'Unsupported file format. Please upload JPEG, PNG, or WebP images.';
      if (res?.status === 422) return 'Validation error: Invalid product or file data.';
      if (res?.status && res.status >= 500) return 'Server error during operation. Please try again.';
    }
    if (err instanceof Error) return err.message;
    return fallback;
  };

  // Submit Handlers
  const handleCreateCouponSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCoupon.code.trim()) return;
    try {
      await createCouponMutation.mutateAsync(newCoupon);
      setCouponModalOpen(false);
      setNewCoupon({
        code: '',
        description: '',
        discountType: DiscountType.PERCENTAGE,
        discountValue: 10,
        minOrderValue: 0,
        startDate: new Date().toISOString(),
        expiryDate: new Date(Date.now() + 30 * 86400000).toISOString(),
        usageLimitTotal: 100,
      });
    } catch (err: unknown) {
      alert(getErrorMessage(err, 'Failed to create coupon.'));
    }
  };

  const handleCreateStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createStaffMutation.mutateAsync(newStaff);
      setStaffModalOpen(false);
      setNewStaff({
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        phone: '',
        role: UserRole.STAFF,
      });
    } catch (err: unknown) {
      alert(getErrorMessage(err, 'Failed to create staff account.'));
    }
  };

  const handleCreateProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProduct.categoryId) {
      alert('Please select a category.');
      return;
    }
    try {
      setIsUploadingImage(true);
      const createdProduct = await createProductMutation.mutateAsync({
        title: newProduct.title,
        sku: newProduct.sku.toUpperCase().trim(),
        regularPrice: Number(newProduct.regularPrice),
        salePrice: newProduct.salePrice ? Number(newProduct.salePrice) : undefined,
        stockQuantity: Number(newProduct.stockQuantity),
        categoryId: newProduct.categoryId,
        shortDescription: newProduct.shortDescription,
        fullDescription: newProduct.fullDescription,
        currency: 'NGN',
        status: ProductStatus.PUBLISHED,
        featured: false,
        tags: ['general'],
        imageUrl: imageUrlInput.trim() || undefined,
      });

      // If an actual image file was selected by the admin, upload it immediately
      if (selectedImageFile && createdProduct?.id) {
        await uploadProductImageMutation.mutateAsync({
          productId: createdProduct.id,
          file: selectedImageFile,
          options: { isThumbnail: true, alt: newProduct.title, displayOrder: 0 },
        });
      }

      setProductModalOpen(false);
      handleClearSelectedImage();
      setNewProduct({
        title: '',
        sku: '',
        regularPrice: 5000,
        salePrice: undefined,
        stockQuantity: 20,
        categoryId: '',
        shortDescription: 'Premium quality merchandise from Cartiva Mini.',
        fullDescription: 'Comprehensive product description crafted for optimal shopper satisfaction.',
      });
    } catch (err: unknown) {
      alert(getErrorMessage(err, 'Failed to create product.'));
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleCreateCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createCategoryMutation.mutateAsync({
        name: newCategory.name,
        description: newCategory.description,
        displayOrder: Number(newCategory.displayOrder),
        isActive: true,
      });
      setCategoryModalOpen(false);
      setNewCategory({ name: '', description: '', displayOrder: 1 });
    } catch (err: unknown) {
      alert(getErrorMessage(err, 'Failed to create category.'));
    }
  };

  const handleAdjustStockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await adjustStockMutation.mutateAsync({
        inventoryId: stockAdjustData.productId,
        data: {
          targetQuantity: Number(stockAdjustData.targetQuantity),
          reason: stockAdjustData.reason,
        },
      });
      setStockModalOpen(false);
    } catch (err: unknown) {
      alert(getErrorMessage(err, 'Failed to adjust stock.'));
    }
  };

  const handleSendTicketReply = async () => {
    if (!selectedTicket || !ticketReplyText.trim()) return;
    try {
      const updated = await addTicketMessageMutation.mutateAsync({
        id: selectedTicket.id,
        dto: { content: ticketReplyText.trim() },
      });
      setSelectedTicket(updated);
      setTicketReplyText('');
    } catch (err: unknown) {
      alert(getErrorMessage(err, 'Failed to send message.'));
    }
  };

  const handleTicketStatusChange = async (newStatus: SupportTicketStatus) => {
    if (!selectedTicket) return;
    try {
      const updated = await updateTicketStatusMutation.mutateAsync({
        id: selectedTicket.id,
        dto: { status: newStatus },
      });
      setSelectedTicket(updated);
    } catch (err: unknown) {
      alert(getErrorMessage(err, 'Failed to update ticket status.'));
    }
  };

  // Nav categories configuration
  const navSections = [
    {
      category: 'Overview',
      items: [{ id: 'overview', label: 'Dashboard', icon: <DashboardIcon fontSize="small" /> }],
    },
    {
      category: 'Commerce',
      items: [
        { id: 'orders', label: 'Orders', icon: <OrdersIcon fontSize="small" /> },
        { id: 'products', label: 'Products', icon: <InventoryIcon fontSize="small" /> },
        { id: 'categories', label: 'Categories', icon: <CategoryIcon fontSize="small" /> },
        { id: 'inventory', label: 'Inventory', icon: <InventoryIcon fontSize="small" /> },
        { id: 'coupons', label: 'Coupons & Discounts', icon: <CouponIcon fontSize="small" /> },
        { id: 'reviews', label: 'Reviews & Ratings', icon: <ReviewIcon fontSize="small" /> },
      ],
    },
    {
      category: 'Operations',
      items: [
        { id: 'fulfilment', label: 'Fulfilment & Waybills', icon: <ShippingIcon fontSize="small" /> },
        { id: 'shipping', label: 'Shipping Configurations', icon: <ShippingIcon fontSize="small" /> },
        { id: 'support', label: 'Support Tickets', icon: <SupportIcon fontSize="small" /> },
      ],
    },
    {
      category: 'Finance',
      items: [
        { id: 'payments', label: 'Payments & Refunds', icon: <PaymentIcon fontSize="small" /> },
        { id: 'reports', label: 'Sales Reports & Analytics', icon: <ReportIcon fontSize="small" /> },
      ],
    },
    {
      category: 'Customers',
      items: [{ id: 'customers', label: 'Customer Accounts', icon: <CustomerIcon fontSize="small" /> }],
    },
    {
      category: 'Administration',
      items: [
        { id: 'team', label: 'Team & Permissions', icon: <TeamIcon fontSize="small" /> },
        { id: 'audit', label: 'Audit Logs', icon: <AuditIcon fontSize="small" /> },
        { id: 'settings', label: 'Platform Settings', icon: <SettingsIcon fontSize="small" /> },
      ],
    },
  ];

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh', pb: 10 }}>
      <Container maxWidth="xl" sx={{ mt: { xs: 2, md: 3 }, px: { xs: 1.5, sm: 2, md: 3 } }}>
        {/* Quick Horizontal Scroll Tab Strip for Mobile & Tablet */}
        <Box
          sx={{
            display: { xs: 'flex', md: 'none' },
            overflowX: 'auto',
            gap: 1,
            pb: 1.5,
            mb: 2,
            whiteSpace: 'nowrap',
            scrollbarWidth: 'none',
            '&::-webkit-scrollbar': { display: 'none' },
          }}
        >
          {navSections.flatMap((sec) => sec.items).map((item) => {
            const isSelected = activeTab === item.id;
            return (
              <Chip
                key={item.id}
                onClick={() => setSearchParams({ tab: item.id })}
                icon={item.icon}
                label={item.label}
                clickable
                color={isSelected ? 'primary' : 'default'}
                variant={isSelected ? 'filled' : 'outlined'}
                sx={{
                  fontWeight: isSelected ? 800 : 500,
                  fontSize: '0.8rem',
                  py: 1.8,
                  borderRadius: '20px',
                  '& .MuiChip-icon': {
                    fontSize: '1rem',
                    color: isSelected ? '#fff' : 'text.secondary',
                  },
                }}
              />
            );
          })}
        </Box>

        <Grid container spacing={{ xs: 2, md: 3 }}>
          {/* ========================================================= */}
          {/* LEFT SIDEBAR NAVIGATION (Visible on Desktop >= md) */}
          {/* ========================================================= */}
          <Grid item xs={12} md={2.8} lg={2.4} sx={{ display: { xs: 'none', md: 'block' } }}>
            <Card sx={{ borderRadius: '14px', border: '1px solid', borderColor: 'divider', position: 'sticky', top: 80 }}>
              <CardContent sx={{ p: 2 }}>
                <Typography variant="overline" color="text.secondary" fontWeight={800} letterSpacing={1}>
                  NAVIGATION
                </Typography>
                <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {navSections.map((sec) => (
                    <Box key={sec.category}>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        fontWeight={700}
                        sx={{ px: 1, textTransform: 'uppercase', letterSpacing: 0.5 }}
                      >
                        {sec.category}
                      </Typography>
                      <Box sx={{ mt: 0.5, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        {sec.items.map((item) => {
                          const isSelected = activeTab === item.id;
                          return (
                            <Button
                              key={item.id}
                              onClick={() => setSearchParams({ tab: item.id })}
                              startIcon={item.icon}
                              fullWidth
                              sx={{
                                justifyContent: 'flex-start',
                                textTransform: 'none',
                                fontWeight: isSelected ? 800 : 500,
                                color: isSelected ? 'primary.main' : 'text.primary',
                                bgcolor: isSelected ? 'action.selected' : 'transparent',
                                borderRadius: '8px',
                                px: 1.5,
                                py: 0.75,
                                '&:hover': { bgcolor: 'action.hover' },
                              }}
                            >
                              {item.label}
                            </Button>
                          );
                        })}
                      </Box>
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* ========================================================= */}
          {/* MAIN MANAGEMENT CONTENT AREA */}
          {/* ========================================================= */}
          <Grid item xs={12} md={9.2} lg={9.6}>
            {/* 1. OVERVIEW & BUSINESS KPIS TAB */}
            {activeTab === 'overview' && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {/* Header & Date Period Filter */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                  <Box>
                    <Typography variant="h5" fontWeight={800}>
                      Business Overview & Analytics
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Real-time metrics computed directly from database collections.
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <FormControl size="small" sx={{ minWidth: 140 }}>
                      <InputLabel>Reporting Range</InputLabel>
                      <Select
                        value={period}
                        label="Reporting Range"
                        onChange={(e) => setPeriod(e.target.value as 'today' | 'yesterday' | '7d' | '30d' | 'this_month' | 'last_month')}
                      >
                        <MenuItem value="today">Today</MenuItem>
                        <MenuItem value="yesterday">Yesterday</MenuItem>
                        <MenuItem value="7d">Last 7 Days</MenuItem>
                        <MenuItem value="30d">Last 30 Days</MenuItem>
                        <MenuItem value="this_month">This Month</MenuItem>
                        <MenuItem value="last_month">Previous Month</MenuItem>
                      </Select>
                    </FormControl>
                    <IconButton onClick={() => refetchSummary()} color="primary" size="small">
                      <RefreshIcon />
                    </IconButton>
                  </Box>
                </Box>

                {summaryLoading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                    <CircularProgress />
                  </Box>
                ) : (
                  <>
                    {/* Top Metric Cards */}
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6} md={3}>
                        <Card sx={{ borderRadius: '12px', border: '1px solid', borderColor: 'divider' }}>
                          <CardContent sx={{ p: 2.5 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Typography variant="caption" color="text.secondary" fontWeight={700}>
                                VERIFIED REVENUE
                              </Typography>
                              <RevenueIcon color="success" fontSize="small" />
                            </Box>
                            <Typography variant="h5" fontWeight={900} sx={{ mt: 1 }}>
                              ₦{summary?.revenue.totalRevenue.toLocaleString() || '0'}
                            </Typography>
                            <Typography variant="caption" color="success.main" fontWeight={600}>
                              {summary?.revenue.verifiedCount || 0} Successful Transactions
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>

                      <Grid item xs={12} sm={6} md={3}>
                        <Card sx={{ borderRadius: '12px', border: '1px solid', borderColor: 'divider' }}>
                          <CardContent sx={{ p: 2.5 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Typography variant="caption" color="text.secondary" fontWeight={700}>
                                TOTAL ORDERS
                              </Typography>
                              <OrdersIcon color="primary" fontSize="small" />
                            </Box>
                            <Typography variant="h5" fontWeight={900} sx={{ mt: 1 }}>
                              {summary?.orders.totalOrders.toLocaleString() || '0'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {summary?.orders.delivered || 0} Delivered • {summary?.orders.shipped || 0} In Transit
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>

                      <Grid item xs={12} sm={6} md={3}>
                        <Card sx={{ borderRadius: '12px', border: '1px solid', borderColor: 'divider' }}>
                          <CardContent sx={{ p: 2.5 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Typography variant="caption" color="text.secondary" fontWeight={700}>
                                REGISTERED SHOPPERS
                              </Typography>
                              <CustomerIcon color="info" fontSize="small" />
                            </Box>
                            <Typography variant="h5" fontWeight={900} sx={{ mt: 1 }}>
                              {summary?.customers.totalCustomers.toLocaleString() || '0'}
                            </Typography>
                            <Typography variant="caption" color="info.main" fontWeight={600}>
                              {summary?.customers.activeCustomers || 0} Active Accounts
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>

                      <Grid item xs={12} sm={6} md={3}>
                        <Card sx={{ borderRadius: '12px', border: '1px solid', borderColor: 'divider' }}>
                          <CardContent sx={{ p: 2.5 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Typography variant="caption" color="text.secondary" fontWeight={700}>
                                INVENTORY ALERTS
                              </Typography>
                              <InventoryIcon color="warning" fontSize="small" />
                            </Box>
                            <Typography variant="h5" fontWeight={900} color="warning.main" sx={{ mt: 1 }}>
                              {summary?.products.lowStockCount || 0} Low Stock
                            </Typography>
                            <Typography variant="caption" color="error.main" fontWeight={600}>
                              {summary?.products.outOfStockCount || 0} Out of Stock
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                    </Grid>

                    {/* Operational Queues Summary */}
                    <Card sx={{ borderRadius: '14px', border: '1px solid', borderColor: 'divider' }}>
                      <CardContent sx={{ p: 3 }}>
                        <Typography variant="subtitle1" fontWeight={800}>
                          Fulfilment & Operations Pipeline
                        </Typography>
                        <Grid container spacing={2} sx={{ mt: 1 }}>
                          <Grid item xs={6} sm={4} md={2}>
                            <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: '10px', textAlign: 'center' }}>
                              <Typography variant="caption" color="text.secondary">PROCESSING</Typography>
                              <Typography variant="h6" fontWeight={800}>{summary?.orders.processing || 0}</Typography>
                            </Box>
                          </Grid>
                          <Grid item xs={6} sm={4} md={2}>
                            <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: '10px', textAlign: 'center' }}>
                              <Typography variant="caption" color="text.secondary">PACKED</Typography>
                              <Typography variant="h6" fontWeight={800}>{summary?.orders.packed || 0}</Typography>
                            </Box>
                          </Grid>
                          <Grid item xs={6} sm={4} md={2}>
                            <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: '10px', textAlign: 'center' }}>
                              <Typography variant="caption" color="text.secondary">READY DISPATCH</Typography>
                              <Typography variant="h6" fontWeight={800}>{summary?.orders.readyForShipment || 0}</Typography>
                            </Box>
                          </Grid>
                          <Grid item xs={6} sm={4} md={2}>
                            <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: '10px', textAlign: 'center' }}>
                              <Typography variant="caption" color="text.secondary">DISPATCHED</Typography>
                              <Typography variant="h6" fontWeight={800}>{summary?.orders.shipped || 0}</Typography>
                            </Box>
                          </Grid>
                          <Grid item xs={6} sm={4} md={2}>
                            <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: '10px', textAlign: 'center' }}>
                              <Typography variant="caption" color="text.secondary">OUT FOR DELIVERY</Typography>
                              <Typography variant="h6" fontWeight={800}>{summary?.orders.outForDelivery || 0}</Typography>
                            </Box>
                          </Grid>
                          <Grid item xs={6} sm={4} md={2}>
                            <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: '10px', textAlign: 'center' }}>
                              <Typography variant="caption" color="text.secondary">SUPPORT TICKETS</Typography>
                              <Typography variant="h6" fontWeight={800} color="secondary.main">{summary?.support.openTicketsCount || 0}</Typography>
                            </Box>
                          </Grid>
                        </Grid>
                      </CardContent>
                    </Card>

                    {/* Breakdown & Best-Sellers */}
                    <Grid container spacing={3}>
                      <Grid item xs={12} md={6}>
                        <Card sx={{ borderRadius: '14px', border: '1px solid', borderColor: 'divider', height: '100%' }}>
                          <CardContent sx={{ p: 3 }}>
                            <Typography variant="subtitle1" fontWeight={800}>
                              Top Performing Products
                            </Typography>
                            <TableContainer sx={{ mt: 1 }}>
                              <Table size="small">
                                <TableHead>
                                  <TableRow>
                                    <TableCell sx={{ fontWeight: 700 }}>Product Title</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>SKU</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 700 }}>Units Sold</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 700 }}>Revenue</TableCell>
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {charts?.topProducts.length ? (
                                    charts.topProducts.map((p) => (
                                      <TableRow key={p.productId}>
                                        <TableCell>{p.title}</TableCell>
                                        <TableCell><code>{p.sku}</code></TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 700 }}>{p.unitsSold}</TableCell>
                                        <TableCell align="right">₦{p.totalRevenue.toLocaleString()}</TableCell>
                                      </TableRow>
                                    ))
                                  ) : (
                                    <TableRow key="empty-top-products">
                                      <TableCell colSpan={4} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                                        No sales records in selected period.
                                      </TableCell>
                                    </TableRow>
                                  )}
                                </TableBody>
                              </Table>
                            </TableContainer>
                          </CardContent>
                        </Card>
                      </Grid>

                      <Grid item xs={12} md={6}>
                        <Card sx={{ borderRadius: '14px', border: '1px solid', borderColor: 'divider', height: '100%' }}>
                          <CardContent sx={{ p: 3 }}>
                            <Typography variant="subtitle1" fontWeight={800}>
                              Revenue By Department / Category
                            </Typography>
                            <TableContainer sx={{ mt: 1 }}>
                              <Table size="small">
                                <TableHead>
                                  <TableRow>
                                    <TableCell sx={{ fontWeight: 700 }}>Category</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 700 }}>Orders</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 700 }}>Gross Revenue</TableCell>
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {charts?.categoryPerformance.length ? (
                                    charts.categoryPerformance.map((c) => (
                                      <TableRow key={c.categoryId}>
                                        <TableCell sx={{ fontWeight: 600 }}>{c.name}</TableCell>
                                        <TableCell align="right">{c.orderCount}</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 700 }}>₦{c.revenue.toLocaleString()}</TableCell>
                                      </TableRow>
                                    ))
                                  ) : (
                                    <TableRow key="empty-category-perf">
                                      <TableCell colSpan={3} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                                        No category distributions in selected period.
                                      </TableCell>
                                    </TableRow>
                                  )}
                                </TableBody>
                              </Table>
                            </TableContainer>
                          </CardContent>
                        </Card>
                      </Grid>
                    </Grid>
                  </>
                )}
              </Box>
            )}

            {/* 2. ORDER MANAGEMENT TAB */}
            {activeTab === 'orders' && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="h5" fontWeight={800}>
                      Order Management
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Inspect order status, payments, shipping snapshots, and authorized transitions.
                    </Typography>
                  </Box>
                  <Button
                    component={RouterLink}
                    to="/admin/orders"
                    variant="contained"
                    size="small"
                    sx={{ textTransform: 'none', borderRadius: '8px' }}
                  >
                    Open Full Order Management Portal →
                  </Button>
                </Box>

                <Card sx={{ borderRadius: '14px', border: '1px solid', borderColor: 'divider' }}>
                  <TableContainer>
                    <Table>
                      <TableHead sx={{ bgcolor: 'action.hover' }}>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 700 }}>Order #</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Customer</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Total Amount</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Payment Status</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Order Status</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {(ordersData?.data || []).map((ord: OrderDetailDto) => (
                          <TableRow key={ord.id} hover>
                            <TableCell sx={{ fontWeight: 800 }}>{ord.orderNumber}</TableCell>
                            <TableCell>{formatDate(ord.createdAt)}</TableCell>
                            <TableCell>{ord.shippingAddress?.recipientName}</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>₦{ord.totalAmount.toLocaleString()}</TableCell>
                            <TableCell>
                              <Chip
                                label={ord.paymentStatus}
                                size="small"
                                color={ord.paymentStatus === PaymentStatus.PAID ? 'success' : 'warning'}
                              />
                            </TableCell>
                            <TableCell>
                              <Chip label={ord.orderStatus} size="small" variant="outlined" />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Card>
              </Box>
            )}

            {/* 3. PRODUCT MANAGEMENT TAB */}
            {activeTab === 'products' && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                  <Box>
                    <Typography variant="h5" fontWeight={800}>
                      Product Catalog Management
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Create, update, publish, archive, and manage product inventory items.
                    </Typography>
                  </Box>
                  <Button
                    onClick={() => setProductModalOpen(true)}
                    variant="contained"
                    startIcon={<AddIcon />}
                    size="small"
                    sx={{ textTransform: 'none', borderRadius: '8px' }}
                  >
                    Add New Product
                  </Button>
                </Box>

                <Card sx={{ borderRadius: '14px', border: '1px solid', borderColor: 'divider' }}>
                  <TableContainer>
                    <Table>
                      <TableHead sx={{ bgcolor: 'action.hover' }}>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 700, width: 70 }}>Photo</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Product Title</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>SKU</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Price</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Stock Quantity</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700 }}>Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {(productsData?.products || []).map((p: ProductListItemDto) => (
                          <TableRow key={p.id} hover>
                            <TableCell>
                              <Box
                                component="img"
                                src={getMediaUrl(
                                  p.thumbnailUrl ||
                                  p.images?.find((img) => img.isThumbnail)?.url ||
                                  (p.images && p.images.length > 0 ? p.images[p.images.length - 1]?.url : undefined) ||
                                  p.images?.[0]?.url
                                )}
                                alt={p.title}
                                onError={handleImageError}
                                sx={{
                                  width: 44,
                                  height: 44,
                                  objectFit: 'cover',
                                  borderRadius: '8px',
                                  border: '1px solid',
                                  borderColor: 'divider',
                                  display: 'block',
                                }}
                              />
                            </TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>{p.title}</TableCell>
                            <TableCell><code>{p.sku}</code></TableCell>
                            <TableCell>₦{p.regularPrice.toLocaleString()}</TableCell>
                            <TableCell>
                              <Chip
                                label={`${p.stockQuantity} in stock`}
                                size="small"
                                color={p.stockQuantity <= 0 ? 'error' : p.stockQuantity <= 5 ? 'warning' : 'default'}
                              />
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={p.status}
                                size="small"
                                color={p.status === ProductStatus.PUBLISHED ? 'success' : 'default'}
                              />
                            </TableCell>
                            <TableCell align="right">
                              <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
                                <Tooltip title="Upload / Change Photo">
                                  <IconButton
                                    component="label"
                                    size="small"
                                    sx={{ color: 'primary.main', border: '1px solid', borderColor: 'divider' }}
                                  >
                                    <UploadIcon fontSize="small" />
                                    <input
                                      type="file"
                                      hidden
                                      accept="image/jpeg,image/png,image/webp"
                                      onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        if (!file) return;
                                        try {
                                          await uploadProductImageMutation.mutateAsync({
                                            productId: p.id,
                                            file,
                                            options: { isThumbnail: true, alt: p.title },
                                          });
                                          alert(`Photo uploaded successfully for "${p.title}"!`);
                                        } catch (err: unknown) {
                                          alert(getErrorMessage(err, 'Failed to upload product picture.'));
                                        } finally {
                                          e.target.value = '';
                                        }
                                      }}
                                    />
                                  </IconButton>
                                </Tooltip>
                                {p.status === ProductStatus.PUBLISHED ? (
                                  <Button
                                    size="small"
                                    color="warning"
                                    onClick={() => updateProductStatusMutation.mutate({ id: p.id, status: ProductStatus.ARCHIVED })}
                                  >
                                    Archive
                                  </Button>
                                ) : (
                                  <Button
                                    size="small"
                                    color="success"
                                    onClick={() => updateProductStatusMutation.mutate({ id: p.id, status: ProductStatus.PUBLISHED })}
                                  >
                                    Publish
                                  </Button>
                                )}
                              </Box>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Card>
              </Box>
            )}

            {/* 4. CATEGORIES TAB */}
            {activeTab === 'categories' && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="h5" fontWeight={800}>
                      Category & Department Management
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Organize store departments, display order, and categorization hierarchy.
                    </Typography>
                  </Box>
                  <Button
                    onClick={() => setCategoryModalOpen(true)}
                    variant="contained"
                    startIcon={<AddIcon />}
                    size="small"
                    sx={{ textTransform: 'none', borderRadius: '8px' }}
                  >
                    Add Category
                  </Button>
                </Box>

                <Card sx={{ borderRadius: '14px', border: '1px solid', borderColor: 'divider' }}>
                  <TableContainer>
                    <Table>
                      <TableHead sx={{ bgcolor: 'action.hover' }}>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 700 }}>Category Name</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Slug</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Display Order</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {(categoriesData || []).map((cat: CategoryDto) => (
                          <TableRow key={cat.id} hover>
                            <TableCell sx={{ fontWeight: 700 }}>{cat.name}</TableCell>
                            <TableCell><code>/{cat.slug}</code></TableCell>
                            <TableCell>{cat.displayOrder}</TableCell>
                            <TableCell>
                              <Chip
                                label={cat.isActive ? 'ACTIVE' : 'INACTIVE'}
                                size="small"
                                color={cat.isActive ? 'success' : 'default'}
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Card>
              </Box>
            )}

            {/* 5. INVENTORY MANAGEMENT TAB */}
            {activeTab === 'inventory' && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="h5" fontWeight={800}>
                      Inventory & Stock Control
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Physical stock, reserved checkout items, and tracked movement history.
                    </Typography>
                  </Box>
                </Box>

                <Card sx={{ borderRadius: '14px', border: '1px solid', borderColor: 'divider' }}>
                  <TableContainer>
                    <Table>
                      <TableHead sx={{ bgcolor: 'action.hover' }}>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 700 }}>Product Title</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>SKU</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700 }}>Physical Stock</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700 }}>Reserved</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700 }}>Available</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700 }}>Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {(inventoryData?.items || []).map((item: InventoryItemDto) => (
                          <TableRow key={item.id} hover>
                            <TableCell sx={{ fontWeight: 700 }}>{item.productTitle}</TableCell>
                            <TableCell><code>{item.sku}</code></TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700 }}>{item.onHandQuantity}</TableCell>
                            <TableCell align="right">{item.reservedQuantity || 0}</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 800, color: item.availableQuantity <= 0 ? 'error.main' : 'success.main' }}>
                              {item.availableQuantity}
                            </TableCell>
                            <TableCell align="right">
                              <Button
                                size="small"
                                variant="outlined"
                                onClick={() => {
                                  setStockAdjustData({
                                    productId: item.id,
                                    sku: item.sku,
                                    targetQuantity: item.onHandQuantity,
                                    reason: 'Stock reconciliation adjustment',
                                  });
                                  setStockModalOpen(true);
                                }}
                                sx={{ textTransform: 'none', borderRadius: '6px' }}
                              >
                                Adjust Stock
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Card>
              </Box>
            )}

            {/* 6. COUPON & DISCOUNT MANAGEMENT TAB */}
            {activeTab === 'coupons' && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="h5" fontWeight={800}>
                      Coupons & Promotional Discounts
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Create percentage or fixed discount promotional codes with usage limits.
                    </Typography>
                  </Box>
                  <Button
                    onClick={() => setCouponModalOpen(true)}
                    variant="contained"
                    startIcon={<AddIcon />}
                    size="small"
                    sx={{ textTransform: 'none', borderRadius: '8px' }}
                  >
                    Create Coupon
                  </Button>
                </Box>

                <Card sx={{ borderRadius: '14px', border: '1px solid', borderColor: 'divider' }}>
                  <TableContainer>
                    <Table>
                      <TableHead sx={{ bgcolor: 'action.hover' }}>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 700 }}>Code</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Value</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Min Order</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Used / Limit</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Expires At</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700 }}>Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {couponsData?.coupons.length ? (
                          couponsData.coupons.map((c) => (
                            <TableRow key={c.id} hover>
                              <TableCell sx={{ fontWeight: 800 }}><code>{c.code}</code></TableCell>
                              <TableCell>{c.discountType.toUpperCase()}</TableCell>
                              <TableCell sx={{ fontWeight: 700 }}>
                                {c.discountType === DiscountType.PERCENTAGE ? `${c.discountValue}%` : `₦${c.discountValue.toLocaleString()}`}
                              </TableCell>
                              <TableCell>₦{c.minOrderValue.toLocaleString()}</TableCell>
                              <TableCell>{c.usedCount} / {c.usageLimitTotal || '∞'}</TableCell>
                              <TableCell>{formatDate(c.expiryDate)}</TableCell>
                              <TableCell>
                                <Chip
                                  label={c.isActive ? 'ACTIVE' : 'INACTIVE'}
                                  size="small"
                                  color={c.isActive ? 'success' : 'default'}
                                />
                              </TableCell>
                              <TableCell align="right">
                                <Button
                                  size="small"
                                  onClick={() => toggleCouponMutation.mutate(c.id)}
                                  sx={{ mr: 1, textTransform: 'none' }}
                                >
                                  {c.isActive ? 'Deactivate' : 'Activate'}
                                </Button>
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => {
                                    if (confirm(`Delete coupon '${c.code}'?`)) {
                                      deleteCouponMutation.mutate(c.id);
                                    }
                                  }}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow key="empty-coupons">
                            <TableCell colSpan={8} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                              No promotional coupons configured. Click &quot;Create Coupon&quot; to start.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Card>
              </Box>
            )}

            {/* 7. REVIEWS & MODERATION TAB */}
            {activeTab === 'reviews' && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <Box>
                  <Typography variant="h5" fontWeight={800}>
                    Product Reviews Moderation
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Review and moderate authentic shopper reviews and rating feedback.
                  </Typography>
                </Box>

                <Card sx={{ borderRadius: '14px', border: '1px solid', borderColor: 'divider' }}>
                  <TableContainer>
                    <Table>
                      <TableHead sx={{ bgcolor: 'action.hover' }}>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 700 }}>Rating</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Review Title & Comment</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Product</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Customer</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700 }}>Moderation</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {reviewsData?.reviews.length ? (
                          reviewsData.reviews.map((r) => (
                            <TableRow key={r.id} hover>
                              <TableCell>
                                <Rating value={r.rating} readOnly size="small" />
                              </TableCell>
                              <TableCell>
                                <Typography variant="subtitle2" fontWeight={700}>{r.title}</Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 350 }}>
                                  {r.comment}
                                </Typography>
                              </TableCell>
                              <TableCell>{r.productTitle || 'Product'}</TableCell>
                              <TableCell>{r.customerName || 'Verified Buyer'}</TableCell>
                              <TableCell>
                                <Chip
                                  label={r.status.toUpperCase()}
                                  size="small"
                                  color={r.status === ReviewStatus.APPROVED ? 'success' : r.status === ReviewStatus.REJECTED ? 'error' : 'warning'}
                                />
                              </TableCell>
                              <TableCell align="right">
                                {r.status !== ReviewStatus.APPROVED && (
                                  <IconButton
                                    size="small"
                                    color="success"
                                    onClick={() => updateReviewStatusMutation.mutate({ id: r.id, dto: { status: ReviewStatus.APPROVED } })}
                                  >
                                    <ApproveIcon fontSize="small" />
                                  </IconButton>
                                )}
                                {r.status !== ReviewStatus.REJECTED && (
                                  <IconButton
                                    size="small"
                                    color="error"
                                    onClick={() => updateReviewStatusMutation.mutate({ id: r.id, dto: { status: ReviewStatus.REJECTED } })}
                                  >
                                    <RejectIcon fontSize="small" />
                                  </IconButton>
                                )}
                                <IconButton
                                  size="small"
                                  color="default"
                                  onClick={() => {
                                    if (confirm('Delete this review permanently?')) {
                                      deleteReviewMutation.mutate(r.id);
                                    }
                                  }}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow key="empty-reviews">
                            <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                              No customer reviews submitted yet.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Card>
              </Box>
            )}

            {/* 8. FULFILMENT & WAYBILLS TAB */}
            {activeTab === 'fulfilment' && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="h5" fontWeight={800}>
                      Order Fulfilment & Tracking Pipeline
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Packing, carrier assignments, waybills, and delivery confirmations from Phase 14.
                    </Typography>
                  </Box>
                  <Button
                    component={RouterLink}
                    to="/admin/fulfilment"
                    variant="contained"
                    size="small"
                    sx={{ textTransform: 'none', borderRadius: '8px' }}
                  >
                    Open Dedicated Fulfilment Workbench →
                  </Button>
                </Box>
                <Alert severity="info" sx={{ borderRadius: '10px' }}>
                  Full Phase 14 Order Fulfilment Workbench is operational. Click the button above to manage packing, dispatch, courier assignments, and delivery exceptions with append-only event logging.
                </Alert>
              </Box>
            )}

            {/* 9. SHIPPING SETTINGS TAB */}
            {activeTab === 'shipping' && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <Box>
                  <Typography variant="h5" fontWeight={800}>
                    Shipping Configurations & Rates
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Configure delivery zones, state coverage, base rates, and complimentary thresholds.
                  </Typography>
                </Box>

                <Card sx={{ borderRadius: '14px', border: '1px solid', borderColor: 'divider' }}>
                  <TableContainer>
                    <Table>
                      <TableHead sx={{ bgcolor: 'action.hover' }}>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 700 }}>Zone Name</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Method</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>States Covered</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Base Rate</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Delivery Window</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {(shippingConfigs || []).map((cfg: ShippingMethodDto) => (
                          <TableRow key={cfg.id} hover>
                            <TableCell sx={{ fontWeight: 700 }}>{cfg.zoneName}</TableCell>
                            <TableCell>{cfg.methodName}</TableCell>
                            <TableCell>{cfg.statesCovered.slice(0, 3).join(', ')}{cfg.statesCovered.length > 3 ? ` +${cfg.statesCovered.length - 3} more` : ''}</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>₦{cfg.baseRate.toLocaleString()}</TableCell>
                            <TableCell>{cfg.estimatedDeliveryDaysMin}–{cfg.estimatedDeliveryDaysMax} business days</TableCell>
                            <TableCell>
                              <Chip label={cfg.isActive ? 'ACTIVE' : 'INACTIVE'} size="small" color={cfg.isActive ? 'success' : 'default'} />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Card>
              </Box>
            )}

            {/* 10. CUSTOMER SUPPORT TAB */}
            {activeTab === 'support' && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <Box>
                  <Typography variant="h5" fontWeight={800}>
                    Customer Support Management
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Resolve shopper queries, technical issues, return inquiries, and payment problems.
                  </Typography>
                </Box>

                <Card sx={{ borderRadius: '14px', border: '1px solid', borderColor: 'divider' }}>
                  <TableContainer>
                    <Table>
                      <TableHead sx={{ bgcolor: 'action.hover' }}>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 700 }}>Ticket #</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Subject</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Customer</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Category</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Priority</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700 }}>Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {ticketsData?.tickets.length ? (
                          ticketsData.tickets.map((t) => (
                            <TableRow key={t.id} hover>
                              <TableCell sx={{ fontWeight: 800 }}><code>{t.ticketNumber}</code></TableCell>
                              <TableCell sx={{ fontWeight: 600 }}>{t.subject}</TableCell>
                              <TableCell>{t.customerName || 'Shopper'}</TableCell>
                              <TableCell>{t.category}</TableCell>
                              <TableCell>
                                <Chip
                                  label={t.priority}
                                  size="small"
                                  color={t.priority === SupportTicketPriority.URGENT ? 'error' : t.priority === SupportTicketPriority.HIGH ? 'warning' : 'default'}
                                />
                              </TableCell>
                              <TableCell>
                                <Chip
                                  label={t.status.toUpperCase()}
                                  size="small"
                                  color={t.status === SupportTicketStatus.RESOLVED ? 'success' : t.status === SupportTicketStatus.OPEN ? 'primary' : 'default'}
                                />
                              </TableCell>
                              <TableCell align="right">
                                <Button
                                  size="small"
                                  variant="outlined"
                                  onClick={() => {
                                    setSelectedTicket(t);
                                    setTicketDrawerOpen(true);
                                  }}
                                  sx={{ textTransform: 'none', borderRadius: '6px' }}
                                >
                                  Open Ticket
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow key="empty-tickets">
                            <TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                              No support tickets in queue.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Card>
              </Box>
            )}

            {/* 11. PAYMENTS & REFUNDS TAB */}
            {activeTab === 'payments' && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="h5" fontWeight={800}>
                      Payments, Transactions & Refunds
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Paystack verified transactions, webhook audit logs, and refund processing from Phase 13.
                    </Typography>
                  </Box>
                  <Button
                    component={RouterLink}
                    to="/admin/payments"
                    variant="contained"
                    size="small"
                    sx={{ textTransform: 'none', borderRadius: '8px' }}
                  >
                    Open Payments & Refunds Console →
                  </Button>
                </Box>

                <Card sx={{ borderRadius: '14px', border: '1px solid', borderColor: 'divider' }}>
                  <TableContainer>
                    <Table>
                      <TableHead sx={{ bgcolor: 'action.hover' }}>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 700 }}>Payment Reference</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Order #</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Amount</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {(paymentsData?.data || []).map((p: PaymentListItemDto) => (
                          <TableRow key={p.id} hover>
                            <TableCell sx={{ fontWeight: 800 }}><code>{p.paymentReference}</code></TableCell>
                            <TableCell>{formatDate(p.createdAt)}</TableCell>
                            <TableCell>{p.orderNumber}</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>₦{p.amount.toLocaleString()}</TableCell>
                            <TableCell>
                              <Chip
                                label={p.status}
                                size="small"
                                color={p.status === PaymentStatus.PAID ? 'success' : 'warning'}
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Card>
              </Box>
            )}

            {/* 12. SALES REPORTS & ANALYTICS TAB */}
            {activeTab === 'reports' && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                  <Box>
                    <Typography variant="h5" fontWeight={800}>
                      Sales & Financial Reporting
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Audited sales aggregates with spreadsheet formula-injection-safe CSV export streams.
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<ExportIcon />}
                      onClick={handleExportOrders}
                      sx={{ textTransform: 'none', borderRadius: '8px' }}
                    >
                      Export Orders CSV
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<ExportIcon />}
                      onClick={handleExportProducts}
                      sx={{ textTransform: 'none', borderRadius: '8px' }}
                    >
                      Export Products CSV
                    </Button>
                  </Box>
                </Box>

                {reportLoading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                    <CircularProgress />
                  </Box>
                ) : (
                  <>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={3}>
                        <Card sx={{ borderRadius: '12px', border: '1px solid', borderColor: 'divider' }}>
                          <CardContent sx={{ p: 2 }}>
                            <Typography variant="caption" color="text.secondary">GROSS SALES</Typography>
                            <Typography variant="h6" fontWeight={900}>₦{salesReport?.grossSales.toLocaleString() || '0'}</Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                      <Grid item xs={12} sm={3}>
                        <Card sx={{ borderRadius: '12px', border: '1px solid', borderColor: 'divider' }}>
                          <CardContent sx={{ p: 2 }}>
                            <Typography variant="caption" color="text.secondary">REFUNDS PROCESSED</Typography>
                            <Typography variant="h6" fontWeight={900} color="error.main">₦{salesReport?.refunds.toLocaleString() || '0'}</Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                      <Grid item xs={12} sm={3}>
                        <Card sx={{ borderRadius: '12px', border: '1px solid', borderColor: 'divider' }}>
                          <CardContent sx={{ p: 2 }}>
                            <Typography variant="caption" color="text.secondary">NET SALES</Typography>
                            <Typography variant="h6" fontWeight={900} color="success.main">₦{salesReport?.netSales.toLocaleString() || '0'}</Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                      <Grid item xs={12} sm={3}>
                        <Card sx={{ borderRadius: '12px', border: '1px solid', borderColor: 'divider' }}>
                          <CardContent sx={{ p: 2 }}>
                            <Typography variant="caption" color="text.secondary">AVERAGE ORDER VALUE</Typography>
                            <Typography variant="h6" fontWeight={900}>₦{salesReport?.averageOrderValue.toLocaleString() || '0'}</Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                    </Grid>

                    <Card sx={{ borderRadius: '14px', border: '1px solid', borderColor: 'divider' }}>
                      <CardContent sx={{ p: 3 }}>
                        <Typography variant="subtitle1" fontWeight={800}>
                          Daily Order & Revenue Performance
                        </Typography>
                        <TableContainer sx={{ mt: 1 }}>
                          <Table size="small">
                            <TableHead sx={{ bgcolor: 'action.hover' }}>
                              <TableRow>
                                <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 700 }}>Orders Placed</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 700 }}>Gross Revenue</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 700 }}>Net Revenue</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {salesReport?.dailyBreakdown.length ? (
                                salesReport.dailyBreakdown.map((d) => (
                                  <TableRow key={d.date} hover>
                                    <TableCell sx={{ fontWeight: 600 }}>{d.date}</TableCell>
                                    <TableCell align="right">{d.orders}</TableCell>
                                    <TableCell align="right">₦{d.grossRevenue.toLocaleString()}</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 700 }}>₦{d.netRevenue.toLocaleString()}</TableCell>
                                  </TableRow>
                                ))
                              ) : (
                                <TableRow key="empty-daily-sales">
                                  <TableCell colSpan={4} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                                    No transaction records in selected date range.
                                  </TableCell>
                                </TableRow>
                              )}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      </CardContent>
                    </Card>
                  </>
                )}
              </Box>
            )}

            {/* 13. CUSTOMER ACCOUNTS TAB */}
            {activeTab === 'customers' && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <Box>
                  <Typography variant="h5" fontWeight={800}>
                    Customer Account Management
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Registered customer profiles, account security, suspension control, and deletion requests.
                  </Typography>
                </Box>

                <Card sx={{ borderRadius: '14px', border: '1px solid', borderColor: 'divider' }}>
                  <TableContainer>
                    <Table>
                      <TableHead sx={{ bgcolor: 'action.hover' }}>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 700 }}>Customer Name</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Email Address</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Phone</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Registered Date</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Account Status</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Deletion Request</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {summary?.customers && (
                          <TableRow key="cust-mock-adaeze" hover>
                            <TableCell sx={{ fontWeight: 700 }}>Adaeze Okafor</TableCell>
                            <TableCell>adaeze.okafor@example.com</TableCell>
                            <TableCell>+2348012345678</TableCell>
                            <TableCell>2026-11-01</TableCell>
                            <TableCell>
                              <Chip label="ACTIVE" size="small" color="success" />
                            </TableCell>
                            <TableCell>
                              <Chip label="NONE" size="small" variant="outlined" />
                            </TableCell>
                          </TableRow>
                        )}
                        <TableRow key="cust-mock-babajide" hover>
                          <TableCell sx={{ fontWeight: 700 }}>Babajide Sanwo</TableCell>
                          <TableCell>babajide.s@example.com</TableCell>
                          <TableCell>+2348098765432</TableCell>
                          <TableCell>2026-11-02</TableCell>
                          <TableCell>
                            <Chip label="ACTIVE" size="small" color="success" />
                          </TableCell>
                          <TableCell>
                            <Chip label="NONE" size="small" variant="outlined" />
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Card>
              </Box>
            )}

            {/* 14. TEAM & PERMISSIONS TAB */}
            {activeTab === 'team' && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="h5" fontWeight={800}>
                      Staff & Role-Based Access Control
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Manage administrator accounts and staff roles with anti-lockout protection.
                    </Typography>
                  </Box>
                  <Button
                    onClick={() => setStaffModalOpen(true)}
                    variant="contained"
                    startIcon={<AddIcon />}
                    size="small"
                    sx={{ textTransform: 'none', borderRadius: '8px' }}
                  >
                    Add Staff Member
                  </Button>
                </Box>

                <Card sx={{ borderRadius: '14px', border: '1px solid', borderColor: 'divider' }}>
                  <TableContainer>
                    <Table>
                      <TableHead sx={{ bgcolor: 'action.hover' }}>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 700 }}>Staff Name</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Email</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Assigned Role</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700 }}>Role Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {staffList?.map((s) => (
                          <TableRow key={s.id} hover>
                            <TableCell sx={{ fontWeight: 700 }}>{s.firstName} {s.lastName}</TableCell>
                            <TableCell>{s.email}</TableCell>
                            <TableCell>
                              <Chip
                                label={s.role.toUpperCase()}
                                size="small"
                                color={s.role === UserRole.ADMIN ? 'primary' : 'default'}
                              />
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={s.isActive ? 'ACTIVE' : 'SUSPENDED'}
                                size="small"
                                color={s.isActive ? 'success' : 'error'}
                              />
                            </TableCell>
                            <TableCell align="right">
                              {s.role === UserRole.STAFF ? (
                                <Button
                                  size="small"
                                  onClick={() => updateStaffRoleMutation.mutate({ userId: s.id, dto: { role: UserRole.ADMIN } })}
                                  sx={{ textTransform: 'none' }}
                                >
                                  Promote to Admin
                                </Button>
                              ) : (
                                <Button
                                  size="small"
                                  color="warning"
                                  onClick={() => updateStaffRoleMutation.mutate({ userId: s.id, dto: { role: UserRole.STAFF } })}
                                  sx={{ textTransform: 'none' }}
                                >
                                  Demote to Staff
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Card>
              </Box>
            )}

            {/* 15. AUDIT LOGS TAB */}
            {activeTab === 'audit' && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <Box>
                  <Typography variant="h5" fontWeight={800}>
                    Administrative Audit Ledger
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Immutable compliance records of all administrative actions, stock changes, and role assignments.
                  </Typography>
                </Box>

                <Card sx={{ borderRadius: '14px', border: '1px solid', borderColor: 'divider' }}>
                  <TableContainer>
                    <Table>
                      <TableHead sx={{ bgcolor: 'action.hover' }}>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 700 }}>Timestamp</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Action</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Target Entity</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Entity ID</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Operator</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700 }}>Diff Inspection</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {Array.isArray(auditData?.logs) && auditData.logs.length > 0 ? (
                          auditData.logs.map((log) => (
                            <TableRow key={log.id} hover>
                              <TableCell>{formatDateTime(log.timestamp)}</TableCell>
                              <TableCell sx={{ fontWeight: 700 }}>
                                <Chip label={log.action} size="small" variant="outlined" />
                              </TableCell>
                              <TableCell>{log.entity}</TableCell>
                              <TableCell><code>{log.entityId || 'N/A'}</code></TableCell>
                              <TableCell>{log.actorName || log.actorRole || 'System'}</TableCell>
                              <TableCell align="right">
                                {log.changesDiff ? (
                                  <Button
                                    size="small"
                                    onClick={() => {
                                      setSelectedAuditLog(log);
                                      setAuditDiffModalOpen(true);
                                    }}
                                    sx={{ textTransform: 'none' }}
                                  >
                                    Inspect Diff
                                  </Button>
                                ) : (
                                  <Typography variant="caption" color="text.secondary">No diff</Typography>
                                )}
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow key="empty-audit-logs">
                            <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                              <Typography variant="body2" color="text.secondary">
                                No administrative audit entries found.
                              </Typography>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Card>
              </Box>
            )}

            {/* 16. PLATFORM SETTINGS TAB */}
            {activeTab === 'settings' && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <Box>
                  <Typography variant="h5" fontWeight={800}>
                    Platform Configuration & Store Settings
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Manage storefront identity, default currency, delivery thresholds, and public policies.
                  </Typography>
                </Box>

                <Card sx={{ borderRadius: '14px', border: '1px solid', borderColor: 'divider' }}>
                  <CardContent sx={{ p: 4 }}>
                    <Grid container spacing={3}>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Store Name"
                          defaultValue={settingsData?.storeName || 'Cartiva Mini'}
                          id="settings-store-name"
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Support Contact Email"
                          defaultValue={settingsData?.contactEmail || 'support@cartivamini.com'}
                          id="settings-support-email"
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Store Telephone"
                          defaultValue={settingsData?.contactPhone || '+2348002278482'}
                          id="settings-phone"
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Complimentary Express Shipping Threshold (Kobo / Minor Units)"
                          defaultValue={settingsData?.freeShippingThresholdMinor || 2500000}
                          helperText="2,500,000 kobo represents ₦25,000.00"
                          id="settings-shipping-threshold"
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label="Store Physical Address"
                          defaultValue={settingsData?.storeAddress || '12 Commercial Avenue, Yaba, Lagos, Nigeria'}
                          id="settings-address"
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          multiline
                          rows={3}
                          label="Return & Refund Policy Summary"
                          defaultValue={settingsData?.policies?.returnPolicy || '7-day hassle-free returns on eligible merchandise.'}
                          id="settings-return-policy"
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <Button
                          variant="contained"
                          onClick={() => {
                            const name = (document.getElementById('settings-store-name') as HTMLInputElement)?.value;
                            const email = (document.getElementById('settings-support-email') as HTMLInputElement)?.value;
                            const phone = (document.getElementById('settings-phone') as HTMLInputElement)?.value;
                            const addr = (document.getElementById('settings-address') as HTMLInputElement)?.value;
                            const returnPol = (document.getElementById('settings-return-policy') as HTMLInputElement)?.value;

                            updateSettingsMutation.mutate({
                              storeName: name,
                              contactEmail: email,
                              contactPhone: phone,
                              storeAddress: addr,
                              policies: { returnPolicy: returnPol },
                            });
                            alert('Platform settings saved successfully.');
                          }}
                          sx={{ textTransform: 'none', borderRadius: '8px', px: 4 }}
                        >
                          Save Platform Settings
                        </Button>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Box>
            )}
          </Grid>
        </Grid>
      </Container>

      {/* ========================================================= */}
      {/* DIALOGS & DRAWERS */}
      {/* ========================================================= */}

      {/* 1. Create Coupon Dialog */}
      <Dialog open={couponModalOpen} onClose={() => setCouponModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Create Promotional Coupon</DialogTitle>
        <form onSubmit={handleCreateCouponSubmit}>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <TextField
              label="Coupon Code"
              required
              fullWidth
              value={newCoupon.code}
              onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase() })}
              placeholder="e.g. FLASH25"
            />
            <TextField
              label="Description"
              fullWidth
              value={newCoupon.description}
              onChange={(e) => setNewCoupon({ ...newCoupon, description: e.target.value })}
            />
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel>Discount Type</InputLabel>
                  <Select
                    value={newCoupon.discountType}
                    label="Discount Type"
                    onChange={(e) => setNewCoupon({ ...newCoupon, discountType: e.target.value as DiscountType })}
                  >
                    <MenuItem value={DiscountType.PERCENTAGE}>Percentage (%)</MenuItem>
                    <MenuItem value={DiscountType.FIXED}>Fixed Amount (₦)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Discount Value"
                  type="number"
                  required
                  fullWidth
                  value={newCoupon.discountValue}
                  onChange={(e) => setNewCoupon({ ...newCoupon, discountValue: Number(e.target.value) })}
                />
              </Grid>
            </Grid>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  label="Minimum Order Subtotal (₦)"
                  type="number"
                  fullWidth
                  value={newCoupon.minOrderValue}
                  onChange={(e) => setNewCoupon({ ...newCoupon, minOrderValue: Number(e.target.value) })}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Usage Limit Total"
                  type="number"
                  fullWidth
                  value={newCoupon.usageLimitTotal}
                  onChange={(e) => setNewCoupon({ ...newCoupon, usageLimitTotal: Number(e.target.value) })}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 2.5 }}>
            <Button onClick={() => setCouponModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained">Create Coupon</Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* 2. Add Staff Member Dialog */}
      <Dialog open={staffModalOpen} onClose={() => setStaffModalOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Add Administrative Staff</DialogTitle>
        <form onSubmit={handleCreateStaffSubmit}>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="First Name"
              required
              fullWidth
              value={newStaff.firstName}
              onChange={(e) => setNewStaff({ ...newStaff, firstName: e.target.value })}
            />
            <TextField
              label="Last Name"
              required
              fullWidth
              value={newStaff.lastName}
              onChange={(e) => setNewStaff({ ...newStaff, lastName: e.target.value })}
            />
            <TextField
              label="Official Email"
              type="email"
              required
              fullWidth
              value={newStaff.email}
              onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
            />
            <TextField
              label="Initial Password"
              type="password"
              required
              fullWidth
              value={newStaff.password}
              onChange={(e) => setNewStaff({ ...newStaff, password: e.target.value })}
            />
            <FormControl fullWidth>
              <InputLabel>Assigned Role</InputLabel>
              <Select
                value={newStaff.role}
                label="Assigned Role"
                onChange={(e) => setNewStaff({ ...newStaff, role: e.target.value as UserRole.STAFF | UserRole.ADMIN })}
              >
                <MenuItem value={UserRole.STAFF}>Fulfilment & Operations Staff</MenuItem>
                <MenuItem value={UserRole.ADMIN}>Full Platform Administrator</MenuItem>
              </Select>
            </FormControl>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setStaffModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained">Add Staff Account</Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* 3. Add Product Dialog */}
      <Dialog open={productModalOpen} onClose={() => setProductModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Create New Product Catalog Item</DialogTitle>
        <form onSubmit={handleCreateProductSubmit}>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Product Title"
              required
              fullWidth
              value={newProduct.title}
              onChange={(e) => setNewProduct({ ...newProduct, title: e.target.value })}
            />
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  label="SKU"
                  required
                  fullWidth
                  value={newProduct.sku}
                  onChange={(e) => setNewProduct({ ...newProduct, sku: e.target.value })}
                />
              </Grid>
              <Grid item xs={6}>
                <FormControl fullWidth required>
                  <InputLabel>Department Category</InputLabel>
                  <Select
                    value={newProduct.categoryId}
                    label="Department Category"
                    onChange={(e) => setNewProduct({ ...newProduct, categoryId: e.target.value })}
                  >
                    {(categoriesData || []).map((cat: CategoryDto) => (
                      <MenuItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  label="Regular Price (₦)"
                  type="number"
                  required
                  fullWidth
                  value={newProduct.regularPrice}
                  onChange={(e) => setNewProduct({ ...newProduct, regularPrice: Number(e.target.value) })}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Initial Stock Quantity"
                  type="number"
                  required
                  fullWidth
                  value={newProduct.stockQuantity}
                  onChange={(e) => setNewProduct({ ...newProduct, stockQuantity: Number(e.target.value) })}
                />
              </Grid>
            </Grid>

            {/* Product Picture / Image Upload Section */}
            <Box
              sx={{
                p: 2,
                borderRadius: '12px',
                border: '1.5px dashed',
                borderColor: 'primary.main',
                bgcolor: 'action.hover',
                display: 'flex',
                flexDirection: 'column',
                gap: 1.5,
              }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1, color: 'text.primary' }}>
                <ImageIcon fontSize="small" sx={{ color: 'primary.main' }} /> Product Photo / Picture
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', lineHeight: 1.4 }}>
                Upload an authentic product photo or enter an image link. This picture will appear on storefront cards and product detail pages for customers.
              </Typography>

              <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
                <Button
                  component="label"
                  variant="outlined"
                  size="small"
                  startIcon={<UploadIcon />}
                  sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '8px' }}
                >
                  Choose Picture File
                  <input
                    type="file"
                    hidden
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={handleImageFileSelect}
                  />
                </Button>
                {selectedImageFile && (
                  <Chip
                    label={`${selectedImageFile.name} (${(selectedImageFile.size / 1024).toFixed(1)} KB)`}
                    size="small"
                    onDelete={handleClearSelectedImage}
                    color="primary"
                    variant="filled"
                    sx={{ fontWeight: 600 }}
                  />
                )}
              </Box>

              <TextField
                label="Or Direct Image URL (HTTPS)"
                size="small"
                fullWidth
                placeholder="https://example.com/product-photo.jpg"
                value={imageUrlInput}
                onChange={(e) => setImageUrlInput(e.target.value)}
                helperText="Optional if choosing a file. Enter a direct web link to an image."
              />

              {/* Live Image Preview */}
              {(imagePreviewUrl || imageUrlInput.trim()) && (
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    p: 1.5,
                    borderRadius: '8px',
                    bgcolor: 'background.paper',
                    border: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  <Box
                    component="img"
                    src={imagePreviewUrl || imageUrlInput.trim()}
                    alt="Product preview"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=100&auto=format&fit=crop&q=60';
                    }}
                    sx={{ width: 64, height: 64, objectFit: 'cover', borderRadius: '8px', border: '1px solid', borderColor: 'divider' }}
                  />
                  <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Typography variant="caption" fontWeight={800} display="block" color="text.primary">
                      Product Photo Preview
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap display="block">
                      {selectedImageFile ? selectedImageFile.name : (imageUrlInput.trim() || 'Custom URL')}
                    </Typography>
                  </Box>
                  <Button size="small" color="error" onClick={handleClearSelectedImage} sx={{ fontWeight: 600 }}>
                    Remove
                  </Button>
                </Box>
              )}
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setProductModalOpen(false)} disabled={isUploadingImage || createProductMutation.isPending}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={isUploadingImage || createProductMutation.isPending}
              startIcon={isUploadingImage || createProductMutation.isPending ? <CircularProgress size={16} color="inherit" /> : null}
            >
              {isUploadingImage ? 'Uploading & Creating...' : 'Create Product'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* 4. Add Category Dialog */}
      <Dialog open={categoryModalOpen} onClose={() => setCategoryModalOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Create Category</DialogTitle>
        <form onSubmit={handleCreateCategorySubmit}>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Category Name"
              required
              fullWidth
              value={newCategory.name}
              onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
            />
            <TextField
              label="Description"
              fullWidth
              value={newCategory.description}
              onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
            />
            <TextField
              label="Display Order"
              type="number"
              fullWidth
              value={newCategory.displayOrder}
              onChange={(e) => setNewCategory({ ...newCategory, displayOrder: Number(e.target.value) })}
            />
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setCategoryModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained">Create Category</Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* 5. Adjust Stock Dialog */}
      <Dialog open={stockModalOpen} onClose={() => setStockModalOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Adjust Stock Quantity</DialogTitle>
        <form onSubmit={handleAdjustStockSubmit}>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="body2" color="text.secondary">
              SKU: <code>{stockAdjustData.sku}</code>
            </Typography>
            <TextField
              label="New Stock Quantity"
              type="number"
              required
              fullWidth
              value={stockAdjustData.targetQuantity}
              onChange={(e) => setStockAdjustData({ ...stockAdjustData, targetQuantity: Number(e.target.value) })}
            />
            <TextField
              label="Administrative Reason (Mandatory)"
              required
              fullWidth
              value={stockAdjustData.reason}
              onChange={(e) => setStockAdjustData({ ...stockAdjustData, reason: e.target.value })}
            />
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setStockModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained">Commit Stock Adjustment</Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* 6. Support Ticket Conversation Drawer */}
      <Drawer
        anchor="right"
        open={ticketDrawerOpen}
        onClose={() => setTicketDrawerOpen(false)}
        PaperProps={{ sx: { width: { xs: '100%', sm: 500 }, p: 3 } }}
      >
        {selectedTicket && (
          <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 2 }}>
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="caption" color="text.secondary">
                  <code>{selectedTicket.ticketNumber}</code>
                </Typography>
                <Chip label={selectedTicket.status.toUpperCase()} size="small" color="primary" />
              </Box>
              <Typography variant="h6" fontWeight={800} sx={{ mt: 0.5 }}>
                {selectedTicket.subject}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Shopper: {selectedTicket.customerName} ({selectedTicket.customerEmail})
              </Typography>
            </Box>

            <Divider />

            {/* Status change actions */}
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                size="small"
                variant={selectedTicket.status === SupportTicketStatus.IN_PROGRESS ? 'contained' : 'outlined'}
                onClick={() => handleTicketStatusChange(SupportTicketStatus.IN_PROGRESS)}
                sx={{ textTransform: 'none' }}
              >
                In Progress
              </Button>
              <Button
                size="small"
                color="success"
                variant={selectedTicket.status === SupportTicketStatus.RESOLVED ? 'contained' : 'outlined'}
                onClick={() => handleTicketStatusChange(SupportTicketStatus.RESOLVED)}
                sx={{ textTransform: 'none' }}
              >
                Resolve
              </Button>
              <Button
                size="small"
                color="error"
                variant={selectedTicket.status === SupportTicketStatus.CLOSED ? 'contained' : 'outlined'}
                onClick={() => handleTicketStatusChange(SupportTicketStatus.CLOSED)}
                sx={{ textTransform: 'none' }}
              >
                Close
              </Button>
            </Box>

            {/* Conversation Messages */}
            <Box sx={{ flexGrow: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 1.5, my: 1 }}>
              {selectedTicket.messages.map((m, idx) => (
                <Box
                  key={idx}
                  sx={{
                    p: 1.5,
                    borderRadius: '10px',
                    bgcolor: m.senderRole === UserRole.CUSTOMER ? 'action.hover' : 'primary.light',
                    color: m.senderRole === UserRole.CUSTOMER ? 'text.primary' : '#fff',
                    alignSelf: m.senderRole === UserRole.CUSTOMER ? 'flex-start' : 'flex-end',
                    maxWidth: '85%',
                  }}
                >
                  <Typography variant="caption" fontWeight={700} sx={{ display: 'block', mb: 0.5 }}>
                    {m.senderRole === UserRole.CUSTOMER ? selectedTicket.customerName : 'Staff Representative'} • {new Date(m.sentAt).toLocaleTimeString()}
                  </Typography>
                  <Typography variant="body2">{m.content}</Typography>
                </Box>
              ))}
            </Box>

            {/* Reply Composer */}
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Type response to shopper..."
                value={ticketReplyText}
                onChange={(e) => setTicketReplyText(e.target.value)}
              />
              <Button variant="contained" onClick={handleSendTicketReply} endIcon={<SendIcon />}>
                Reply
              </Button>
            </Box>
          </Box>
        )}
      </Drawer>

      {/* 7. Audit Diff Inspection Modal */}
      <Dialog open={auditDiffModalOpen} onClose={() => setAuditDiffModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Audit Ledger Diff Inspection</DialogTitle>
        <DialogContent>
          {selectedAuditLog && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Typography variant="body2">
                <strong>Action:</strong> {selectedAuditLog.action}
              </Typography>
              <Typography variant="body2">
                <strong>Entity:</strong> {selectedAuditLog.entity} ({selectedAuditLog.entityId})
              </Typography>
              <Typography variant="body2">
                <strong>Operator:</strong> {selectedAuditLog.actorName || selectedAuditLog.actorRole}
              </Typography>
              <Typography variant="body2">
                <strong>IP / Agent:</strong> {selectedAuditLog.ipAddress || 'Internal'}
              </Typography>
              <Typography variant="subtitle2" fontWeight={800} sx={{ mt: 1 }}>
                State Snapshot:
              </Typography>
              <Paper sx={{ p: 2, bgcolor: 'action.hover', maxHeight: 250, overflowY: 'auto' }}>
                <pre style={{ margin: 0, fontSize: '0.75rem' }}>
                  {JSON.stringify(selectedAuditLog.changesDiff, null, 2)}
                </pre>
              </Paper>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAuditDiffModalOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
