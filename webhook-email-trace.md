# Webhook Email Execution Trace

## Execution Flow

The webhook handler follows this execution path:

1. **[WEBHOOK_START]** - Event received at handler entry
2. **[WEBHOOK_VERIFIED]** - Razorpay signature verified successfully
3. **[WEBHOOK_EVENT_TYPE]** - Event type identified (e.g., "payment.captured")
4. **[WEBHOOK_PAYMENT_CAPTURED]** - Payment captured event detected
5. **[WEBHOOK_UPDATING_ORDER]** - Before updating order status to "paid"
6. **[WEBHOOK_ORDER_UPDATED]** - After order update attempt (includes success flag)
7. **[WEBHOOK_CALLING_EMAIL]** - Immediately before calling `sendOrderConfirmationEmail()`
8. **[WEBHOOK_EMAIL_RESULT]** - Result returned from `sendOrderConfirmationEmail()`

## Diagnostic Points

### Whether [WEBHOOK_CALLING_EMAIL] appears
- If this log appears: Email function is being invoked
- If this log does NOT appear: Execution exited early before reaching email step

### Whether result is returned
- **[WEBHOOK_EMAIL_RESULT]** will show `email_sent: true/false`
- This indicates whether `sendOrderConfirmationEmail()` completed execution

### If execution exits early, identify where

Early exit points (before email):

1. **Signature verification fails** - No [WEBHOOK_VERIFIED] log
2. **Invalid payload** - No [WEBHOOK_EVENT_TYPE] log
3. **Wrong event type** - [WEBHOOK_EVENT_TYPE] shows non-payment event
4. **Order already paid** - [WEBHOOK_ORDER_UPDATED] shows `update_succeeded: false`
5. **Order update fails** - Error logged before [WEBHOOK_ORDER_UPDATED]

## Expected Flow for Successful Email

```
[WEBHOOK_START] Event received
[WEBHOOK_VERIFIED]
[WEBHOOK_EVENT_TYPE] payment.captured
[WEBHOOK_PAYMENT_CAPTURED]
[WEBHOOK_UPDATING_ORDER] { order_id: "..." }
[WEBHOOK_ORDER_UPDATED] { order_id: "...", update_succeeded: true }
[POST_PAYMENT_START] Processing order: ...
[STOCK_DECREMENT_START] ...
[SHIPPING_COST_STORED] ...
[WEBHOOK_CALLING_EMAIL] { order_id: "..." }
[EMAIL_PAYLOAD] { ... }
[EMAIL_SUCCESS] { order_id: "...", email: "..." }
[WEBHOOK_EMAIL_RESULT] { order_id: "...", email_sent: true }
```

## Troubleshooting

- **Missing [WEBHOOK_CALLING_EMAIL]**: Check if order update succeeded or if execution exited earlier
- **Missing [WEBHOOK_EMAIL_RESULT]**: Email function threw an exception (check for [EMAIL_ERROR])
- **email_sent: false**: Check email service logs for [EMAIL_FAIL], [EMAIL_ABORT], or [EMAIL_ERROR] messages
