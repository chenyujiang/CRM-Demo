# CRM Demo

Domain glossary for the CRM Demo proof-of-concept.

## Language

**Activity**:
A single chronological entry on a Contact or Deal's timeline: either a user-authored Comment or a system-generated record of a change (e.g. a deal's stage changing). Displayed together on the entity's detail view, newest first.
_Avoid_: Log entry, history item, event (when referring to a single displayed entry)

**Comment**:
A user-authored Activity entry — free text a user adds to a Contact or Deal's timeline at a point in time. Distinct from a Contact's existing `notes` field (a single, overwritable free-text field): a Comment is appended, not overwritten, and carries its own timestamp.
_Avoid_: Note (reserved for the Contact's existing single-field notes), log
