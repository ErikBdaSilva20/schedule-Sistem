import type { ReactNode } from "react";
import { X } from "lucide-react";
import { useEffect } from "react";

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const w = size === "sm" ? "max-w-md" : size === "lg" ? "max-w-3xl" : "max-w-xl";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={`card-surface relative z-10 w-full ${w} bg-card-elevated p-5 shadow-2xl`}>
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold">{title}</h3>
            {description && <p className="mt-0.5 text-xs text-secondary">{description}</p>}
          </div>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg border border-border bg-card hover:bg-card-hover">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div>{children}</div>
        {footer && <div className="mt-5 flex justify-end gap-2 border-t border-border pt-4">{footer}</div>}
      </div>
    </div>
  );
}

export function Field({
  label,
  children,
  hint,
  className = "",
}: {
  label: string;
  children: ReactNode;
  hint?: string;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <div className="mb-1 text-[11px] font-medium uppercase tracking-wider text-muted-strong">
        {label}
      </div>
      {children}
      {hint && <div className="mt-1 text-[11px] text-muted-strong">{hint}</div>}
    </label>
  );
}

const inputBase =
  "w-full rounded-lg border border-border bg-background-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-strong/70 transition focus:border-primary focus:outline-none focus:ring-4 focus:ring-[rgba(22,199,132,0.12)]";

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputBase} ${props.className ?? ""}`} />;
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${inputBase} min-h-[88px] ${props.className ?? ""}`} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${inputBase} ${props.className ?? ""}`} />;
}

export function Button({
  variant = "primary",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "danger" | "outline" }) {
  const styles =
    variant === "primary"
      ? "bg-primary text-primary-foreground hover:bg-primary-light"
      : variant === "danger"
        ? "bg-destructive/15 text-destructive border border-destructive/30 hover:bg-destructive/25"
        : variant === "outline"
          ? "border border-border bg-card text-foreground hover:bg-card-hover"
          : "text-secondary hover:bg-black/[0.06] hover:text-foreground";
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition disabled:opacity-50 ${styles} ${className}`}
    />
  );
}
