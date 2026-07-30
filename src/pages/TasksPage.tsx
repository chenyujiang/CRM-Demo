import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  contactsService as defaultContactsService,
  type Contact,
} from "@/services/contactsService";
import { dealsService as defaultDealsService, type Deal } from "@/services/dealsService";
import {
  tasksService as defaultTasksService,
  type Task,
  type TaskInput,
} from "@/services/tasksService";
import { toLocalIsoDate } from "@/lib/date";
import { cn } from "@/lib/utils";

export type TaskUrgency = "overdue" | "due-soon" | "normal";

const DUE_SOON_WINDOW_DAYS = 3;

/**
 * How urgently a task should be visually called out. A pure function so the
 * "overdue"/"due-soon" rule is directly testable without rendering the page
 * or mocking the system clock.
 */
export function getTaskUrgency(
  dueDate: string,
  completed: boolean,
  today: Date = new Date(),
): TaskUrgency {
  if (completed) return "normal";

  const due = new Date(`${dueDate}T00:00:00`);
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diffDays = Math.round((due.getTime() - todayMidnight.getTime()) / 86_400_000);

  if (diffDays < 0) return "overdue";
  if (diffDays <= DUE_SOON_WINDOW_DAYS) return "due-soon";
  return "normal";
}

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

function formatDueDate(dueDate: string): string {
  return dateFormatter.format(new Date(`${dueDate}T00:00:00`));
}

type DialogState = { mode: "create" } | { mode: "edit"; task: Task } | null;

interface FormState {
  title: string;
  dueDate: string;
  contactId: string;
  dealId: string;
}

function todayIso(): string {
  return toLocalIsoDate(new Date());
}

function emptyForm(): FormState {
  return { title: "", dueDate: todayIso(), contactId: "", dealId: "" };
}

export interface TasksPageProps {
  /** The data-service seam: defaults to the real Supabase-backed tasksService. */
  tasksService?: typeof defaultTasksService;
  /** Reused to populate the optional "link to a contact" picker. */
  contactsService?: typeof defaultContactsService;
  /** Reused to populate the optional "link to a deal" picker. */
  dealsService?: typeof defaultDealsService;
}

export function TasksPage({
  tasksService = defaultTasksService,
  contactsService = defaultContactsService,
  dealsService = defaultDealsService,
}: TasksPageProps) {
  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [contacts, setContacts] = React.useState<Contact[]>([]);
  const [deals, setDeals] = React.useState<Deal[]>([]);
  const [loaded, setLoaded] = React.useState(false);
  const [dialogState, setDialogState] = React.useState<DialogState>(null);
  const [form, setForm] = React.useState<FormState>(emptyForm());
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    setTasks(await tasksService.list());
    setLoaded(true);
  }, [tasksService]);

  React.useEffect(() => {
    void refresh();
    void contactsService.list().then(setContacts);
    void dealsService.list().then(setDeals);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refresh]);

  function openCreate() {
    setForm(emptyForm());
    setError(null);
    setDialogState({ mode: "create" });
  }

  function openEdit(task: Task) {
    setForm({
      title: task.title,
      dueDate: task.dueDate,
      contactId: task.contactId ?? "",
      dealId: task.dealId ?? "",
    });
    setError(null);
    setDialogState({ mode: "edit", task });
  }

  async function handleDelete(task: Task) {
    await tasksService.remove(task.id);
    await refresh();
  }

  async function handleToggleComplete(task: Task) {
    await tasksService.markComplete(task.id, !task.completed);
    await refresh();
  }

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const input: TaskInput = {
        title: form.title,
        dueDate: form.dueDate,
        contactId: form.contactId || null,
        dealId: form.dealId || null,
      };
      if (dialogState?.mode === "edit") {
        await tasksService.update(dialogState.task.id, input);
      } else {
        await tasksService.create(input);
      }
      setDialogState(null);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save task");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Tasks</h2>
          <p className="text-sm text-muted-foreground">Follow-ups and other work to do.</p>
        </div>
        <Button onClick={openCreate}>Add task</Button>
      </div>

      {loaded && tasks.length === 0 && (
        <p className="text-sm text-muted-foreground">No tasks yet — add your first one.</p>
      )}

      {tasks.length > 0 && (
        <div className="space-y-2">
          {tasks.map((task) => {
            const urgency = getTaskUrgency(task.dueDate, task.completed);
            return (
              <div
                key={task.id}
                data-testid={`task-row-${task.id}`}
                className={cn(
                  "flex items-center justify-between gap-4 rounded-md border p-3 text-sm",
                  urgency === "overdue" && "border-destructive/50 bg-destructive/5",
                  urgency === "due-soon" && "border-amber-400/60 bg-amber-50",
                )}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    aria-label={`Mark ${task.title} complete`}
                    checked={task.completed}
                    onChange={() => void handleToggleComplete(task)}
                  />
                  <div>
                    <button
                      type="button"
                      className={cn(
                        "font-medium hover:underline",
                        task.completed && "text-muted-foreground line-through",
                      )}
                      onClick={() => openEdit(task)}
                    >
                      {task.title}
                    </button>
                    <div className="flex flex-wrap items-center gap-2 text-muted-foreground">
                      <span>{formatDueDate(task.dueDate)}</span>
                      {urgency === "overdue" && (
                        <span className="font-medium text-destructive">Overdue</span>
                      )}
                      {urgency === "due-soon" && (
                        <span className="font-medium text-amber-700">Due soon</span>
                      )}
                      {task.contactName && <span>{task.contactName}</span>}
                      {task.dealName && <span>{task.dealName}</span>}
                    </div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  aria-label={`Delete ${task.title}`}
                  onClick={() => void handleDelete(task)}
                >
                  Delete
                </Button>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={dialogState !== null} onOpenChange={(open) => !open && setDialogState(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialogState?.mode === "edit" ? "Edit task" : "Add task"}</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleSave}>
            <div className="space-y-2">
              <Label htmlFor="task-title">Title</Label>
              <Input
                id="task-title"
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-due-date">Due date</Label>
              <Input
                id="task-due-date"
                type="date"
                value={form.dueDate}
                onChange={(event) => setForm({ ...form, dueDate: event.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-contact">Contact (optional)</Label>
              <select
                id="task-contact"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                value={form.contactId}
                onChange={(event) => setForm({ ...form, contactId: event.target.value })}
              >
                <option value="">None</option>
                {contacts.map((contact) => (
                  <option key={contact.id} value={contact.id}>
                    {contact.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-deal">Deal (optional)</Label>
              <select
                id="task-deal"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                value={form.dealId}
                onChange={(event) => setForm({ ...form, dealId: event.target.value })}
              >
                <option value="">None</option>
                {deals.map((deal) => (
                  <option key={deal.id} value={deal.id}>
                    {deal.name}
                  </option>
                ))}
              </select>
            </div>
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <DialogFooter>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
