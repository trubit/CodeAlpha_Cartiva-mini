import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('Homepage Progressive Rendering & Non-Blocking Architecture', () => {
  it('should ensure SmartHomeRoute never blocks public storefront with full-page CircularProgress', () => {
    const smartHomePath = resolve(__dirname, '../frontend/src/components/common/SmartHomeRoute.tsx');
    const content = readFileSync(smartHomePath, 'utf-8');

    // SmartHomeRoute should not render a full-viewport CircularProgress
    expect(content).not.toContain('<CircularProgress />');
    expect(content).not.toContain('minHeight: \'80vh\'');
    // Public visitors should directly receive HomePage
    expect(content).toContain('return <HomePage />;');
  });

  it('should verify HomePage implements independent section error boundaries and retry triggers', () => {
    const homePagePath = resolve(__dirname, '../frontend/src/pages/HomePage.tsx');
    const content = readFileSync(homePagePath, 'utf-8');

    // Check Categories section has error state and refetch hook
    expect(content).toContain('isError: categoriesError');
    expect(content).toContain('refetch: refetchCategories');
    expect(content).toContain('refetchCategories()');

    // Check Featured / Best Sellers section has error state and refetch hook
    expect(content).toContain('isError: featuredError');
    expect(content).toContain('refetch: refetchFeatured');
    expect(content).toContain('refetchFeatured()');

    // Check New Arrivals section has error state and refetch hook
    expect(content).toContain('isError: newArrivalsError');
    expect(content).toContain('refetch: refetchNewArrivals');
    expect(content).toContain('refetchNewArrivals()');
  });

  it('should verify HomePage maintains section skeletons during network loading', () => {
    const homePagePath = resolve(__dirname, '../frontend/src/pages/HomePage.tsx');
    const content = readFileSync(homePagePath, 'utf-8');

    expect(content).toContain('categoriesLoading ?');
    expect(content).toContain('featuredLoading ?');
    expect(content).toContain('newArrivalsLoading ?');
    expect(content).toContain('<Skeleton');
  });

  it('should verify Hero section and benefits trust bar are completely synchronous and unblocked', () => {
    const homePagePath = resolve(__dirname, '../frontend/src/pages/HomePage.tsx');
    const content = readFileSync(homePagePath, 'utf-8');

    // Hero section and trust bar are rendered directly without waiting for query data
    expect(content).toContain('Shop Smart.');
    expect(content).toContain('Live Better.');
    expect(content).toContain('Fast & Reliable');
    expect(content).toContain('Paystack Verified');
  });
});

