import Card from "@/components/ui/Card";
import Link from "next/link";
import { format } from "date-fns";
import { Badge } from "@/components/ui/Badge";
import Button from "@/components/ui/Button";

interface Order {
  id: string;
  order_number: string;
  payment_status: string | null;
  shipping_status: string | null;
  total_amount: number | null;
  created_at: string;
}

interface OrdersOverviewProps {
  orders: Order[];
  totalCount: number;
}

function getStatusBadgeVariant(status: string | null): "gold" | "bronze" | "vine" | "outline" {
  if (!status) return "outline";
  
  const normalized = status.toLowerCase();
  if (normalized === "paid" || normalized === "delivered") return "gold";
  if (normalized === "pending" || normalized === "processing") return "bronze";
  if (normalized === "failed" || normalized === "cancelled") return "vine";
  return "outline";
}

export default function OrdersOverview({ orders, totalCount }: OrdersOverviewProps) {
  return (
    <Card className="p-6 md:p-8" shadowVariant="warm-sm">
      <div className="flex items-center justify-between mb-6">
        <h2 className="serif-display text-xl md:text-2xl text-night">
          Recent Orders
        </h2>
        {totalCount > 0 && (
          <span className="text-sm text-silver-dark">
            {totalCount} {totalCount === 1 ? "order" : "orders"}
          </span>
        )}
      </div>

      {totalCount === 0 ? (
        <div className="py-8 text-center">
          <p className="text-silver-dark mb-4">You have no orders yet.</p>
          <Link href="/">
            <Button variant="outline" className="text-sm">
              Start Shopping
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div
              key={order.id}
              className="border-b border-silver-light pb-4 last:border-0 last:pb-0"
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Link
                      href={`/account/orders/${order.id}`}
                      className="font-semibold text-night hover:text-gold transition-colors"
                    >
                      #{order.order_number}
                    </Link>
                    <span className="text-xs text-silver-dark">
                      {format(new Date(order.created_at), "MMM dd, yyyy")}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {order.payment_status && (
                      <Badge variant={getStatusBadgeVariant(order.payment_status)}>
                        {order.payment_status}
                      </Badge>
                    )}
                    {order.shipping_status && (
                      <Badge variant={getStatusBadgeVariant(order.shipping_status)}>
                        {order.shipping_status}
                      </Badge>
                    )}
                  </div>
                  {order.total_amount && (
                    <p className="text-sm text-night font-medium">
                      ₹{order.total_amount.toFixed(2)}
                    </p>
                  )}
                </div>
                <Link href={`/account/orders/${order.id}`}>
                  <Button variant="outline" className="text-xs sm:text-sm whitespace-nowrap">
                    View
                  </Button>
                </Link>
              </div>
            </div>
          ))}
          
          {totalCount > 3 && (
            <div className="pt-4 border-t border-silver-light">
              <Link href="/account/orders">
                <Button variant="outline" className="w-full text-sm">
                  View All Orders
                </Button>
              </Link>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}






