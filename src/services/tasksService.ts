import { supabase } from "@/lib/supabase";

export interface Task {
  id: string;
  title: string;
  dueDate: string;
  completed: boolean;
  contactId: string | null;
  contactName: string | null;
  dealId: string | null;
  dealName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TaskInput {
  title: string;
  dueDate: string;
  contactId?: string | null;
  dealId?: string | null;
}

interface TaskRow {
  id: string;
  title: string;
  due_date: string;
  completed: boolean;
  contact_id: string | null;
  deal_id: string | null;
  created_at: string;
  updated_at: string;
  contacts: { name: string } | null;
  deals: { name: string } | null;
}

function toTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    dueDate: row.due_date,
    completed: row.completed,
    contactId: row.contact_id,
    contactName: row.contacts?.name ?? null,
    dealId: row.deal_id,
    dealName: row.deals?.name ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * The data-service seam for tasks: all Supabase calls for this entity go
 * through this module, following the same shape as the other services.
 */
export const tasksService = {
  async list(): Promise<Task[]> {
    const { data, error } = await supabase
      .from("tasks")
      .select("*, contacts(name), deals(name)")
      .order("due_date");
    if (error) throw error;
    return (data as TaskRow[]).map(toTask);
  },

  async create(input: TaskInput): Promise<Task> {
    const { data, error } = await supabase
      .from("tasks")
      .insert({
        title: input.title,
        due_date: input.dueDate,
        contact_id: input.contactId ?? null,
        deal_id: input.dealId ?? null,
      })
      .select("*, contacts(name), deals(name)")
      .single();
    if (error) throw error;
    return toTask(data as TaskRow);
  },

  async update(id: string, input: Partial<TaskInput>): Promise<Task> {
    const { contactId, dealId, dueDate, ...rest } = input;
    const { data, error } = await supabase
      .from("tasks")
      .update({
        ...rest,
        ...(dueDate !== undefined ? { due_date: dueDate } : {}),
        ...(contactId !== undefined ? { contact_id: contactId } : {}),
        ...(dealId !== undefined ? { deal_id: dealId } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("*, contacts(name), deals(name)")
      .single();
    if (error) throw error;
    return toTask(data as TaskRow);
  },

  async markComplete(id: string, completed: boolean): Promise<Task> {
    const { data, error } = await supabase
      .from("tasks")
      .update({ completed, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("*, contacts(name), deals(name)")
      .single();
    if (error) throw error;
    return toTask(data as TaskRow);
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from("tasks").delete().eq("id", id);
    if (error) throw error;
  },
};
