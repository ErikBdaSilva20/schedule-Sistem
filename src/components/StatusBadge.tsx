import { STATUS_COLOR, STATUS_LABEL, type AppointmentStatus } from "@/lib/types";

export function StatusBadge({ status }: { status: AppointmentStatus }) {
  return (
    <span
      className={`inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${STATUS_COLOR[status]}`}
    >
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-80" />
      <span className="truncate">{STATUS_LABEL[status]}</span>
    </span>
  );
}
