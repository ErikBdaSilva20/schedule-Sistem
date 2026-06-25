// Re-exporta tipos do schema e mantém constantes de UI.
export type { Client }      from "@/lib/data/clients.repo";
export type { Service }     from "@/lib/data/services.repo";
export type { TeamMember }  from "@/lib/data/team_members.repo";
export type { Appointment } from "@/lib/data/appointments.repo";
export type { AppointmentStatus } from "@/lib/data/types.gen";

export const STATUS_LABEL: Record<string, string> = {
  scheduled:  "Agendado",
  confirmed:  "Confirmado",
  completed:  "Concluído",
  cancelled:  "Cancelado",
  no_show:    "Não compareceu",
};

export const STATUS_COLOR: Record<string, string> = {
  scheduled:  "bg-info/15 text-info border-info/30",
  confirmed:  "bg-primary/15 text-primary border-primary/30",
  completed:  "bg-purple-accent/15 text-purple-accent border-purple-accent/30",
  cancelled:  "bg-destructive/15 text-destructive border-destructive/30",
  no_show:    "bg-warning/15 text-warning border-warning/30",
};
