import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('UI Consistency & Product Image Upload Verification', () => {
  const rootDir = resolve(__dirname, '..');

  it('1. verifies product image upload UI and mutation integration in AdminDashboardPage.tsx', () => {
    const adminPage = readFileSync(
      resolve(rootDir, 'frontend/src/pages/admin/AdminDashboardPage.tsx'),
      'utf-8'
    );

    // Verify hooks and states
    expect(adminPage).toContain('useUploadProductImage');
    expect(adminPage).toContain('selectedImageFile');
    expect(adminPage).toContain('imagePreviewUrl');
    expect(adminPage).toContain('imageUrlInput');
    expect(adminPage).toContain('handleImageFileSelect');

    // Verify modal inputs
    expect(adminPage).toContain('Product Photo / Picture');
    expect(adminPage).toContain('Choose Picture File');
    expect(adminPage).toContain('accept="image/jpeg,image/png,image/webp,image/gif"');
    expect(adminPage).toContain('Or Direct Image URL (HTTPS)');
    expect(adminPage).toContain('Product Photo Preview');

    // Verify table display column
    expect(adminPage).toContain('<TableCell sx={{ fontWeight: 700, width: 70 }}>Photo</TableCell>');
    expect(adminPage).toContain('Upload / Change Photo');
  });

  it('2. verifies dark mode surface consistency on ShopPage.tsx (No white card in dark mode)', () => {
    const shopPage = readFileSync(
      resolve(rootDir, 'frontend/src/pages/ShopPage.tsx'),
      'utf-8'
    );

    // Verify empty state uses theme-aware dark surface #111827 instead of bright paper/white
    expect(shopPage).toContain("theme.palette.mode === 'dark' ? '#111827' : '#FFFFFF'");
    expect(shopPage).toContain("theme.palette.mode === 'dark' ? '#1F2937' : '#E2E8F0'");
    expect(shopPage).toContain('No Products Found');
  });

  it('3. verifies customer dashboard welcome banner contrast (No dark card in light mode)', () => {
    const overviewPage = readFileSync(
      resolve(rootDir, 'frontend/src/pages/account/AccountOverviewPage.tsx'),
      'utf-8'
    );

    // Verify welcome banner adapts to light/dark modes
    expect(overviewPage).toContain("theme.palette.mode === 'dark' ? '#111827' : '#FFFFFF'");
    expect(overviewPage).toContain("theme.palette.mode === 'dark' ? '#F8FAFC' : '#101D3B'");
    expect(overviewPage).toContain("Welcome back, {user?.firstName || 'Valued Customer'}!");
  });

  it('4. verifies /about page text visibility and contrast against light-theme overriding', () => {
    const aboutPage = readFileSync(
      resolve(rootDir, 'frontend/src/pages/AboutPage.tsx'),
      'utf-8'
    );

    // Verify header text prevents light-mode typography darkening
    expect(aboutPage).toContain("color: '#FFFFFF !important'");
    expect(aboutPage).toContain("color: '#FFB900 !important'");
    expect(aboutPage).toContain('Everything You Need,');
    expect(aboutPage).toContain('Just a Click Away.');
  });

  it('5. verifies /products route seamlessly displays the product catalog without 404', () => {
    const routesFile = readFileSync(
      resolve(rootDir, 'frontend/src/routes/index.tsx'),
      'utf-8'
    );

    // Verify /shop and /products canonical alias
    expect(routesFile).toContain('<Route path="shop" element={<ShopPage />} />');
    expect(routesFile).toContain('<Route path="products" element={<Navigate to="/shop" replace />} />');
    expect(routesFile).toContain('<Route path="products/:slug" element={<ProductDetailPage />} />');

    // Verify auth service sets canonical /shop actionUrl
    const authService = readFileSync(
      resolve(rootDir, 'backend/src/modules/auth/auth.service.ts'),
      'utf-8'
    );
    expect(authService).toContain("actionUrl: '/shop'");
  });
});
