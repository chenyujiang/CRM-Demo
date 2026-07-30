import { createClient } from "@supabase/supabase-js";

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

async function seed() {
  const { error: authError } = await supabase.auth.signInWithPassword({
    email: demoEmail,
    password: demoPassword,
  });
  if (authError) throw authError;

  const { error: deleteError } = await supabase
    .from("contacts")
    .delete()
    .not("id", "is", null);
  if (deleteError) throw deleteError;

  const { data, error: insertError } = await supabase
    .from("contacts")
    .insert(contacts)
    .select("id");
  if (insertError) throw insertError;

  console.log(`Seeded ${data.length} contacts.`);

  await supabase.auth.signOut();
}

seed().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
