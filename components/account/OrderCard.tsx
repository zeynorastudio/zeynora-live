import Card from "@/components/ui/Card";
import Link from "next/link";
import { format } from "date-fns";
import { Badge } from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { ArrowRight } from "lucide-react";

interface Order {
  id: string;
  order_number: string;
  payment_status: string | null;
  shipping_status: string | null;
  total_amount: number | null;
  created_at: string;
}

interface OrderCardProps {
  order: Order;
}

function getPaymentStatusVariant(status: string | null): "gold" | "bronze" | "vine" | "outline" {
  if (!status) return "outline";
  
  const normalized = status.toLowerCase();
  if (normalized === "paid") return "gold";
  if (normalized === "pending") return "bronze";
  if (normalized === "failed" || normalized === "refunded") return "vine";
  return "outline";
}

function getShippingStatusVariant(status: string | null): "gold" | "bronze" | "vine" | "outline" {
  if (!status) return "outline";
  
  const normalized = status.toLowerCase();
  if (normalized === "delivered") return "gold";
  if (normalized === "pending" || normalized === "processing" || normalized === "shipped" || normalized === "in_transit" || normalized === "out_for_delivery") return "bronze";
  if (normalized === "cancelled" || normalized === "rto" || normalized === "returned") return "vine";
  return "outline";
}

export default function OrderCard({ order }: OrderCardProps) {
  return (
    <Card className="p-5 md:p-6 hover:shadow-lg transition-all duration-300 group" shadowVariant="warm-sm">
      <div className="flex flex-col gap-4">
        {/* Header: Order Number & Date */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <Link
              href={`/account/orders/${order.id}`}
              className="block group-hover:text-gold transition-colors"
            >
              <h3 className="serif-display text-lg md:text-xl text-night mb-1">
                Order #{order.order_number}
              </h3>
            </Link>
            <p className="text-xs md:text-sm text-silver-dark">
              {format(new Date(order.created_at), "MMM dd, yyyy 'at' h:mm a")}
            </p>
          </div>
          <Link
            href={`/account/orders/${order.id}`}
            className="flex-shrink-0 text-silver-dark group-hover:text-gold transition-colors"
            aria-label="View order details"
          >
            <ArrowRight className="w-5 h-5" strokeWidth={1.5} />
          </Link>
        </div>

        {/* Status Chips */}
        <div className="flex flex-wrap gap-2">
          {order.payment_status && (
            <Badge variant={getPaymentStatusVariant(order.payment_status)}>
              {order.payment_status.charAt(0).toUpperCase() + order.payment_status.slice(1)}
            </Badge>
          )}
          {order.shipping_status && (
            <Badge variant={getShippingStatusVariant(order.shipping_status)}>
              {order.shipping_status.replace(/_/g, " ").split(" ").map(word => 
                word.charAt(0).toUpperCase() + word.slice(1)
              ).join(" ")}
            </Badge>
          )}
        </div>

        {/* Total Amount */}
        {order.total_amount && (
          <div className="pt-2 border-t border-silver-light">
            <div className="flex items-baseline justify-between">
              <span className="text-xs md:text-sm text-silver-dark uppercase tracking-wide">
                Total Amount
              </span>
              <span className="serif-display text-xl md:text-2xl text-gold font-semibold">
                ₹{order.total_amount.toFixed(2)}
              </span>
            </div>
          </div>
        )}

        {/* CTA Button */}
        <div className="pt-2">
          <Link href={`/account/orders/${order.id}`}>
            <Button
              variant="outline"
              className="w-full group-hover:border-gold group-hover:text-gold transition-colors"
            >
              View Details
            </Button>
          </Link>
        </div>
      </div>
    </Card>
  );
}






