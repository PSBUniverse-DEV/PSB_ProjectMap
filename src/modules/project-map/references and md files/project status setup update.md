Here's a production-ready prompt you can give your AI coding assistant (Cline/Cursor/Copilot). It includes the business rules, UI/UX requirements, and implementation details.

---

# Prompt: Upgrade Project Status Setup Page

We need to redesign and enhance the **Project Status Setup** page in the **PSBUniverse Project Map** module.

This is an **administrative setup page**, so prioritize simplicity, consistency, and usability over unnecessary complexity.

---

## Database

The page uses the following table.

```sql
public.proj_s_project_status

status_id
status_name
status_description
display_color
display_order
is_active
date_created
```

Current table:

```sql
create table public.proj_s_project_status (
  status_id serial primary key,
  status_name text not null unique,
  status_description text,
  display_color text,
  display_order integer not null default 0,
  is_active boolean not null default true,
  date_created timestamptz not null default now()
);
```

---

# Overall Requirements

Redesign the page to expose **all important fields** in the table.

Current UI only shows:

* Status Name
* Description
* Color

It should now support:

* Display Order
* Active Status
* Color Preview
* Better Add/Edit Dialog
* Drag & Drop Ordering (preferred)

---

# Grid Layout

Replace the current table with something similar to:

| Actions     | Order | Color     | Status Name          | Description              | Active |
| ----------- | ----: | --------- | -------------------- | ------------------------ | ------ |
| Edit Delete |  ☰ 10 | ■ #3B82F6 | New Dealer Order     | New order received       | Active |
| Edit Delete |  ☰ 20 | ■ #8B5CF6 | Welcome Email / Call | Initial customer contact | Active |

Default sorting:

```sql
ORDER BY display_order ASC,
         status_name ASC
```

Do NOT default to alphabetical order.

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

The drag handle visually indicates that rows can be reordered.

---

# Drag & Drop (Preferred)

Rows should be draggable.

When a row is dropped:

* automatically recalculate display_order
* save new ordering to database
* refresh grid

Example

Before

```
10 Ready for Install

20 Pending Payment

30 Installed
```

User drags

```
Installed
```

above

```
Pending Payment
```

After

```
10 Ready for Install

20 Installed

30 Pending Payment
```

Database updates automatically.

No popup required.

If drag-and-drop cannot be implemented cleanly with the current table component, keep the Display Order column editable instead.

---

# Color Column

Do NOT display only the hex code.

Display:

■ #3B82F6

Example

🟦 #3B82F6

or

████ #3B82F6

The colored square should use the actual color from display_color.

If display_color is null:

show

```
No Color
```

---

# Active Column

Display as a switch or badge.

Preferred:

```
ON
OFF
```

or

```
🟢 Active

⚪ Inactive
```

User should be able to toggle active status directly from the grid.

Updating the toggle should immediately update the database.

---

# Search

Search should include:

* status name
* description
* display color

---

# Filters

Add quick filters.

```
All

Active

Inactive
```

---

# Record Count

Continue displaying

```
13 Records
```

beside the page title.

---

# Add Project Status Dialog

Redesign the modal.

New layout:

```
---------------------------------------

Project Status

---------------------------------------

Status Name *

[____________________________]

Description

[____________________________]

Display Color

[ Color Picker ]  #3B82F6

Status

☑ Active

---------------------------------------

Cancel        Save

---------------------------------------
```

When saving, display_order is +1 from the current or highest order.

---

# Edit Dialog

Use the same dialog.

Populate

* Status Name
* Description
* Display Color
* Active Status

---

# Color Picker

Instead of typing hex values manually,

use

HTML Color Picker

or

a reusable Color Picker component.

The selected color should:

* update preview square
* update hex value
* save hex code to display_color

---

# Delete

Delete should NOT permanently remove records immediately.

Before deleting:

Show confirmation dialog.

```
Delete Project Status?

This status may already be used by existing projects.

Cancel

Delete
```

If the status is already referenced by another table,

prevent deletion and display an error.

Prefer soft delete by setting

```
is_active = false
```

instead of deleting.

---

# Validation

Status Name

Required

Maximum length 100

Cannot duplicate another status name.

Display Color

Must be a valid hex color.

---

# Empty State

If there are no statuses,

display

```
No Project Statuses

Click "Add Project Status" to create one.
```

---

# Success Messages

After Add

```
Project status added successfully.
```

After Edit

```
Project status updated successfully.
```

After Toggle

```
Project status updated.
```

After Reorder

```
Display order updated.
```

---

# Error Messages

Show friendly messages.

Avoid developer jargon.

Example

```
Unable to save project status.

Please try again.
```

instead of raw database errors.

---

# UI Consistency

Follow the existing PSBUniverse design system.

Use:

* existing cards
* existing buttons
* existing spacing
* existing typography

Do not introduce a new design language.

---

# Performance

* Load only active data initially unless "All" is selected.
* Do not refetch the entire page after every small update if local state can be updated.
* Keep interactions responsive.

---

# Goal

The finished page should allow an administrator to:

* View project statuses at a glance
* See each status color immediately
* See whether a status is active
* Add new statuses
* Edit existing statuses
* Enable/disable statuses
* Reorder statuses using drag-and-drop (or display order if drag-and-drop is unavailable)
* Search and filter statuses easily
* Manage the workflow order without manually editing database values

The final result should feel like a modern SaaS admin configuration page while remaining simple, intuitive, and consistent with the rest of the PSBUniverse Setup module.
