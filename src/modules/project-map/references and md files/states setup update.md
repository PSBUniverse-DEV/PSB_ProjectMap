Below is a production-ready prompt for your AI assistant.

---

# Prompt: Upgrade States Setup Page

The **States Setup** page should be redesigned to match the exact UX and functionality of the **Project Status Setup** page.

This page is part of the **PSBUniverse Project Map** administration module and should follow the same design language, interaction patterns, and behaviors.

---

# Database

The page uses the following table.

```sql
public.proj_s_states

id
state_name
state_code
display_color
display_order
is_active
created_at
```

```sql
create table public.proj_s_states (
  id serial not null,
  state_name text not null,
  state_code text not null,
  display_color text not null,
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamp with time zone not null default now(),

  constraint proj_s_states_pkey primary key (id),
  constraint proj_s_states_state_code_key unique (state_code),
  constraint proj_s_states_state_name_key unique (state_name)
);
```

---

# Overall Goal

Make the **States Setup** page visually and functionally consistent with the **Project Status Setup** page.

The page should expose all important metadata while remaining simple and easy to maintain.

---

# Grid Layout

Replace the current table with the following columns.

| Actions     | Order | Color      | State Name | State Code | Active |
| ----------- | ----: | ---------- | ---------- | ---------- | ------ |
| Edit Delete |  ☰ 10 | 🟥 #E53935 | Alabama    | AL         | ON     |
| Edit Delete |  ☰ 20 | 🟪 #D43F8D | Alaska     | AK         | ON     |

Default sorting

```sql
ORDER BY display_order ASC,
         state_name ASC
```

Do NOT default to alphabetical sorting.

---

# Order Column

Display

```
☰ 10

☰ 20

☰ 30
```

instead of

```
10

20

30
```

The drag handle indicates that rows are reorderable.

---

# Drag & Drop Ordering (Preferred)

Rows should support drag-and-drop.

When a row is dropped:

* recalculate display_order
* update database
* refresh local state
* display success toast

```
Display order updated.
```

If drag-and-drop cannot be implemented cleanly with the current table component, allow editing the Display Order value manually.

---

# Color Column

Do not display only the hex code.

Display

```
■ #E53935
```

or

```
🟥 #E53935
```

The square should use the actual color stored in `display_color`.

If no color exists

display

```
No Color
```

---

# Active Column

Use the same ON/OFF switch used in Project Status.

Example

```
ON
```

```
OFF
```

Clicking the switch should

* update database immediately
* update local UI
* show success toast

```
State updated.
```

No modal required.

---

# Search

Search should include

* State Name
* State Code

---

# Filters

Add quick filters

```
All

Active

Inactive
```

---

# Record Count

Display

```
50 Records
```

beside the page title.

---

# Add State Dialog

Redesign the modal.

Use the same layout as Project Status.

```
--------------------------------------

State

--------------------------------------

State Name *

[______________________]

State Code *

[______________________]

Display Color

[ Color Picker ]  #E53935

Display Order

[ 10 ]

Status

☑ Active

--------------------------------------

Cancel        Save

--------------------------------------
```

---

# Edit State Dialog

Use the exact same layout.

Populate

* State Name
* State Code
* Display Color
* Display Order
* Active

---

# Color Picker

Use a native HTML color picker or reusable Color Picker component.

The selected color should

* update preview
* update hex value
* save to display_color

Do not require users to manually type hex values.

---

# Validation

State Name

* Required
* Unique
* Maximum 100 characters

State Code

* Required
* Unique
* Maximum 10 characters
* Automatically convert to uppercase while typing

Examples

```
AL

AK

TX

GA
```

Display Order

Must be numeric.

Display Color

Must be a valid hex color.

---

# Delete

Before deleting

show confirmation dialog

```
Delete State?

This state may already be referenced by Origin Addresses or Projects.

Cancel

Delete
```

If the record is referenced by another table

prevent deletion.

Prefer

```
is_active = false
```

instead of deleting whenever possible.

---

# Empty State

If no states exist

display

```
No States

Click "Add State" to create one.
```

---

# Loading State

Display skeleton rows or loading spinner while loading.

---

# Success Messages

After Add

```
State added successfully.
```

After Edit

```
State updated successfully.
```

After Toggle

```
State updated.
```

After Reorder

```
Display order updated.
```

---

# Error Messages

Use friendly user messages.

Avoid displaying PostgreSQL or Supabase errors.

Example

```
Unable to save state.

Please try again.
```

---

# UI Consistency

The page must match the **Project Status Setup** page.

Use the same

* spacing
* typography
* buttons
* dialogs
* toggles
* table styles
* color picker
* action icons
* loading indicators
* toast notifications

Do not introduce a different UI pattern.

---

# Performance

* Update local state whenever possible.
* Avoid full page refreshes after edits or toggle changes.
* Keep interactions responsive.

---

# Final Goal

The States Setup page should feel like a direct sibling of the Project Status Setup page.

Administrators should be able to:

* View all states
* See each state's color immediately
* Enable/disable states
* Add new states
* Edit existing states
* Reorder states (drag-and-drop preferred)
* Search states quickly
* Maintain display order easily

The final UI should be visually identical to the Project Status Setup page, differing only in the fields specific to the `proj_s_states` table.
