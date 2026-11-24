/**
 * Cartiva Mini — Provider-Independent Carrier Interface
 * Standardizes carrier interactions and separates manual staff delivery operations
 * from automated third-party logistics integrations.
 */

export interface ICarrierTrackingUpdate {
  status: string;
  description: string;
  location?: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface ICarrierProvider {
  /**
   * Human-readable identifier for the carrier provider.
   */
  readonly providerName: string;

  /**
   * Indicates whether this carrier provider uses an automated external API
   * or relies on manual staff dispatch/tracking.
   */
  readonly isAutomated: boolean;

  /**
   * Validates tracking number format according to carrier specifications.
   */
  validateTrackingNumber(trackingNumber: string): boolean;

  /**
   * Generates a unique tracking number for a shipment reference.
   */
  generateTrackingNumber(shipmentReference: string): string;

  /**
   * Generates an external tracking URL for the customer where supported.
   */
  getTrackingUrl(trackingNumber: string): string | undefined;

  /**
   * Optional method to fetch live updates if an automated API integration exists.
   */
  fetchLiveTracking?(trackingNumber: string): Promise<ICarrierTrackingUpdate[]>;
}
