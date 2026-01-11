import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth/getAdminSession";

export async function GET(req: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session || session.role !== "super_admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const sql = `
      -- Enable uuid extension if not enabled (usually standard)
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

      -- Orders Table Updates
      CREATE TABLE IF NOT EXISTS orders (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        order_number TEXT UNIQUE NOT NULL,
        customer JSONB NOT NULL,
        items JSONB NOT NULL,
        subtotal NUMERIC NOT NULL DEFAULT 0,
        shipping_cost NUMERIC DEFAULT 0,
        total NUMERIC NOT NULL DEFAULT 0,
        payment_status TEXT NOT NULL DEFAULT 'pending',
        payment_provider TEXT,
        payment_intent_id TEXT,
        shipping_status TEXT DEFAULT 'pending',
        shiprocket_order_id TEXT,
        shiprocket_awb TEXT,
        shiprocket_courier TEXT,
        shiprocket_response JSONB DEFAULT '{}',
        profit_amount NUMERIC DEFAULT 0,
        profit_percent NUMERIC DEFAULT 0,
        delivery_zone TEXT,
        pin_code TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Order Items Normalization (Optional but recommended)
      CREATE TABLE IF NOT EXISTS order_items (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
        product_uid TEXT NOT NULL,
        variant_sku TEXT,
        qty INTEGER NOT NULL DEFAULT 1,
        price NUMERIC NOT NULL,
        cost NUMERIC DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Shipping Queries Table
      CREATE TABLE IF NOT EXISTS shipping_queries (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        order_id UUID REFERENCES orders(id) ON DELETE SET NULL, -- optional link
        order_number TEXT, -- manual entry fallback
        customer_name TEXT,
        email TEXT,
        phone TEXT,
        message TEXT,
        admin_reply TEXT,
        status TEXT DEFAULT 'open', -- open, read, resolved
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Admin Audit Logs (if not exists)
      CREATE TABLE IF NOT EXISTS admin_audit_logs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        action TEXT NOT NULL,
        target_resource TEXT,
        target_id TEXT,
        performed_by UUID,
        details JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    return NextResponse.json({ 
      message: "Please execute the following SQL migration in your Supabase SQL Editor.",
      sql 
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

