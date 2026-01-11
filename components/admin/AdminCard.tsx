import { cn } from "@/lib/utils";

interface AdminCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export function AdminCard({ className, title, subtitle, action, children, ...props }: AdminCardProps) {
  return (
    <div 
      className={cn(
        "bg-white rounded-xl border border-silver-light shadow-sm overflow-hidden",
        className
      )} 
      {...props}
    >
      {(title || action) && (
        <div className="px-6 py-4 border-b border-silver-light flex items-center justify-between bg-white/50">
          <div>
            {title && <h3 className="serif-display text-lg text-night">{title}</h3>}
            {subtitle && <p className="text-sm text-silver-dark mt-1">{subtitle}</p>}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div className="p-6">
        {children}
      </div>
    </div>
  );
}


