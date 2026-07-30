import { dealsService as defaultDealsService, type Deal, type DealStage } from "@/services/dealsService";
import { tasksService as defaultTasksService, type Task } from "@/services/tasksService";

const CLOSED_STAGES: DealStage[] = ["won", "lost"];
const STAGE_ORDER: DealStage[] = ["new", "qualified", "proposal", "negotiation", "won", "lost"];

export interface DashboardMetrics {
  openDealsCount: number;
  totalPipelineValue: number;
  dealsWonThisPeriod: number;
  openTaskCount: number;
  valueByStage: { stage: DealStage; value: number }[];
}

/**
 * The dashboard's aggregation logic: pure, given the deals and tasks already
 * fetched through their own seams, so it's directly testable without a
 * network round trip and never duplicates how deals/tasks are read.
 */
export function computeDashboardMetrics(
  deals: Deal[],
  tasks: Task[],
  now: Date = new Date(),
): DashboardMetrics {
  const openDeals = deals.filter((deal) => !CLOSED_STAGES.includes(deal.stage));

  const dealsWonThisPeriod = deals.filter((deal) => {
    if (deal.stage !== "won") return false;
    const updated = new Date(deal.updatedAt);
    return updated.getFullYear() === now.getFullYear() && updated.getMonth() === now.getMonth();
  }).length;

  const valueByStage = STAGE_ORDER.map((stage) => ({
    stage,
    value: deals
      .filter((deal) => deal.stage === stage)
      .reduce((sum, deal) => sum + deal.value, 0),
  }));

  return {
    openDealsCount: openDeals.length,
    totalPipelineValue: openDeals.reduce((sum, deal) => sum + deal.value, 0),
    dealsWonThisPeriod,
    openTaskCount: tasks.filter((task) => !task.completed).length,
    valueByStage,
  };
}

interface DealsSource {
  list: typeof defaultDealsService.list;
}

interface TasksSource {
  list: typeof defaultTasksService.list;
}

/**
 * The dashboard has no table or seam of its own — it composes the existing
 * dealsService/tasksService seams, so callers pass those in (real or fake)
 * rather than this module owning its own Supabase access.
 */
export const dashboardService = {
  async getMetrics(
    dealsService: DealsSource = defaultDealsService,
    tasksService: TasksSource = defaultTasksService,
  ): Promise<DashboardMetrics> {
    const [deals, tasks] = await Promise.all([dealsService.list(), tasksService.list()]);
    return computeDashboardMetrics(deals, tasks);
  },
};
