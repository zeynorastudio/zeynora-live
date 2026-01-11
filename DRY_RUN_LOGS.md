# Dry-Run Logs for Customer Authentication Flow

## Signup Flow Simulation

### Input:
- Email: `customer@example.com`
- Password: `password123`
- First Name: `John`
- Last Name: `Doe`
- Phone: `+919876543210` (optional)

### Steps:

1. **Validation**
   - ✅ Email format valid
   - ✅ Password length >= 8 characters
   - ✅ First name and last name provided
   - ✅ Phone format valid (if provided): `+919876543210`

2. **Admin Email Check**
   - Query: `SELECT id, email, role FROM users WHERE email = 'customer@example.com' AND role IN ('super_admin', 'admin', 'staff')`
   - Result: No admin found
   - ✅ Proceed with signup

3. **Create Supabase Auth User**
   - Action: `supabase.auth.signUp({ email: 'customer@example.com', password: 'password123' })`
   - Result: Auth user created with `auth_uid = 'abc-123-def'`

4. **Map to Customers Table**
   - Check: `SELECT * FROM customers WHERE auth_uid = 'abc-123-def'`
   - Result: No existing customer
   - Check: `SELECT * FROM customers WHERE email = 'customer@example.com' AND auth_uid IS NULL`
   - Result: No existing customer with email
   - Action: `INSERT INTO customers (auth_uid, email, first_name, last_name, phone) VALUES (...)`
   - Result: Customer created with `customer_id = 'xyz-789-uvw'`

5. **Merge Guest Data**
   - Check: Cookie `z_session = 'guest-session-123'`
   - Find guest cart: `SELECT id FROM carts WHERE session_id = 'guest-session-123'`
   - Find customer cart: `SELECT id FROM carts WHERE user_id = (SELECT id FROM users WHERE auth_uid = 'abc-123-def')`
   - Merge cart items (deduplicate by SKU, sum quantities)
   - Clear guest cookie

6. **Redirect**
   - Redirect to `/account` or previous intended page

### Output:
- ✅ Customer account created
- ✅ Auth user linked to customer
- ✅ Guest cart merged
- ✅ Redirect to `/account`

---

## Login Flow Simulation

### Input:
- Email: `customer@example.com`
- Password: `password123`

### Steps:

1. **Authenticate**
   - Action: `supabase.auth.signInWithPassword({ email: 'customer@example.com', password: 'password123' })`
   - Result: Auth successful, `auth_uid = 'abc-123-def'`

2. **Find Customer**
   - Check: `SELECT * FROM customers WHERE auth_uid = 'abc-123-def'`
   - Result: Customer found with `customer_id = 'xyz-789-uvw'`
   - ✅ Customer exists, proceed

3. **Merge Guest Data**
   - Check: Cookie `z_session = 'guest-session-456'`
   - Find guest cart: `SELECT id FROM carts WHERE session_id = 'guest-session-456'`
   - Find customer cart: `SELECT id FROM carts WHERE user_id = (SELECT id FROM users WHERE auth_uid = 'abc-123-def')`
   - Merge cart items
   - Clear guest cookie

4. **Redirect**
   - Redirect to `/account` or previous intended page

### Output:
- ✅ Customer logged in
- ✅ Guest cart merged
- ✅ Redirect to `/account`

---

## Login Flow - New Customer (No Customer Record)

### Input:
- Email: `newcustomer@example.com`
- Password: `password123`

### Steps:

1. **Authenticate**
   - Action: `supabase.auth.signInWithPassword({ email: 'newcustomer@example.com', password: 'password123' })`
   - Result: Auth successful, `auth_uid = 'new-123-abc'`

2. **Find Customer**
   - Check: `SELECT * FROM customers WHERE auth_uid = 'new-123-abc'`
   - Result: No customer found
   - Check: `SELECT id, email, role FROM users WHERE email = 'newcustomer@example.com' AND role IN ('super_admin', 'admin', 'staff')`
   - Result: No admin found
   - Action: `INSERT INTO customers (auth_uid, email, first_name, last_name) VALUES ('new-123-abc', 'newcustomer@example.com', '', '')`
   - Result: Customer created with minimal data

3. **Merge Guest Data**
   - (Same as above)

4. **Redirect**
   - Redirect to `/account`

### Output:
- ✅ Customer record created automatically
- ✅ Guest cart merged
- ✅ Redirect to `/account`

---

## Login Flow - Admin Email Collision

### Input:
- Email: `admin@example.com`
- Password: `adminpassword`

### Steps:

1. **Authenticate**
   - Action: `supabase.auth.signInWithPassword({ email: 'admin@example.com', password: 'adminpassword' })`
   - Result: Auth successful, `auth_uid = 'admin-123-xyz'`

2. **Find Customer**
   - Check: `SELECT * FROM customers WHERE auth_uid = 'admin-123-xyz'`
   - Result: No customer found
   - Check: `SELECT id, email, role FROM users WHERE email = 'admin@example.com' AND role IN ('super_admin', 'admin', 'staff')`
   - Result: Admin user found with `role = 'admin'`

3. **Error Response**
   - Return error: "This email is reserved for admin accounts. Please use the admin portal to sign in."
   - ❌ Do NOT create customer record

### Output:
- ❌ Login blocked
- ❌ Error message displayed
- ❌ No customer record created

---

## Guest Merge Simulation

### Input:
- Customer ID: `xyz-789-uvw`
- Guest Session ID: `guest-session-123`

### Steps:

1. **Find Guest Cart**
   - Query: `SELECT id FROM carts WHERE session_id = 'guest-session-123'`
   - Result: Cart found with `cart_id = 'cart-guest-123'`
   - Query: `SELECT product_variant_id, quantity, price_snapshot FROM cart_items WHERE cart_id = 'cart-guest-123'`
   - Result: 3 items found

2. **Find Customer Cart**
   - Get customer auth_uid: `SELECT auth_uid FROM customers WHERE id = 'xyz-789-uvw'`
   - Get user_id: `SELECT id FROM users WHERE auth_uid = 'customer-auth-uid'`
   - Query: `SELECT id FROM carts WHERE user_id = 'user-id-123'`
   - Result: Cart found with `cart_id = 'cart-customer-456'`

3. **Merge Items**
   - Get existing customer cart items
   - Deduplicate by `product_variant_id`
   - Sum quantities for matching items
   - Insert merged items into customer cart
   - Delete guest cart items
   - Delete guest cart

4. **Clear Guest Cookie**
   - Delete `z_session` cookie

### Output:
- ✅ Guest cart items merged into customer cart
- ✅ Duplicate items combined (quantities summed)
- ✅ Guest cart deleted
- ✅ Guest cookie cleared

---

## Address Management - Max 3 Enforcement

### Scenario: Adding 4th Address

### Steps:

1. **Count Existing Addresses**
   - Get customer_id from auth session
   - Get user_id: `SELECT id FROM users WHERE auth_uid = (SELECT auth_uid FROM customers WHERE id = 'customer-id')`
   - Query: `SELECT COUNT(*) FROM addresses WHERE user_id = 'user-id'`
   - Result: 3 addresses found

2. **Attempt to Create 4th Address**
   - Validation: `currentCount (3) >= MAX_ADDRESSES (3)`
   - ❌ Return error: "Maximum 3 addresses allowed. Please delete an existing address first."

### Output:
- ❌ Address creation blocked
- ✅ Error message returned

---

## Address Management - Set Default

### Steps:

1. **Set Address as Default**
   - Action: `UPDATE addresses SET is_default = false WHERE user_id = 'user-id' AND id != 'address-id'`
   - Action: `UPDATE addresses SET is_default = true WHERE id = 'address-id'`

### Output:
- ✅ Other addresses unset as default
- ✅ Selected address set as default

---

## Address Management - Delete Default Address

### Steps:

1. **Delete Default Address**
   - Action: `DELETE FROM addresses WHERE id = 'default-address-id'`
   - Check: `SELECT id FROM addresses WHERE user_id = 'user-id' ORDER BY created_at ASC LIMIT 1`
   - Result: Earliest address found
   - Action: `UPDATE addresses SET is_default = true WHERE id = 'earliest-address-id'`

### Output:
- ✅ Default address deleted
- ✅ Earliest address promoted to default

---

## Test Instructions

### Local Testing

1. **Start Development Server**
   ```bash
   npm run dev
   ```

2. **Test Signup**
   ```bash
   curl -X POST http://localhost:3000/signup \
     -H "Content-Type: application/json" \
     -d '{
       "first_name": "John",
       "last_name": "Doe",
       "email": "test@example.com",
       "password": "password123",
       "confirm_password": "password123",
       "phone": "+919876543210"
     }'
   ```

3. **Test Login**
   ```bash
   curl -X POST http://localhost:3000/login \
     -H "Content-Type: application/json" \
     -d '{
       "email": "test@example.com",
       "password": "password123"
     }'
   ```

### Playwright Test Snippet

```typescript
import { test, expect } from '@playwright/test';

test('Customer signup flow', async ({ page }) => {
  // Navigate to signup page
  await page.goto('/signup');
  
  // Fill form
  await page.fill('input[name="first_name"]', 'John');
  await page.fill('input[name="last_name"]', 'Doe');
  await page.fill('input[name="email"]', 'test@example.com');
  await page.fill('input[name="password"]', 'password123');
  await page.fill('input[name="confirm_password"]', 'password123');
  await page.fill('input[name="phone"]', '+919876543210');
  
  // Submit
  await page.click('button[type="submit"]');
  
  // Wait for redirect
  await page.waitForURL('/account');
  
  // Verify redirect
  expect(page.url()).toContain('/account');
});

test('Customer login flow', async ({ page }) => {
  // Navigate to login page
  await page.goto('/login');
  
  // Fill form
  await page.fill('input[name="email"]', 'test@example.com');
  await page.fill('input[name="password"]', 'password123');
  
  // Submit
  await page.click('button[type="submit"]');
  
  // Wait for redirect
  await page.waitForURL('/account');
  
  // Verify redirect
  expect(page.url()).toContain('/account');
});

test('Max 3 addresses enforcement', async ({ page }) => {
  // Login first
  await page.goto('/login');
  await page.fill('input[name="email"]', 'test@example.com');
  await page.fill('input[name="password"]', 'password123');
  await page.click('button[type="submit"]');
  await page.waitForURL('/account');
  
  // Navigate to addresses
  await page.goto('/account/addresses');
  
  // Add 3 addresses (assuming none exist)
  for (let i = 1; i <= 3; i++) {
    await page.click('text=Add New Address');
    await page.fill('input[name="full_name"]', `Recipient ${i}`);
    await page.fill('input[name="phone"]', `+91987654321${i}`);
    await page.fill('input[name="line1"]', `Address ${i}`);
    await page.fill('input[name="city"]', 'Mumbai');
    await page.fill('input[name="state"]', 'Maharashtra');
    await page.fill('input[name="pincode"]', '400001');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(1000);
  }
  
  // Try to add 4th address
  await page.click('text=Add New Address');
  await page.fill('input[name="full_name"]', 'Recipient 4');
  await page.fill('input[name="phone"]', '+919876543214');
  await page.fill('input[name="line1"]', 'Address 4');
  await page.fill('input[name="city"]', 'Mumbai');
  await page.fill('input[name="state"]', 'Maharashtra');
  await page.fill('input[name="pincode"]', '400001');
  await page.click('button[type="submit"]');
  
  // Verify error message
  await expect(page.locator('text=Maximum 3 addresses allowed')).toBeVisible();
});
```

### Manual Testing Checklist

- [ ] Signup with valid data
- [ ] Signup with admin email (should fail)
- [ ] Signup with invalid phone format (should fail)
- [ ] Signup with password < 8 chars (should fail)
- [ ] Login with valid credentials
- [ ] Login with admin email (should show error)
- [ ] Login with invalid credentials (should fail)
- [ ] Guest cart merge on signup
- [ ] Guest cart merge on login
- [ ] Add address (should work)
- [ ] Add 4th address (should fail with max 3 error)
- [ ] Set default address
- [ ] Delete default address (should auto-promote earliest)
- [ ] Update address
- [ ] Delete address

















