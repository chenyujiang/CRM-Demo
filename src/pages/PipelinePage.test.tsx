import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test } from "vitest";

import { filterDeals, handleDealDrop, PipelinePage } from "@/pages/PipelinePage";
import type {
  activitiesService as realActivitiesService,
  CommentActivity,
  TimelineEntry,
} from "@/services/activitiesService";
import type { Contact, contactsService as realContactsService } from "@/services/contactsService";
import type { Deal, dealsService as realDealsService, DealStage } from "@/services/dealsService";
import { renderWithToast } from "@/test/renderWithToast";

function makeContact(overrides: Partial<Contact>): Contact {
  return {
    id: "contact-1",
    name: "Jane Doe",
    company: "Acme Inc",
    email: null,
    phone: null,
    notes: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeDeal(overrides: Partial<Deal>): Deal {
  return {
    id: "deal-1",
    name: "Big Deal",
    value: 1000,
    stage: "new",
    contactId: "contact-1",
    contactName: "Jane Doe",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function createFakeContactsService(seed: Contact[]): typeof realContactsService {
  return {
    async list() {
      return [...seed];
    },
    async get(id) {
      return seed.find((c) => c.id === id) ?? null;
    },
    async create() {
      throw new Error("not used in this test");
    },
    async update() {
      throw new Error("not used in this test");
    },
    async remove() {
      throw new Error("not used in this test");
    },
  };
}

function createFakeDealsService(seed: Deal[]): typeof realDealsService {
  let deals = [...seed];
  let nextId = seed.length + 1;
  const contactsById = new Map(
    seed.map((d) => [d.contactId, d.contactName] as const),
  );

  return {
    async list() {
      return [...deals];
    },
    async create(input) {
      const deal: Deal = {
        id: String(nextId++),
        name: input.name,
        value: input.value,
        stage: input.stage,
        contactId: input.contactId,
        contactName: contactsById.get(input.contactId) ?? "Jane Doe",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      deals = [...deals, deal];
      return deal;
    },
    async update(id, input) {
      const existing = deals.find((d) => d.id === id);
      if (!existing) throw new Error("not found");
      const updated: Deal = { ...existing, ...input, updatedAt: new Date().toISOString() };
      deals = deals.map((d) => (d.id === id ? updated : d));
      return updated;
    },
    async changeStage(id, stage) {
      return this.update(id, { stage });
    },
    async remove(id) {
      deals = deals.filter((d) => d.id !== id);
    },
  };
}

function createFakeActivitiesService(
  seed: TimelineEntry[] = [],
): Pick<typeof realActivitiesService, "list" | "create"> {
  let entries = [...seed];
  let nextId = seed.length + 1;

  return {
    async list() {
      return [...entries];
    },
    async create(_entityType, _entityId, body) {
      const comment: CommentActivity = {
        id: `comment-${nextId++}`,
        type: "comment",
        createdAt: new Date().toISOString(),
        body,
        authorEmail: "demo@crm-demo.test",
      };
      entries = [comment, ...entries];
      return comment;
    },
  };
}

describe("PipelinePage", () => {
  test("renders deals grouped into their stage columns", async () => {
    const contactsService = createFakeContactsService([makeContact({})]);
    const dealsService = createFakeDealsService([
      makeDeal({ id: "1", name: "New Deal", stage: "new" }),
      makeDeal({ id: "2", name: "Qualified Deal", stage: "qualified" }),
    ]);
    renderWithToast(
      <PipelinePage
        dealsService={dealsService}
        contactsService={contactsService}
        activitiesService={createFakeActivitiesService()}
      />,
    );

    expect(await screen.findByText("New Deal")).toBeInTheDocument();
    const newColumn = screen.getByTestId("column-new");
    const qualifiedColumn = screen.getByTestId("column-qualified");
    expect(within(newColumn).getByText("New Deal")).toBeInTheDocument();
    expect(within(qualifiedColumn).getByText("Qualified Deal")).toBeInTheDocument();
    expect(within(newColumn).queryByText("Qualified Deal")).not.toBeInTheDocument();
  });

  test("creates a new deal assigned to a contact and stage", async () => {
    const user = userEvent.setup();
    const contactsService = createFakeContactsService([
      makeContact({ id: "contact-1", name: "Jane Doe" }),
    ]);
    const dealsService = createFakeDealsService([]);
    renderWithToast(
      <PipelinePage
        dealsService={dealsService}
        contactsService={contactsService}
        activitiesService={createFakeActivitiesService()}
      />,
    );
    await screen.findByText(/pipeline/i);

    await user.click(screen.getByRole("button", { name: /add deal/i }));
    const dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByLabelText(/name/i), "Fresh Opportunity");
    await user.clear(within(dialog).getByLabelText(/value/i));
    await user.type(within(dialog).getByLabelText(/value/i), "2500");
    await user.selectOptions(within(dialog).getByLabelText(/contact/i), "contact-1");
    await user.selectOptions(within(dialog).getByLabelText(/stage/i), "qualified");
    await user.click(within(dialog).getByRole("button", { name: /save/i }));

    const qualifiedColumn = await screen.findByTestId("column-qualified");
    expect(within(qualifiedColumn).getByText("Fresh Opportunity")).toBeInTheDocument();
    expect(await screen.findByText(/deal created/i)).toBeInTheDocument();
  });

  test("edits an existing deal", async () => {
    const user = userEvent.setup();
    const contactsService = createFakeContactsService([makeContact({})]);
    const dealsService = createFakeDealsService([
      makeDeal({ id: "1", name: "Original Name", stage: "new" }),
    ]);
    renderWithToast(
      <PipelinePage
        dealsService={dealsService}
        contactsService={contactsService}
        activitiesService={createFakeActivitiesService()}
      />,
    );
    await screen.findByText("Original Name");

    await user.click(screen.getByRole("button", { name: "Original Name" }));
    const viewDialog = await screen.findByRole("dialog");
    await user.click(within(viewDialog).getByRole("button", { name: /edit/i }));

    const editDialog = await screen.findByRole("dialog");
    const nameField = within(editDialog).getByLabelText(/name/i);
    await user.clear(nameField);
    await user.type(nameField, "Renamed Deal");
    await user.click(within(editDialog).getByRole("button", { name: /save/i }));

    expect(await screen.findByText("Renamed Deal")).toBeInTheDocument();
  });

  test("opens a deal's read-only detail view showing its fields", async () => {
    const user = userEvent.setup();
    const contactsService = createFakeContactsService([makeContact({ id: "contact-1", name: "Jane Doe" })]);
    const dealsService = createFakeDealsService([
      makeDeal({ id: "1", name: "Big Deal", value: 5000, stage: "qualified", contactName: "Jane Doe" }),
    ]);
    renderWithToast(
      <PipelinePage
        dealsService={dealsService}
        contactsService={contactsService}
        activitiesService={createFakeActivitiesService()}
      />,
    );
    await screen.findByText("Big Deal");

    await user.click(screen.getByRole("button", { name: "Big Deal" }));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("$5,000")).toBeInTheDocument();
    expect(within(dialog).getByText("Jane Doe")).toBeInTheDocument();
    expect(within(dialog).getByText("Qualified")).toBeInTheDocument();
  });

  test("shows a deal's Activity timeline, including stage-change entries", async () => {
    const user = userEvent.setup();
    const contactsService = createFakeContactsService([makeContact({})]);
    const dealsService = createFakeDealsService([makeDeal({ id: "1", name: "Big Deal" })]);
    const activitiesService = createFakeActivitiesService([
      { id: "1", type: "stage_changed", createdAt: new Date().toISOString(), fromStage: "new", toStage: "qualified" },
    ]);
    renderWithToast(
      <PipelinePage
        dealsService={dealsService}
        contactsService={contactsService}
        activitiesService={activitiesService}
      />,
    );
    await screen.findByText("Big Deal");

    await user.click(screen.getByRole("button", { name: "Big Deal" }));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(/moved from new to qualified/i)).toBeInTheDocument();
  });

  test("posts a new comment to a deal's timeline", async () => {
    const user = userEvent.setup();
    const contactsService = createFakeContactsService([makeContact({})]);
    const dealsService = createFakeDealsService([makeDeal({ id: "1", name: "Big Deal" })]);
    renderWithToast(
      <PipelinePage
        dealsService={dealsService}
        contactsService={contactsService}
        activitiesService={createFakeActivitiesService()}
      />,
    );
    await screen.findByText("Big Deal");

    await user.click(screen.getByRole("button", { name: "Big Deal" }));
    const dialog = await screen.findByRole("dialog");

    await user.type(within(dialog).getByLabelText(/add a comment/i), "Customer wants a discount");
    await user.click(within(dialog).getByRole("button", { name: /post comment/i }));

    expect(await within(dialog).findByText("Customer wants a discount")).toBeInTheDocument();
    expect(await screen.findByText(/comment added/i)).toBeInTheDocument();
  });

  test("deletes a deal", async () => {
    const user = userEvent.setup();
    const contactsService = createFakeContactsService([makeContact({})]);
    const dealsService = createFakeDealsService([
      makeDeal({ id: "1", name: "Doomed Deal", stage: "new" }),
    ]);
    renderWithToast(
      <PipelinePage
        dealsService={dealsService}
        contactsService={contactsService}
        activitiesService={createFakeActivitiesService()}
      />,
    );
    await screen.findByText("Doomed Deal");

    await user.click(screen.getByRole("button", { name: /delete doomed deal/i }));

    await waitFor(() => {
      expect(screen.queryByText("Doomed Deal")).not.toBeInTheDocument();
    });
    expect(await screen.findByText(/deleted doomed deal/i)).toBeInTheDocument();
  });

  test("filters visible deal cards by search", async () => {
    const user = userEvent.setup();
    const contactsService = createFakeContactsService([makeContact({})]);
    const dealsService = createFakeDealsService([
      makeDeal({ id: "1", name: "Platform expansion", stage: "new", contactName: "Ava Thompson" }),
      makeDeal({ id: "2", name: "Renewal", stage: "qualified", contactName: "Isabella Chen" }),
    ]);
    renderWithToast(
      <PipelinePage
        dealsService={dealsService}
        contactsService={contactsService}
        activitiesService={createFakeActivitiesService()}
      />,
    );
    await screen.findByText("Platform expansion");

    await user.type(screen.getByLabelText(/search/i), "Chen");

    await waitFor(() => {
      expect(screen.queryByText("Platform expansion")).not.toBeInTheDocument();
    });
    expect(screen.getByText("Renewal")).toBeInTheDocument();
  });
});

describe("handleDealDrop", () => {
  const deals: Deal[] = [makeDeal({ id: "1", stage: "new" })];

  test("resolves a stage change when dropped on a different column", () => {
    const result = handleDealDrop(
      { active: { id: "1" }, over: { id: "qualified" as DealStage } } as never,
      deals,
    );
    expect(result).toEqual({ dealId: "1", stage: "qualified" });
  });

  test("resolves nothing when dropped outside any column", () => {
    const result = handleDealDrop({ active: { id: "1" }, over: null } as never, deals);
    expect(result).toBeNull();
  });

  test("resolves nothing when dropped back on the same column", () => {
    const result = handleDealDrop(
      { active: { id: "1" }, over: { id: "new" as DealStage } } as never,
      deals,
    );
    expect(result).toBeNull();
  });

  test("resolves nothing for an unknown deal id", () => {
    const result = handleDealDrop(
      { active: { id: "missing" }, over: { id: "qualified" as DealStage } } as never,
      deals,
    );
    expect(result).toBeNull();
  });
});

describe("filterDeals", () => {
  const deals: Deal[] = [
    makeDeal({ id: "1", name: "Platform expansion", contactName: "Ava Thompson" }),
    makeDeal({ id: "2", name: "Renewal", contactName: "Isabella Chen" }),
  ];

  test("matches by deal name, case-insensitively", () => {
    expect(filterDeals(deals, "platform").map((deal) => deal.id)).toEqual(["1"]);
  });

  test("matches by contact name", () => {
    expect(filterDeals(deals, "chen").map((deal) => deal.id)).toEqual(["2"]);
  });

  test("returns every deal for a blank query", () => {
    expect(filterDeals(deals, "   ")).toEqual(deals);
  });

  test("returns nothing for a query that matches no deal", () => {
    expect(filterDeals(deals, "nonexistent")).toEqual([]);
  });
});
