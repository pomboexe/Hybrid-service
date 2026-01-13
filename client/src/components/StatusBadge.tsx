import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const styles: Record<string, string> = {
    open: "bg-blue-50 text-blue-700 border-blue-200",
    resolved: "bg-green-50 text-green-700 border-green-200",
    escalated: "bg-red-50 text-red-700 border-red-200",
  };

  const labels: Record<string, string> = {
    open: "Open",
    resolved: "Resolved",
    escalated: "Escalated",
  };

  const defaultStyle = "bg-gray-50 text-gray-700 border-gray-200";

  return (
    <span className={cn(
      "px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize inline-flex items-center",
      styles[status] || defaultStyle
    )}>
      {labels[status] || status}
    </span>
  );
}

interface PriorityBadgeProps {
  priority: string;
}

export function PriorityBadge({ priority }: PriorityBadgeProps) {
  const styles: Record<string, string> = {
    low: "text-slate-500 bg-slate-100",
    medium: "text-orange-600 bg-orange-50",
    high: "text-red-600 bg-red-50",
  };

  return (
    <span className={cn(
      "text-xs font-semibold px-2 py-0.5 rounded uppercase tracking-wider",
      styles[priority] || "text-gray-500 bg-gray-100"
    )}>
      {priority}
    </span>
  );
}
