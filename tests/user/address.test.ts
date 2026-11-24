import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { createApp } from '../../backend/src/app.js';
import { User } from '../../backend/src/models/User.model.js';
import { Address } from '../../backend/src/models/Address.model.js';
import { authService } from '../../backend/src/modules/auth/auth.service.js';
import { startTestServer, type TestServer } from '../test-server.helper.js';
import { UserRole } from '@shared/enums.js';

describe('Customer Delivery Address Management (/api/v1/users/me/addresses)', () => {
  let testServer: TestServer;
  const testDbUri =
    process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/cartiva-mini-user-address-test';

  beforeAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    await mongoose.connect(testDbUri);
    await User.deleteMany({});
    await Address.deleteMany({});
    const app = createApp();
    testServer = await startTestServer(app);
  });

  afterAll(async () => {
    await User.deleteMany({});
    await Address.deleteMany({});
    if (testServer) await testServer.close();
    await mongoose.disconnect();
  });

  it('should automatically set the first created address as default', async () => {
    const passwordHash = await bcrypt.hash('Password123!', 10);
    const user = await User.create({
      firstName: 'Chidi',
      lastName: 'Okafor',
      email: 'chidi.addr1@cartivamini.test',
      passwordHash,
      role: UserRole.CUSTOMER,
      isEmailVerified: true,
      isActive: true,
    });

    const accessToken = authService.generateAccessToken(user);

    const res = await testServer.request('/api/v1/users/me/addresses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: {
        recipientName: 'Chidi Okafor',
        phone: '+2348033445566',
        streetAddress: '15 Admiralty Way',
        apartmentSuite: 'Penthouse 4B',
        city: 'Lekki',
        state: 'Lagos',
        country: 'Nigeria',
      },
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.recipientName).toBe('Chidi Okafor');
    expect(res.body.data.isDefault).toBe(true);
  });

  it('should maintain single default address when setting new default', async () => {
    const passwordHash = await bcrypt.hash('Password123!', 10);
    const user = await User.create({
      firstName: 'Amina',
      lastName: 'Danladi',
      email: 'amina.defaults@cartivamini.test',
      passwordHash,
      role: UserRole.CUSTOMER,
      isEmailVerified: true,
      isActive: true,
    });

    const accessToken = authService.generateAccessToken(user);

    // Address 1 (auto-default)
    const res1 = await testServer.request('/api/v1/users/me/addresses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: {
        recipientName: 'Amina Home',
        phone: '+2348022334455',
        streetAddress: '12 Gana Street',
        city: 'Maitama',
        state: 'Abuja',
      },
    });
    expect(res1.body.data.isDefault).toBe(true);
    const addr1Id = res1.body.data.id;

    // Address 2 (non-default)
    const res2 = await testServer.request('/api/v1/users/me/addresses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: {
        recipientName: 'Amina Office',
        phone: '+2348022334455',
        streetAddress: '44 Constitution Avenue',
        city: 'Central Business District',
        state: 'Abuja',
        isDefault: false,
      },
    });
    expect(res2.body.data.isDefault).toBe(false);
    const addr2Id = res2.body.data.id;

    // Set Address 2 as default
    const setDefRes = await testServer.request(`/api/v1/users/me/addresses/${addr2Id}/default`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    expect(setDefRes.status).toBe(200);
    expect(setDefRes.body.data.isDefault).toBe(true);

    // Verify in database that Address 1 is now non-default
    const addr1InDb = await Address.findById(addr1Id);
    const addr2InDb = await Address.findById(addr2Id);
    expect(addr1InDb?.isDefaultShipping).toBe(false);
    expect(addr2InDb?.isDefaultShipping).toBe(true);
  });

  it('should prevent IDOR: customer cannot access, update, or delete another customer address', async () => {
    const passwordHash = await bcrypt.hash('Password123!', 10);
    const victim = await User.create({
      firstName: 'Victim',
      lastName: 'User',
      email: 'victim.idor@cartivamini.test',
      passwordHash,
      role: UserRole.CUSTOMER,
      isEmailVerified: true,
      isActive: true,
    });

    const attacker = await User.create({
      firstName: 'Attacker',
      lastName: 'User',
      email: 'attacker.idor@cartivamini.test',
      passwordHash,
      role: UserRole.CUSTOMER,
      isEmailVerified: true,
      isActive: true,
    });

    // Victim creates an address
    const victimAddress = await Address.create({
      userId: victim._id,
      recipientName: 'Private Resident',
      phone: '+2348011112222',
      streetAddress: 'Confidential Road 1',
      city: 'Victoria Island',
      state: 'Lagos',
      country: 'Nigeria',
      isDefaultShipping: true,
    });

    const attackerToken = authService.generateAccessToken(attacker);

    // Attacker tries to update victim address
    const updateRes = await testServer.request(
      `/api/v1/users/me/addresses/${victimAddress._id.toString()}`,
      {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${attackerToken}` },
        body: { recipientName: 'Pawned Name' },
      }
    );
    expect(updateRes.status).toBe(404);
    expect(updateRes.body.error.code).toBe('ADDRESS_NOT_FOUND');

    // Attacker tries to delete victim address
    const deleteRes = await testServer.request(
      `/api/v1/users/me/addresses/${victimAddress._id.toString()}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${attackerToken}` },
      }
    );
    expect(deleteRes.status).toBe(404);

    // Verify victim address remains intact
    const stillExists = await Address.findById(victimAddress._id);
    expect(stillExists).not.toBeNull();
    expect(stillExists?.recipientName).toBe('Private Resident');
  });

  it('should promote next address to default when the default address is deleted', async () => {
    const passwordHash = await bcrypt.hash('Password123!', 10);
    const user = await User.create({
      firstName: 'Emeka',
      lastName: 'Ibe',
      email: 'emeka.promote@cartivamini.test',
      passwordHash,
      role: UserRole.CUSTOMER,
      isEmailVerified: true,
      isActive: true,
    });

    const accessToken = authService.generateAccessToken(user);

    // Create 2 addresses
    const addr1Res = await testServer.request('/api/v1/users/me/addresses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: {
        recipientName: 'Emeka Default',
        phone: '+2348055667788',
        streetAddress: '1st Street',
        city: 'Ikeja',
        state: 'Lagos',
      },
    });

    const addr2Res = await testServer.request('/api/v1/users/me/addresses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: {
        recipientName: 'Emeka Backup',
        phone: '+2348055667788',
        streetAddress: '2nd Street',
        city: 'Ikeja',
        state: 'Lagos',
        isDefault: false,
      },
    });

    const defaultId = addr1Res.body.data.id;
    const backupId = addr2Res.body.data.id;

    // Delete the default address
    const delRes = await testServer.request(`/api/v1/users/me/addresses/${defaultId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    expect(delRes.status).toBe(200);

    // Verify backup address was promoted to default
    const backupInDb = await Address.findById(backupId);
    expect(backupInDb?.isDefaultShipping).toBe(true);
  });

  it('should enforce the maximum limit of 10 delivery addresses per customer', async () => {
    const passwordHash = await bcrypt.hash('Password123!', 10);
    const user = await User.create({
      firstName: 'Collector',
      lastName: 'Addresses',
      email: 'collector.max@cartivamini.test',
      passwordHash,
      role: UserRole.CUSTOMER,
      isEmailVerified: true,
      isActive: true,
    });

    const accessToken = authService.generateAccessToken(user);

    // Populate 10 addresses
    for (let i = 1; i <= 10; i++) {
      await Address.create({
        userId: user._id,
        recipientName: `Recipient ${i}`,
        phone: '+2348011223344',
        streetAddress: `${i} Market Road`,
        city: 'Port Harcourt',
        state: 'Rivers',
        country: 'Nigeria',
      });
    }

    // Attempt 11th address
    const res = await testServer.request('/api/v1/users/me/addresses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: {
        recipientName: 'Recipient 11',
        phone: '+2348011223344',
        streetAddress: '11 Extra Road',
        city: 'Port Harcourt',
        state: 'Rivers',
      },
    });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('MAX_ADDRESSES_REACHED');
  });
});
