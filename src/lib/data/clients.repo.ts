import { db } from "./client";
import type { Database } from "./types.gen";

export type Client = Database["public"]["Tables"]["clients"]["Row"];
type Insert = Database["public"]["Tables"]["clients"]["Insert"];
type Update = Database["public"]["Tables"]["clients"]["Update"];

export const listClients   = ()                          => db.table<Client>("clients").list();
export const createClient  = (input: Insert)             => db.table<Client>("clients").create(input);
export const updateClient  = (id: string, patch: Update) => db.table<Client>("clients").update(id, patch);
export const deleteClient  = (id: string)                => db.table<Client>("clients").remove(id);
