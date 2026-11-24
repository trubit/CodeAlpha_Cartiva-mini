/**
 * Cartiva Mini — Carrier Provider Factory
 * Resolves appropriate carrier provider instance while keeping external APIs isolated.
 */
import type { ICarrierProvider } from './carrier.interface.js';
import { ManualCarrierProvider } from './manual.carrier.js';

export class CarrierProviderFactory {
  private static providers: Map<string, ICarrierProvider> = new Map();

  static {
    // Register standard supported carriers with manual/in-house adapter
    this.register('cartiva in-house logistics', new ManualCarrierProvider('Cartiva In-House Logistics'));
    this.register('gig logistics', new ManualCarrierProvider('GIG Logistics'));
    this.register('dhl express', new ManualCarrierProvider('DHL Express'));
    this.register('fedex', new ManualCarrierProvider('FedEx'));
    this.register('standard courier', new ManualCarrierProvider('Standard Courier'));
  }

  public static register(name: string, provider: ICarrierProvider): void {
    this.providers.set(name.toLowerCase().trim(), provider);
  }

  public static getProvider(carrierName?: string): ICarrierProvider {
    if (!carrierName) {
      return this.providers.get('cartiva in-house logistics')!;
    }

    const normalized = carrierName.toLowerCase().trim();
    const existing = this.providers.get(normalized);
    if (existing) {
      return existing;
    }

    // Dynamic fallback for any custom named carrier (e.g. local dispatch partner)
    const dynamicProvider = new ManualCarrierProvider(carrierName.trim());
    this.providers.set(normalized, dynamicProvider);
    return dynamicProvider;
  }
}
