import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test } from "vitest";

import { handleDealDrop, PipelinePage } from "@/pages/PipelinePage";
import type { Contact, contactsService as realContactsService } from "@/services/contactsService";
import type { Deal, dealsService as realDealsService, DealStage } from "@/services/dealsService";

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

describe("PipelinePage", () => {
  test("renders deals grouped into their stage columns", async () => {
    const contactsService = createFakeContactsService([makeContact({})]);
    const dealsService = createFakeDealsService([
      makeDeal({ id: "1", name: "New Deal", stage: "new" }),
      makeDeal({ id: "2", name: "Qualified Deal", stage: "qualified" }),
    ]);
    render(<PipelinePage dealsService={dealsService} contactsService={contactsService} />);

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
    render(<PipelinePage dealsService={dealsService} contactsService={contactsService} />);
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
  });

  test("edits an existing deal", async () => {
    const user = userEvent.setup();
    const contactsService = createFakeContactsService([makeContact({})]);
    const dealsService = createFakeDealsService([
      makeDeal({ id: "1", name: "Original Name", stage: "new" }),
    ]);
    render(<PipelinePage dealsService={dealsService} contactsService={contactsService} />);
    await screen.findByText("Original Name");

    await user.click(screen.getByRole("button", { name: "Original Name" }));
    const dialog = await screen.findByRole("dialog");
    const nameField = within(dialog).getByLabelText(/name/i);
    await user.clear(nameField);
    await user.type(nameField, "Renamed Deal");
    await user.click(within(dialog).getByRole("button", { name: /save/i }));

    expect(await screen.findByText("Renamed Deal")).toBeInTheDocument();
  });

  test("deletes a deal", async () => {
    const user = userEvent.setup();
    const contactsService = createFakeContactsService([makeContact({})]);
    const dealsService = createFakeDealsService([
      makeDeal({ id: "1", name: "Doomed Deal", stage: "new" }),
    ]);
    render(<PipelinePage dealsService={dealsService} contactsService={contactsService} />);
    await screen.findByText("Doomed Deal");

    await user.click(screen.getByRole("button", { name: /delete doomed deal/i }));

    await waitFor(() => {
      expect(screen.queryByText("Doomed Deal")).not.toBeInTheDocument();
    });
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
