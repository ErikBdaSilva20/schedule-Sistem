import { db } from "./client";
import type { Database } from "./types.gen";

export type TeamMember = Database["public"]["Tables"]["team_members"]["Row"];
type Insert = Database["public"]["Tables"]["team_members"]["Insert"];
type Update = Database["public"]["Tables"]["team_members"]["Update"];

export const listTeamMembers   = ()                          => db.table<TeamMember>("team_members").list();
export const createTeamMember  = (input: Insert)             => db.table<TeamMember>("team_members").create(input);
export const updateTeamMember  = (id: string, patch: Update) => db.table<TeamMember>("team_members").update(id, patch);
export const deleteTeamMember  = (id: string)                => db.table<TeamMember>("team_members").remove(id);
