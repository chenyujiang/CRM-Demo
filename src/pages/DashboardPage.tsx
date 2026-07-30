import * as React from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  dashboardService as defaultDashboardService,
  type DashboardMetrics,
} from "@/services/dashboardService";
import { dealsService as defaultDealsService, type DealStage } from "@/services/dealsService";
import { tasksService as defaultTasksService } from "@/services/tasksService";

const stageLabels: Record<DealStage, string> = {
  new: "New",
  qualified: "Qualified",
  proposal: "Proposal",
  negotiation: "Negotiation",
  won: "Won",
  lost: "Lost",
};

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

interface StatTileProps {
  label: string;
  value: string;
  testId: string;
}

function StatTile({ label, value, testId }: StatTileProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <p className="text-sm text-muted-foreground">{label}</p>
      </CardHeader>
      <CardContent>
        <p data-testid={testId} className="text-2xl font-semibold">
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

export interface DashboardPageProps {
  /** The dashboard has no seam of its own — it composes these two. */
  dealsService?: Pick<typeof defaultDealsService, "list">;
  tasksService?: Pick<typeof defaultTasksService, "list">;
  dashboardService?: typeof defaultDashboardService;
}

export function DashboardPage({
  dealsService = defaultDealsService,
  tasksService = defaultTasksService,
  dashboardService = defaultDashboardService,
}: DashboardPageProps) {
  const [metrics, setMetrics] = React.useState<DashboardMetrics | null>(null);

  React.useEffect(() => {
    void dashboardService.getMetrics(dealsService, tasksService).then(setMetrics);
  }, [dashboardService, dealsService, tasksService]);

  const chartData = React.useMemo(
    () =>
      (metrics?.valueByStage ?? []).map(({ stage, value }) => ({
        stage: stageLabels[stage],
        value,
      })),
    [metrics],
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Dashboard</h2>
        <p className="text-sm text-muted-foreground">A snapshot of the pipeline and open work.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Open deals"
          value={metrics ? String(metrics.openDealsCount) : "—"}
          testId="metric-open-deals"
        />
        <StatTile
          label="Pipeline value"
          value={metrics ? currencyFormatter.format(metrics.totalPipelineValue) : "—"}
          testId="metric-pipeline-value"
        />
        <StatTile
          label="Deals won this month"
          value={metrics ? String(metrics.dealsWonThisPeriod) : "—"}
          testId="metric-deals-won"
        />
        <StatTile
          label="Open tasks"
          value={metrics ? String(metrics.openTaskCount) : "—"}
          testId="metric-open-tasks"
        />
      </div>

      <Card>
        <CardHeader>
          <p className="text-sm font-medium">Pipeline value by stage</p>
        </CardHeader>
        <CardContent>
          <div data-testid="pipeline-value-chart" className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                <CartesianGrid vertical={false} stroke="#e1e0d9" />
                <XAxis
                  dataKey="stage"
                  tick={{ fill: "#898781", fontSize: 12 }}
                  axisLine={{ stroke: "#c3c2b7" }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "#898781", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value: number) => currencyFormatter.format(value)}
                  width={70}
                />
                <Tooltip
                  formatter={(value) => currencyFormatter.format(Number(value ?? 0))}
                />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
