// Footer: Premium luxury footer with 4-column editorial layout
// DB Sources:
//   - categories.name (text)
//   - categories.slug (text)
//   - categories.parent_id (uuid)
// Structure-only: No logic, no fetches, no hooks
// Responsive: Mobile (1 col), Tablet (2 cols), Desktop (4 cols)

// Accessibility:
// - role="contentinfo"
// - aria-label="Footer"
// - Proper heading hierarchy

"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronDown } from "lucide-react";

const companyLinks = [
  { label: "About Zeynora", href: "/about" },
  { label: "Craftsmanship", href: "/craft" },
  { label: "Boutiques", href: "/stores" },
  { label: "Press", href: "/press" },
];

const helpLinks = [
  { label: "Shipping & Delivery", href: "/shipping" },
  { label: "Returns & Exchanges", href: "/returns" },
  { label: "Care Guide", href: "/care" },
  { label: "Support", href: "/support" },
];

const sections = [
  { id: "company", title: "Company", links: companyLinks },
  { id: "help", title: "Help", links: helpLinks },
  { id: "contact", title: "Contact Info", links: [] },
  { id: "newsletter", title: "Newsletter", links: [] },
];

export default function Footer() {
  const [openId, setOpenId] = useState<string | null>(null);
  const currentYear = new Date().getFullYear();

  const toggleSection = (id: string) => {
    setOpenId((prev) => (prev === id ? null : id));
  };

  const renderLinks = (links: { label: string; href: string }[]) => {
    if (!links.length) {
      return <div className="h-6" aria-hidden="true" />;
    }
    return (
      <ul className="space-y-2">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="text-sm text-[#F6E7C1]/80 hover:text-white transition-colors"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <footer className="w-full bg-[#7E213C] text-white" role="contentinfo" aria-label="Footer">
      <div className="max-w-6xl mx-auto px-4 py-14">
        {/* Desktop layout */}
        <div className="hidden md:grid grid-cols-4 gap-10">
          {sections.map((section) => (
            <div key={section.id} className="space-y-4">
              <h3 className="serif-display text-lg tracking-[0.3em] uppercase">
                {section.title}
              </h3>
              {renderLinks(section.links)}
            </div>
          ))}
        </div>

        {/* Mobile accordions */}
        <div className="md:hidden space-y-4">
          {sections.map((section) => {
            const isOpen = openId === section.id;
            return (
              <div key={section.id} className="border border-white/20 rounded-xl">
                <button
                  type="button"
                  onClick={() => toggleSection(section.id)}
                  className="w-full flex items-center justify-between px-4 py-3 text-left"
                  aria-expanded={isOpen}
                >
                  <span className="serif-display text-base tracking-[0.3em] uppercase">
                    {section.title}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
                  />
                </button>
                <div
                  className={`overflow-hidden transition-[max-height] duration-300 ${
                    isOpen ? "max-h-40" : "max-h-0"
                  }`}
                >
                  <div className="px-4 pb-4">{renderLinks(section.links)}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="border-t border-white/20">
        <div className="max-w-6xl mx-auto px-4 py-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-[#F6E7C1]/70">
          <span>© {currentYear} ZEYNORA. All rights reserved.</span>
          <span className="tracking-[0.3em] uppercase">Timeless · Couture · India</span>
        </div>
      </div>
    </footer>
  );
}
