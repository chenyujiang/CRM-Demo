import { afterAll, beforeAll, describe, expect, test } from "vitest";

import { supabase } from "@/lib/supabase";
import { contactsService } from "@/services/contactsService";

const createdIds: string[] = [];

beforeAll(async () => {
  const { error } = await supabase.auth.signInWithPassword({
    email: "demo@crm-demo.test",
    password: "Demo12345!",
  });
  if (error) throw error;
});

afterAll(async () => {
  for (const id of createdIds) {
    await contactsService.remove(id).catch(() => {});
  }
  await supabase.auth.signOut();
});

describe("contactsService", () => {
  test("creates a contact and lists it back", async () => {
    const contact = await contactsService.create({
      name: "Test Contact — creates and lists",
      company: "Acme Testing Co",
      email: "test-create@example.com",
      phone: "555-0100",
      notes: "created by a test",
    });
    createdIds.push(contact.id);

    expect(contact.name).toBe("Test Contact — creates and lists");
    expect(contact.company).toBe("Acme Testing Co");

    const all = await contactsService.list();
    expect(all.some((c) => c.id === contact.id)).toBe(true);
  });

  test("updates a contact", async () => {
    const contact = await contactsService.create({
      name: "Test Contact — before update",
      company: "Old Co",
    });
    createdIds.push(contact.id);

    const updated = await contactsService.update(contact.id, {
      name: "Test Contact — after update",
      company: "New Co",
    });

    expect(updated.id).toBe(contact.id);
    expect(updated.name).toBe("Test Contact — after update");
    expect(updated.company).toBe("New Co");
  });

  test("deletes a contact", async () => {
    const contact = await contactsService.create({
      name: "Test Contact — to delete",
    });

    await contactsService.remove(contact.id);

    const all = await contactsService.list();
    expect(all.some((c) => c.id === contact.id)).toBe(false);
  });

  test("searches contacts by name or company", async () => {
    const unique = `Zzyx-${Date.now()}`;
    const byName = await contactsService.create({
      name: `${unique} Solo`,
      company: "Unrelated Co",
    });
    const byCompany = await contactsService.create({
      name: "Someone Else",
      company: `${unique} Industries`,
    });
    const nonMatch = await contactsService.create({
      name: "No Match Here",
      company: "No Match Co",
    });
    createdIds.push(byName.id, byCompany.id, nonMatch.id);

    const results = await contactsService.list(unique);
    const resultIds = results.map((c) => c.id);

    expect(resultIds).toContain(byName.id);
    expect(resultIds).toContain(byCompany.id);
    expect(resultIds).not.toContain(nonMatch.id);
  });
});
