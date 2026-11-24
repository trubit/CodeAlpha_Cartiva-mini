/**
 * Cartiva Mini — Checkout Session Repository
 * Encapsulates Mongoose database operations for server-side checkout sessions.
 */
import { Types } from 'mongoose';
import {
  CheckoutSession,
  type CheckoutSessionDocument,
} from '../../models/CheckoutSession.model.js';
import { CheckoutStep } from '@shared/enums.js';

export class CheckoutRepository {
  /**
   * Finds an active checkout session for an authenticated user.
   */
  public async findActiveSessionByUser(userId: string): Promise<CheckoutSessionDocument | null> {
    return CheckoutSession.findOne({
      userId: new Types.ObjectId(userId),
      step: { $ne: CheckoutStep.CONFIRMED },
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });
  }

  /**
   * Finds a checkout session by its unique session ID.
   */
  public async findSessionById(sessionId: string): Promise<CheckoutSessionDocument | null> {
    return CheckoutSession.findOne({ sessionId });
  }

  /**
   * Creates a new checkout session.
   */
  public async createSession(
    data: Partial<CheckoutSessionDocument>
  ): Promise<CheckoutSessionDocument> {
    return CheckoutSession.create(data);
  }

  /**
   * Updates an existing checkout session.
   */
  public async updateSession(
    sessionId: string,
    data: Partial<CheckoutSessionDocument>
  ): Promise<CheckoutSessionDocument | null> {
    return CheckoutSession.findOneAndUpdate({ sessionId }, { $set: data }, { new: true });
  }

  /**
   * Safely deletes a checkout session.
   */
  public async deleteSession(sessionId: string): Promise<boolean> {
    const result = await CheckoutSession.deleteOne({ sessionId });
    return result.deletedCount > 0;
  }
}

export const checkoutRepository = new CheckoutRepository();
