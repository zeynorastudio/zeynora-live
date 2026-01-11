# Final Checklist - Customer Authentication Implementation

## Pre-Deployment Checklist

### 1. Database Migrations

- [ ] Review `supabase/migrations/20250120000000_create_customers_table.sql`
- [ ] Review `supabase/migrations/20250120000001_add_customer_id_to_related_tables.sql`
- [ ] Test migrations in development/staging environment
- [ ] Execute migrations in Supabase SQL Editor
- [ ] Verify `customers` table created successfully
- [ ] Verify `customer_id` columns added to `addresses`, `carts`, `wishlist_items`

### 2. Environment Variables

- [ ] Verify `SUPABASE_SERVICE_ROLE_KEY` is set in `.env.local`
- [ ] Verify `NEXT_PUBLIC_SUPABASE_URL` is set
- [ ] Verify `NEXT_PUBLIC_SUPABASE_ANON_KEY` is set
- [ ] Verify `NEXT_PUBLIC_SITE_URL` is set (for merge-guest API calls)

### 3. TypeScript Types

- [ ] Regenerate Supabase types: `npx supabase gen types typescript --project-id <project-id> > types/supabase.ts`
- [ ] Verify `customers` table types are included
- [ ] Fix any TypeScript errors

### 4. Code Review

- [ ] Review all server actions for security
- [ ] Verify service-role client is only used server-side
- [ ] Verify admin email collision checks are in place
- [ ] Verify max 3 addresses enforcement
- [ ] Verify phone validation (+91XXXXXXXXXX format)

### 5. Testing

#### Signup Flow
- [ ] Test signup with valid data
- [ ] Test signup with admin email (should fail)
- [ ] Test signup with invalid phone format (should fail)
- [ ] Test signup with password < 8 chars (should fail)
- [ ] Test signup with existing email (should handle gracefully)
- [ ] Verify customer record created in database
- [ ] Verify guest cart merged on signup

#### Login Flow
- [ ] Test login with valid credentials
- [ ] Test login with admin email (should show error)
- [ ] Test login with invalid credentials (should fail)
- [ ] Test login with non-existent customer (should create customer record)
- [ ] Verify guest cart merged on login

#### Address Management
- [ ] Test adding address (should work)
- [ ] Test adding 4th address (should fail with max 3 error)
- [ ] Test setting default address (should unset others)
- [ ] Test deleting default address (should auto-promote earliest)
- [ ] Test updating address
- [ ] Test deleting address
- [ ] Verify phone validation in address form

#### Guest Merge
- [ ] Test guest cart merge on signup
- [ ] Test guest cart merge on login
- [ ] Verify cart items deduplicated correctly
- [ ] Verify quantities summed correctly
- [ ] Verify guest cookie cleared after merge

### 6. UI/UX

- [ ] Verify Palette B styling applied (soft vine background, muted gold accents)
- [ ] Verify form validation messages are clear
- [ ] Verify error messages are user-friendly
- [ ] Verify redirects work correctly
- [ ] Test on mobile devices
- [ ] Test accessibility (keyboard navigation, screen readers)

### 7. Security

- [ ] Verify RLS policies (if applicable)
- [ ] Verify service-role client is not exposed client-side
- [ ] Verify admin email collision checks prevent customer signup
- [ ] Verify customer verification in account layout
- [ ] Test SQL injection protection (via Supabase client)

### 8. Performance

- [ ] Verify database queries are optimized
- [ ] Verify no N+1 query issues
- [ ] Test with multiple concurrent signups/logins

### 9. Documentation

- [ ] Review `IMPLEMENTATION_SUMMARY.md`
- [ ] Review `DRY_RUN_LOGS.md`
- [ ] Review `SCHEMA_INSPECTION_REPORT.md`
- [ ] Update API documentation if needed

### 10. Deployment

- [ ] Deploy to staging environment
- [ ] Run smoke tests in staging
- [ ] Deploy to production
- [ ] Monitor for errors in production
- [ ] Set up error tracking/alerts

## Manual Steps to Run Locally

1. **Install Dependencies** (if needed)
   ```bash
   npm install
   ```

2. **Set Environment Variables**
   ```bash
   # .env.local
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   ```

3. **Run Migrations**
   - Open Supabase SQL Editor
   - Copy contents of `supabase/migrations/20250120000000_create_customers_table.sql`
   - Execute in SQL Editor
   - Copy contents of `supabase/migrations/20250120000001_add_customer_id_to_related_tables.sql`
   - Execute in SQL Editor

4. **Regenerate Types**
   ```bash
   npx supabase gen types typescript --project-id <project-id> > types/supabase.ts
   ```

5. **Start Development Server**
   ```bash
   npm run dev
   ```

6. **Test Signup**
   - Navigate to `http://localhost:3000/signup`
   - Fill form and submit
   - Verify redirect to `/account`
   - Check database for customer record

7. **Test Login**
   - Navigate to `http://localhost:3000/login`
   - Use credentials from signup
   - Verify redirect to `/account`

8. **Test Address Management**
   - Navigate to `/account/addresses`
   - Add 3 addresses
   - Try to add 4th (should fail)
   - Test setting default
   - Test deleting default

## Known Issues / Limitations

1. **Guest Wishlist Merge**
   - Not fully implemented (requires guest wishlist storage mechanism)
   - Placeholder in `merge-guest/route.ts`

2. **Users Table Dependency**
   - Addresses, carts, wishlist_items still reference `users.id`
   - Requires customer -> users mapping for queries
   - `customer_id` columns added for future migration

3. **Phone Format**
   - Currently only supports +91 (India) format
   - Can be extended for international formats

## Support / Troubleshooting

### Common Issues

1. **"SUPABASE_SERVICE_ROLE_KEY is not defined"**
   - Solution: Add `SUPABASE_SERVICE_ROLE_KEY` to `.env.local`

2. **"Customer not found" errors**
   - Solution: Verify migrations ran successfully
   - Check `customers` table exists in database

3. **"Maximum 3 addresses allowed" error when adding first address**
   - Solution: Check address count query is working correctly
   - Verify `user_id` mapping is correct

4. **Guest cart not merging**
   - Solution: Verify `z_session` cookie is set
   - Check `merge-guest/route.ts` is being called
   - Verify `NEXT_PUBLIC_SITE_URL` is set correctly

### Debug Steps

1. Check browser console for client-side errors
2. Check server logs for server-side errors
3. Verify database records exist
4. Test API routes directly with curl/Postman
5. Check Supabase logs for database errors

## Next Steps After Deployment

1. Monitor error logs
2. Collect user feedback
3. Optimize performance based on usage
4. Implement guest wishlist merge (if needed)
5. Consider migrating to `customer_id` as primary foreign key (future)

















