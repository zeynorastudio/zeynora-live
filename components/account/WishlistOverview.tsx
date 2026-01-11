import Card from "@/components/ui/Card";
import Link from "next/link";
import Button from "@/components/ui/Button";
import { Heart } from "lucide-react";

interface WishlistOverviewProps {
  count: number;
}

export default function WishlistOverview({ count }: WishlistOverviewProps) {
  return (
    <Card className="p-6 md:p-8" shadowVariant="warm-sm">
      <div className="flex items-center justify-between mb-6">
        <h2 className="serif-display text-xl md:text-2xl text-night">
          Wishlist
        </h2>
        {count > 0 && (
          <span className="text-sm text-silver-dark">
            {count} {count === 1 ? "item" : "items"}
          </span>
        )}
      </div>

      {count === 0 ? (
        <div className="py-8 text-center">
          <Heart className="w-12 h-12 text-silver-light mx-auto mb-4" strokeWidth={1} />
          <p className="text-silver-dark mb-4">No items in your wishlist.</p>
          <Link href="/">
            <Button variant="outline" className="text-sm">
              Browse Products
            </Button>
          </Link>
        </div>
      ) : (
        <div className="py-4">
          <p className="text-night mb-6">
            You have <span className="font-semibold text-gold">{count}</span>{" "}
            {count === 1 ? "item" : "items"} saved in your wishlist.
          </p>
          <Link href="/wishlist">
            <Button variant="outline" className="w-full text-sm">
              View Wishlist
            </Button>
          </Link>
        </div>
      )}
    </Card>
  );
}























