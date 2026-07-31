import { afterAll, beforeAll, describe, expect, test } from "vitest";

import { supabase } from "@/lib/supabase";
import { activitiesService } from "@/services/activitiesService";
import { contactsService } from "@/services/contactsService";
import { dealsService } from "@/services/dealsService";

let testContactId: string;
const createdDealIds: string[] = [];

beforeAll(async () => {
  const { error } = await supabase.auth.signInWithPassword({
    email: "demo@crm-demo.test",
    password: "Demo12345!",
  });
  if (error) throw error;

  const contact = await contactsService.create({ name: "Deals Test Contact" });
  testContactId = contact.id;
});

afterAll(async () => {
  for (const id of createdDealIds) {
    await dealsService.remove(id).catch(() => {});
  }
  await contactsService.remove(testContactId).catch(() => {});
  await supabase.auth.signOut();
});

describe("dealsService", () => {
  test("creates a deal and lists it back with the contact name joined", async () => {
    const deal = await dealsService.create({
      name: "Test Deal — creates and lists",
      value: 5000,
      stage: "new",
      contactId: testContactId,
    });
    createdDealIds.push(deal.id);

    expect(deal.name).toBe("Test Deal — creates and lists");
    expect(deal.stage).toBe("new");
    expect(deal.contactName).toBe("Deals Test Contact");

    const all = await dealsService.list();
    expect(all.some((d) => d.id === deal.id)).toBe(true);
  });

  test("updates a deal's fields", async () => {
    const deal = await dealsService.create({
      name: "Before update",
      value: 1000,
      stage: "new",
      contactId: testContactId,
    });
    createdDealIds.push(deal.id);

    const updated = await dealsService.update(deal.id, { name: "After update", value: 2000 });

    expect(updated.name).toBe("After update");
    expect(updated.value).toBe(2000);
  });

  test("changes a deal's stage", async () => {
    const deal = await dealsService.create({
      name: "Stage change test",
      value: 100,
      stage: "new",
      contactId: testContactId,
    });
    createdDealIds.push(deal.id);

    const moved = await dealsService.changeStage(deal.id, "qualified");

    expect(moved.stage).toBe("qualified");

    const all = await dealsService.list();
    expect(all.find((d) => d.id === deal.id)?.stage).toBe("qualified");
  });

  test("changing a deal's stage records a stage_changed activity", async () => {
    const deal = await dealsService.create({
      name: "Stage change logs activity",
      value: 100,
      stage: "new",
      contactId: testContactId,
    });
    createdDealIds.push(deal.id);

    await dealsService.changeStage(deal.id, "qualified");

    const timeline = await activitiesService.list("deal", deal.id, deal.createdAt);
    expect(timeline[0]).toMatchObject({ type: "stage_changed", fromStage: "new", toStage: "qualified" });
  });

  test("updating a deal's other fields without changing its stage records no activity", async () => {
    const deal = await dealsService.create({
      name: "No stage change, no activity",
      value: 100,
      stage: "new",
      contactId: testContactId,
    });
    createdDealIds.push(deal.id);

    await dealsService.update(deal.id, { name: "Renamed, same stage" });

    const timeline = await activitiesService.list("deal", deal.id, deal.createdAt);
    expect(timeline.every((entry) => entry.type !== "stage_changed")).toBe(true);
  });

  test("deletes a deal", async () => {
    const deal = await dealsService.create({
      name: "To delete",
      value: 1,
      stage: "new",
      contactId: testContactId,
    });

    await dealsService.remove(deal.id);

    const all = await dealsService.list();
    expect(all.some((d) => d.id === deal.id)).toBe(false);
  });
});
