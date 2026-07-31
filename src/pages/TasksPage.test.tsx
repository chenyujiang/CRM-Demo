import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test } from "vitest";

import { filterTasks, getTaskUrgency, TasksPage } from "@/pages/TasksPage";
import type { Contact, contactsService as realContactsService } from "@/services/contactsService";
import type { Deal, dealsService as realDealsService } from "@/services/dealsService";
import type { Task, tasksService as realTasksService } from "@/services/tasksService";
import { renderWithToast } from "@/test/renderWithToast";

function isoDateOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function makeTask(overrides: Partial<Task>): Task {
  return {
    id: "task-1",
    title: "Follow up",
    dueDate: isoDateOffset(0),
    completed: false,
    contactId: null,
    contactName: null,
    dealId: null,
    dealName: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

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
  return {
    async list() {
      return [...seed];
    },
    async create() {
      throw new Error("not used in this test");
    },
    async update() {
      throw new Error("not used in this test");
    },
    async changeStage() {
      throw new Error("not used in this test");
    },
    async remove() {
      throw new Error("not used in this test");
    },
  };
}

function createFakeTasksService(seed: Task[]): typeof realTasksService {
  let tasks = [...seed];
  let nextId = seed.length + 1;

  return {
    async list() {
      return [...tasks].sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1));
    },
    async create(input) {
      const task: Task = {
        id: String(nextId++),
        title: input.title,
        dueDate: input.dueDate,
        completed: false,
        contactId: input.contactId ?? null,
        contactName: input.contactId ? "Jane Doe" : null,
        dealId: input.dealId ?? null,
        dealName: input.dealId ? "Big Deal" : null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      tasks = [...tasks, task];
      return task;
    },
    async update(id, input) {
      const existing = tasks.find((t) => t.id === id);
      if (!existing) throw new Error("not found");
      const updated: Task = { ...existing, ...input, updatedAt: new Date().toISOString() };
      tasks = tasks.map((t) => (t.id === id ? updated : t));
      return updated;
    },
    async markComplete(id, completed) {
      const existing = tasks.find((t) => t.id === id);
      if (!existing) throw new Error("not found");
      const updated: Task = { ...existing, completed };
      tasks = tasks.map((t) => (t.id === id ? updated : t));
      return updated;
    },
    async remove(id) {
      tasks = tasks.filter((t) => t.id !== id);
    },
  };
}

describe("TasksPage", () => {
  test("lists tasks with title, due date, and linked contact/deal", async () => {
    const tasksService = createFakeTasksService([
      makeTask({ id: "1", title: "Call Jane", contactName: "Jane Doe" }),
      makeTask({ id: "2", title: "Close the deal", dealName: "Big Deal" }),
    ]);
    renderWithToast(
      <TasksPage
        tasksService={tasksService}
        contactsService={createFakeContactsService([])}
        dealsService={createFakeDealsService([])}
      />,
    );

    expect(await screen.findByText("Call Jane")).toBeInTheDocument();
    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    expect(screen.getByText("Close the deal")).toBeInTheDocument();
    expect(screen.getByText("Big Deal")).toBeInTheDocument();
  });

  test("visually distinguishes overdue and due-soon tasks", async () => {
    const tasksService = createFakeTasksService([
      makeTask({ id: "1", title: "Task A", dueDate: isoDateOffset(-2) }),
      makeTask({ id: "2", title: "Task B", dueDate: isoDateOffset(1) }),
      makeTask({ id: "3", title: "Task C", dueDate: isoDateOffset(30) }),
    ]);
    renderWithToast(
      <TasksPage
        tasksService={tasksService}
        contactsService={createFakeContactsService([])}
        dealsService={createFakeDealsService([])}
      />,
    );

    const overdueRow = await screen.findByTestId("task-row-1");
    const dueSoonRow = screen.getByTestId("task-row-2");
    const futureRow = screen.getByTestId("task-row-3");

    expect(within(overdueRow).getByText(/overdue/i)).toBeInTheDocument();
    expect(within(dueSoonRow).getByText(/due soon/i)).toBeInTheDocument();
    expect(within(futureRow).queryByText(/overdue/i)).not.toBeInTheDocument();
    expect(within(futureRow).queryByText(/due soon/i)).not.toBeInTheDocument();
  });

  test("creates a new task optionally linked to a contact", async () => {
    const user = userEvent.setup();
    const tasksService = createFakeTasksService([]);
    renderWithToast(
      <TasksPage
        tasksService={tasksService}
        contactsService={createFakeContactsService([makeContact({ id: "contact-1", name: "Jane Doe" })])}
        dealsService={createFakeDealsService([])}
      />,
    );
    await screen.findByText(/no tasks yet/i);

    await user.click(screen.getByRole("button", { name: /add task/i }));
    const dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByLabelText(/title/i), "New follow-up");
    await user.selectOptions(within(dialog).getByLabelText(/contact/i), "contact-1");
    await user.click(within(dialog).getByRole("button", { name: /save/i }));

    expect(await screen.findByText("New follow-up")).toBeInTheDocument();
    expect(await screen.findByText(/task created/i)).toBeInTheDocument();
  });

  test("edits an existing task", async () => {
    const user = userEvent.setup();
    const tasksService = createFakeTasksService([makeTask({ id: "1", title: "Original title" })]);
    renderWithToast(
      <TasksPage
        tasksService={tasksService}
        contactsService={createFakeContactsService([])}
        dealsService={createFakeDealsService([])}
      />,
    );
    await screen.findByText("Original title");

    await user.click(screen.getByRole("button", { name: "Original title" }));
    const dialog = await screen.findByRole("dialog");
    const titleField = within(dialog).getByLabelText(/title/i);
    await user.clear(titleField);
    await user.type(titleField, "Renamed task");
    await user.click(within(dialog).getByRole("button", { name: /save/i }));

    expect(await screen.findByText("Renamed task")).toBeInTheDocument();
  });

  test("marks a task complete", async () => {
    const user = userEvent.setup();
    const tasksService = createFakeTasksService([makeTask({ id: "1", title: "Mark me done" })]);
    renderWithToast(
      <TasksPage
        tasksService={tasksService}
        contactsService={createFakeContactsService([])}
        dealsService={createFakeDealsService([])}
      />,
    );
    await screen.findByText("Mark me done");

    await user.click(screen.getByRole("checkbox", { name: /mark me done/i }));

    await waitFor(() => {
      expect(screen.getByRole("checkbox", { name: /mark me done/i })).toBeChecked();
    });
    expect(await screen.findByText(/marked complete/i)).toBeInTheDocument();
  });

  test("deletes a task", async () => {
    const user = userEvent.setup();
    const tasksService = createFakeTasksService([makeTask({ id: "1", title: "Doomed task" })]);
    renderWithToast(
      <TasksPage
        tasksService={tasksService}
        contactsService={createFakeContactsService([])}
        dealsService={createFakeDealsService([])}
      />,
    );
    await screen.findByText("Doomed task");

    await user.click(screen.getByRole("button", { name: /delete doomed task/i }));

    await waitFor(() => {
      expect(screen.queryByText("Doomed task")).not.toBeInTheDocument();
    });
    expect(await screen.findByText(/deleted doomed task/i)).toBeInTheDocument();
  });

  test("filters visible tasks by search", async () => {
    const user = userEvent.setup();
    const tasksService = createFakeTasksService([
      makeTask({ id: "1", title: "Call Jane", contactName: "Jane Doe", dueDate: isoDateOffset(1) }),
      makeTask({ id: "2", title: "Prepare contract", dealName: "Big Deal", dueDate: isoDateOffset(2) }),
    ]);
    renderWithToast(
      <TasksPage
        tasksService={tasksService}
        contactsService={createFakeContactsService([])}
        dealsService={createFakeDealsService([])}
      />,
    );
    await screen.findByText("Call Jane");

    await user.type(screen.getByLabelText(/search/i), "Big Deal");

    await waitFor(() => {
      expect(screen.queryByText("Call Jane")).not.toBeInTheDocument();
    });
    expect(screen.getByText("Prepare contract")).toBeInTheDocument();
  });
});

describe("getTaskUrgency", () => {
  test("is overdue for a past due date that isn't completed", () => {
    expect(getTaskUrgency(isoDateOffset(-1), false)).toBe("overdue");
  });

  test("is due-soon for today through the next few days", () => {
    expect(getTaskUrgency(isoDateOffset(0), false)).toBe("due-soon");
    expect(getTaskUrgency(isoDateOffset(3), false)).toBe("due-soon");
  });

  test("is normal for a date further in the future", () => {
    expect(getTaskUrgency(isoDateOffset(10), false)).toBe("normal");
  });

  test("is normal for a completed task even if overdue", () => {
    expect(getTaskUrgency(isoDateOffset(-5), true)).toBe("normal");
  });
});

describe("filterTasks", () => {
  const tasks: Task[] = [
    makeTask({ id: "1", title: "Call Jane", contactName: "Jane Doe", dealName: null }),
    makeTask({ id: "2", title: "Prepare contract", contactName: null, dealName: "Big Deal" }),
  ];

  test("matches by title, case-insensitively", () => {
    expect(filterTasks(tasks, "call").map((task) => task.id)).toEqual(["1"]);
  });

  test("matches by linked contact name", () => {
    expect(filterTasks(tasks, "jane doe").map((task) => task.id)).toEqual(["1"]);
  });

  test("matches by linked deal name", () => {
    expect(filterTasks(tasks, "big deal").map((task) => task.id)).toEqual(["2"]);
  });

  test("returns every task for a blank query", () => {
    expect(filterTasks(tasks, "   ")).toEqual(tasks);
  });

  test("returns nothing for a query that matches no task", () => {
    expect(filterTasks(tasks, "nonexistent")).toEqual([]);
  });
});
