import { cn } from "@/lib/utils";

interface AdminTableProps extends React.TableHTMLAttributes<HTMLTableElement> {
  headers: string[];
}

export function AdminTable({ headers, children, className, ...props }: AdminTableProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-silver-light">
      <table className={cn("w-full text-left border-collapse", className)} {...props}>
        <thead>
          <tr className="bg-offwhite border-b border-silver-light">
            {headers.map((header, idx) => (
              <th 
                key={idx} 
                className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-silver-darker whitespace-nowrap"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-silver-light">
          {children}
        </tbody>
      </table>
    </div>
  );
}


