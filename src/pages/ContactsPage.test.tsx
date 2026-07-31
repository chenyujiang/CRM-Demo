import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test } from "vitest";

import { ContactsPage } from "@/pages/ContactsPage";
import type {
  Contact,
  contactsService as realContactsService,
} from "@/services/contactsService";
import type { Deal, dealsService as realDealsService } from "@/services/dealsService";
import type { Task, tasksService as realTasksService } from "@/services/tasksService";
import { renderWithToast } from "@/test/renderWithToast";

/**
 * A fake implementing the same shape as the real contactsService — the
 * data-service seam in action for UI tests, same pattern as authService's
 * fake in AppRoutes.test.tsx.
 */
function createFakeContactsService(seed: Contact[]): typeof realContactsService {
  let contacts = [...seed];
  let nextId = seed.length + 1;

  return {
    async list(query) {
      if (!query) return [...contacts];
      const q = query.toLowerCase();
      return contacts.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.company ?? "").toLowerCase().includes(q),
      );
    },
    async get(id) {
      return contacts.find((c) => c.id === id) ?? null;
    },
    async create(input) {
      const contact: Contact = {
        id: String(nextId++),
        name: input.name,
        company: input.company ?? null,
        email: input.email ?? null,
        phone: input.phone ?? null,
        notes: input.notes ?? null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      contacts = [...contacts, contact];
      return contact;
    },
    async update(id, input) {
      const existing = contacts.find((c) => c.id === id);
      if (!existing) throw new Error("not found");
      const updated: Contact = { ...existing, ...input, updatedAt: new Date().toISOString() };
      contacts = contacts.map((c) => (c.id === id ? updated : c));
      return updated;
    },
    async remove(id) {
      contacts = contacts.filter((c) => c.id !== id);
    },
  };
}

function makeContact(overrides: Partial<Contact>): Contact {
  return {
    id: "1",
    name: "Jane Doe",
    company: "Acme Inc",
    email: "jane@acme.test",
    phone: "555-1234",
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
    contactId: "1",
    contactName: "Jane Doe",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeTask(overrides: Partial<Task>): Task {
  return {
    id: "task-1",
    title: "Follow up",
    dueDate: "2026-01-01",
    completed: false,
    contactId: "1",
    contactName: "Jane Doe",
    dealId: null,
    dealName: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function createFakeDealsService(seed: Deal[]): Pick<typeof realDealsService, "list"> {
  return {
    async list() {
      return [...seed];
    },
  };
}

function createFakeTasksService(seed: Task[]): Pick<typeof realTasksService, "list"> {
  return {
    async list() {
      return [...seed];
    },
  };
}

describe("ContactsPage", () => {
  test("lists contacts on load", async () => {
    const service = createFakeContactsService([
      makeContact({ id: "1", name: "Jane Doe", company: "Acme Inc" }),
      makeContact({ id: "2", name: "Bob Smith", company: "Globex" }),
    ]);
    renderWithToast(
      <ContactsPage
        contactsService={service}
        dealsService={createFakeDealsService([])}
        tasksService={createFakeTasksService([])}
      />,
    );

    expect(await screen.findByText("Jane Doe")).toBeInTheDocument();
    expect(screen.getByText("Bob Smith")).toBeInTheDocument();
  });

  test("opens a contact's detail view showing all its fields, including notes", async () => {
    const user = userEvent.setup();
    const service = createFakeContactsService([
      makeContact({
        id: "1",
        name: "Jane Doe",
        company: "Acme Inc",
        email: "jane@acme.test",
        phone: "555-1234",
        notes: "Met at the spring conference.",
      }),
    ]);
    renderWithToast(
      <ContactsPage
        contactsService={service}
        dealsService={createFakeDealsService([])}
        tasksService={createFakeTasksService([])}
      />,
    );
    await screen.findByText("Jane Doe");

    await user.click(screen.getByRole("button", { name: "Jane Doe" }));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Jane Doe")).toBeInTheDocument();
    expect(within(dialog).getByText("Acme Inc")).toBeInTheDocument();
    expect(within(dialog).getByText("jane@acme.test")).toBeInTheDocument();
    expect(within(dialog).getByText("555-1234")).toBeInTheDocument();
    expect(within(dialog).getByText("Met at the spring conference.")).toBeInTheDocument();
  });

  test("shows a contact's linked deals and tasks in its detail view", async () => {
    const user = userEvent.setup();
    const service = createFakeContactsService([
      makeContact({ id: "1", name: "Jane Doe" }),
      makeContact({ id: "2", name: "Bob Smith" }),
    ]);
    const dealsService = createFakeDealsService([
      makeDeal({ id: "deal-1", name: "Jane's Deal", contactId: "1" }),
      makeDeal({ id: "deal-2", name: "Bob's Deal", contactId: "2" }),
    ]);
    const tasksService = createFakeTasksService([
      makeTask({ id: "task-1", title: "Follow up with Jane", contactId: "1" }),
      makeTask({ id: "task-2", title: "Follow up with Bob", contactId: "2" }),
    ]);
    renderWithToast(
      <ContactsPage contactsService={service} dealsService={dealsService} tasksService={tasksService} />,
    );
    await screen.findByText("Jane Doe");

    await user.click(screen.getByRole("button", { name: "Jane Doe" }));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Jane's Deal")).toBeInTheDocument();
    expect(within(dialog).queryByText("Bob's Deal")).not.toBeInTheDocument();
    expect(within(dialog).getByText("Follow up with Jane")).toBeInTheDocument();
    expect(within(dialog).queryByText("Follow up with Bob")).not.toBeInTheDocument();
  });

  test("shows empty states for a contact with no linked deals or tasks", async () => {
    const user = userEvent.setup();
    const service = createFakeContactsService([makeContact({ id: "1", name: "Jane Doe" })]);
    renderWithToast(
      <ContactsPage
        contactsService={service}
        dealsService={createFakeDealsService([])}
        tasksService={createFakeTasksService([])}
      />,
    );
    await screen.findByText("Jane Doe");

    await user.click(screen.getByRole("button", { name: "Jane Doe" }));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(/no deals yet/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/no tasks yet/i)).toBeInTheDocument();
  });

  test("moves from the detail view into editing", async () => {
    const user = userEvent.setup();
    const service = createFakeContactsService([
      makeContact({ id: "1", name: "Jane Doe", company: "Acme Inc" }),
    ]);
    renderWithToast(
      <ContactsPage
        contactsService={service}
        dealsService={createFakeDealsService([])}
        tasksService={createFakeTasksService([])}
      />,
    );
    await screen.findByText("Jane Doe");

    await user.click(screen.getByRole("button", { name: "Jane Doe" }));
    const detailDialog = await screen.findByRole("dialog");
    await user.click(within(detailDialog).getByRole("button", { name: /edit/i }));

    const editDialog = await screen.findByRole("dialog");
    const nameField = within(editDialog).getByLabelText(/^name/i);
    await user.clear(nameField);
    await user.type(nameField, "Jane Updated");
    await user.click(within(editDialog).getByRole("button", { name: /save/i }));

    expect(await screen.findByText("Jane Updated")).toBeInTheDocument();
  });

  test("filters the list by search", async () => {
    const user = userEvent.setup();
    const service = createFakeContactsService([
      makeContact({ id: "1", name: "Jane Doe", company: "Acme Inc" }),
      makeContact({ id: "2", name: "Bob Smith", company: "Globex" }),
    ]);
    renderWithToast(
      <ContactsPage
        contactsService={service}
        dealsService={createFakeDealsService([])}
        tasksService={createFakeTasksService([])}
      />,
    );
    await screen.findByText("Jane Doe");

    await user.type(screen.getByLabelText(/search/i), "Globex");

    await waitFor(() => {
      expect(screen.queryByText("Jane Doe")).not.toBeInTheDocument();
    });
    expect(screen.getByText("Bob Smith")).toBeInTheDocument();
  });

  test("creates a new contact", async () => {
    const user = userEvent.setup();
    const service = createFakeContactsService([]);
    renderWithToast(
      <ContactsPage
        contactsService={service}
        dealsService={createFakeDealsService([])}
        tasksService={createFakeTasksService([])}
      />,
    );
    await screen.findByText(/no contacts yet/i);

    await user.click(screen.getByRole("button", { name: /add contact/i }));

    const dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByLabelText(/^name/i), "New Person");
    await user.type(within(dialog).getByLabelText(/company/i), "New Co");
    await user.click(within(dialog).getByRole("button", { name: /save/i }));

    expect(await screen.findByText("New Person")).toBeInTheDocument();
    expect(screen.getByText("New Co")).toBeInTheDocument();
    expect(await screen.findByRole("status")).toHaveTextContent(/contact created/i);
  });

  test("edits an existing contact", async () => {
    const user = userEvent.setup();
    const service = createFakeContactsService([
      makeContact({ id: "1", name: "Jane Doe", company: "Acme Inc" }),
    ]);
    renderWithToast(
      <ContactsPage
        contactsService={service}
        dealsService={createFakeDealsService([])}
        tasksService={createFakeTasksService([])}
      />,
    );
    await screen.findByText("Jane Doe");

    await user.click(screen.getByRole("button", { name: /edit jane doe/i }));

    const dialog = await screen.findByRole("dialog");
    const nameField = within(dialog).getByLabelText(/^name/i);
    await user.clear(nameField);
    await user.type(nameField, "Jane Updated");
    await user.click(within(dialog).getByRole("button", { name: /save/i }));

    expect(await screen.findByText("Jane Updated")).toBeInTheDocument();
    expect(screen.queryByText("Jane Doe")).not.toBeInTheDocument();
  });

  test("deletes a contact", async () => {
    const user = userEvent.setup();
    const service = createFakeContactsService([
      makeContact({ id: "1", name: "Jane Doe", company: "Acme Inc" }),
    ]);
    renderWithToast(
      <ContactsPage
        contactsService={service}
        dealsService={createFakeDealsService([])}
        tasksService={createFakeTasksService([])}
      />,
    );
    await screen.findByText("Jane Doe");

    await user.click(screen.getByRole("button", { name: /delete jane doe/i }));

    await waitFor(() => {
      expect(screen.queryByText("Jane Doe")).not.toBeInTheDocument();
    });
    expect(await screen.findByRole("status")).toHaveTextContent(/deleted jane doe/i);
  });
});
