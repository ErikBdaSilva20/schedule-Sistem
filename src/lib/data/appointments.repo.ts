import { db } from "./client";
import type { Database } from "./types.gen";

export type Appointment = Database["public"]["Tables"]["appointments"]["Row"];
type Insert = Database["public"]["Tables"]["appointments"]["Insert"];
type Update = Database["public"]["Tables"]["appointments"]["Update"];

export const listAppointments   = ()                              => db.table<Appointment>("appointments").list();
export const createAppointment  = (input: Insert)                 => db.table<Appointment>("appointments").create(input);
export const updateAppointment  = (id: string, patch: Update)     => db.table<Appointment>("appointments").update(id, patch);
export const deleteAppointment  = (id: string)                    => db.table<Appointment>("appointments").remove(id);
