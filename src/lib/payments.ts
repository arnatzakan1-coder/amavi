import "server-only";
/**
 * Payment connection points.
 *
 * AMAVI never stores card data: online payments must go through the provider's hosted
 * payment page, and the result must come back through a signed webhook.
 *
 * Online providers (kaspi, halyk, card) stay DISABLED until a real integration is written
 * against the provider's official documentation and the merchant keys are set. Nothing here
 * simulates a successful payment.
 *
 * Manual methods do not move money on the site:
 *  - kaspi_invoice: after confirming the order a manager sends a Kaspi Pay invoice to the customer's phone;
 *  - boutique: the customer pays at pickup.
 * The admin marks these orders as paid.
 */

export type OrderForPayment = { id: string; number: string; totalKzt: number; email: string | null; phone: string };

export interface OnlineProvider {
  code: "kaspi" | "halyk" | "card";
  /** Required env variables (shown in the admin panel). */
  env: string[];
  /** True only when keys are present AND the integration is implemented. */
  isReady(): boolean;
  createPayment(order: OrderForPayment, returnUrl: string): Promise<{ redirectUrl: string; ref: string }>;
  verifyWebhook(req: Request): Promise<{ orderNumber: string; paid: boolean; ref: string }>;
}

export class PaymentNotConfigured extends Error {
  constructor(code: string) {
    super(`Payment provider "${code}" is not configured`);
  }
}

const hasEnv = (keys: string[]) => keys.every((k) => Boolean(process.env[k]));

function pendingProvider(code: OnlineProvider["code"], env: string[]): OnlineProvider {
  return {
    code,
    env,
    // Flip to `hasEnv(env)` once createPayment / verifyWebhook are implemented with the official API.
    isReady: () => false,
    async createPayment() {
      throw new PaymentNotConfigured(code);
    },
    async verifyWebhook() {
      throw new PaymentNotConfigured(code);
    },
  };
}

export const ONLINE_PROVIDERS: Record<OnlineProvider["code"], OnlineProvider> = {
  // Kaspi Pay online acquiring — requires a Kaspi merchant agreement (kaspi.kz/merchantcabinet).
  kaspi: pendingProvider("kaspi", ["KASPI_MERCHANT_ID", "KASPI_API_KEY", "KASPI_WEBHOOK_SECRET"]),
  // Halyk ePay — requires a Halyk Bank acquiring agreement (epayment.kz).
  halyk: pendingProvider("halyk", ["HALYK_EPAY_CLIENT_ID", "HALYK_EPAY_CLIENT_SECRET", "HALYK_EPAY_TERMINAL_ID"]),
  // Visa / Mastercard through a licensed Kazakhstan payment gateway of AMAVI's choice.
  card: pendingProvider("card", ["CARD_GATEWAY_PUBLIC_KEY", "CARD_GATEWAY_SECRET", "CARD_GATEWAY_WEBHOOK_SECRET"]),
};

export const MANUAL_METHODS = ["kaspi_invoice", "boutique"] as const;

export function isOnline(code: string): code is OnlineProvider["code"] {
  return code in ONLINE_PROVIDERS;
}

/** Whether a payment method can be used at checkout right now. */
export function paymentAvailable(code: string, active: boolean): boolean {
  if (!active) return false;
  if (isOnline(code)) return ONLINE_PROVIDERS[code].isReady();
  return (MANUAL_METHODS as readonly string[]).includes(code);
}

export function providerStatus() {
  return Object.values(ONLINE_PROVIDERS).map((p) => ({ code: p.code, env: p.env, keysPresent: hasEnv(p.env), ready: p.isReady() }));
}
