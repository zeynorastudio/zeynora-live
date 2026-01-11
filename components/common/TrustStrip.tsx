// TrustStrip: Static trust indicators displayed above footer
// Features: Secure Payments, Verified Products, Fast Delivery, Easy Returns
// No animation, no API calls - pure static component

import { ShieldCheck, BadgeCheck, Truck, RefreshCw } from "lucide-react";

const trustItems = [
  {
    id: "secure-payments",
    icon: ShieldCheck,
    title: "Secure Payments",
    description: "100% secure checkout",
  },
  {
    id: "verified-products",
    icon: BadgeCheck,
    title: "Verified Products",
    description: "Authenticity guaranteed",
  },
  {
    id: "fast-delivery",
    icon: Truck,
    title: "Fast Delivery",
    description: "Pan-India shipping",
  },
  {
    id: "easy-returns",
    icon: RefreshCw,
    title: "Easy Returns",
    description: "Hassle-free returns",
  },
];

export default function TrustStrip() {
  return (
    <section 
      className="w-full bg-cream border-t border-silver-light py-8 md:py-10"
      aria-label="Trust indicators"
    >
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
          {trustItems.map((item) => {
            const IconComponent = item.icon;
            return (
              <div 
                key={item.id}
                className="flex flex-col items-center text-center"
              >
                <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-gold/10 flex items-center justify-center mb-3">
                  <IconComponent className="w-5 h-5 md:w-6 md:h-6 text-gold" />
                </div>
                <h3 className="font-medium text-night text-sm md:text-base mb-1">
                  {item.title}
                </h3>
                <p className="text-xs md:text-sm text-silver-dark">
                  {item.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}




