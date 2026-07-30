import { supabase } from "@/lib/supabase";

export interface Contact {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ContactInput {
  name: string;
  company?: string | null;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
}

interface ContactRow {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

function toContact(row: ContactRow): Contact {
  return {
    id: row.id,
    name: row.name,
    company: row.company,
    email: row.email,
    phone: row.phone,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * The data-service seam for contacts: all Supabase calls for this entity
 * go through this module, following the same shape as authService.
 */
export const contactsService = {
  async list(query?: string): Promise<Contact[]> {
    let request = supabase.from("contacts").select("*").order("name");

    if (query) {
      const escaped = query.replace(/[%_]/g, (match) => `\\${match}`);
      request = request.or(`name.ilike.%${escaped}%,company.ilike.%${escaped}%`);
    }

    const { data, error } = await request;
    if (error) throw error;
    return (data as ContactRow[]).map(toContact);
  },

  async get(id: string): Promise<Contact | null> {
    const { data, error } = await supabase
      .from("contacts")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data ? toContact(data as ContactRow) : null;
  },

  async create(input: ContactInput): Promise<Contact> {
    const { data, error } = await supabase
      .from("contacts")
      .insert(input)
      .select("*")
      .single();
    if (error) throw error;
    return toContact(data as ContactRow);
  },

  async update(id: string, input: Partial<ContactInput>): Promise<Contact> {
    const { data, error } = await supabase
      .from("contacts")
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return toContact(data as ContactRow);
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from("contacts").delete().eq("id", id);
    if (error) throw error;
  },
};
