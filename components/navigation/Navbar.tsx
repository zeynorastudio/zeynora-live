"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Menu, Search, MessageCircle } from "lucide-react";
import AccountButton from "./AccountButton";
import WishlistIcon from "./WishlistIcon";
import CartIcon from "./CartIcon";
import MobileMenuDrawer from "./MobileMenuDrawer";
import SearchModal from "./SearchModal";
import { CartDrawer } from "@/components/cart/CartDrawer";

const BASE_NAV_ITEMS = [
  { label: "Featured", href: "/shop?tag=featured", key: "featured" },
  { label: "Best Selling", href: "/shop?tag=best-selling", key: "best" },
  { label: "New Arrivals", href: "/shop?tag=new-launch", key: "new" },
  { label: "Seasonal", href: "/shop?tag=seasonal", key: "seasonal" },
  { label: "Festive", href: "/shop?tag=festive", key: "festive" },
];

interface NavbarProps {
  festiveEnabled?: boolean;
  initialWishlistCount?: number;
  initialCartCount?: number;
}

export default function Navbar({
  festiveEnabled = false,
  initialWishlistCount = 0,
  initialCartCount = 0,
}: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const lastScrollY = useRef(0);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const navItems = useMemo(() => {
    if (festiveEnabled) return BASE_NAV_ITEMS;
    return BASE_NAV_ITEMS.filter((item) => item.key !== "festive");
  }, [festiveEnabled]);

  const whatsappHref =
    process.env.NEXT_PUBLIC_WHATSAPP_URL || "https://wa.me/917000000000";

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      // Clear any pending hide timeout
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = null;
      }

      if (currentScrollY > lastScrollY.current && currentScrollY > 20) {
        // Scrolling down - hide with 200ms delay
        hideTimeoutRef.current = setTimeout(() => {
          setHidden(true);
        }, 200);
      } else if (currentScrollY < lastScrollY.current) {
        // Scrolling up - show immediately
        setHidden(false);
      }

      lastScrollY.current = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, []);

  return (
    <>
      <nav
        role="navigation"
        aria-label="Secondary navigation"
        className={`w-full bg-vine/95 text-white border-b border-champagne/25 backdrop-blur-md transition-all duration-300 ease-in-out ${
          hidden
            ? "opacity-0 -translate-y-[20px] pointer-events-none"
            : "opacity-100 translate-y-0"
        }`}
      >
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-3">
          {/* Mobile menu trigger */}
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="md:hidden p-2 rounded-sm border border-bronze/40 text-white/80 hover:text-champagne hover:border-champagne transition-colors focus:outline-none focus:ring-2 focus:ring-champagne"
            aria-label="Open mobile navigation"
            aria-controls="mobile-menu"
            aria-expanded={mobileOpen}
          >
            <Menu className="w-5 h-5" strokeWidth={1.5} />
          </button>

          {/* Nav links */}
          <div className="flex-1">
            <div className="hidden md:flex items-center justify-center gap-8">
              {navItems.map((item) => (
                <Link
                  key={item.key}
                  href={item.href}
                  className="relative uppercase tracking-[0.2em] text-xs text-white/80 hover:text-white transition-colors pb-1 group"
                >
                  {item.label}
                  <span className="pointer-events-none absolute inset-x-0 -bottom-0.5 h-px bg-gradient-to-r from-transparent via-champagne to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                </Link>
              ))}
            </div>
            <div className="md:hidden overflow-x-auto flex gap-4">
              {navItems.map((item) => (
                <Link
                  key={item.key}
                  href={item.href}
                  className="uppercase text-[11px] tracking-[0.25em] text-white/80 whitespace-nowrap py-1"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Action icons */}
          <div className="flex items-center gap-2 md:gap-3">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="p-2 text-white/80 hover:text-champagne transition-colors focus:outline-none focus:ring-2 focus:ring-champagne rounded-sm"
              aria-label="Open search"
              aria-haspopup="dialog"
            >
              <Search className="w-5 h-5" strokeWidth={1.5} />
            </button>
            <AccountButton className="p-2 text-white/80 hover:text-champagne transition-colors focus:outline-none focus:ring-2 focus:ring-champagne rounded-sm" />
            <WishlistIcon initialCount={initialWishlistCount} />
            <CartIcon
              initialCount={initialCartCount}
              onOpen={() => setCartOpen(true)}
            />
            <a
              href={whatsappHref}
              target="_blank"
              rel="noreferrer"
              className="p-2 text-white/80 hover:text-champagne transition-colors focus:outline-none focus:ring-2 focus:ring-champagne rounded-sm"
              aria-label="Chat on WhatsApp"
            >
              <MessageCircle className="w-5 h-5" strokeWidth={1.5} />
            </a>
          </div>
        </div>
      </nav>

      <MobileMenuDrawer open={mobileOpen} onClose={() => setMobileOpen(false)} />
      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
      <CartDrawer />
    </>
  );
}
