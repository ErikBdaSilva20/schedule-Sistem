import { db } from "./client";
import type { Database } from "./types.gen";

export type Service = Database["public"]["Tables"]["services"]["Row"];
type Insert = Database["public"]["Tables"]["services"]["Insert"];
type Update = Database["public"]["Tables"]["services"]["Update"];

export const listServices   = ()                          => db.table<Service>("services").list();
export const createService  = (input: Insert)             => db.table<Service>("services").create(input);
export const updateService  = (id: string, patch: Update) => db.table<Service>("services").update(id, patch);
export const deleteService  = (id: string)                => db.table<Service>("services").remove(id);
