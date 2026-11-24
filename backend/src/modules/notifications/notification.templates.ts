import { NotificationType } from '@shared/enums.js';

/**
 * Escapes unsafe HTML characters to prevent XSS and template injection attacks.
 */
export function escapeHtml(str: string): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

export interface TemplateContext {
  recipientName?: string;
  orderNumber?: string;
  orderTotal?: string | number;
  items?: Array<{ title: string; quantity: number; price?: string | number }>;
  carrierName?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  paymentReference?: string;
  amount?: string | number;
  refundReference?: string;
  ticketNumber?: string;
  ticketSubject?: string;
  replyMessage?: string;
  productName?: string;
  currentStock?: number;
  actionUrl?: string;
  actionText?: string;
  headline?: string;
  message?: string;
  unsubscribeUrl?: string;
  otpCode?: string;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * Formats a master Cartiva Mini branded HTML email layout.
 */
export function buildMasterEmailTemplate(params: {
  title: string;
  headline: string;
  bodyHtml: string;
  ctaText?: string;
  ctaUrl?: string;
  footerNote?: string;
  unsubscribeUrl?: string;
}): string {
  const ctaButtonHtml =
    params.ctaText && params.ctaUrl
      ? `
      <div style="margin: 32px 0 24px; text-align: center;">
        <a href="${escapeHtml(params.ctaUrl)}" style="background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%); color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 15px; display: inline-block; box-shadow: 0 4px 10px rgba(15, 23, 42, 0.2); letter-spacing: 0.2px;">
          ${escapeHtml(params.ctaText)}
        </a>
      </div>
      `
      : '';

  const unsubscribeHtml = params.unsubscribeUrl
    ? `<p style="margin: 12px 0 0; font-size: 12px; color: #94a3b8;">
        You received this because you are opted in to promotional updates. 
        <a href="${escapeHtml(params.unsubscribeUrl)}" style="color: #64748b; text-decoration: underline;">Unsubscribe from marketing emails</a>
      </p>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(params.title)}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.08); border: 1px solid #e2e8f0;">
          <!-- Header -->
          <tr>
            <td style="background-color: #0f172a; padding: 28px 40px; text-align: center;">
              <span style="font-size: 24px; font-weight: 800; letter-spacing: 1.5px; color: #ffffff;">CARTIVA<span style="color: #f59e0b;">.</span>MINI</span>
              <p style="margin: 4px 0 0; font-size: 12px; color: #94a3b8; letter-spacing: 0.5px; text-transform: uppercase;">Everything You Need, Just a Click Away.</p>
            </td>
          </tr>
          <!-- Main Content -->
          <tr>
            <td style="padding: 36px 40px 28px;">
              <h1 style="margin: 0 0 16px; font-size: 22px; font-weight: 700; color: #0f172a; line-height: 1.35;">${escapeHtml(params.headline)}</h1>
              <div style="font-size: 15px; line-height: 1.65; color: #334155;">
                ${params.bodyHtml}
              </div>
              ${ctaButtonHtml}
              ${
                params.footerNote
                  ? `<p style="margin: 28px 0 0; font-size: 13px; color: #64748b; line-height: 1.5; border-top: 1px solid #f1f5f9; padding-top: 18px;">${params.footerNote}</p>`
                  : ''
              }
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 24px 40px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; line-height: 1.6;">
              <p style="margin: 0 0 6px; font-weight: 500; color: #64748b;">Cartiva Mini &bull; Secured E-Commerce Platform</p>
              <p style="margin: 0;">&copy; ${new Date().getFullYear()} Cartiva Mini. All rights reserved.</p>
              ${unsubscribeHtml}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Registry of notification email templates mapped to NotificationType.
 */
export const notificationTemplates: Record<
  NotificationType,
  (ctx: TemplateContext) => RenderedEmail
> = {
  [NotificationType.ACCOUNT_WELCOME]: (ctx) => {
    const name = ctx.recipientName || 'Valued Customer';
    const subject = 'Welcome to Cartiva Mini!';
    const headline = `Welcome to Cartiva Mini, ${escapeHtml(name)}!`;
    const bodyHtml = `
      <p>We are delighted to welcome you to <strong>Cartiva Mini</strong> — your destination for quality products, fast fulfillment, and dependable customer service.</p>
      <p>Your account is ready. Explore our curated catalog, save your favorite items to your wishlist, and enjoy seamless checkout with secure payment protection.</p>
    `;
    const text = `Welcome to Cartiva Mini, ${name}!\n\nYour account is now active. Explore our catalog: ${ctx.actionUrl || 'http://localhost:5180'}\n\nThank you for choosing Cartiva Mini.`;
    const html = buildMasterEmailTemplate({
      title: subject,
      headline,
      bodyHtml,
      ctaText: 'Explore Catalog',
      ctaUrl: ctx.actionUrl || 'http://localhost:5180/shop',
      footerNote: 'Need help? Contact our support desk at any time through your account portal.',
    });
    return { subject, html, text };
  },

  [NotificationType.EMAIL_VERIFICATION]: (ctx) => {
    const name = ctx.recipientName || 'Valued Customer';
    const subject = 'Cartiva Mini — Your Verification Code';
    const headline = 'Verify Your Email Address';
    const meta = (ctx.metadata || {}) as Record<string, unknown>;
    const otpCode = String(ctx.otpCode || meta['otpCode'] || meta['otp'] || '******');
    const bodyHtml = `
      <p>Hello ${escapeHtml(name)},</p>
      <p>Thank you for registering with Cartiva Mini. Please use your 6-digit verification code below to verify your email address:</p>
      <div style="margin: 28px 0; text-align: center;">
        <div style="display: inline-block; background-color: #101D3B; color: #FFFFFF; font-size: 32px; font-weight: 800; letter-spacing: 8px; padding: 16px 36px; border-radius: 12px; font-family: 'Courier New', Courier, monospace;">
          ${escapeHtml(otpCode)}
        </div>
      </div>
      <p style="font-size: 13px; color: #64748B;">Enter this 6-digit code on the Cartiva Mini verification page. Never share this code with anyone.</p>
    `;
    const text = `Hello ${name},\n\nYour Cartiva Mini verification code is: ${otpCode}\n\nEnter this 6-digit code on the verification page. This code is valid for 30 minutes.\n\n— Cartiva Mini Team`;
    const html = buildMasterEmailTemplate({
      title: subject,
      headline,
      bodyHtml,
      footerNote: 'This verification code is valid for 30 minutes. If you did not create an account, please ignore this email.',
    });
    return { subject, html, text };
  },

  [NotificationType.PASSWORD_RESET]: (ctx) => {
    const name = ctx.recipientName || 'Valued Customer';
    const subject = 'Cartiva Mini — Password Reset Request';
    const headline = 'Reset Your Password';
    const bodyHtml = `
      <p>Hello ${escapeHtml(name)},</p>
      <p>We received a request to reset the password for your Cartiva Mini account.</p>
      <p>Click the button below to choose a new password. For security, this link is valid for 1 hour.</p>
    `;
    const text = `Hello ${name},\n\nWe received a password reset request. Reset link: ${ctx.actionUrl}\n\nValid for 1 hour. If you did not request this, your account is secure and no action is required.`;
    const html = buildMasterEmailTemplate({
      title: subject,
      headline,
      bodyHtml,
      ctaText: 'Reset Password',
      ctaUrl: ctx.actionUrl,
      footerNote: 'If you did not request a password reset, you can safely ignore this message.',
    });
    return { subject, html, text };
  },

  [NotificationType.PASSWORD_CHANGED]: (ctx) => {
    const name = ctx.recipientName || 'Valued Customer';
    const subject = 'Security Alert: Password Changed';
    const headline = 'Your Password Was Changed';
    const bodyHtml = `
      <p>Hello ${escapeHtml(name)},</p>
      <p>The password for your Cartiva Mini account was recently changed.</p>
      <p>All active sessions on other devices have been automatically logged out for your security.</p>
    `;
    const text = `Hello ${name},\n\nYour Cartiva Mini password was recently updated. All existing sessions were invalidated.\n\nIf you did not make this change, please contact support immediately.`;
    const html = buildMasterEmailTemplate({
      title: subject,
      headline,
      bodyHtml,
      ctaText: 'Review Account Security',
      ctaUrl: ctx.actionUrl || 'http://localhost:5180/account/profile',
      footerNote: 'If you did not make this change, please contact Cartiva Mini support immediately.',
    });
    return { subject, html, text };
  },

  [NotificationType.SECURITY_ALERT]: (ctx) => {
    const name = ctx.recipientName || 'Valued Customer';
    const subject = 'Important Account Security Alert';
    const headline = 'Security Alert on Your Account';
    const bodyHtml = `
      <p>Hello ${escapeHtml(name)},</p>
      <p>${escapeHtml(ctx.message || 'An important security event was detected on your account.')}</p>
    `;
    const text = `Hello ${name},\n\nSecurity Alert: ${ctx.message}\n\nPlease review your account: ${ctx.actionUrl || 'http://localhost:5180/account/profile'}`;
    const html = buildMasterEmailTemplate({
      title: subject,
      headline,
      bodyHtml,
      ctaText: 'Check Account Security',
      ctaUrl: ctx.actionUrl || 'http://localhost:5180/account/profile',
      footerNote: 'Your account safety is our priority.',
    });
    return { subject, html, text };
  },

  [NotificationType.ORDER_CONFIRMED]: (ctx) => {
    const orderNo = ctx.orderNumber || 'N/A';
    const total = ctx.orderTotal ? `₦${Number(ctx.orderTotal).toLocaleString()}` : '';
    const subject = `Order Confirmed — #${orderNo}`;
    const headline = `Thank You for Your Order!`;
    const bodyHtml = `
      <p>Hello ${escapeHtml(ctx.recipientName || 'Valued Customer')},</p>
      <p>We have received and confirmed your order <strong>#${escapeHtml(orderNo)}</strong>.</p>
      ${total ? `<p style="font-size: 16px; font-weight: 700; color: #0f172a;">Total: ${total}</p>` : ''}
      <p>Our fulfillment team is preparing your package for shipment. You will receive updates as your order progresses.</p>
    `;
    const text = `Order #${orderNo} confirmed. Total: ${total}. Track your order: ${ctx.actionUrl || 'http://localhost:5180/account/orders'}`;
    const html = buildMasterEmailTemplate({
      title: subject,
      headline,
      bodyHtml,
      ctaText: 'View Order Details',
      ctaUrl: ctx.actionUrl || `http://localhost:5180/account/orders`,
      footerNote: 'You can track shipment progress and view invoices in your order history.',
    });
    return { subject, html, text };
  },

  [NotificationType.ORDER_STATUS]: (ctx) => {
    const orderNo = ctx.orderNumber || 'N/A';
    const subject = `Update on Order #${orderNo}`;
    const headline = `Order Status Update: #${escapeHtml(orderNo)}`;
    const bodyHtml = `
      <p>Hello ${escapeHtml(ctx.recipientName || 'Valued Customer')},</p>
      <p>${escapeHtml(ctx.message || 'Your order status has been updated.')}</p>
    `;
    const text = `Order #${orderNo} status update: ${ctx.message}. View: ${ctx.actionUrl}`;
    const html = buildMasterEmailTemplate({
      title: subject,
      headline,
      bodyHtml,
      ctaText: 'View Order',
      ctaUrl: ctx.actionUrl,
    });
    return { subject, html, text };
  },

  [NotificationType.ORDER_PROCESSING]: (ctx) => {
    const orderNo = ctx.orderNumber || 'N/A';
    const subject = `Order #${orderNo} Is Being Processed`;
    const headline = `Order Processing: #${escapeHtml(orderNo)}`;
    const bodyHtml = `
      <p>Hello ${escapeHtml(ctx.recipientName || 'Valued Customer')},</p>
      <p>Great news! Your order <strong>#${escapeHtml(orderNo)}</strong> is now being packed and prepared for dispatch by our fulfillment center.</p>
    `;
    const text = `Your order #${orderNo} is being processed and packed. Track at: ${ctx.actionUrl}`;
    const html = buildMasterEmailTemplate({
      title: subject,
      headline,
      bodyHtml,
      ctaText: 'Track Order',
      ctaUrl: ctx.actionUrl,
    });
    return { subject, html, text };
  },

  [NotificationType.ORDER_DISPATCHED]: (ctx) => {
    const orderNo = ctx.orderNumber || 'N/A';
    const carrier = ctx.carrierName || 'Express Courier';
    const tracking = ctx.trackingNumber ? `Tracking Number: <strong>${escapeHtml(ctx.trackingNumber)}</strong>` : '';
    const subject = `Your Order #${orderNo} Has Been Dispatched!`;
    const headline = `Order #${escapeHtml(orderNo)} Is on Its Way!`;
    const bodyHtml = `
      <p>Hello ${escapeHtml(ctx.recipientName || 'Valued Customer')},</p>
      <p>Your package has left our fulfillment facility via <strong>${escapeHtml(carrier)}</strong>.</p>
      ${tracking ? `<p style="background: #f8fafc; padding: 12px 16px; border-radius: 6px; border: 1px solid #e2e8f0;">${tracking}</p>` : ''}
      <p>You can follow the real-time shipment journey using the tracking link below.</p>
    `;
    const text = `Order #${orderNo} dispatched via ${carrier}. Tracking: ${ctx.trackingNumber || 'Available in account'}. Link: ${ctx.actionUrl}`;
    const html = buildMasterEmailTemplate({
      title: subject,
      headline,
      bodyHtml,
      ctaText: 'Track Shipment',
      ctaUrl: ctx.actionUrl || ctx.trackingUrl,
      footerNote: 'Delivery times may vary slightly based on carrier logistics and destination state.',
    });
    return { subject, html, text };
  },

  [NotificationType.DELIVERY_UPDATE]: (ctx) => {
    const orderNo = ctx.orderNumber || 'N/A';
    const subject = `Delivery Update for Order #${orderNo}`;
    const headline = `Delivery Update: #${escapeHtml(orderNo)}`;
    const bodyHtml = `
      <p>Hello ${escapeHtml(ctx.recipientName || 'Valued Customer')},</p>
      <p>${escapeHtml(ctx.message || 'There is a new update regarding your shipment.')}</p>
    `;
    const text = `Delivery update for #${orderNo}: ${ctx.message}. Track: ${ctx.actionUrl}`;
    const html = buildMasterEmailTemplate({
      title: subject,
      headline,
      bodyHtml,
      ctaText: 'View Shipment Tracking',
      ctaUrl: ctx.actionUrl,
    });
    return { subject, html, text };
  },

  [NotificationType.DELIVERY_COMPLETED]: (ctx) => {
    const orderNo = ctx.orderNumber || 'N/A';
    const subject = `Delivered — Order #${orderNo}`;
    const headline = `Your Order Has Been Delivered!`;
    const bodyHtml = `
      <p>Hello ${escapeHtml(ctx.recipientName || 'Valued Customer')},</p>
      <p>Your order <strong>#${escapeHtml(orderNo)}</strong> has been successfully delivered.</p>
      <p>We hope you love your purchase! If you have any feedback or need assistance, please feel free to leave a product review or contact our support team.</p>
    `;
    const text = `Order #${orderNo} has been delivered. Thank you for shopping with Cartiva Mini!`;
    const html = buildMasterEmailTemplate({
      title: subject,
      headline,
      bodyHtml,
      ctaText: 'View Order & Leave Review',
      ctaUrl: ctx.actionUrl || `http://localhost:5180/account/orders`,
      footerNote: 'Thank you for choosing Cartiva Mini. Everything You Need, Just a Click Away.',
    });
    return { subject, html, text };
  },

  [NotificationType.ORDER_CANCELLED]: (ctx) => {
    const orderNo = ctx.orderNumber || 'N/A';
    const subject = `Order #${orderNo} Cancelled`;
    const headline = `Order #${escapeHtml(orderNo)} Has Been Cancelled`;
    const bodyHtml = `
      <p>Hello ${escapeHtml(ctx.recipientName || 'Valued Customer')},</p>
      <p>Your order <strong>#${escapeHtml(orderNo)}</strong> has been cancelled.</p>
      <p>${escapeHtml(ctx.message || 'Any reserved items have been returned to inventory.')}</p>
    `;
    const text = `Order #${orderNo} was cancelled. ${ctx.message}`;
    const html = buildMasterEmailTemplate({
      title: subject,
      headline,
      bodyHtml,
      ctaText: 'View Orders',
      ctaUrl: ctx.actionUrl || 'http://localhost:5180/account/orders',
    });
    return { subject, html, text };
  },

  [NotificationType.PAYMENT_SUCCESS]: (ctx) => {
    const orderNo = ctx.orderNumber || 'N/A';
    const amount = ctx.amount ? `₦${Number(ctx.amount).toLocaleString()}` : '';
    const ref = ctx.paymentReference || 'N/A';
    const subject = `Payment Successful — Order #${orderNo}`;
    const headline = `Payment Received & Verified`;
    const bodyHtml = `
      <p>Hello ${escapeHtml(ctx.recipientName || 'Valued Customer')},</p>
      <p>We have successfully verified your payment for order <strong>#${escapeHtml(orderNo)}</strong>.</p>
      <table style="width: 100%; margin: 16px 0; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px 16px;">
        <tr><td style="color: #64748b; font-size: 14px;">Amount Paid:</td><td style="font-weight: 700; color: #0f172a; font-size: 14px; text-align: right;">${amount}</td></tr>
        <tr><td style="color: #64748b; font-size: 14px;">Transaction Reference:</td><td style="font-family: monospace; color: #0f172a; font-size: 13px; text-align: right;">${escapeHtml(ref)}</td></tr>
      </table>
      <p>Your order is now confirmed and will begin fulfillment shortly.</p>
    `;
    const text = `Payment verified for Order #${orderNo}. Amount: ${amount}. Ref: ${ref}.`;
    const html = buildMasterEmailTemplate({
      title: subject,
      headline,
      bodyHtml,
      ctaText: 'View Order Details',
      ctaUrl: ctx.actionUrl || 'http://localhost:5180/account/orders',
      footerNote: 'This transaction was verified through secure Paystack payment processing.',
    });
    return { subject, html, text };
  },

  [NotificationType.PAYMENT_FAILED]: (ctx) => {
    const orderNo = ctx.orderNumber || 'N/A';
    const subject = `Payment Failed — Order #${orderNo}`;
    const headline = `Payment Could Not Be Completed`;
    const bodyHtml = `
      <p>Hello ${escapeHtml(ctx.recipientName || 'Valued Customer')},</p>
      <p>We were unable to complete payment verification for order <strong>#${escapeHtml(orderNo)}</strong>.</p>
      <p style="color: #dc2626;">${escapeHtml(ctx.message || 'The payment transaction was declined or interrupted.')}</p>
      <p>Your order reservation is temporarily held. You can retry payment by clicking the button below.</p>
    `;
    const text = `Payment failed for order #${orderNo}. Retry payment at: ${ctx.actionUrl}`;
    const html = buildMasterEmailTemplate({
      title: subject,
      headline,
      bodyHtml,
      ctaText: 'Retry Payment Now',
      ctaUrl: ctx.actionUrl,
      footerNote: 'If you believe this is an error or were debited by your bank, please reach out to our support team.',
    });
    return { subject, html, text };
  },

  [NotificationType.REFUND_UPDATE]: (ctx) => {
    const orderNo = ctx.orderNumber || 'N/A';
    const refundRef = ctx.refundReference || 'N/A';
    const amount = ctx.amount ? `₦${Number(ctx.amount).toLocaleString()}` : '';
    const subject = `Refund Processed — Order #${orderNo}`;
    const headline = `Refund Processed`;
    const bodyHtml = `
      <p>Hello ${escapeHtml(ctx.recipientName || 'Valued Customer')},</p>
      <p>A refund has been processed for order <strong>#${escapeHtml(orderNo)}</strong>.</p>
      <table style="width: 100%; margin: 16px 0; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px 16px;">
        <tr><td style="color: #64748b; font-size: 14px;">Refund Amount:</td><td style="font-weight: 700; color: #0f172a; font-size: 14px; text-align: right;">${amount}</td></tr>
        <tr><td style="color: #64748b; font-size: 14px;">Refund Reference:</td><td style="font-family: monospace; color: #0f172a; font-size: 13px; text-align: right;">${escapeHtml(refundRef)}</td></tr>
      </table>
      <p>${escapeHtml(ctx.message || 'The funds have been credited to your original payment method. Depending on your financial institution, this may take 3-7 business days.')}</p>
    `;
    const text = `Refund processed for order #${orderNo}. Amount: ${amount}. Ref: ${refundRef}.`;
    const html = buildMasterEmailTemplate({
      title: subject,
      headline,
      bodyHtml,
      ctaText: 'View Order Status',
      ctaUrl: ctx.actionUrl || 'http://localhost:5180/account/orders',
    });
    return { subject, html, text };
  },

  [NotificationType.SUPPORT_RESPONSE]: (ctx) => {
    const ticketNo = ctx.ticketNumber || 'N/A';
    const subject = `New Reply on Support Ticket #${ticketNo}`;
    const headline = `Support Team Replied`;
    const bodyHtml = `
      <p>Hello ${escapeHtml(ctx.recipientName || 'Valued Customer')},</p>
      <p>Our customer support team has responded to your ticket <strong>#${escapeHtml(ticketNo)}</strong> (${escapeHtml(ctx.ticketSubject || 'Inquiry')}).</p>
      <div style="background: #f8fafc; border-left: 4px solid #1e40af; padding: 14px 18px; margin: 18px 0; border-radius: 0 6px 6px 0;">
        <p style="margin: 0; font-style: italic; color: #334155;">"${escapeHtml(ctx.replyMessage || 'Please review our response in your account ticket center.')}"</p>
      </div>
      <p>Click below to read the full conversation or add a follow-up reply.</p>
    `;
    const text = `Support reply on ticket #${ticketNo}: ${ctx.replyMessage}\n\nView and reply: ${ctx.actionUrl}`;
    const html = buildMasterEmailTemplate({
      title: subject,
      headline,
      bodyHtml,
      ctaText: 'View Ticket Response',
      ctaUrl: ctx.actionUrl,
      footerNote: 'Please do not reply directly to this automated email. Use the support ticket portal.',
    });
    return { subject, html, text };
  },

  [NotificationType.LOW_STOCK]: (ctx) => {
    const product = ctx.productName || 'Product';
    const count = ctx.currentStock !== undefined ? ctx.currentStock : 0;
    const subject = `[Admin Alert] Low Stock: ${product}`;
    const headline = `Inventory Alert: Low Stock`;
    const bodyHtml = `
      <p>Administrative Alert:</p>
      <p>Product <strong>${escapeHtml(product)}</strong> has fallen to <strong>${count}</strong> units remaining in stock.</p>
      <p>Please review current inventory levels and initiate purchase orders or restock replenishment.</p>
    `;
    const text = `[Admin Alert] Product "${product}" has low stock (${count} units remaining). Manage: ${ctx.actionUrl}`;
    const html = buildMasterEmailTemplate({
      title: subject,
      headline,
      bodyHtml,
      ctaText: 'Manage Inventory',
      ctaUrl: ctx.actionUrl || 'http://localhost:5180/admin/inventory',
      footerNote: 'This is an internal administrative notification sent to authorized inventory managers.',
    });
    return { subject, html, text };
  },

  [NotificationType.OUT_OF_STOCK]: (ctx) => {
    const product = ctx.productName || 'Product';
    const subject = `[Admin Alert] OUT OF STOCK: ${product}`;
    const headline = `Inventory Alert: Stock Depleted`;
    const bodyHtml = `
      <p>Urgent Administrative Alert:</p>
      <p>Product <strong>${escapeHtml(product)}</strong> is now completely out of stock (0 units).</p>
      <p>Customer checkout for this SKU will be blocked until inventory is replenished.</p>
    `;
    const text = `[Admin Alert] Product "${product}" is OUT OF STOCK. Manage: ${ctx.actionUrl}`;
    const html = buildMasterEmailTemplate({
      title: subject,
      headline,
      bodyHtml,
      ctaText: 'Restock SKU',
      ctaUrl: ctx.actionUrl || 'http://localhost:5180/admin/inventory',
      footerNote: 'Authorized administrative alert.',
    });
    return { subject, html, text };
  },

  [NotificationType.PROMOTION]: (ctx) => {
    const subject = ctx.headline || 'Special Offer from Cartiva Mini!';
    const headline = ctx.headline || 'Curated Offer for You';
    const bodyHtml = `
      <p>Hello ${escapeHtml(ctx.recipientName || 'Valued Customer')},</p>
      <p>${escapeHtml(ctx.message || 'Explore our latest seasonal collections and featured arrivals.')}</p>
    `;
    const text = `${headline}\n\n${ctx.message}\n\nShop now: ${ctx.actionUrl || 'http://localhost:5180'}`;
    const html = buildMasterEmailTemplate({
      title: subject,
      headline,
      bodyHtml,
      ctaText: ctx.actionText || 'Shop Now',
      ctaUrl: ctx.actionUrl || 'http://localhost:5180/shop',
      unsubscribeUrl: ctx.unsubscribeUrl || 'http://localhost:5180/account/notifications/preferences',
    });
    return { subject, html, text };
  },

  [NotificationType.SYSTEM_ALERT]: (ctx) => {
    const subject = ctx.headline || 'Cartiva Mini System Notice';
    const headline = ctx.headline || 'System Notification';
    const bodyHtml = `
      <p>${escapeHtml(ctx.message || 'Important system update regarding your Cartiva Mini platform.')}</p>
    `;
    const text = `${headline}: ${ctx.message}`;
    const html = buildMasterEmailTemplate({
      title: subject,
      headline,
      bodyHtml,
      ctaText: ctx.actionText || 'Visit Platform',
      ctaUrl: ctx.actionUrl || 'http://localhost:5180',
    });
    return { subject, html, text };
  },
};

/**
 * Renders an email for a given NotificationType.
 */
export function renderEmailTemplate(type: NotificationType, context: TemplateContext): RenderedEmail {
  const renderer = notificationTemplates[type];
  if (!renderer) {
    // Fallback to system alert template if unknown
    return notificationTemplates[NotificationType.SYSTEM_ALERT](context);
  }
  return renderer(context);
}
