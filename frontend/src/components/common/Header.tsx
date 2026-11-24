import React, { useState, useRef, useEffect } from 'react';
import {
  AppBar,
  Typography,
  Container,
  IconButton,
  Box,
  Button,
  Badge,
  Tooltip,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Divider,
  Menu,
  MenuItem,
  InputBase,
  Paper,
  CircularProgress,
  Chip,
} from '@mui/material';
import {
  ShoppingCart as CartIcon,
  FavoriteBorderOutlined as WishlistIcon,
  LocalShippingOutlined as ShippingIcon,
  PersonOutline as UserIcon,
  Search as SearchIcon,
  Menu as MenuIcon,
  Close as CloseIcon,
  KeyboardArrowDown as ArrowDownIcon,
  CategoryOutlined as CategoryIcon,
  HomeOutlined as HomeIcon,
  StorefrontOutlined as ShopIcon,
  LocalOfferOutlined as DealsIcon,
  InfoOutlined as InfoIcon,
  SupportAgentOutlined as SupportIcon,
  AdminPanelSettingsOutlined as AdminIcon,
  ExitToApp as LogoutIcon,
  AssignmentOutlined as OrdersIcon,
  LocationOnOutlined as AddressIcon,
  SecurityOutlined as SecurityIcon,
  LightMode as LightModeIcon,
  DarkMode as DarkModeIcon,
  NotificationsOutlined as NotificationIcon,
  CheckCircleOutline as CheckIcon,
} from '@mui/icons-material';
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';
import { useUiStore } from '@/stores/uiStore';
import { useAuthStore } from '@/stores/authStore';
import { useCart } from '@/hooks/useCart';
import { useWishlist } from '@/hooks/useWishlist';
import { usePublicCategories } from '@/hooks/useCategories';
import { formatDateTime } from '@/utils/date.util';
import {
  useNotifications,
  useUnreadNotificationCount,
  useMarkAsRead,
  useMarkAllAsRead,
} from '@/hooks/useNotifications';
import { productService } from '@/services/product.service';
import { authService } from '@/services/auth.service';
import { UserRole } from '@shared/enums';
import type { ProductSuggestionItemDto } from '@shared/api.types';

export const Header: React.FC = () => {
  const navigate = useNavigate();
  const { themeMode, toggleTheme, setCartDrawerOpen, showToast } = useUiStore();
  const { user, isAuthenticated, clearAuth } = useAuthStore();
  const { data: cart } = useCart();
  const { data: wishlist } = useWishlist({ enabled: isAuthenticated });
  const { data: categories = [] } = usePublicCategories();

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<ProductSuggestionItemDto[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Menus
  const [accountAnchorEl, setAccountAnchorEl] = useState<null | HTMLElement>(null);
  const [categoriesAnchorEl, setCategoriesAnchorEl] = useState<null | HTMLElement>(null);
  const [navCategoriesAnchorEl, setNavCategoriesAnchorEl] = useState<null | HTMLElement>(null);
  const [notificationAnchorEl, setNotificationAnchorEl] = useState<null | HTMLElement>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const { data: unreadNotificationCount = 0 } = useUnreadNotificationCount(isAuthenticated);
  const { data: recentNotificationsData } = useNotifications(
    { limit: 5 },
    isAuthenticated && Boolean(notificationAnchorEl)
  );
  const markAsReadMutation = useMarkAsRead();
  const markAllAsReadMutation = useMarkAllAsRead();

  const cartCount = cart?.data?.itemCount || 0;
  const cartSubtotal = cart?.data?.subtotal || 0;
  const wishlistCount = wishlist?.data?.itemCount || 0;
  const isAdmin = user?.role === UserRole.ADMIN;
  const location = useLocation();
  const isShop = location.pathname === '/shop' || location.pathname.startsWith('/shop');
  const logoDestination = !isAuthenticated
    ? '/'
    : isAdmin || user?.role === 'super_admin'
    ? '/admin/dashboard'
    : '/dashboard';

  // Debounced Search Suggestions
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsSearching(true);
        const data = await productService.getSuggestions(searchQuery.trim(), 5);
        setSuggestions(data.products || []);
        setShowSuggestions(true);
      } catch {
        setSuggestions([]);
      } finally {
        setIsSearching(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Click outside search suggestion box
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setShowSuggestions(false);
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleSuggestionClick = (slug: string) => {
    setShowSuggestions(false);
    setSearchQuery('');
    navigate(`/products/${slug}`);
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
      clearAuth();
      setAccountAnchorEl(null);
      showToast('You have been signed out successfully.', 'info');
      navigate('/');
    } catch {
      clearAuth();
      setAccountAnchorEl(null);
      navigate('/');
    }
  };

  return (
    <AppBar position="sticky" color="inherit" elevation={0} sx={{ zIndex: 1100 }}>
      {/* =========================================================================
          1. SLIM TOP INFORMATION STRIP (Deep Navy Background)
          ========================================================================= */}
      <Box
        sx={{
          bgcolor: '#101D3B',
          color: '#FFFFFF',
          py: 0.75,
          px: { xs: 2, md: 4 },
          fontSize: { xs: '0.75rem', sm: '0.8rem' },
          fontWeight: 500,
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        <Container maxWidth="xl" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Left Free Shipping message */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ShippingIcon sx={{ fontSize: '1rem', color: '#FFB900' }} />
            <span>Free Shipping on orders over ₦50,000</span>
          </Box>

          {/* Right quick utility links */}
          <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 2.5 }}>
            <Box
              component={RouterLink}
              to="/orders"
              sx={{ color: 'inherit', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 0.5, '&:hover': { color: '#FFB900' } }}
            >
              <OrdersIcon sx={{ fontSize: '0.9rem' }} />
              <span>Track Order</span>
            </Box>
            <Box
              component={RouterLink}
              to="/support"
              sx={{ color: 'inherit', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 0.5, '&:hover': { color: '#FFB900' } }}
            >
              <SupportIcon sx={{ fontSize: '0.9rem' }} />
              <span>Customer Support</span>
            </Box>
            {!isShop && (
              <Box
                component={RouterLink}
                to="/about"
                sx={{ color: 'inherit', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 0.5, '&:hover': { color: '#FFB900' } }}
              >
                <InfoIcon sx={{ fontSize: '0.9rem' }} />
                <span>About Us</span>
              </Box>
            )}
            <IconButton
              size="small"
              onClick={toggleTheme}
              sx={{ color: '#FFFFFF', p: 0.5, ml: 1, '&:hover': { color: '#FFB900' } }}
              aria-label="Toggle theme mode"
            >
              {themeMode === 'dark' ? <LightModeIcon sx={{ fontSize: '1rem' }} /> : <DarkModeIcon sx={{ fontSize: '1rem' }} />}
            </IconButton>
          </Box>
        </Container>
      </Box>

      {/* =========================================================================
          2. MAIN BRAND HEADER ROW (White Background)
          ========================================================================= */}
      <Box
        sx={{
          bgcolor: 'background.paper',
          borderBottom: '1px solid',
          borderColor: 'divider',
          py: 1.5,
          px: { xs: 1.5, md: 4 },
        }}
      >
        <Container maxWidth="xl" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: { xs: 1.5, md: 3 } }}>
          {/* Mobile Menu Button */}
          <IconButton
            sx={{ display: { xs: 'inline-flex', md: 'none' }, color: 'text.primary' }}
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open mobile menu"
          >
            <MenuIcon />
          </IconButton>

          {/* Logo & Tagline */}
          <Box
            component={RouterLink}
            to={logoDestination}
            sx={{
              display: 'flex',
              alignItems: 'center',
              textDecoration: 'none',
              gap: 1.25,
              flexShrink: 0,
            }}
          >
            <Box
              sx={{
                width: 42,
                height: 42,
                borderRadius: '12px',
                bgcolor: '#1557D5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
                boxShadow: '0 4px 12px rgba(21, 87, 213, 0.3)',
              }}
            >
              <CartIcon sx={{ fontSize: '1.4rem' }} />
            </Box>
            <Box>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 900,
                  fontSize: { xs: '1.15rem', md: '1.4rem' },
                  color: 'text.primary',
                  lineHeight: 1.1,
                  letterSpacing: '-0.5px',
                }}
              >
                Cartiva <Box component="span" sx={{ color: '#1557D5' }}>Mini</Box>
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  fontSize: '0.68rem',
                  fontWeight: 600,
                  color: 'text.secondary',
                  letterSpacing: '0.2px',
                  display: { xs: 'none', sm: 'block' },
                }}
              >
                Shop Smart. Live Better.
              </Typography>
            </Box>
          </Box>

          {/* Center Prominent Search Bar with Autocomplete */}
          <Box
            ref={searchContainerRef}
            component="form"
            onSubmit={handleSearchSubmit}
            sx={{
              position: 'relative',
              flexGrow: 1,
              maxWidth: { xs: '100%', sm: 480, md: 620 },
              mx: { xs: 1, md: 3 },
              display: { xs: 'none', sm: 'block' },
            }}
          >
            <Paper
              elevation={0}
              sx={{
                display: 'flex',
                alignItems: 'center',
                borderRadius: '9999px',
                border: '1.5px solid',
                borderColor: 'divider',
                bgcolor: themeMode === 'dark' ? '#1F2937' : '#F5F7FC',
                px: 2,
                py: 0.5,
                transition: 'all 200ms ease',
                '&:focus-within': {
                  borderColor: '#1557D5',
                  bgcolor: 'background.paper',
                  boxShadow: '0 0 0 3px rgba(21, 87, 213, 0.15)',
                },
              }}
            >
              <InputBase
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => {
                  if (suggestions.length > 0) setShowSuggestions(true);
                }}
                placeholder="Search for products, categories or brands..."
                sx={{ ml: 1, flex: 1, fontSize: '0.9rem', color: 'text.primary' }}
                inputProps={{ 'aria-label': 'Search products' }}
              />
              {isSearching ? (
                <CircularProgress size={20} sx={{ color: '#1557D5', mr: 1 }} />
              ) : null}
              <IconButton
                type="submit"
                sx={{
                  bgcolor: '#101D3B',
                  color: '#FFFFFF',
                  p: 1,
                  '&:hover': { bgcolor: '#1557D5' },
                  transition: 'background-color 200ms',
                }}
                aria-label="Submit search"
              >
                <SearchIcon sx={{ fontSize: '1.15rem' }} />
              </IconButton>
            </Paper>

            {/* Live Autocomplete Suggestions Box */}
            {showSuggestions && suggestions.length > 0 && (
              <Paper
                elevation={4}
                sx={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  mt: 1,
                  borderRadius: '14px',
                  bgcolor: 'background.paper',
                  border: '1px solid',
                  borderColor: 'divider',
                  zIndex: 1300,
                  overflow: 'hidden',
                }}
              >
                <List dense disablePadding>
                  {suggestions.map((item) => (
                    <ListItem key={item.id} disablePadding>
                      <ListItemButton
                        onClick={() => handleSuggestionClick(item.slug)}
                        sx={{ py: 1.2, px: 2, '&:hover': { bgcolor: 'action.hover' } }}
                      >
                        <SearchIcon sx={{ fontSize: '1rem', color: 'text.secondary', mr: 1.5 }} />
                        <ListItemText
                          primary={item.title}
                          primaryTypographyProps={{ fontSize: '0.88rem', fontWeight: 500 }}
                          secondary={`₦${(item.salePrice || item.regularPrice).toLocaleString()}`}
                          secondaryTypographyProps={{ fontSize: '0.78rem', color: 'primary.main', fontWeight: 600 }}
                        />
                      </ListItemButton>
                    </ListItem>
                  ))}
                  <Divider />
                  <ListItemButton
                    onClick={handleSearchSubmit}
                    sx={{ py: 1, textAlign: 'center', bgcolor: 'action.hover' }}
                  >
                    <Typography variant="caption" sx={{ color: '#1557D5', fontWeight: 700, width: '100%' }}>
                      View all results for &quot;{searchQuery}&quot; →
                    </Typography>
                  </ListItemButton>
                </List>
              </Paper>
            )}
          </Box>

          {/* Right Action Buttons (Account, Wishlist, Cart) */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 2 } }}>
            {/* Account Menu */}
            <Button
              onClick={(e) => setAccountAnchorEl(e.currentTarget)}
              startIcon={<UserIcon sx={{ color: 'text.primary' }} />}
              endIcon={<ArrowDownIcon sx={{ fontSize: '1rem', color: 'text.secondary' }} />}
              sx={{
                color: 'text.primary',
                fontWeight: 600,
                fontSize: '0.88rem',
                textTransform: 'none',
                px: { xs: 1, sm: 1.5 },
                py: 0.75,
                borderRadius: '10px',
                '&:hover': { bgcolor: themeMode === 'dark' ? '#1F2937' : '#F5F7FC' },
              }}
              aria-label="Account menu"
            >
              <Box sx={{ textAlign: 'left', display: { xs: 'none', sm: 'block' } }}>
                <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', lineHeight: 1 }}>
                  {isAuthenticated && user ? `Hello, ${user.firstName}` : 'Welcome'}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.2, color: 'text.primary' }}>
                  Account
                </Typography>
              </Box>
            </Button>

            <Menu
              anchorEl={accountAnchorEl}
              open={Boolean(accountAnchorEl)}
              onClose={() => setAccountAnchorEl(null)}
              PaperProps={{
                sx: {
                  width: 230,
                  borderRadius: '14px',
                  boxShadow: '0 10px 30px rgba(16, 29, 59, 0.12)',
                  p: 0.5,
                  mt: 1,
                },
              }}
            >
              {isAuthenticated ? (
                <>
                  <Box sx={{ px: 2, py: 1.2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                      {user?.firstName} {user?.lastName}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                      {user?.email}
                    </Typography>
                  </Box>
                  <Divider sx={{ my: 0.5 }} />
                  <MenuItem
                    component={RouterLink}
                    to="/account"
                    onClick={() => setAccountAnchorEl(null)}
                    sx={{ borderRadius: 1.5, py: 1 }}
                  >
                    <ListItemIcon><UserIcon fontSize="small" /></ListItemIcon>
                    Account Overview
                  </MenuItem>
                  <MenuItem
                    component={RouterLink}
                    to="/orders"
                    onClick={() => setAccountAnchorEl(null)}
                    sx={{ borderRadius: 1.5, py: 1 }}
                  >
                    <ListItemIcon><OrdersIcon fontSize="small" /></ListItemIcon>
                    My Orders
                  </MenuItem>
                  <MenuItem
                    component={RouterLink}
                    to="/account/addresses"
                    onClick={() => setAccountAnchorEl(null)}
                    sx={{ borderRadius: 1.5, py: 1 }}
                  >
                    <ListItemIcon><AddressIcon fontSize="small" /></ListItemIcon>
                    Delivery Addresses
                  </MenuItem>
                  <MenuItem
                    component={RouterLink}
                    to="/account/security"
                    onClick={() => setAccountAnchorEl(null)}
                    sx={{ borderRadius: 1.5, py: 1 }}
                  >
                    <ListItemIcon><SecurityIcon fontSize="small" /></ListItemIcon>
                    Account Security
                  </MenuItem>
                  <MenuItem
                    component={RouterLink}
                    to="/account/support"
                    onClick={() => setAccountAnchorEl(null)}
                    sx={{ borderRadius: 1.5, py: 1 }}
                  >
                    <ListItemIcon><SupportIcon fontSize="small" /></ListItemIcon>
                    Support Tickets
                  </MenuItem>
                  {isAdmin && (
                    <>
                      <Divider sx={{ my: 0.5 }} />
                      <MenuItem
                        component={RouterLink}
                        to="/admin"
                        onClick={() => setAccountAnchorEl(null)}
                        sx={{ borderRadius: 1.5, py: 1, color: '#1557D5' }}
                      >
                        <ListItemIcon><AdminIcon fontSize="small" sx={{ color: '#1557D5' }} /></ListItemIcon>
                        Admin Portal
                      </MenuItem>
                    </>
                  )}
                  <Divider sx={{ my: 0.5 }} />
                  <MenuItem onClick={handleLogout} sx={{ borderRadius: 1.5, py: 1, color: '#EF4444' }}>
                    <ListItemIcon><LogoutIcon fontSize="small" sx={{ color: '#EF4444' }} /></ListItemIcon>
                    Sign Out
                  </MenuItem>
                </>
              ) : (
                <>
                  <Box sx={{ p: 1.5, textAlign: 'center' }}>
                    <Button
                      fullWidth
                      variant="contained"
                      component={RouterLink}
                      to="/login"
                      onClick={() => setAccountAnchorEl(null)}
                      sx={{ bgcolor: '#1557D5', color: '#FFFFFF', mb: 1, borderRadius: 2 }}
                    >
                      Sign In
                    </Button>
                    <Typography variant="caption" sx={{ color: '#64748B' }}>
                      New customer?{' '}
                      <Box
                        component={RouterLink}
                        to="/register"
                        onClick={() => setAccountAnchorEl(null)}
                        sx={{ color: '#1557D5', fontWeight: 700 }}
                      >
                        Register
                      </Box>
                    </Typography>
                  </Box>
                </>
              )}
            </Menu>

            {/* Notification Bell Icon & Dropdown Popover */}
            {isAuthenticated && (
              <>
                <Tooltip title="Notifications">
                  <IconButton
                    onClick={(e) => setNotificationAnchorEl(e.currentTarget)}
                    sx={{
                      color: 'text.primary',
                      bgcolor: themeMode === 'dark' ? '#1F2937' : '#F5F7FC',
                      borderRadius: '10px',
                      p: 1.1,
                      '&:hover': {
                        bgcolor: themeMode === 'dark' ? '#374151' : '#E8F0FE',
                        color: '#1557D5',
                      },
                    }}
                    aria-label="Notifications"
                    id="notifications-bell-button"
                  >
                    <Badge badgeContent={unreadNotificationCount} color="error" max={99}>
                      <NotificationIcon />
                    </Badge>
                  </IconButton>
                </Tooltip>

                <Menu
                  anchorEl={notificationAnchorEl}
                  open={Boolean(notificationAnchorEl)}
                  onClose={() => setNotificationAnchorEl(null)}
                  PaperProps={{
                    sx: {
                      width: 360,
                      maxWidth: '92vw',
                      mt: 1.5,
                      borderRadius: '14px',
                      boxShadow: '0 12px 36px rgba(16, 29, 59, 0.15)',
                      p: 0,
                      overflow: 'hidden',
                    },
                  }}
                  transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                  anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                >
                  <Box
                    sx={{
                      p: 2,
                      bgcolor: themeMode === 'dark' ? '#101D3B' : '#0F172A',
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <NotificationIcon sx={{ fontSize: 20, color: '#FFB900' }} />
                      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                        Notifications
                      </Typography>
                      {unreadNotificationCount > 0 && (
                        <Chip
                          label={`${unreadNotificationCount} new`}
                          size="small"
                          sx={{
                            bgcolor: '#EF4444',
                            color: '#FFFFFF',
                            height: 20,
                            fontWeight: 700,
                            fontSize: '0.7rem',
                          }}
                        />
                      )}
                    </Box>
                    {unreadNotificationCount > 0 && (
                      <Button
                        size="small"
                        onClick={() => markAllAsReadMutation.mutate()}
                        sx={{
                          color: '#93C5FD',
                          textTransform: 'none',
                          fontSize: '0.75rem',
                          p: 0,
                          minWidth: 'auto',
                          '&:hover': { color: '#FFFFFF' },
                        }}
                      >
                        Mark all read
                      </Button>
                    )}
                  </Box>

                  <Box sx={{ maxHeight: 320, overflowY: 'auto' }}>
                    {!recentNotificationsData?.items || recentNotificationsData.items.length === 0 ? (
                      <Box sx={{ p: 3, textAlign: 'center' }}>
                        <CheckIcon sx={{ fontSize: 40, color: '#10B981', mb: 1, opacity: 0.8 }} />
                        <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                          You&apos;re all caught up!
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          No unread notifications at this time.
                        </Typography>
                      </Box>
                    ) : (
                      recentNotificationsData.items.map((item) => (
                        <MenuItem
                          key={item.id}
                          onClick={() => {
                            if (!item.isRead) {
                              markAsReadMutation.mutate(item.id);
                            }
                            setNotificationAnchorEl(null);
                            if (item.actionUrl) {
                              navigate(item.actionUrl);
                            } else {
                              navigate('/account/notifications');
                            }
                          }}
                          sx={{
                            py: 1.5,
                            px: 2,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'flex-start',
                            borderBottom: '1px solid',
                            borderColor: 'divider',
                            bgcolor: !item.isRead
                              ? themeMode === 'dark'
                                ? 'rgba(21, 87, 213, 0.15)'
                                : '#F0F7FF'
                              : 'transparent',
                            '&:hover': {
                              bgcolor: themeMode === 'dark' ? '#1F2937' : '#F5F7FC',
                            },
                          }}
                        >
                          <Box
                            sx={{
                              width: '100%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              mb: 0.4,
                            }}
                          >
                            <Typography
                              variant="body2"
                              sx={{
                                fontWeight: !item.isRead ? 700 : 500,
                                color: 'text.primary',
                                fontSize: '0.86rem',
                              }}
                            >
                              {item.title}
                            </Typography>
                            {!item.isRead && (
                              <Box
                                sx={{
                                  width: 8,
                                  height: 8,
                                  borderRadius: '50%',
                                  bgcolor: '#1557D5',
                                  flexShrink: 0,
                                  ml: 1,
                                }}
                              />
                            )}
                          </Box>
                          <Typography
                            variant="caption"
                            sx={{
                              color: 'text.secondary',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                              lineHeight: 1.35,
                            }}
                          >
                            {item.message}
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{ color: '#94A3B8', fontSize: '0.7rem', mt: 0.6 }}
                          >
                            {formatDateTime(item.createdAt)}
                          </Typography>
                        </MenuItem>
                      ))
                    )}
                  </Box>

                  <Box
                    sx={{
                      p: 1.5,
                      bgcolor: themeMode === 'dark' ? '#1F2937' : '#F8FAFC',
                      borderTop: '1px solid',
                      borderColor: 'divider',
                      display: 'flex',
                      gap: 1,
                    }}
                  >
                    <Button
                      fullWidth
                      variant="contained"
                      size="small"
                      onClick={() => {
                        setNotificationAnchorEl(null);
                        navigate('/account/notifications');
                      }}
                      sx={{
                        bgcolor: '#1557D5',
                        color: '#FFFFFF',
                        textTransform: 'none',
                        fontWeight: 600,
                        fontSize: '0.8rem',
                        borderRadius: '8px',
                        '&:hover': { bgcolor: '#0D47A1' },
                      }}
                    >
                      View All Notifications
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => {
                        setNotificationAnchorEl(null);
                        navigate('/account/notifications/preferences');
                      }}
                      sx={{
                        borderColor: 'divider',
                        color: 'text.primary',
                        textTransform: 'none',
                        fontSize: '0.8rem',
                        borderRadius: '8px',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Preferences
                    </Button>
                  </Box>
                </Menu>
              </>
            )}

            {/* Wishlist Icon */}
            <Tooltip title="View Wishlist">
              <IconButton
                component={RouterLink}
                to="/wishlist"
                sx={{
                  color: 'text.primary',
                  bgcolor: themeMode === 'dark' ? '#1F2937' : '#F5F7FC',
                  borderRadius: '10px',
                  p: 1.1,
                  '&:hover': { bgcolor: themeMode === 'dark' ? '#374151' : '#E8F0FE', color: '#1557D5' },
                }}
                aria-label="Wishlist"
              >
                <Badge badgeContent={wishlistCount} color="error" max={99}>
                  <WishlistIcon />
                </Badge>
              </IconButton>
            </Tooltip>

            {/* Cart Button with Total Amount Badge */}
            <Button
              onClick={() => setCartDrawerOpen(true)}
              variant="contained"
              sx={{
                bgcolor: '#101D3B',
                color: '#FFFFFF',
                borderRadius: '12px',
                px: { xs: 1.5, sm: 2 },
                py: 0.9,
                display: 'flex',
                alignItems: 'center',
                gap: 1.2,
                boxShadow: '0 4px 14px rgba(16, 29, 59, 0.2)',
                '&:hover': { bgcolor: '#1557D5', boxShadow: '0 6px 18px rgba(21, 87, 213, 0.3)' },
              }}
              aria-label="View shopping cart"
            >
              <Badge badgeContent={cartCount} color="error" max={99}>
                <CartIcon sx={{ color: '#FFB900' }} />
              </Badge>
              <Box sx={{ textAlign: 'left', display: { xs: 'none', sm: 'block' } }}>
                <Typography variant="caption" sx={{ display: 'block', opacity: 0.85, lineHeight: 1 }}>
                  Cart
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.1 }}>
                  ₦{cartSubtotal.toLocaleString()}
                </Typography>
              </Box>
            </Button>
          </Box>
        </Container>
      </Box>

      {/* =========================================================================
          3. CATEGORIES & NAVIGATION STRIP (Design Reference Navigation)
          ========================================================================= */}
      <Box
        sx={{
          bgcolor: 'background.paper',
          borderBottom: '1px solid',
          borderColor: 'divider',
          display: { xs: 'none', md: 'block' },
        }}
      >
        <Container
          maxWidth="xl"
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            py: 0.5,
          }}
        >
          {/* Left: "All Categories" Button */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <Button
              onClick={(e) => setCategoriesAnchorEl(e.currentTarget)}
              startIcon={<CategoryIcon sx={{ color: '#FFFFFF' }} />}
              endIcon={<ArrowDownIcon sx={{ color: '#FFFFFF' }} />}
              sx={{
                bgcolor: '#101D3B',
                color: '#FFFFFF',
                fontWeight: 700,
                fontSize: '0.9rem',
                textTransform: 'none',
                px: 2.2,
                py: 1,
                borderRadius: '8px',
                '&:hover': { bgcolor: '#1A294E' },
              }}
              aria-label="Browse all categories"
            >
              All Categories
            </Button>

            <Menu
              anchorEl={categoriesAnchorEl}
              open={Boolean(categoriesAnchorEl)}
              onClose={() => setCategoriesAnchorEl(null)}
              PaperProps={{
                sx: {
                  width: 260,
                  borderRadius: '12px',
                  boxShadow: '0 10px 30px rgba(16, 29, 59, 0.15)',
                  mt: 1,
                },
              }}
            >
              {categories.map((cat) => (
                <MenuItem
                  key={cat.id}
                  component={RouterLink}
                  to={`/shop?category=${cat.slug}`}
                  onClick={() => setCategoriesAnchorEl(null)}
                  sx={{ py: 1.1, fontSize: '0.9rem', fontWeight: 500 }}
                >
                  {cat.name}
                </MenuItem>
              ))}
              <Divider />
              <MenuItem
                component={RouterLink}
                to="/shop"
                onClick={() => setCategoriesAnchorEl(null)}
                sx={{ py: 1, color: '#1557D5', fontWeight: 700 }}
              >
                View All Categories →
              </MenuItem>
            </Menu>

            {/* Navigation Links */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <Box
                component={RouterLink}
                to={logoDestination}
                sx={{
                  color: 'text.primary',
                  fontWeight: 600,
                  fontSize: '0.92rem',
                  textDecoration: 'none',
                  '&:hover': { color: '#1557D5' },
                }}
              >
                Home
              </Box>
              <Box
                component={RouterLink}
                to="/shop"
                sx={{
                  color: 'text.primary',
                  fontWeight: 600,
                  fontSize: '0.92rem',
                  textDecoration: 'none',
                  '&:hover': { color: '#1557D5' },
                }}
              >
                Shop
              </Box>
              <Box
                component={RouterLink}
                to="/shop?filter=deals"
                sx={{
                  color: 'text.primary',
                  fontWeight: 600,
                  fontSize: '0.92rem',
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.6,
                  '&:hover': { color: '#1557D5' },
                }}
              >
                <span>Deals</span>
                <Chip
                  label="Hot"
                  size="small"
                  sx={{
                    bgcolor: '#EF4444',
                    color: '#FFFFFF',
                    height: 18,
                    fontSize: '0.65rem',
                    fontWeight: 700,
                  }}
                />
              </Box>

              {/* Categories Dropdown Link */}
              <Box
                onClick={(e) => setNavCategoriesAnchorEl(e.currentTarget)}
                sx={{
                  color: 'text.primary',
                  fontWeight: 600,
                  fontSize: '0.92rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.3,
                  cursor: 'pointer',
                  '&:hover': { color: '#1557D5' },
                }}
              >
                <span>Categories</span>
                <ArrowDownIcon sx={{ fontSize: '1rem' }} />
              </Box>
              <Menu
                anchorEl={navCategoriesAnchorEl}
                open={Boolean(navCategoriesAnchorEl)}
                onClose={() => setNavCategoriesAnchorEl(null)}
                PaperProps={{
                  sx: {
                    width: 240,
                    borderRadius: '12px',
                    boxShadow: '0 10px 30px rgba(16, 29, 59, 0.15)',
                    mt: 1,
                  },
                }}
              >
                {categories.slice(0, 8).map((cat) => (
                  <MenuItem
                    key={cat.id}
                    component={RouterLink}
                    to={`/shop?category=${cat.slug}`}
                    onClick={() => setNavCategoriesAnchorEl(null)}
                    sx={{ py: 1, fontSize: '0.88rem' }}
                  >
                    {cat.name}
                  </MenuItem>
                ))}
              </Menu>

              {!isShop && (
                <>
                  <Box
                    component={RouterLink}
                    to="/about"
                    sx={{
                      color: 'text.primary',
                      fontWeight: 600,
                      fontSize: '0.92rem',
                      textDecoration: 'none',
                      '&:hover': { color: '#1557D5' },
                    }}
                  >
                    About
                  </Box>
                  <Box
                    component={RouterLink}
                    to="/contact"
                    sx={{
                      color: 'text.primary',
                      fontWeight: 600,
                      fontSize: '0.92rem',
                      textDecoration: 'none',
                      '&:hover': { color: '#1557D5' },
                    }}
                  >
                    Contact
                  </Box>
                </>
              )}
            </Box>
          </Box>

          {/* Right Promotional Highlight Tag */}
          <Box
            component={RouterLink}
            to="/shop?filter=deals"
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              bgcolor: '#FFF8E6',
              border: '1px solid #FFB900',
              borderRadius: '9999px',
              px: 2,
              py: 0.5,
              textDecoration: 'none',
              transition: 'all 200ms ease',
              '&:hover': {
                bgcolor: '#FFB900',
                color: '#101D3B',
                transform: 'translateY(-1px)',
              },
            }}
          >
            <Typography variant="caption" sx={{ color: '#101D3B', fontWeight: 800, fontSize: '0.8rem' }}>
              ⚡ Summer Sale - Up to 70% OFF!
            </Typography>
          </Box>
        </Container>
      </Box>

      {/* =========================================================================
          4. MOBILE NAVIGATION DRAWER
          ========================================================================= */}
      <Drawer
        anchor="left"
        open={mobileMenuOpen}
        onClose={() => {
          if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
          }
          setMobileMenuOpen(false);
        }}
        PaperProps={{
          sx: { width: 310, bgcolor: 'background.paper' },
        }}
      >
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box
              sx={{
                width: 34,
                height: 34,
                borderRadius: '8px',
                bgcolor: '#1557D5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
              }}
            >
              <CartIcon sx={{ fontSize: '1.2rem' }} />
            </Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'text.primary' }}>
              Cartiva Mini
            </Typography>
          </Box>
          <IconButton onClick={() => setMobileMenuOpen(false)} aria-label="Close menu" sx={{ color: 'text.primary' }}>
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Mobile Search Input */}
        <Box component="form" onSubmit={handleSearchSubmit} sx={{ p: 2, bgcolor: themeMode === 'dark' ? '#1F2937' : '#F5F7FC' }}>
          <Paper
            elevation={0}
            sx={{
              display: 'flex',
              alignItems: 'center',
              borderRadius: '9999px',
              border: '1px solid',
              borderColor: 'divider',
              px: 1.5,
              py: 0.3,
            }}
          >
            <InputBase
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products..."
              sx={{ flex: 1, fontSize: '0.85rem', color: 'text.primary' }}
            />
            <IconButton type="submit" size="small" aria-label="Search" sx={{ color: 'text.primary' }}>
              <SearchIcon sx={{ fontSize: '1.1rem' }} />
            </IconButton>
          </Paper>
        </Box>

        {/* Mobile Links */}
        <List sx={{ px: 1 }}>
          <ListItem disablePadding>
            <ListItemButton component={RouterLink} to={logoDestination} onClick={() => setMobileMenuOpen(false)}>
              <ListItemIcon><HomeIcon sx={{ color: '#1557D5' }} /></ListItemIcon>
              <ListItemText primary="Home" />
            </ListItemButton>
          </ListItem>
          <ListItem disablePadding>
            <ListItemButton component={RouterLink} to="/shop" onClick={() => setMobileMenuOpen(false)}>
              <ListItemIcon><ShopIcon sx={{ color: '#1557D5' }} /></ListItemIcon>
              <ListItemText primary="Shop Catalog" />
            </ListItemButton>
          </ListItem>
          <ListItem disablePadding>
            <ListItemButton component={RouterLink} to="/shop?filter=deals" onClick={() => setMobileMenuOpen(false)}>
              <ListItemIcon><DealsIcon sx={{ color: '#EF4444' }} /></ListItemIcon>
              <ListItemText primary="Exclusive Deals" />
              <Chip label="Hot" size="small" sx={{ bgcolor: '#EF4444', color: '#FFFFFF', height: 18, fontSize: '0.65rem' }} />
            </ListItemButton>
          </ListItem>
          <ListItem disablePadding>
            <ListItemButton component={RouterLink} to="/wishlist" onClick={() => setMobileMenuOpen(false)}>
              <ListItemIcon><WishlistIcon sx={{ color: '#1557D5' }} /></ListItemIcon>
              <ListItemText primary="Wishlist" />
              {wishlistCount > 0 && <Chip label={wishlistCount} size="small" color="error" />}
            </ListItemButton>
          </ListItem>
          {isAuthenticated && (
            <ListItem disablePadding>
              <ListItemButton component={RouterLink} to="/account/notifications" onClick={() => setMobileMenuOpen(false)}>
                <ListItemIcon><NotificationIcon sx={{ color: '#1557D5' }} /></ListItemIcon>
                <ListItemText primary="Notifications" />
                {unreadNotificationCount > 0 && <Chip label={unreadNotificationCount} size="small" color="error" />}
              </ListItemButton>
            </ListItem>
          )}

          <Divider sx={{ my: 1 }} />
          <Typography variant="overline" sx={{ px: 2, color: '#64748B', fontWeight: 700 }}>
            Categories
          </Typography>

          {categories.slice(0, 6).map((cat) => (
            <ListItem key={cat.id} disablePadding>
              <ListItemButton
                component={RouterLink}
                to={`/shop?category=${cat.slug}`}
                onClick={() => setMobileMenuOpen(false)}
                sx={{ pl: 3 }}
              >
                <ListItemText primary={cat.name} primaryTypographyProps={{ fontSize: '0.88rem' }} />
              </ListItemButton>
            </ListItem>
          ))}

          <Divider sx={{ my: 1 }} />
          <Typography variant="overline" sx={{ px: 2, color: '#64748B', fontWeight: 700 }}>
            Customer Service
          </Typography>

          <ListItem disablePadding>
            <ListItemButton component={RouterLink} to="/orders" onClick={() => setMobileMenuOpen(false)}>
              <ListItemIcon><OrdersIcon /></ListItemIcon>
              <ListItemText primary="Track Order" />
            </ListItemButton>
          </ListItem>
          <ListItem disablePadding>
            <ListItemButton component={RouterLink} to="/support" onClick={() => setMobileMenuOpen(false)}>
              <ListItemIcon><SupportIcon /></ListItemIcon>
              <ListItemText primary="Support & Help" />
            </ListItemButton>
          </ListItem>
          {!isShop && (
            <ListItem disablePadding>
              <ListItemButton component={RouterLink} to="/about" onClick={() => setMobileMenuOpen(false)}>
                <ListItemIcon><InfoIcon /></ListItemIcon>
                <ListItemText primary="About Cartiva Mini" />
              </ListItemButton>
            </ListItem>
          )}

          <Divider sx={{ my: 1 }} />
          {isAuthenticated ? (
            <>
              <ListItem disablePadding>
                <ListItemButton component={RouterLink} to="/account" onClick={() => setMobileMenuOpen(false)}>
                  <ListItemIcon><UserIcon /></ListItemIcon>
                  <ListItemText primary="My Account" />
                </ListItemButton>
              </ListItem>
              <ListItem disablePadding>
                <ListItemButton onClick={handleLogout} sx={{ color: '#EF4444' }}>
                  <ListItemIcon><LogoutIcon sx={{ color: '#EF4444' }} /></ListItemIcon>
                  <ListItemText primary="Sign Out" />
                </ListItemButton>
              </ListItem>
            </>
          ) : (
            <Box sx={{ p: 2 }}>
              <Button
                fullWidth
                variant="contained"
                component={RouterLink}
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                sx={{ bgcolor: '#1557D5', color: '#FFFFFF', mb: 1, borderRadius: 2 }}
              >
                Sign In
              </Button>
              <Button
                fullWidth
                variant="outlined"
                component={RouterLink}
                to="/register"
                onClick={() => setMobileMenuOpen(false)}
                sx={{ borderColor: '#1557D5', color: '#1557D5', borderRadius: 2 }}
              >
                Create Account
              </Button>
            </Box>
          )}
        </List>
      </Drawer>
    </AppBar>
  );
};
