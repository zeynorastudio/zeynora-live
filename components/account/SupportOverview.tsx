import Card from "@/components/ui/Card";
import Link from "next/link";
import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { format } from "date-fns";
import { MessageSquare } from "lucide-react";

interface SupportTicket {
  id: string;
  order_number: string | null;
  status: string;
  message: string;
  created_at: string;
}

interface SupportOverviewProps {
  tickets: SupportTicket[];
  totalCount: number;
}

function getStatusBadgeVariant(status: string): "gold" | "bronze" | "vine" | "outline" {
  const normalized = status.toLowerCase();
  if (normalized === "resolved") return "gold";
  if (normalized === "read" || normalized === "open") return "bronze";
  return "outline";
}

export default function SupportOverview({ tickets, totalCount }: SupportOverviewProps) {
  const lastTicket = tickets[0] || null;

  return (
    <Card className="p-6 md:p-8" shadowVariant="warm-sm">
      <div className="flex items-center justify-between mb-6">
        <h2 className="serif-display text-xl md:text-2xl text-night">
          Support Tickets
        </h2>
        {totalCount > 0 && (
          <span className="text-sm text-silver-dark">
            {totalCount} {totalCount === 1 ? "ticket" : "tickets"}
          </span>
        )}
      </div>

      {totalCount === 0 ? (
        <div className="py-8 text-center">
          <MessageSquare className="w-12 h-12 text-silver-light mx-auto mb-4" strokeWidth={1} />
          <p className="text-silver-dark mb-4">No support tickets.</p>
          <Link href="/support/shipping">
            <Button variant="outline" className="text-sm">
              Contact Support
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {lastTicket && (
            <div className="border border-silver-light rounded-lg p-4 bg-cream/30">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex-1">
                  {lastTicket.order_number && (
                    <p className="text-xs text-silver-dark mb-1">
                      Order: #{lastTicket.order_number}
                    </p>
                  )}
                  <p className="text-sm text-night line-clamp-2 mb-2">
                    {lastTicket.message}
                  </p>
                  <p className="text-xs text-silver-dark">
                    {format(new Date(lastTicket.created_at), "MMM dd, yyyy")}
                  </p>
                </div>
                <Badge variant={getStatusBadgeVariant(lastTicket.status)}>
                  {lastTicket.status}
                </Badge>
              </div>
            </div>
          )}
          
          <Link href="/support/shipping">
            <Button variant="outline" className="w-full text-sm">
              {totalCount > 1 ? "View All Tickets" : "View Ticket"}
            </Button>
          </Link>
        </div>
      )}
    </Card>
  );
}

