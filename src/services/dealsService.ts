import { supabase } from "@/lib/supabase";

export type DealStage = "new" | "qualified" | "proposal" | "negotiation" | "won" | "lost";

export interface Deal {
  id: string;
  name: string;
  value: number;
  stage: DealStage;
  contactId: string;
  contactName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DealInput {
  name: string;
  value: number;
  stage: DealStage;
  contactId: string;
}

interface DealRow {
  id: string;
  name: string;
  value: number;
  stage: DealStage;
  contact_id: string;
  created_at: string;
  updated_at: string;
  contacts: { name: string } | null;
}

function toDeal(row: DealRow): Deal {
  return {
    id: row.id,
    name: row.name,
    value: row.value,
    stage: row.stage,
    contactId: row.contact_id,
    contactName: row.contacts?.name ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * The data-service seam for deals: all Supabase calls for this entity go
 * through this module, following the same shape as authService/contactsService.
 */
export const dealsService = {
  async list(): Promise<Deal[]> {
    const { data, error } = await supabase
      .from("deals")
      .select("*, contacts(name)")
      .order("created_at");
    if (error) throw error;
    return (data as DealRow[]).map(toDeal);
  },

  async create(input: DealInput): Promise<Deal> {
    const { name, value, stage, contactId } = input;
    const { data, error } = await supabase
      .from("deals")
      .insert({ name, value, stage, contact_id: contactId })
      .select("*, contacts(name)")
      .single();
    if (error) throw error;
    return toDeal(data as DealRow);
  },

  async update(id: string, input: Partial<DealInput>): Promise<Deal> {
    const { contactId, ...rest } = input;
    const { data, error } = await supabase
      .from("deals")
      .update({
        ...rest,
        ...(contactId !== undefined ? { contact_id: contactId } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("*, contacts(name)")
      .single();
    if (error) throw error;
    return toDeal(data as DealRow);
  },

  async changeStage(id: string, stage: DealStage): Promise<Deal> {
    return dealsService.update(id, { stage });
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from("deals").delete().eq("id", id);
    if (error) throw error;
  },
};
