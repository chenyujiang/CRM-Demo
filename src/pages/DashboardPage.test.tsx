import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { DashboardPage } from "@/pages/DashboardPage";
import type { Deal, dealsService as realDealsService } from "@/services/dealsService";
import type { Task, tasksService as realTasksService } from "@/services/tasksService";

function makeDeal(overrides: Partial<Deal>): Deal {
  return {
    id: "deal-1",
    name: "Deal",
    value: 1000,
    stage: "new",
    contactId: "contact-1",
    contactName: "Jane Doe",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeTask(overrides: Partial<Task>): Task {
  return {
    id: "task-1",
    title: "Task",
    dueDate: "2026-01-01",
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

describe("DashboardPage", () => {
  test("shows the four key metrics computed from real deals and tasks data", async () => {
    const dealsService = createFakeDealsService([
      makeDeal({ id: "1", stage: "new", value: 3000 }),
      makeDeal({ id: "2", stage: "qualified", value: 4000 }),
      makeDeal({ id: "3", stage: "won", value: 5000, updatedAt: new Date().toISOString() }),
      makeDeal({ id: "4", stage: "lost", value: 2000 }),
    ]);
    const tasksService = createFakeTasksService([
      makeTask({ id: "1", completed: false }),
      makeTask({ id: "2", completed: false }),
      makeTask({ id: "3", completed: true }),
    ]);

    render(<DashboardPage dealsService={dealsService} tasksService={tasksService} />);

    expect(await screen.findByTestId("metric-open-deals")).toHaveTextContent("2");
    expect(screen.getByTestId("metric-pipeline-value")).toHaveTextContent("$7,000");
    expect(screen.getByTestId("metric-deals-won")).toHaveTextContent("1");
    expect(screen.getByTestId("metric-open-tasks")).toHaveTextContent("2");
  });

  test("renders a chart built from the aggregated data", async () => {
    const dealsService = createFakeDealsService([makeDeal({ id: "1", stage: "new", value: 1000 })]);
    const tasksService = createFakeTasksService([]);

    render(<DashboardPage dealsService={dealsService} tasksService={tasksService} />);

    expect(await screen.findByTestId("pipeline-value-chart")).toBeInTheDocument();
  });

  test("reflects a change in the underlying data", async () => {
    const dealsServiceEmpty = createFakeDealsService([]);
    const tasksServiceEmpty = createFakeTasksService([]);
    const { rerender } = render(
      <DashboardPage dealsService={dealsServiceEmpty} tasksService={tasksServiceEmpty} />,
    );
    expect(await screen.findByTestId("metric-open-deals")).toHaveTextContent("0");

    const dealsServiceWithOne = createFakeDealsService([makeDeal({ id: "1", stage: "new" })]);
    rerender(<DashboardPage dealsService={dealsServiceWithOne} tasksService={tasksServiceEmpty} />);

    expect(await screen.findByTestId("metric-open-deals")).toHaveTextContent("1");
  });
});
