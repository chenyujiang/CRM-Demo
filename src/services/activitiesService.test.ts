import { afterAll, beforeAll, describe, expect, test } from "vitest";

import { supabase } from "@/lib/supabase";
import { activitiesService, buildTimeline, type Activity } from "@/services/activitiesService";
import { contactsService } from "@/services/contactsService";
import { dealsService } from "@/services/dealsService";

describe("buildTimeline", () => {
  test("appends a synthesized 'created' entry after the stored activities", () => {
    const activities: Activity[] = [
      { id: "1", type: "comment", createdAt: "2026-01-03T00:00:00.000Z", body: "hi", authorEmail: "a@test.com" },
    ];

    const timeline = buildTimeline(activities, "entity-1", "2026-01-01T00:00:00.000Z");

    expect(timeline).toEqual([
      activities[0],
      { id: "entity-1-created", type: "created", createdAt: "2026-01-01T00:00:00.000Z" },
    ]);
  });

  test("returns just the 'created' entry when there are no stored activities", () => {
    const timeline = buildTimeline([], "entity-1", "2026-01-01T00:00:00.000Z");

    expect(timeline).toEqual([{ id: "entity-1-created", type: "created", createdAt: "2026-01-01T00:00:00.000Z" }]);
  });

  test("preserves the newest-first order of the stored activities", () => {
    const activities: Activity[] = [
      { id: "2", type: "comment", createdAt: "2026-01-03T00:00:00.000Z", body: "newer", authorEmail: "a@test.com" },
      { id: "1", type: "comment", createdAt: "2026-01-02T00:00:00.000Z", body: "older", authorEmail: "a@test.com" },
    ];

    const timeline = buildTimeline(activities, "entity-1", "2026-01-01T00:00:00.000Z");

    expect(timeline.map((entry) => entry.id)).toEqual(["2", "1", "entity-1-created"]);
  });
});

describe("activitiesService", () => {
  let testContactId: string;

  beforeAll(async () => {
    const { error } = await supabase.auth.signInWithPassword({
      email: "demo@crm-demo.test",
      password: "Demo12345!",
    });
    if (error) throw error;

    const contact = await contactsService.create({ name: "Activities Test Contact" });
    testContactId = contact.id;
  });

  afterAll(async () => {
    await contactsService.remove(testContactId).catch(() => {});
    await supabase.auth.signOut();
  });

  test("create posts a Comment, stamped with the logged-in user's email", async () => {
    const comment = await activitiesService.create("contact", testContactId, "Called about renewal");

    expect(comment.type).toBe("comment");
    expect(comment.body).toBe("Called about renewal");
    expect(comment.authorEmail).toBe("demo@crm-demo.test");
  });

  test("list returns the entity's timeline newest-first, with the synthesized 'created' entry last", async () => {
    const contact = await contactsService.create({ name: "Activities List Test Contact" });

    await activitiesService.create("contact", contact.id, "First comment");
    await activitiesService.create("contact", contact.id, "Second comment");

    const timeline = await activitiesService.list("contact", contact.id, contact.createdAt);

    expect(timeline).toHaveLength(3);
    expect(timeline[0]).toMatchObject({ type: "comment", body: "Second comment" });
    expect(timeline[1]).toMatchObject({ type: "comment", body: "First comment" });
    expect(timeline[2]).toMatchObject({ type: "created", createdAt: contact.createdAt });

    await contactsService.remove(contact.id);
  });

  test("list scopes entries to the given entity, not other entities of the same type", async () => {
    const other = await contactsService.create({ name: "Unrelated Contact" });
    await activitiesService.create("contact", other.id, "Should not leak");

    const timeline = await activitiesService.list("contact", testContactId, "2020-01-01T00:00:00.000Z");

    expect(timeline.some((entry) => "body" in entry && entry.body === "Should not leak")).toBe(false);

    await contactsService.remove(other.id);
  });

  test("recordStageChange writes a stage_changed entry for a deal", async () => {
    const deal = await dealsService.create({
      name: "Activities Test Deal",
      value: 100,
      stage: "new",
      contactId: testContactId,
    });

    await activitiesService.recordStageChange(deal.id, "new", "qualified");

    const timeline = await activitiesService.list("deal", deal.id, deal.createdAt);

    expect(timeline[0]).toMatchObject({ type: "stage_changed", fromStage: "new", toStage: "qualified" });

    await dealsService.remove(deal.id);
  });
});
