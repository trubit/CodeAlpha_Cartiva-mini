/**
 * Cartiva Mini — Manual / In-House Carrier Adapter
 * Standard default carrier handler for internal logistics and staff-driven delivery operations.
 */
import type { ICarrierProvider } from './carrier.interface.js';

export class ManualCarrierProvider implements ICarrierProvider {
  public readonly providerName: string;
  public readonly isAutomated = false;

  constructor(providerName = 'Cartiva In-House Logistics') {
    this.providerName = providerName;
  }

  public validateTrackingNumber(trackingNumber: string): boolean {
    if (!trackingNumber || typeof trackingNumber !== 'string') return false;
    // Standard alphanumeric tracking identifier between 6 and 32 characters
    const cleaned = trackingNumber.trim();
    return cleaned.length >= 6 && cleaned.length <= 32;
  }

  public generateTrackingNumber(shipmentReference: string): string {
    const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
    const cleanRef = shipmentReference.replace(/^SHP-/, '').replace(/[^A-Z0-9]/gi, '');
    return `CRTV-${cleanRef}-${randomSuffix}`;
  }

  public getTrackingUrl(_trackingNumber: string): string | undefined {
    // Manual/in-house logistics uses internal Cartiva Mini tracking view
    return undefined;
  }
}
