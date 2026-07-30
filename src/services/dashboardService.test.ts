import { describe, expect, test } from "vitest";

import { computeDashboardMetrics, dashboardService } from "@/services/dashboardService";
import type { Deal } from "@/services/dealsService";
import type { Task } from "@/services/tasksService";

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

const now = new Date("2026-07-15T12:00:00");

describe("computeDashboardMetrics", () => {
  test("counts open deals and sums their value, excluding won/lost", () => {
    const deals = [
      makeDeal({ id: "1", stage: "new", value: 1000 }),
      makeDeal({ id: "2", stage: "qualified", value: 2000 }),
      makeDeal({ id: "3", stage: "won", value: 5000 }),
      makeDeal({ id: "4", stage: "lost", value: 3000 }),
    ];

    const metrics = computeDashboardMetrics(deals, [], now);

    expect(metrics.openDealsCount).toBe(2);
    expect(metrics.totalPipelineValue).toBe(3000);
  });

  test("counts deals won within the current calendar month", () => {
    const deals = [
      makeDeal({ id: "1", stage: "won", updatedAt: "2026-07-10T00:00:00.000Z" }),
      makeDeal({ id: "2", stage: "won", updatedAt: "2026-07-01T00:00:00.000Z" }),
      makeDeal({ id: "3", stage: "won", updatedAt: "2026-06-30T00:00:00.000Z" }),
      makeDeal({ id: "4", stage: "lost", updatedAt: "2026-07-10T00:00:00.000Z" }),
    ];

    const metrics = computeDashboardMetrics(deals, [], now);

    expect(metrics.dealsWonThisPeriod).toBe(2);
  });

  test("counts open (incomplete) tasks", () => {
    const tasks = [
      makeTask({ id: "1", completed: false }),
      makeTask({ id: "2", completed: false }),
      makeTask({ id: "3", completed: true }),
    ];

    const metrics = computeDashboardMetrics([], tasks, now);

    expect(metrics.openTaskCount).toBe(2);
  });

  test("sums deal value per stage across all six stages", () => {
    const deals = [
      makeDeal({ id: "1", stage: "new", value: 1000 }),
      makeDeal({ id: "2", stage: "new", value: 500 }),
      makeDeal({ id: "3", stage: "qualified", value: 2000 }),
    ];

    const metrics = computeDashboardMetrics(deals, [], now);

    expect(metrics.valueByStage).toEqual([
      { stage: "new", value: 1500 },
      { stage: "qualified", value: 2000 },
      { stage: "proposal", value: 0 },
      { stage: "negotiation", value: 0 },
      { stage: "won", value: 0 },
      { stage: "lost", value: 0 },
    ]);
  });

  test("handles no deals or tasks", () => {
    const metrics = computeDashboardMetrics([], [], now);

    expect(metrics.openDealsCount).toBe(0);
    expect(metrics.totalPipelineValue).toBe(0);
    expect(metrics.dealsWonThisPeriod).toBe(0);
    expect(metrics.openTaskCount).toBe(0);
  });
});

describe("dashboardService.getMetrics", () => {
  test("composes metrics from the injected deals and tasks services, without its own data access", async () => {
    const fakeDealsService = {
      async list() {
        return [makeDeal({ id: "1", stage: "new", value: 4000 })];
      },
    };
    const fakeTasksService = {
      async list() {
        return [makeTask({ id: "1", completed: false })];
      },
    };

    const metrics = await dashboardService.getMetrics(fakeDealsService, fakeTasksService);

    expect(metrics.openDealsCount).toBe(1);
    expect(metrics.totalPipelineValue).toBe(4000);
    expect(metrics.openTaskCount).toBe(1);
  });
});
