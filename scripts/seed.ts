import { createClient } from "@supabase/supabase-js";

import { toLocalIsoDate } from "../src/lib/date";

type DealStage = "new" | "qualified" | "proposal" | "negotiation" | "won" | "lost";

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const demoEmail = "demo@crm-demo.test";
const demoPassword = "Demo12345!";

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set (run via `npm run seed`, which loads .env).",
  );
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const contacts = [
  { name: "Ava Thompson", company: "Northwind SaaS", email: "ava.thompson@northwindsaas.test", phone: "555-0101", notes: "Champion on the platform team." },
  { name: "Liam Carter", company: "Northwind SaaS", email: "liam.carter@northwindsaas.test", phone: "555-0102", notes: null },
  { name: "Sophia Nguyen", company: "Brightline Cloud", email: "sophia.nguyen@brightlinecloud.test", phone: "555-0103", notes: "Prefers async updates over calls." },
  { name: "Noah Patel", company: "Brightline Cloud", email: "noah.patel@brightlinecloud.test", phone: "555-0104", notes: null },
  { name: "Emma Rodriguez", company: "Vertex Analytics", email: "emma.rodriguez@vertexanalytics.test", phone: "555-0105", notes: "Evaluating us against two competitors." },
  { name: "Oliver Kim", company: "Vertex Analytics", email: "oliver.kim@vertexanalytics.test", phone: "555-0106", notes: null },
  { name: "Isabella Chen", company: "Fenwick Digital", email: "isabella.chen@fenwickdigital.test", phone: "555-0107", notes: "Renewal due next quarter." },
  { name: "Ethan Brooks", company: "Fenwick Digital", email: "ethan.brooks@fenwickdigital.test", phone: "555-0108", notes: null },
  { name: "Mia Johansson", company: "Cascade Metrics", email: "mia.johansson@cascademetrics.test", phone: "555-0109", notes: "Wants a custom onboarding session." },
  { name: "Lucas Ferreira", company: "Cascade Metrics", email: "lucas.ferreira@cascademetrics.test", phone: "555-0110", notes: null },
  { name: "Charlotte Dubois", company: "Anchorpoint Systems", email: "charlotte.dubois@anchorpointsystems.test", phone: "555-0111", notes: "Budget approved for Q3." },
  { name: "Mason Alvarez", company: "Anchorpoint Systems", email: "mason.alvarez@anchorpointsystems.test", phone: "555-0112", notes: null },
  { name: "Amelia Novak", company: "Redshift Labs", email: "amelia.novak@redshiftlabs.test", phone: "555-0113", notes: "Technical evaluator, very detail-oriented." },
  { name: "James O'Connor", company: "Redshift Labs", email: "james.oconnor@redshiftlabs.test", phone: "555-0114", notes: null },
  { name: "Harper Singh", company: "Lumen Data Co", email: "harper.singh@lumendataco.test", phone: "555-0115", notes: "Introduced by an existing customer." },
  { name: "Benjamin Osei", company: "Lumen Data Co", email: "benjamin.osei@lumendataco.test", phone: "555-0116", notes: null },
  { name: "Evelyn Marsh", company: "Solstice Works", email: "evelyn.marsh@solsticeworks.test", phone: "555-0117", notes: "Slow to respond, follow up monthly." },
  { name: "Daniel Whitfield", company: "Solstice Works", email: "daniel.whitfield@solsticeworks.test", phone: "555-0118", notes: null },
];

function isoDateOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return toLocalIsoDate(d);
}

function daysAgoIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

/**
 * How long ago a deal past "New" was created — deeper pipeline stages get a
 * longer backdated history, so the seeded pipeline looks like it's been
 * worked over time rather than assembled a moment ago.
 */
const STAGE_AGE_DAYS: Partial<Record<DealStage, number>> = {
  qualified: 10,
  proposal: 16,
  negotiation: 22,
  won: 28,
  lost: 24,
};

/** The stage-by-stage path a deal took to reach its (seeded) current stage. */
const STAGE_PROGRESSION: DealStage[] = ["new", "qualified", "proposal", "negotiation"];

function stageChangePath(finalStage: DealStage): DealStage[] {
  if (finalStage === "won" || finalStage === "lost") return [...STAGE_PROGRESSION, finalStage];
  return STAGE_PROGRESSION.slice(0, STAGE_PROGRESSION.indexOf(finalStage) + 1);
}

/** Builds the backdated, staggered stage_changed activity rows for one deal. */
function stageChangeActivitiesFor(dealId: string, finalStage: DealStage, ageDays: number) {
  const path = stageChangePath(finalStage);
  const transitions = path.slice(1);
  const step = ageDays / (transitions.length + 1);

  return transitions.map((toStage, i) => ({
    entity_type: "deal",
    entity_id: dealId,
    type: "stage_changed",
    from_stage: path[i],
    to_stage: toStage,
    created_at: daysAgoIso(Math.max(1, Math.round(ageDays - step * (i + 1)))),
  }));
}

function tasksFor(contactIdByEmail: Map<string, string>, dealIdByName: Map<string, string>) {
  const contact = (email: string) => {
    const id = contactIdByEmail.get(email);
    if (!id) throw new Error(`Seed contact not found for task: ${email}`);
    return id;
  };
  const deal = (name: string) => {
    const id = dealIdByName.get(name);
    if (!id) throw new Error(`Seed deal not found for task: ${name}`);
    return id;
  };

  return [
    { title: "Send proposal follow-up", due_date: isoDateOffset(-5), completed: false, contact_id: null, deal_id: null },
    { title: "Call about renewal", due_date: isoDateOffset(-2), completed: false, contact_id: contact("isabella.chen@fenwickdigital.test"), deal_id: null },
    { title: "Prepare contract for Enterprise plan", due_date: isoDateOffset(0), completed: false, contact_id: null, deal_id: deal("Enterprise plan") },
    { title: "Check in with Ava Thompson", due_date: isoDateOffset(2), completed: false, contact_id: contact("ava.thompson@northwindsaas.test"), deal_id: null },
    { title: "Update pipeline notes", due_date: isoDateOffset(3), completed: false, contact_id: null, deal_id: null },
    { title: "Quarterly review for Analytics upgrade", due_date: isoDateOffset(14), completed: false, contact_id: null, deal_id: deal("Analytics upgrade") },
    { title: "Plan Q4 outreach", due_date: isoDateOffset(30), completed: false, contact_id: null, deal_id: null },
    { title: "Send holiday card to Harper Singh", due_date: isoDateOffset(45), completed: false, contact_id: contact("harper.singh@lumendataco.test"), deal_id: null },
    { title: "Kickoff call with Northwind SaaS", due_date: isoDateOffset(-10), completed: true, contact_id: contact("ava.thompson@northwindsaas.test"), deal_id: null },
    { title: "Send pricing sheet for Referral deal", due_date: isoDateOffset(-3), completed: true, contact_id: null, deal_id: deal("Referral deal") },
  ];
}

function dealsFor(contactIdByEmail: Map<string, string>) {
  const idFor = (email: string) => {
    const id = contactIdByEmail.get(email);
    if (!id) throw new Error(`Seed contact not found for deal: ${email}`);
    return id;
  };

  /**
   * Every deal gets an explicit created_at — PostgREST's batch insert treats
   * a key missing from some rows as NULL for those rows once any row in the
   * batch has it, so this can't be conditional per row. Deals past "New" get
   * backdated, so their seeded stage_changed history (built in `seed()` from
   * STAGE_AGE_DAYS) has room to sit chronologically after creation and
   * before now; "New" deals stay effectively fresh.
   */
  const backdated = (stage: DealStage) => ({ created_at: daysAgoIso(STAGE_AGE_DAYS[stage] ?? 0) });

  return [
    { name: "Platform expansion", value: 15000, stage: "new", contact_id: idFor("ava.thompson@northwindsaas.test"), ...backdated("new") },
    { name: "Initial rollout", value: 8000, stage: "new", contact_id: idFor("sophia.nguyen@brightlinecloud.test"), ...backdated("new") },
    { name: "Analytics upgrade", value: 22000, stage: "qualified", contact_id: idFor("emma.rodriguez@vertexanalytics.test"), ...backdated("qualified") },
    { name: "Renewal", value: 12000, stage: "qualified", contact_id: idFor("isabella.chen@fenwickdigital.test"), ...backdated("qualified") },
    { name: "Onboarding package", value: 9500, stage: "proposal", contact_id: idFor("mia.johansson@cascademetrics.test"), ...backdated("proposal") },
    { name: "Enterprise plan", value: 30000, stage: "proposal", contact_id: idFor("charlotte.dubois@anchorpointsystems.test"), ...backdated("proposal") },
    { name: "Technical evaluation", value: 18000, stage: "negotiation", contact_id: idFor("amelia.novak@redshiftlabs.test"), ...backdated("negotiation") },
    { name: "Referral deal", value: 14000, stage: "won", contact_id: idFor("harper.singh@lumendataco.test"), ...backdated("won") },
    { name: "Budget freeze", value: 6000, stage: "lost", contact_id: idFor("evelyn.marsh@solsticeworks.test"), ...backdated("lost") },
  ];
}

/** A handful of sample Comments seeded on contacts/deals, so the Activity timeline never looks empty. */
function commentsFor(contactIdByEmail: Map<string, string>, dealIdByName: Map<string, string>) {
  const contact = (email: string) => {
    const id = contactIdByEmail.get(email);
    if (!id) throw new Error(`Seed contact not found for comment: ${email}`);
    return id;
  };
  const deal = (name: string) => {
    const id = dealIdByName.get(name);
    if (!id) throw new Error(`Seed deal not found for comment: ${name}`);
    return id;
  };

  return [
    {
      entity_type: "contact",
      entity_id: contact("isabella.chen@fenwickdigital.test"),
      type: "comment",
      body: "Called to discuss the renewal — she wants updated pricing before it goes to their finance team.",
      author_email: demoEmail,
      created_at: daysAgoIso(3),
    },
    {
      entity_type: "contact",
      entity_id: contact("charlotte.dubois@anchorpointsystems.test"),
      type: "comment",
      body: "Confirmed budget sign-off internally; just needs the contract redlined.",
      author_email: demoEmail,
      created_at: daysAgoIso(2),
    },
    {
      entity_type: "deal",
      entity_id: deal("Enterprise plan"),
      type: "comment",
      body: "Sent the revised proposal reflecting the negotiated seat count.",
      author_email: demoEmail,
      created_at: daysAgoIso(2),
    },
    {
      entity_type: "deal",
      entity_id: deal("Technical evaluation"),
      type: "comment",
      body: "Their security team asked for our SOC 2 report before proceeding.",
      author_email: demoEmail,
      created_at: daysAgoIso(1),
    },
  ];
}

async function seed() {
  const { error: authError } = await supabase.auth.signInWithPassword({
    email: demoEmail,
    password: demoPassword,
  });
  if (authError) throw authError;

  const { error: deleteActivitiesError } = await supabase
    .from("activities")
    .delete()
    .not("id", "is", null);
  if (deleteActivitiesError) throw deleteActivitiesError;

  const { error: deleteTasksError } = await supabase.from("tasks").delete().not("id", "is", null);
  if (deleteTasksError) throw deleteTasksError;

  const { error: deleteDealsError } = await supabase.from("deals").delete().not("id", "is", null);
  if (deleteDealsError) throw deleteDealsError;

  const { error: deleteContactsError } = await supabase
    .from("contacts")
    .delete()
    .not("id", "is", null);
  if (deleteContactsError) throw deleteContactsError;

  const { data: insertedContacts, error: insertContactsError } = await supabase
    .from("contacts")
    .insert(contacts)
    .select("id, email");
  if (insertContactsError) throw insertContactsError;

  console.log(`Seeded ${insertedContacts.length} contacts.`);

  const contactIdByEmail = new Map(
    insertedContacts.map((c: { id: string; email: string }) => [c.email, c.id]),
  );

  const { data: insertedDeals, error: insertDealsError } = await supabase
    .from("deals")
    .insert(dealsFor(contactIdByEmail))
    .select("id, name, stage, created_at");
  if (insertDealsError) throw insertDealsError;

  console.log(`Seeded ${insertedDeals.length} deals.`);

  const dealIdByName = new Map(
    insertedDeals.map((d: { id: string; name: string }) => [d.name, d.id]),
  );

  const { data: insertedTasks, error: insertTasksError } = await supabase
    .from("tasks")
    .insert(tasksFor(contactIdByEmail, dealIdByName))
    .select("id");
  if (insertTasksError) throw insertTasksError;

  console.log(`Seeded ${insertedTasks.length} tasks.`);

  const stageChangeActivities = insertedDeals.flatMap(
    (d: { id: string; stage: DealStage; created_at: string }) => {
      const ageDays = STAGE_AGE_DAYS[d.stage];
      return ageDays === undefined ? [] : stageChangeActivitiesFor(d.id, d.stage, ageDays);
    },
  );

  const { data: insertedActivities, error: insertActivitiesError } = await supabase
    .from("activities")
    .insert([...stageChangeActivities, ...commentsFor(contactIdByEmail, dealIdByName)])
    .select("id");
  if (insertActivitiesError) throw insertActivitiesError;

  console.log(`Seeded ${insertedActivities.length} activities.`);

  await supabase.auth.signOut();
}

seed().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
