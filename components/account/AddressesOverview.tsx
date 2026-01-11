import Card from "@/components/ui/Card";
import Link from "next/link";
import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { MapPin } from "lucide-react";

interface Address {
  id: string;
  full_name: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  pincode: string;
  is_default: boolean;
}

interface AddressesOverviewProps {
  address: Address | null;
  totalCount: number;
}

export default function AddressesOverview({ address, totalCount }: AddressesOverviewProps) {
  return (
    <Card className="p-6 md:p-8" shadowVariant="warm-sm">
      <div className="flex items-center justify-between mb-6">
        <h2 className="serif-display text-xl md:text-2xl text-night">
          Saved Addresses
        </h2>
        {totalCount > 0 && (
          <span className="text-sm text-silver-dark">
            {totalCount} {totalCount === 1 ? "address" : "addresses"}
          </span>
        )}
      </div>

      {totalCount === 0 ? (
        <div className="py-8 text-center">
          <MapPin className="w-12 h-12 text-silver-light mx-auto mb-4" strokeWidth={1} />
          <p className="text-silver-dark mb-4">No saved addresses yet.</p>
          <Link href="/account/addresses">
            <Button variant="outline" className="text-sm">
              Add Address
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {address && (
            <div className="border border-silver-light rounded-lg p-4 bg-cream/30">
              {address.is_default && (
                <Badge variant="gold" className="mb-2 text-xs">
                  Default
                </Badge>
              )}
              <div className="text-sm text-night space-y-1">
                <p className="font-semibold">{address.full_name}</p>
                <p className="text-silver-dark">{address.phone}</p>
                <p className="mt-2">
                  {address.line1}
                  {address.line2 && `, ${address.line2}`}
                </p>
                <p>
                  {address.city}, {address.state} {address.pincode}
                </p>
              </div>
            </div>
          )}
          
          <Link href="/account/addresses">
            <Button variant="outline" className="w-full text-sm">
              {totalCount > 1 ? "Manage Addresses" : "Edit Address"}
            </Button>
          </Link>
        </div>
      )}
    </Card>
  );
}







