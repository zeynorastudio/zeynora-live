import { cn } from "@/lib/utils";

interface AdminStatCardProps {
  title: string;
  value: string | number;
  trend?: string;
  trendUp?: boolean;
  icon?: React.ElementType;
}

export function AdminStatCard({ title, value, trend, trendUp, icon: Icon }: AdminStatCardProps) {
  return (
    <div className="bg-white p-6 rounded-xl border border-silver-light shadow-sm flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-silver-dark mb-1">{title}</p>
        <h4 className="serif-display text-2xl text-night">{value}</h4>
        {trend && (
          <span className={cn(
            "inline-flex items-center text-xs font-medium mt-2",
            trendUp ? "text-green-600" : "text-red-600"
          )}>
            {trendUp ? "↑" : "↓"} {trend}
          </span>
        )}
      </div>
      {Icon && (
        <div className="p-3 bg-offwhite rounded-lg text-silver-darker">
          <Icon className="w-5 h-5" />
        </div>
      )}
    </div>
  );
}


