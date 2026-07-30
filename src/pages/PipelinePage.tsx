import * as React from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type KeyboardCoordinateGetter,
} from "@dnd-kit/core";

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
import {
  DEAL_STAGES,
  dealStageLabels,
  dealsService as defaultDealsService,
  type Deal,
  type DealInput,
  type DealStage,
} from "@/services/dealsService";
import { cn } from "@/lib/utils";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

/**
 * The outcome of a drag-and-drop action: given the event dnd-kit reports
 * when a card is dropped, decide whether it represents a real stage change.
 * Kept as a pure function so it's testable without simulating dnd-kit's
 * pointer/keyboard gesture mechanics — that's dnd-kit's job, this is ours.
 */
export function handleDealDrop(
  event: DragEndEvent,
  deals: Deal[],
): { dealId: string; stage: DealStage } | null {
  const { active, over } = event;
  if (!over) return null;
  const dealId = String(active.id);
  const stage = over.id as DealStage;
  const deal = deals.find((d) => d.id === dealId);
  if (!deal || deal.stage === stage) return null;
  return { dealId, stage };
}

const columnKeyboardCoordinateGetter: KeyboardCoordinateGetter = (
  event,
  { context: { active, droppableRects } },
) => {
  if (!active) return undefined;
  const draggedFromStage = active.data.current?.stage as DealStage | undefined;
  if (!draggedFromStage) return undefined;

  const stageIds = DEAL_STAGES.map((s) => s.id);
  const currentIndex = stageIds.indexOf(draggedFromStage);

  let nextIndex: number | null = null;
  if (event.code === "ArrowRight") nextIndex = currentIndex + 1;
  if (event.code === "ArrowLeft") nextIndex = currentIndex - 1;
  if (nextIndex === null || nextIndex < 0 || nextIndex >= stageIds.length) return undefined;

  const rect = droppableRects.get(stageIds[nextIndex]);
  if (!rect) return undefined;

  event.preventDefault();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
};

type DialogState = { mode: "create" } | { mode: "edit"; deal: Deal } | null;

interface FormState {
  name: string;
  value: string;
  stage: DealStage;
  contactId: string;
}

function emptyForm(stage: DealStage): FormState {
  return { name: "", value: "0", stage, contactId: "" };
}

export interface PipelinePageProps {
  /** The data-service seam: defaults to the real Supabase-backed dealsService. */
  dealsService?: typeof defaultDealsService;
  /** Reused to populate the "assign to a contact" picker. */
  contactsService?: typeof defaultContactsService;
}

export function PipelinePage({
  dealsService = defaultDealsService,
  contactsService = defaultContactsService,
}: PipelinePageProps) {
  const [deals, setDeals] = React.useState<Deal[]>([]);
  const [contacts, setContacts] = React.useState<Contact[]>([]);
  const [dialogState, setDialogState] = React.useState<DialogState>(null);
  const [form, setForm] = React.useState<FormState>(emptyForm("new"));
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    setDeals(await dealsService.list());
  }, [dealsService]);

  React.useEffect(() => {
    void refresh();
    void contactsService.list().then(setContacts);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refresh]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: columnKeyboardCoordinateGetter }),
  );

  async function onDragEnd(event: DragEndEvent) {
    const result = handleDealDrop(event, deals);
    if (!result) return;
    await dealsService.changeStage(result.dealId, result.stage);
    await refresh();
  }

  function openCreate(stage: DealStage) {
    setForm(emptyForm(stage));
    setError(null);
    setDialogState({ mode: "create" });
  }

  function openEdit(deal: Deal) {
    setForm({
      name: deal.name,
      value: String(deal.value),
      stage: deal.stage,
      contactId: deal.contactId,
    });
    setError(null);
    setDialogState({ mode: "edit", deal });
  }

  async function handleDelete(deal: Deal) {
    await dealsService.remove(deal.id);
    await refresh();
  }

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const input: DealInput = {
        name: form.name,
        value: Number(form.value) || 0,
        stage: form.stage,
        contactId: form.contactId,
      };
      if (dialogState?.mode === "edit") {
        await dealsService.update(dialogState.deal.id, input);
      } else {
        await dealsService.create(input);
      }
      setDialogState(null);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save deal");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Pipeline</h2>
          <p className="text-sm text-muted-foreground">
            Track deals as they move through your sales process.
          </p>
        </div>
        <Button onClick={() => openCreate("new")}>Add deal</Button>
      </div>

      <DndContext sensors={sensors} onDragEnd={(event) => void onDragEnd(event)}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {DEAL_STAGES.map((stage) => (
            <DealColumn
              key={stage.id}
              stage={stage}
              deals={deals.filter((deal) => deal.stage === stage.id)}
              onOpen={openEdit}
              onDelete={(deal) => void handleDelete(deal)}
            />
          ))}
        </div>
      </DndContext>

      <Dialog open={dialogState !== null} onOpenChange={(open) => !open && setDialogState(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialogState?.mode === "edit" ? "Edit deal" : "Add deal"}</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleSave}>
            <div className="space-y-2">
              <Label htmlFor="deal-name">Name</Label>
              <Input
                id="deal-name"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="deal-value">Value</Label>
              <Input
                id="deal-value"
                type="number"
                min={0}
                value={form.value}
                onChange={(event) => setForm({ ...form, value: event.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="deal-contact">Contact</Label>
              <select
                id="deal-contact"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                value={form.contactId}
                onChange={(event) => setForm({ ...form, contactId: event.target.value })}
                required
              >
                <option value="" disabled>
                  Select a contact
                </option>
                {contacts.map((contact) => (
                  <option key={contact.id} value={contact.id}>
                    {contact.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="deal-stage">Stage</Label>
              <select
                id="deal-stage"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                value={form.stage}
                onChange={(event) => setForm({ ...form, stage: event.target.value as DealStage })}
              >
                {DEAL_STAGES.map((stage) => (
                  <option key={stage.id} value={stage.id}>
                    {stage.label}
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

interface DealColumnProps {
  stage: { id: DealStage; label: string };
  deals: Deal[];
  onOpen: (deal: Deal) => void;
  onDelete: (deal: Deal) => void;
}

function DealColumn({ stage, deals, onOpen, onDelete }: DealColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });

  return (
    <div
      ref={setNodeRef}
      data-testid={`column-${stage.id}`}
      className={cn(
        "space-y-2 rounded-lg border bg-muted/30 p-3",
        isOver && "ring-2 ring-primary",
      )}
    >
      <h3 className="text-sm font-semibold">{stage.label}</h3>
      <div className="space-y-2">
        {deals.map((deal) => (
          <DealCard key={deal.id} deal={deal} onOpen={onOpen} onDelete={onDelete} />
        ))}
      </div>
    </div>
  );
}

interface DealCardProps {
  deal: Deal;
  onOpen: (deal: Deal) => void;
  onDelete: (deal: Deal) => void;
}

function DealCard({ deal, onOpen, onDelete }: DealCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: deal.id,
    data: { stage: deal.stage },
  });

  const style: React.CSSProperties | undefined = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        "space-y-1 rounded-md border bg-background p-2 text-sm shadow-sm",
        isDragging && "opacity-50",
      )}
    >
      <button
        type="button"
        className="font-medium hover:underline"
        onClick={() => onOpen(deal)}
      >
        {deal.name}
      </button>
      <p className="text-muted-foreground">{deal.contactName}</p>
      <span className="inline-block rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
        {dealStageLabels[deal.stage]}
      </span>
      <div className="flex items-center justify-between">
        <span>{currencyFormatter.format(deal.value)}</span>
        <Button
          variant="outline"
          size="sm"
          aria-label={`Delete ${deal.name}`}
          onClick={(event) => {
            event.stopPropagation();
            onDelete(deal);
          }}
        >
          Delete
        </Button>
      </div>
    </div>
  );
}
