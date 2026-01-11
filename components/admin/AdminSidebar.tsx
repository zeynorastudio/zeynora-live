"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Package,
  Bell,
  Shield,
  LogOut,
  ChevronRight,
  Grid,
  Box,
  ClipboardList,
  ShoppingBag,
  Users,
  Truck,
  CreditCard,
  BarChart3,
} from "lucide-react";

type NavItemConfig = {
  label: string;
  href: string;
  disabled?: boolean;
};

type NavGroupConfig = {
  title: string;
  items: NavItemConfig[];
};

const homepageGroup: NavGroupConfig = {
  title: "Homepage",
  items: [
    { label: "Hero", href: "/admin/super/homepage?tab=hero" },
    { label: "Categories", href: "/admin/super/homepage?tab=categories" },
    { label: "Banners", href: "/admin/super/homepage?tab=banners" },
    { label: "Sections", href: "/admin/super/homepage?tab=sections" },
    { label: "Sale Strip", href: "/admin/super/homepage?tab=sale-strip" },
  ],
};

const productGroup: NavGroupConfig = {
  title: "Products",
  items: [
    { label: "All Products", href: "/admin/products" },
    { label: "Add Product", href: "/admin/products/new" },
    { label: "Media Library", href: "/admin/media" },
    { label: "Bulk Editor", href: "/admin/variants" },
    { label: "Reorder Tool", href: "/admin/products/reorder" },
    { label: "Bulk Import", href: "/admin/super/products/import" },
  ],
};

const marketingGroup: NavGroupConfig = {
  title: "Marketing",
  items: [
    { label: "Email Preferences Manager", href: "/admin/email-preferences" },
    { label: "Sale System", href: "/admin/super/sales" },
  ],
};

// Phase 3 — Orders & Operations Group
const ordersGroup: NavGroupConfig = {
  title: "Orders",
  items: [
    { label: "All Orders", href: "/admin/orders" },
    { label: "Dashboard", href: "/admin/dashboard" },
  ],
};

// Phase 3 — Payments Group (read-only)
const paymentsGroup: NavGroupConfig = {
  title: "Payments",
  items: [
    { label: "Payment History", href: "/admin/payments" },
  ],
};

// Phase 3 — Shipping Group
const shippingGroup: NavGroupConfig = {
  title: "Shipping",
  items: [
    { label: "Shipments", href: "/admin/shipping" },
    { label: "Shipping Queries", href: "/admin/support/shipping" },
  ],
};

const customerOpsGroup: NavGroupConfig = {
  title: "Customer Ops",
  items: [
    { label: "Customers", href: "/admin/customers" },
    { label: "Store Credits", href: "/admin/orders" },
    { label: "Returns", href: "/admin/returns" },
  ],
};

const developerGroup: NavGroupConfig = {
  title: "Developer Tools",
  items: [
    { label: "API & Integrations", href: "/admin/super/dev" },
    { label: "System Logs", href: "/admin/super/logs" },
    { label: "Global Settings", href: "/admin/super/settings" },
  ],
};

// Admin role nav items (non-super-admin)
const adminNavItems: NavItemConfig[] = [
  { label: "Dashboard", href: "/admin/dashboard" },
  { label: "Orders", href: "/admin/orders" },
  { label: "Customers", href: "/admin/customers" },
  { label: "Shipping", href: "/admin/shipping" },
  { label: "Inventory", href: "/admin/inventory" },
  { label: "Queries", href: "/admin/queries" },
  { label: "Business Info", href: "/admin/business" },
];

// Staff role nav items (limited access)
const staffNavItems: NavItemConfig[] = [
  { label: "Orders", href: "/admin/orders" },
  { label: "Shipping", href: "/admin/shipping" },
];

export function AdminSidebar({ role }: { role?: string }) {
  const isSuperAdmin = role === "super_admin";
  const isAdmin = role === "admin";
  const isStaff = role === "staff";
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-50 flex h-screen w-[260px] flex-col border-r border-white/10 bg-[#0F0A0C] text-white">
      <div className="h-16 border-b border-white/10 px-6 flex items-center">
        <span className="serif-display text-xl tracking-[0.5em] text-[#F6E7C1] uppercase">
          ZEYNORA
        </span>
      </div>

      <nav className="flex-1 overflow-y-auto px-5 py-6 space-y-8">
        {isSuperAdmin ? (
          <>
            <Section title="Dashboard" icon={Home}>
              <SimpleNavItem href="/admin/dashboard" label="Dashboard" pathname={pathname} />
            </Section>
            <Section title="Orders" icon={ShoppingBag}>
              <Group config={ordersGroup} pathname={pathname} />
            </Section>
            <Section title="Payments" icon={CreditCard}>
              <Group config={paymentsGroup} pathname={pathname} />
            </Section>
            <Section title="Shipping" icon={Truck}>
              <Group config={shippingGroup} pathname={pathname} />
            </Section>
            <Section title="Customers" icon={Users}>
              <SimpleNavItem href="/admin/customers" label="All Customers" pathname={pathname} />
            </Section>
            <Section title="Analytics" icon={BarChart3}>
              <SimpleNavItem href="/admin/analytics" label="Analytics" pathname={pathname} />
            </Section>
            <Section title="Homepage" icon={Home}>
              <Group config={homepageGroup} pathname={pathname} />
            </Section>
            <Section title="Products" icon={Package}>
              <Group config={productGroup} pathname={pathname} />
            </Section>
            <Section title="Collections" icon={Grid}>
              <SimpleNavItem href="/admin/collections" label="Collections" pathname={pathname} />
              <SimpleNavItem href="/admin/categories" label="Categories" pathname={pathname} />
            </Section>
            <Section title="Marketing" icon={Bell}>
              <Group config={marketingGroup} pathname={pathname} />
            </Section>
            <Section title="Customer Ops" icon={ClipboardList}>
              <Group config={customerOpsGroup} pathname={pathname} />
            </Section>
            <Section title="Developer Tools" icon={Shield}>
              <Group config={developerGroup} pathname={pathname} />
            </Section>
          </>
        ) : isAdmin ? (
          <>
            <Section title="Dashboard" icon={Home}>
              <SimpleNavItem href="/admin/dashboard" label="Dashboard" pathname={pathname} />
            </Section>
            <Section title="Orders" icon={ShoppingBag}>
              <SimpleNavItem href="/admin/orders" label="All Orders" pathname={pathname} />
            </Section>
            <Section title="Payments" icon={CreditCard}>
              <SimpleNavItem href="/admin/payments" label="Payment History" pathname={pathname} />
            </Section>
            <Section title="Shipping" icon={Truck}>
              <SimpleNavItem href="/admin/shipping" label="Shipments" pathname={pathname} />
              <SimpleNavItem href="/admin/support/shipping" label="Shipping Queries" pathname={pathname} />
            </Section>
            <Section title="Customers" icon={Users}>
              <SimpleNavItem href="/admin/customers" label="All Customers" pathname={pathname} />
            </Section>
            <Section title="Analytics" icon={BarChart3}>
              <SimpleNavItem href="/admin/analytics" label="Analytics" pathname={pathname} />
            </Section>
            <Section title="Essentials" icon={Box}>
              <div className="space-y-1">
                {adminNavItems.filter(item => 
                  !["Dashboard", "Orders", "Customers"].includes(item.label)
                ).map((item) => (
                  <SimpleNavItem key={item.label} href={item.href} label={item.label} pathname={pathname} />
                ))}
              </div>
            </Section>
          </>
        ) : isStaff ? (
          <Section title="Operations" icon={Box}>
            <div className="space-y-1">
              {staffNavItems.map((item) => (
                <SimpleNavItem key={item.label} href={item.href} label={item.label} pathname={pathname} />
              ))}
            </div>
          </Section>
        ) : (
          <Section title="Essentials" icon={Box}>
            <div className="space-y-1">
              {adminNavItems.map((item) => (
                <SimpleNavItem key={item.label} href={item.href} label={item.label} pathname={pathname} />
              ))}
            </div>
          </Section>
        )}
      </nav>

      <div className="border-t border-white/10 p-4">
        <form action="/api/admin/logout" method="post">
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-white/80 hover:bg-white/5 hover:text-white transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </form>
      </div>
    </aside>
  );
}

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: any;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.4em] text-[#F6E7C1]/70">
        <Icon className="h-3.5 w-3.5 text-[#D4AF37]" />
        {title}
      </div>
      {children}
    </div>
  );
}

function Group({ config, pathname }: { config: NavGroupConfig; pathname: string }) {
  return (
    <div className="space-y-1">
      {config.items.map((item) => (
        <SimpleNavItem key={item.label} href={item.href} label={item.label} pathname={pathname} disabled={item.disabled} />
      ))}
    </div>
  );
}

function SimpleNavItem({
  href,
  label,
  pathname,
  disabled,
}: {
  href: string;
  label: string;
  pathname: string;
  disabled?: boolean;
}) {
  const isActive = !disabled && (pathname === href || pathname.startsWith(href));

  const classNames = [
    "flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors",
    disabled
      ? "text-white/30 cursor-not-allowed"
      : isActive
        ? "bg-white/10 text-white"
        : "text-white/70 hover:text-white hover:bg-white/5",
  ].join(" ");

  if (disabled) {
    return (
      <span className={classNames}>
        {label}
      </span>
    );
  }

  return (
    <Link href={href} className={classNames}>
      <span>{label}</span>
      <ChevronRight className="h-3.5 w-3.5" />
    </Link>
  );
}
