I would standardize these three pages exactly like **Project Status**. They are all lookup/configuration tables and should have one consistent experience throughout the Setup module.

---

# Prompt: Standardize Building Categories, Permit Status, and Welcome Call Status Setup Pages

The following setup pages should be redesigned to match the **Project Status Setup** page exactly.

* Building Categories
* Permit Statuses
* Welcome Call Statuses

These are administrative lookup tables and should share the same layout, behavior, validation, dialogs, and user experience.

Do **not** create three different UI implementations.

Instead, follow one reusable pattern.

---

# General Requirements

All three pages should have:

* Same toolbar
* Same search box
* Same Add button
* Same Edit dialog
* Same Delete confirmation
* Same Active toggle
* Same Display Order behavior
* Same loading state
* Same success/error toast messages
* Same spacing and typography
* Same responsive layout

The only thing that changes between pages is the database table and field names.

---

# Grid Layout

All three pages should use this layout.

| Actions     | Order | Name       | Description         | Active |
| ----------- | ----: | ---------- | ------------------- | ------ |
| Edit Delete |  ☰ 10 | Garage     | Garage structure    | ON     |
| Edit Delete |  ☰ 20 | Commercial | Commercial building | ON     |

Default sorting

```sql
ORDER BY display_order ASC,
         <name column> ASC
```

Never default to alphabetical sorting alone.

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

The drag handle indicates reorder support.

---

# Drag & Drop Ordering (Preferred)

Rows should support drag-and-drop.

After dropping

* recalculate display_order
* update database
* update local state
* show

```
Display order updated.
```

If drag-and-drop cannot be implemented cleanly with the current DataGrid, allow manual editing of Display Order.

---

# Active Column

Use the exact same ON/OFF toggle used by Project Status.

Example

```
ON
```

```
OFF
```

Clicking the switch should

* update database immediately
* update local state
* show

```
Updated successfully.
```

No modal required.

---

# Search

Each page should search all meaningful text fields.

---

## Building Categories

Search

* Building Category Name
* Description

---

## Permit Status

Search

* Status Name
* Description

---

## Welcome Call Status

Search

* Status Name
* Description

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

Continue displaying

```
9 Records

5 Records
```

beside each page title.

---

# Dialog Layout

Use one consistent dialog.

---

## Building Categories

Database

```sql
proj_s_building_categories
```

Dialog

```
------------------------------------

Building Category

------------------------------------

Category Name *

[____________________]

Description

[____________________]

Display Order

[ 10 ]

Status

☑ Active

------------------------------------

Cancel          Save

------------------------------------
```

---

Validation

Category Name

* Required
* Unique
* Maximum 100 characters

Description

Optional

Display Order

Numeric

---

Default sort

```sql
ORDER BY display_order,
         building_category_name
```

---

## Permit Status

Database

```sql
proj_s_permit_status
```

Dialog

```
------------------------------------

Permit Status

------------------------------------

Status Name *

[____________________]

Description

[____________________]

Display Order

[ 10 ]

Status

☑ Active

------------------------------------

Cancel          Save

------------------------------------
```

Validation

Status Name

Required

Unique

Maximum 100 characters

---

Default sort

```sql
ORDER BY display_order,
         status_name
```

---

## Welcome Call Status

Database

```sql
proj_s_welcome_call_status
```

Dialog

```
------------------------------------

Welcome Call Status

------------------------------------

Status Name *

[____________________]

Description

[____________________]

Display Order

[ 10 ]

Status

☑ Active

------------------------------------

Cancel          Save

------------------------------------
```

Validation

Status Name

Required

Unique

Maximum 100 characters

---

Default sort

```sql
ORDER BY display_order,
         status_name
```

---

# Delete

All three pages should use the same confirmation dialog.

```
Delete Record?

This record may already be referenced by existing projects.

Cancel

Delete
```

If the record is referenced

prevent deletion.

Prefer

```
is_active = false
```

instead of deleting whenever possible.

---

# Loading State

Display skeleton rows or loading spinner.

---

# Empty State

Display

```
No Records

Click "Add" to create one.
```

---

# Success Messages

After Add

```
Added successfully.
```

After Edit

```
Updated successfully.
```

After Toggle

```
Status updated.
```

After Reorder

```
Display order updated.
```

---

# Error Messages

Display friendly messages.

Example

```
Unable to save changes.

Please try again.
```

Do not expose PostgreSQL or Supabase errors.

---

# Performance

* Update local state whenever possible.
* Avoid unnecessary full-page reloads.
* Keep all interactions responsive.

---

# UI Consistency

These three pages should be visually identical to **Project Status Setup**.

Use the exact same:

* DataGrid
* Dialog component
* Search bar
* Buttons
* Action icons
* Active toggle
* Display Order behavior
* Pagination
* Toast notifications
* Loading indicators
* Empty states

Only the database table and displayed field names should differ.

---

# Architecture Recommendation

Rather than maintaining six nearly identical setup pages, extract reusable components:

* `SetupDataGrid`
* `SetupDialog`
* `SetupDeleteDialog`
* `SetupActiveToggle`
* `SetupSearchToolbar`

Each setup page should only provide:

* Table name
* Primary key
* Display name field
* Description field (if applicable)
* Default sort
* Validation rules

This keeps all setup pages consistent and makes future changes (such as updating dialog styles or table behaviors) apply everywhere with minimal code duplication.

=====

display order in the add/edit forms shouldnt be added becuase they are already drag and drop

()When saving, display_order is +1 from the current or highest order.


=====

I actually think this is a better UX.

`display_order` is an implementation detail, not something administrators should manage manually. Once you've implemented drag-and-drop ordering, having a **Display Order** input becomes redundant and can even cause conflicts.

I'd update all Setup pages with the following rule.

---

## Remove Display Order from Add/Edit Dialogs

Do **not** display the **Display Order** field in:

* Project Status
* States
* Origin Addresses (already removed)
* Building Categories
* Permit Status
* Welcome Call Status

The user should never manually assign the order.

---

## Automatic Display Order Assignment

When a new record is created:

1. Retrieve the current highest `display_order`.
2. Set the new record's `display_order` to:

```text
highest_display_order + 1
```

or

```sql
MAX(display_order) + 1
```

If there are no existing records:

```text
display_order = 1
```

---

### Example

Current records

| Name      | Display Order |
| --------- | ------------: |
| Pending   |             1 |
| Approved  |             2 |
| Completed |             3 |

Adding

```text
Rejected
```

Automatically saves

```text
display_order = 4
```

No user interaction required.

---

### After Drag & Drop

If the administrator rearranges

```text
Pending

Approved

Completed

Rejected
```

to

```text
Pending

Rejected

Approved

Completed
```

The application should automatically update

```text
Pending     1

Rejected    2

Approved    3

Completed   4
```

The user never edits numbers.

---

# Simplified Dialog

Instead of

```
Category Name

Description

Display Order

Active
```

use

```
Category Name

Description

Active
```

Cleaner and easier to understand.

---

# Business Rule

> **Display Order is a system-managed field.**
>
> It is automatically assigned when a new record is created and automatically recalculated whenever rows are reordered using drag-and-drop. Users should never manually edit or enter `display_order`.

---

## Prompt for the AI

> Remove the **Display Order** field from every Add and Edit dialog across all Setup pages. Since the grids support drag-and-drop ordering, `display_order` is now a system-managed field and should never be manually edited by users.
>
> When creating a new record:
>
> * Query the highest existing `display_order`.
> * Set the new record's `display_order` to `MAX(display_order) + 1`.
> * If no records exist, use `display_order = 1`.
>
> When rows are reordered using drag-and-drop:
>
> * Recalculate the `display_order` values sequentially based on the new row positions.
> * Persist the updated order to the database.
> * Refresh the grid and display a success toast.
>
> This behavior should be applied consistently to:
>
> * Project Status
> * States
> * Building Categories
> * Permit Status
> * Welcome Call Status
>
> The dialogs should only contain fields that users are expected to edit. `display_order` must remain an internal implementation detail managed entirely by the application.
