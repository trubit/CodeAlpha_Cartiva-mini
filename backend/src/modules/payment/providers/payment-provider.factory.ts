/**
 * Cartiva Mini — Payment Provider Factory
 * Dynamically resolves payment gateway provider instances, enabling multi-gateway extensibility.
 */
import type { IPaymentProvider } from './payment-provider.interface.js';
import { PaystackProvider } from './paystack.provider.js';
import { AppError } from '../../../utils/AppError.js';
import { ErrorCodes } from '../../../constants/errorCodes.js';

class PaymentProviderFactory {
  private readonly providers: Map<string, IPaymentProvider> = new Map();

  constructor() {
    // Register default primary gateway: Paystack
    const paystack = new PaystackProvider();
    this.providers.set(paystack.providerName, paystack);
  }

  /**
   * Retrieves registered payment provider by identifier.
   */
  public getProvider(gatewayName = 'paystack'): IPaymentProvider {
    const provider = this.providers.get(gatewayName.toLowerCase());
    if (!provider) {
      throw new AppError(
        `Payment gateway '${gatewayName}' is not supported or configured.`,
        400,
        ErrorCodes.BAD_REQUEST
      );
    }
    return provider;
  }

  /**
   * Registers a new provider adapter (for future gateway expansion without rewriting core).
   */
  public registerProvider(provider: IPaymentProvider): void {
    this.providers.set(provider.providerName.toLowerCase(), provider);
  }
}

export const paymentProviderFactory = new PaymentProviderFactory();
