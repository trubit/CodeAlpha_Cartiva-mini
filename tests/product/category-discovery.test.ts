import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import { createApp } from '../../backend/src/app.js';
import { Category, type CategoryDocument } from '../../backend/src/models/Category.model.js';
import { Product } from '../../backend/src/models/Product.model.js';
import { startTestServer, type TestServer } from '../test-server.helper.js';
import { ProductStatus } from '@shared/enums.js';

describe('Category & Subcategory Discovery (/api/v1/categories)', () => {
  let testServer: TestServer;
  let fashionParent: CategoryDocument;
  let mensSubcategory: CategoryDocument;
  let womensSubcategory: CategoryDocument;
  let inactiveCategory: CategoryDocument;

  const testDbUri =
    process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/cartiva-mini-cat-discovery-test';

  beforeAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    await mongoose.connect(testDbUri);
    await Category.deleteMany({});
    await Product.deleteMany({});

    const app = createApp();
    testServer = await startTestServer(app);

    // Create Taxonomy: Parent -> Subcategories
    fashionParent = await Category.create({
      name: 'Fashion & Apparel',
      slug: 'fashion-apparel-disc',
      isActive: true,
      displayOrder: 1,
    });

    mensSubcategory = await Category.create({
      name: "Men's Clothing",
      slug: 'mens-clothing-disc',
      parentId: fashionParent._id,
      isActive: true,
      displayOrder: 1,
    });

    womensSubcategory = await Category.create({
      name: "Women's Clothing",
      slug: 'womens-clothing-disc',
      parentId: fashionParent._id,
      isActive: true,
      displayOrder: 2,
    });

    inactiveCategory = await Category.create({
      name: 'Archived Seasonal Category',
      slug: 'archived-seasonal-disc',
      isActive: false, // Must be excluded
    });

    // Create Products assigned to parent and subcategories
    await Product.create([
      {
        title: 'Classic Cotton Crewneck T-Shirt',
        slug: 'classic-cotton-crewneck-disc',
        sku: 'TSHIRT-CREW-001',
        brand: 'Cartiva Basics',
        shortDescription: '100% combed cotton everyday tee.',
        fullDescription: 'Durable and breathable cotton fabric.',
        regularPrice: 8500,
        categoryId: mensSubcategory._id,
        subCategoryId: mensSubcategory._id,
        stockQuantity: 50,
        status: ProductStatus.PUBLISHED,
      },
      {
        title: 'Floral Summer Maxi Dress',
        slug: 'floral-summer-maxi-dress-disc',
        sku: 'DRESS-MAXI-001',
        brand: 'Luxe Wear',
        shortDescription: 'Lightweight chiffon summer floral maxi dress.',
        fullDescription: 'Flowing silhouette with adjustable tie waist.',
        regularPrice: 24000,
        categoryId: womensSubcategory._id,
        subCategoryId: womensSubcategory._id,
        stockQuantity: 20,
        status: ProductStatus.PUBLISHED,
      },
      {
        title: 'Unisex Leather Belt',
        slug: 'unisex-leather-belt-disc',
        sku: 'BELT-LEA-001',
        brand: 'Cartiva Leather',
        shortDescription: 'Genuine leather brass buckle belt.',
        fullDescription: 'Full grain leather belt with durable finish.',
        regularPrice: 15000,
        categoryId: fashionParent._id, // Assigned directly to parent category
        stockQuantity: 30,
        status: ProductStatus.PUBLISHED,
      },
      {
        title: 'Unpublished Prototype Jacket',
        slug: 'unpublished-prototype-jacket-disc',
        sku: 'JACKET-PROTO-001',
        brand: 'Cartiva Outerwear',
        shortDescription: 'Sample jacket not yet released.',
        fullDescription: 'Testing sample.',
        regularPrice: 45000,
        categoryId: mensSubcategory._id,
        stockQuantity: 5,
        status: ProductStatus.DRAFT, // Must NEVER be returned
      },
    ]);
  });

  afterAll(async () => {
    await Category.deleteMany({});
    await Product.deleteMany({});
    if (testServer) await testServer.close();
    await mongoose.disconnect();
  });

  it('should retrieve public category hierarchy with active subcategories nested', async () => {
    const res = await testServer.request('/api/v1/categories');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const categories = res.body.data;
    const fashion = categories.find((c: { slug: string }) => c.slug === 'fashion-apparel-disc');
    expect(fashion).toBeDefined();
    expect(fashion.children.length).toBe(2);

    const childSlugs = fashion.children.map((c: { slug: string }) => c.slug);
    expect(childSlugs).toContain('mens-clothing-disc');
    expect(childSlugs).toContain('womens-clothing-disc');

    // Inactive category must not be in public list
    const inactive = categories.find((c: { slug: string }) => c.slug === 'archived-seasonal-disc');
    expect(inactive).toBeUndefined();
  });

  it('should retrieve single category detail by slug with accurate product count', async () => {
    const res = await testServer.request(`/api/v1/categories/${fashionParent.slug}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.slug).toBe(fashionParent.slug);
    expect(res.body.data.name).toBe('Fashion & Apparel');
    expect(typeof res.body.data.productCount).toBe('number');
  });

  it('should return 404 for nonexistent or inactive category', async () => {
    const resNonExistent = await testServer.request('/api/v1/categories/does-not-exist');
    expect(resNonExistent.status).toBe(404);

    const resInactive = await testServer.request(`/api/v1/categories/${inactiveCategory.slug}`);
    expect(resInactive.status).toBe(404);
  });

  it('should discover all products in a parent category including its subcategories via /categories/:slug/products', async () => {
    const res = await testServer.request(`/api/v1/categories/${fashionParent.slug}/products`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const skus = res.body.data.map((p: { sku: string }) => p.sku);
    // Should contain belt (parent), t-shirt (men's subcategory), and dress (women's subcategory)
    expect(skus).toContain('BELT-LEA-001');
    expect(skus).toContain('TSHIRT-CREW-001');
    expect(skus).toContain('DRESS-MAXI-001');

    // Should strictly exclude draft jacket
    expect(skus).not.toContain('JACKET-PROTO-001');
  });

  it('should discover products for a specific subcategory only', async () => {
    const res = await testServer.request(`/api/v1/categories/${mensSubcategory.slug}/products`);

    expect(res.status).toBe(200);
    const skus = res.body.data.map((p: { sku: string }) => p.sku);

    // Only men's clothing product
    expect(skus).toContain('TSHIRT-CREW-001');
    expect(skus).not.toContain('DRESS-MAXI-001');
    expect(skus).not.toContain('BELT-LEA-001');
  });

  it('should support price filtering within category products endpoint', async () => {
    // Only dress (24k) and belt (15k) are >= 10k, t-shirt (8.5k) is excluded
    const res = await testServer.request(
      `/api/v1/categories/${fashionParent.slug}/products?minPrice=10000`
    );

    expect(res.status).toBe(200);
    const skus = res.body.data.map((p: { sku: string }) => p.sku);
    expect(skus).toContain('BELT-LEA-001');
    expect(skus).toContain('DRESS-MAXI-001');
    expect(skus).not.toContain('TSHIRT-CREW-001');
  });
});
