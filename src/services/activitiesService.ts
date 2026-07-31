import { supabase } from "@/lib/supabase";
import type { DealStage } from "@/services/dealsService";

export type ActivityEntityType = "contact" | "deal";

export interface CommentActivity {
  id: string;
  type: "comment";
  createdAt: string;
  body: string;
  authorEmail: string;
}

export interface StageChangedActivity {
  id: string;
  type: "stage_changed";
  createdAt: string;
  fromStage: DealStage;
  toStage: DealStage;
}

export type Activity = CommentActivity | StageChangedActivity;

export interface CreatedActivity {
  id: string;
  type: "created";
  createdAt: string;
}

/** A single chronological entry on a Contact or Deal's Activity timeline. */
export type TimelineEntry = Activity | CreatedActivity;

interface ActivityRow {
  id: string;
  type: "comment" | "stage_changed";
  body: string | null;
  author_email: string | null;
  from_stage: DealStage | null;
  to_stage: DealStage | null;
  created_at: string;
}

function toActivity(row: ActivityRow): Activity {
  if (row.type === "comment") {
    return {
      id: row.id,
      type: "comment",
      createdAt: row.created_at,
      body: row.body as string,
      authorEmail: row.author_email as string,
    };
  }
  return {
    id: row.id,
    type: "stage_changed",
    createdAt: row.created_at,
    fromStage: row.from_stage as DealStage,
    toStage: row.to_stage as DealStage,
  };
}

/**
 * Merges an entity's stored Activities (already newest-first) with its
 * synthesized "created" entry. "created" is never stored — it's derived
 * from the entity's own createdAt — and, since it marks the entity's
 * earliest possible event, it always belongs at the end of a newest-first
 * timeline.
 */
export function buildTimeline(
  activities: Activity[],
  entityId: string,
  entityCreatedAt: string,
): TimelineEntry[] {
  return [...activities, { id: `${entityId}-created`, type: "created", createdAt: entityCreatedAt }];
}

/**
 * The data-service seam for Activity timelines: all Supabase access for the
 * polymorphic `activities` table goes through this module. Entity-owning
 * services (e.g. dealsService) call `recordStageChange` rather than writing
 * to `activities` directly.
 */
export const activitiesService = {
  async list(
    entityType: ActivityEntityType,
    entityId: string,
    entityCreatedAt: string,
  ): Promise<TimelineEntry[]> {
    const { data, error } = await supabase
      .from("activities")
      .select("*")
      .eq("entity_type", entityType)
      .eq("entity_id", entityId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    const activities = (data as ActivityRow[]).map(toActivity);
    return buildTimeline(activities, entityId, entityCreatedAt);
  },

  async create(
    entityType: ActivityEntityType,
    entityId: string,
    body: string,
  ): Promise<CommentActivity> {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;

    const { data, error } = await supabase
      .from("activities")
      .insert({
        entity_type: entityType,
        entity_id: entityId,
        type: "comment",
        body,
        author_email: userData.user?.email ?? "unknown",
      })
      .select("*")
      .single();
    if (error) throw error;
    return toActivity(data as ActivityRow) as CommentActivity;
  },

  async recordStageChange(
    dealId: string,
    fromStage: DealStage,
    toStage: DealStage,
  ): Promise<void> {
    const { error } = await supabase.from("activities").insert({
      entity_type: "deal",
      entity_id: dealId,
      type: "stage_changed",
      from_stage: fromStage,
      to_stage: toStage,
    });
    if (error) throw error;
  },
};
