import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="card-surface flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div>
        <div className="text-base font-semibold text-foreground">{title}</div>
        {description && <p className="mt-1 text-sm text-secondary">{description}</p>}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
