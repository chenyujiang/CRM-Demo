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
import { Textarea } from "@/components/ui/textarea";
import {
  contactsService as defaultContactsService,
  type Contact,
  type ContactInput,
} from "@/services/contactsService";

type DialogState = { mode: "create" } | { mode: "edit"; contact: Contact } | null;

const emptyForm: ContactInput = {
  name: "",
  company: "",
  email: "",
  phone: "",
  notes: "",
};

export interface ContactsPageProps {
  /** The data-service seam: defaults to the real Supabase-backed contactsService. */
  contactsService?: typeof defaultContactsService;
}

export function ContactsPage({ contactsService = defaultContactsService }: ContactsPageProps) {
  const [contacts, setContacts] = React.useState<Contact[]>([]);
  const [query, setQuery] = React.useState("");
  const [loaded, setLoaded] = React.useState(false);
  const [dialogState, setDialogState] = React.useState<DialogState>(null);
  const [form, setForm] = React.useState<ContactInput>(emptyForm);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const refresh = React.useCallback(
    async (q: string) => {
      const data = await contactsService.list(q || undefined);
      setContacts(data);
      setLoaded(true);
    },
    [contactsService],
  );

  React.useEffect(() => {
    void refresh(query);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, refresh]);

  function openCreate() {
    setForm(emptyForm);
    setError(null);
    setDialogState({ mode: "create" });
  }

  function openEdit(contact: Contact) {
    setForm({
      name: contact.name,
      company: contact.company ?? "",
      email: contact.email ?? "",
      phone: contact.phone ?? "",
      notes: contact.notes ?? "",
    });
    setError(null);
    setDialogState({ mode: "edit", contact });
  }

  async function handleDelete(contact: Contact) {
    await contactsService.remove(contact.id);
    await refresh(query);
  }

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      if (dialogState?.mode === "edit") {
        await contactsService.update(dialogState.contact.id, form);
      } else {
        await contactsService.create(form);
      }
      setDialogState(null);
      await refresh(query);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save contact");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Contacts</h2>
          <p className="text-sm text-muted-foreground">Manage the people you work with.</p>
        </div>
        <Button onClick={openCreate}>Add contact</Button>
      </div>

      <div className="max-w-sm space-y-2">
        <Label htmlFor="contact-search">Search</Label>
        <Input
          id="contact-search"
          placeholder="Search by name or company"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      {loaded && contacts.length === 0 && (
        <p className="text-sm text-muted-foreground">
          {query ? "No contacts match your search." : "No contacts yet — add your first one."}
        </p>
      )}

      {contacts.length > 0 && (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50 text-left">
              <tr>
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Company</th>
                <th className="px-4 py-2 font-medium">Email</th>
                <th className="px-4 py-2 font-medium">Phone</th>
                <th className="px-4 py-2 font-medium">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((contact) => (
                <tr key={contact.id} className="border-b last:border-0">
                  <td className="px-4 py-2 font-medium">{contact.name}</td>
                  <td className="px-4 py-2">{contact.company}</td>
                  <td className="px-4 py-2">{contact.email}</td>
                  <td className="px-4 py-2">{contact.phone}</td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        aria-label={`Edit ${contact.name}`}
                        onClick={() => openEdit(contact)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        aria-label={`Delete ${contact.name}`}
                        onClick={() => void handleDelete(contact)}
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={dialogState !== null} onOpenChange={(open) => !open && setDialogState(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialogState?.mode === "edit" ? "Edit contact" : "Add contact"}</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleSave}>
            <div className="space-y-2">
              <Label htmlFor="contact-name">Name</Label>
              <Input
                id="contact-name"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-company">Company</Label>
              <Input
                id="contact-company"
                value={form.company ?? ""}
                onChange={(event) => setForm({ ...form, company: event.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-email">Email</Label>
              <Input
                id="contact-email"
                type="email"
                value={form.email ?? ""}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-phone">Phone</Label>
              <Input
                id="contact-phone"
                value={form.phone ?? ""}
                onChange={(event) => setForm({ ...form, phone: event.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-notes">Notes</Label>
              <Textarea
                id="contact-notes"
                value={form.notes ?? ""}
                onChange={(event) => setForm({ ...form, notes: event.target.value })}
              />
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
