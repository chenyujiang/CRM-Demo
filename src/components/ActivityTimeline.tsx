import * as React from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  activitiesService as defaultActivitiesService,
  type ActivityEntityType,
  type TimelineEntry,
} from "@/services/activitiesService";
import { dealStageLabels } from "@/services/dealsService";

const COMMENT_MAX_LENGTH = 2000;

/**
 * Loads and posts to one entity's Activity timeline — the fetch-on-open,
 * prepend-on-post glue that ContactsPage and PipelinePage would otherwise
 * each repeat around their view dialog's entity.
 */
export function useActivityTimeline(
  activitiesService: Pick<typeof defaultActivitiesService, "list" | "create">,
  entityType: ActivityEntityType,
  entity: { id: string; createdAt: string } | null,
  onCommentAdded: () => void,
) {
  const [entries, setEntries] = React.useState<TimelineEntry[]>([]);

  React.useEffect(() => {
    if (!entity) return;
    void activitiesService.list(entityType, entity.id, entity.createdAt).then(setEntries);
  }, [activitiesService, entityType, entity]);

  async function addComment(body: string) {
    if (!entity) return;
    const comment = await activitiesService.create(entityType, entity.id, body);
    setEntries((current) => [comment, ...current]);
    onCommentAdded();
  }

  return { entries, addComment };
}

const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

function describe(entry: TimelineEntry): string {
  switch (entry.type) {
    case "created":
      return "Record created";
    case "stage_changed":
      return `Moved from ${dealStageLabels[entry.fromStage]} to ${dealStageLabels[entry.toStage]}`;
    case "comment":
      return entry.body;
  }
}

interface ActivityTimelineProps {
  entries: TimelineEntry[];
  /** Posts a new Comment; rejecting lets the form show the failure inline. */
  onSubmitComment: (body: string) => Promise<void>;
}

/**
 * The Activity timeline shared by the Contact and Deal detail views: a
 * newest-first feed of system events and Comments, plus a form to post a
 * new Comment.
 */
export function ActivityTimeline({ entries, onSubmitComment }: ActivityTimelineProps) {
  const [body, setBody] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = body.trim();
    if (!trimmed) {
      setError("Comment can't be empty.");
      return;
    }
    if (trimmed.length > COMMENT_MAX_LENGTH) {
      setError(`Comment must be ${COMMENT_MAX_LENGTH} characters or fewer.`);
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await onSubmitComment(trimmed);
      setBody("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add comment");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium">Activity</h3>
      <ul className="space-y-2 text-sm">
        {entries.map((entry) => (
          <li key={entry.id} className="rounded-md border bg-muted/30 p-2">
            <p className="whitespace-pre-wrap">
              {entry.type === "comment" && (
                <span className="font-medium">{entry.authorEmail}: </span>
              )}
              {describe(entry)}
            </p>
            <p className="text-xs text-muted-foreground">{dateTimeFormatter.format(new Date(entry.createdAt))}</p>
          </li>
        ))}
      </ul>

      <form className="space-y-2" onSubmit={(event) => void handleSubmit(event)}>
        <Label htmlFor="activity-comment">Add a comment</Label>
        <Textarea
          id="activity-comment"
          value={body}
          maxLength={COMMENT_MAX_LENGTH}
          onChange={(event) => setBody(event.target.value)}
        />
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <Button type="submit" size="sm" disabled={submitting}>
          {submitting ? "Posting…" : "Post comment"}
        </Button>
      </form>
    </div>
  );
}
