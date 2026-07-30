import { afterAll, beforeAll, describe, expect, test } from "vitest";

import { supabase } from "@/lib/supabase";
import { contactsService } from "@/services/contactsService";
import { tasksService } from "@/services/tasksService";

let testContactId: string;
const createdTaskIds: string[] = [];

beforeAll(async () => {
  const { error } = await supabase.auth.signInWithPassword({
    email: "demo@crm-demo.test",
    password: "Demo12345!",
  });
  if (error) throw error;

  const contact = await contactsService.create({ name: "Tasks Test Contact" });
  testContactId = contact.id;
});

afterAll(async () => {
  for (const id of createdTaskIds) {
    await tasksService.remove(id).catch(() => {});
  }
  await contactsService.remove(testContactId).catch(() => {});
  await supabase.auth.signOut();
});

describe("tasksService", () => {
  test("creates a task and lists it back, optionally linked to a contact", async () => {
    const task = await tasksService.create({
      title: "Test Task — creates and lists",
      dueDate: "2026-01-01",
      contactId: testContactId,
    });
    createdTaskIds.push(task.id);

    expect(task.title).toBe("Test Task — creates and lists");
    expect(task.completed).toBe(false);
    expect(task.contactName).toBe("Tasks Test Contact");

    const all = await tasksService.list();
    expect(all.some((t) => t.id === task.id)).toBe(true);
  });

  test("creates a task with no linked contact or deal", async () => {
    const task = await tasksService.create({
      title: "Unlinked task",
      dueDate: "2026-01-01",
    });
    createdTaskIds.push(task.id);

    expect(task.contactId).toBeNull();
    expect(task.dealId).toBeNull();
  });

  test("updates a task's fields", async () => {
    const task = await tasksService.create({
      title: "Before update",
      dueDate: "2026-01-01",
    });
    createdTaskIds.push(task.id);

    const updated = await tasksService.update(task.id, {
      title: "After update",
      dueDate: "2026-02-01",
    });

    expect(updated.title).toBe("After update");
    expect(updated.dueDate).toBe("2026-02-01");
  });

  test("marks a task complete and incomplete", async () => {
    const task = await tasksService.create({
      title: "Mark complete test",
      dueDate: "2026-01-01",
    });
    createdTaskIds.push(task.id);

    const completed = await tasksService.markComplete(task.id, true);
    expect(completed.completed).toBe(true);

    const reopened = await tasksService.markComplete(task.id, false);
    expect(reopened.completed).toBe(false);
  });

  test("deletes a task", async () => {
    const task = await tasksService.create({
      title: "To delete",
      dueDate: "2026-01-01",
    });

    await tasksService.remove(task.id);

    const all = await tasksService.list();
    expect(all.some((t) => t.id === task.id)).toBe(false);
  });
});
