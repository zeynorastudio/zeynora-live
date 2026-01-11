# Customer Authentication Flow - Implementation Summary

## Overview

This implementation creates a separate customer authentication flow with a dedicated `customers` table, keeping it completely separate from the admin `users` table.

## Database Schema

### New Tables

1. **`customers` table** (migration: `20250120000000_create_customers_table.sql`)
   - `id` uuid PRIMARY KEY
   - `auth_uid` uuid UNIQUE (links to Supabase Auth)
   - `email` text NOT NULL UNIQUE
   - `first_name` text NOT NULL
   - `last_name` text NOT NULL
   - `phone` text NULL (validated: +91XXXXXXXXXX format)
   - `created_at` timestamptz
   - `updated_at` timestamptz

### Schema Updates

2. **Add `customer_id` columns** (migration: `20250120000001_add_customer_id_to_related_tables.sql`)
   - `addresses.customer_id` uuid REFERENCES customers(id)
   - `carts.customer_id` uuid REFERENCES customers(id)
   - `wishlist_items.customer_id` uuid REFERENCES customers(id)

**Note:** These columns are nullable for backward compatibility. Existing tables (`addresses`, `carts`, `wishlist_items`) still reference `users.id` via `user_id` columns.

## Files Created

### Core Authentication

1. **`lib/auth/customers.ts`**
   - Helper functions for customer management
   - `validatePhone()` - Phone format validation
   - `sanitizeEmail()` - Email normalization
   - `isAdminEmail()` - Check for admin email collisions
   - `findCustomerByAuthUid()` - Find customer by auth_uid
   - `findCustomerByEmail()` - Find customer by email
   - `createCustomer()` - Create new customer (service-role)
   - `mapEmailToAuthUid()` - Map email to auth_uid for existing customers
   - `findOrCreateCustomerForAuthUid()` - Find or create customer on login

### Signup Flow

2. **`app/(storefront)/signup/page.tsx`**
   - Signup UI with Palette B styling
   - Form fields: first_name, last_name, email, password, confirm_password, phone (optional)
   - Client-side validation
   - Inline error messages

3. **`app/(storefront)/signup/actions.ts`**
   - Server action for signup
   - Validates input
   - Checks admin email collision
   - Creates Supabase Auth user
   - Maps to customers table
   - Merges guest cart/wishlist
   - Redirects to /account

### Login Flow

4. **`app/(storefront)/login/page.tsx`**
   - Login UI with Palette B styling
   - Form fields: email, password
   - Client-side validation
   - Inline error messages

5. **`app/(storefront)/login/actions.ts`**
   - Server action for login
   - Authenticates via Supabase Auth
   - Finds or creates customer record
   - Checks admin email collision
   - Merges guest cart/wishlist
   - Redirects to /account

### Account Protection

6. **`app/(storefront)/account/layout.tsx`** (updated)
   - Verifies customer exists (not just admin)
   - Redirects to login if not authenticated or not a customer

### Address Management

7. **`app/(storefront)/account/addresses/page.tsx`** (updated)
   - Fetches addresses for customer
   - Uses customer -> users mapping for addresses.user_id

8. **`app/(storefront)/account/addresses/actions.ts`**
   - `createAddressAction()` - Create address (enforces max 3)
   - `updateAddressAction()` - Update address
   - `deleteAddressAction()` - Delete address (auto-promotes earliest if default deleted)
   - `setDefaultAddressAction()` - Set default address (unsets others)

9. **`app/(storefront)/account/addresses/AddressFormClient.tsx`**
   - Client form component for address creation/editing
   - Uses server actions
   - Validates phone format

### Guest Merge

10. **`app/api/auth/merge-guest/route.ts`**
    - Merges guest cart into customer cart
    - Deduplicates by SKU, sums quantities
    - Clears guest cookie
    - Placeholder for wishlist merge (requires guest wishlist mechanism)

### Layout Updates

11. **`app/(storefront)/layout.tsx`** (updated)
    - Updated `getWishlistCount()` to verify customer exists
    - Updated `getCartQuantity()` to verify customer exists
    - Uses customer -> users mapping for queries

## Key Features

### Signup Flow

1. **Validation**
   - Email format
   - Password min 8 characters
   - Phone format: +91XXXXXXXXXX (if provided)
   - Required fields: first_name, last_name, email, password

2. **Admin Email Collision Check**
   - Checks `users` table for admin emails before creating customer
   - Returns clear error: "This email is reserved for admin accounts. Please contact support."

3. **Customer Mapping**
   - If customer exists with `auth_uid` → use existing
   - If customer exists with `email` but no `auth_uid` → update with `auth_uid`
   - If no customer exists → create new customer

4. **Guest Merge**
   - Merges guest cart items into customer cart
   - Deduplicates by SKU, sums quantities
   - Clears guest cookie

### Login Flow

1. **Authentication**
   - Uses Supabase Auth `signInWithPassword`

2. **Customer Resolution**
   - Finds customer by `auth_uid`
   - If not found, checks admin email collision
   - If not admin, creates customer record (minimal data)

3. **Guest Merge**
   - Same as signup flow

### Address Management

1. **Max 3 Addresses**
   - Enforced in server actions
   - Returns HTTP 400 with clear message if limit exceeded

2. **Default Address**
   - Only one default address per customer
   - Setting default unsets others
   - Deleting default auto-promotes earliest address

3. **Phone Validation**
   - Server-side validation: +91XXXXXXXXXX format
   - Clear error messages

## Security

1. **Service-Role Client**
   - Used for elevated operations (creating/updating customers)
   - Only used in server-side code

2. **Admin Email Protection**
   - Prevents customer signup with admin emails
   - Clear error messages

3. **Customer Verification**
   - Account layout verifies customer exists
   - Prevents admin users from accessing customer routes

## Migration Requirements

**⚠️ IMPORTANT: DO NOT RUN MIGRATIONS AUTOMATICALLY**

1. Review `supabase/migrations/20250120000000_create_customers_table.sql`
2. Review `supabase/migrations/20250120000001_add_customer_id_to_related_tables.sql`
3. Execute in Supabase SQL Editor after approval

## Environment Variables

Required:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (for service-role client)
- `NEXT_PUBLIC_SITE_URL` (for merge-guest API calls)

## Testing

See `DRY_RUN_LOGS.md` for:
- Dry-run simulation logs
- Test instructions
- Playwright test snippets
- Manual testing checklist

## Known Limitations

1. **Wishlist Merge**
   - Guest wishlist merge is not fully implemented (requires guest wishlist storage mechanism)
   - Placeholder in `merge-guest/route.ts`

2. **Users Table Dependency**
   - Addresses, carts, and wishlist_items still reference `users.id` via `user_id`
   - Requires customer -> users mapping for queries
   - `customer_id` columns added for future migration

3. **Phone Format**
   - Currently only supports +91 (India) format
   - Can be extended for international formats

## Next Steps

1. **Run Migrations**
   - Review and approve SQL migrations
   - Execute in Supabase SQL Editor

2. **Test Locally**
   - Follow test instructions in `DRY_RUN_LOGS.md`
   - Verify all flows work correctly

3. **Update TypeScript Types**
   - Regenerate Supabase types to include `customers` table
   - Update `types/supabase.ts`

4. **RLS Policies** (if needed)
   - Review and add RLS policies for `customers` table
   - Ensure customers can only access their own data

5. **Guest Wishlist** (future)
   - Implement guest wishlist storage mechanism
   - Complete wishlist merge in `merge-guest/route.ts`

## Blockers

1. **Missing Environment Variables**
   - Verify `SUPABASE_SERVICE_ROLE_KEY` is set
   - Verify `NEXT_PUBLIC_SITE_URL` is set (for merge-guest API)

2. **Migration Approval**
   - SQL migrations must be reviewed and approved before execution
   - Test migrations in development environment first

3. **TypeScript Types**
   - Regenerate Supabase types after running migrations
   - Update imports if needed

















