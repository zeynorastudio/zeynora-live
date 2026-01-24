/**
 * Order Confirmation Email Module
 * DEPRECATED: This file is kept for backward compatibility.
 * New code should import from @/lib/email/service instead.
 * 
 * This module now re-exports from the unified email service (Resend).
 */

// Re-export from the new unified email service
export { sendOrderConfirmationEmail } from "./service";
