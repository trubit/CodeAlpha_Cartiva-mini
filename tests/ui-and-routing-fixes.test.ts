import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('UI, Theming and Routing Fixes Verification', () => {
  it('should have explicit color="#FFFFFF" on AboutPage hero h2 headline', () => {
    const aboutPath = resolve(__dirname, '../frontend/src/pages/AboutPage.tsx');
    const content = readFileSync(aboutPath, 'utf-8');
    // Ensure the variant="h2" Typography explicitly specifies color: '#FFFFFF'
    expect(content).toContain("variant=\"h2\"");
    expect(content).toContain("color: '#FFFFFF'");
  });

  it('should have explicit color="#FFFFFF" on HomePage promotional banner h3 headline', () => {
    const homePath = resolve(__dirname, '../frontend/src/pages/HomePage.tsx');
    const content = readFileSync(homePath, 'utf-8');
    // Ensure the promotional banner variant="h3" Typography explicitly specifies color: '#FFFFFF'
    expect(content).toContain("variant=\"h3\"");
    expect(content).toContain("color: '#FFFFFF'");
  });

  it('should optimize HomePage hero image with eager loading and responsive WebP parameters', () => {
    const homePath = resolve(__dirname, '../frontend/src/pages/HomePage.tsx');
    const content = readFileSync(homePath, 'utf-8');
    expect(content).toContain('fm=webp');
    expect(content).toContain('loading="eager"');
  });

  it('should register canonical alias /products redirecting to /shop in AppRoutes', () => {
    const routesPath = resolve(__dirname, '../frontend/src/routes/index.tsx');
    const content = readFileSync(routesPath, 'utf-8');
    expect(content).toContain('<Route path="products" element={<Navigate to="/shop" replace />} />');
  });

  it('should wrap AppRoutes in AppSessionInitializer in App.tsx', () => {
    const appPath = resolve(__dirname, '../frontend/src/app/App.tsx');
    const content = readFileSync(appPath, 'utf-8');
    expect(content).toContain('<AppSessionInitializer>');
    expect(content).toContain('</AppSessionInitializer>');
  });

  it('should implement safe actionUrl navigation and rewrite /products to /shop in AccountNotificationsPage', () => {
    const notifPagePath = resolve(__dirname, '../frontend/src/pages/account/AccountNotificationsPage.tsx');
    const content = readFileSync(notifPagePath, 'utf-8');
    expect(content).toContain("javascript:");
    expect(content).toContain("targetPath = '/shop'");
    expect(content).toContain("noopener,noreferrer");
  });

  it('should use /shop instead of /products in backend notification templates', () => {
    const templatesPath = resolve(__dirname, '../backend/src/modules/notifications/notification.templates.ts');
    const content = readFileSync(templatesPath, 'utf-8');
    expect(content).not.toContain("localhost:5180/products'");
    expect(content).toContain("localhost:5180/shop'");
  });
});

