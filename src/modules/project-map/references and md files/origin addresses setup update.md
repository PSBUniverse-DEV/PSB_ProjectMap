Here's a revised prompt for the **Origin Addresses Setup** page that aligns with your latest database schema and business rules.

---

# Prompt: Upgrade Origin Addresses Setup Page

We need to redesign and enhance the **Origin Addresses Setup** page in the **PSBUniverse Project Map** module.

This is an **administrative configuration page**. The design should remain clean, modern, and consistent with the rest of the PSBUniverse Setup module.

---

# Database

The page uses the following table.

```sql
public.proj_s_origin_addresses

id
origin_name
origin_code
formatted_address
address_line_1
city
state
state_code
postal_code
country
latitude
longitude
is_default
is_active
created_at
```

```sql
create table public.proj_s_origin_addresses (
    id serial primary key,
    origin_name text not null unique,
    origin_code text,
    formatted_address text,
    address_line_1 text,
    city text,
    state text,
    state_code text,
    postal_code text,
    country text,
    latitude numeric(10,7),
    longitude numeric(10,7),
    is_default boolean default false,
    is_active boolean default true,
    created_at timestamptz default now()
);
```

---

# Business Rules

## Remove `is_default`

The **is_default** field is no longer used.

Do not display it anywhere.

Remove it from:

* Grid
* Add Dialog
* Edit Dialog
* Validation
* API payloads

Ignore this column entirely.

---

# Grid Layout

Replace the current table with:

| Actions     | Origin Name           | Code   | Formatted Address                       | City    | State   | Active |
| ----------- | --------------------- | ------ | --------------------------------------- | ------- | ------- | ------ |
| Edit Delete | Atlanta HQ            | ATL-HQ | 123 Main Street, Atlanta, Georgia 30001 | Atlanta | Georgia | ON     |
| Edit Delete | Dallas Service Center | DAL-SC | Dallas, Texas, USA                      | Dallas  | Texas   | OFF    |

---

# Formatted Address

Instead of hiding it,

display

```text
formatted_address
```

This is the address users actually recognize.

Do NOT truncate excessively.

Allow wrapping if necessary.

This is much more useful than showing individual address parts.

---

# Active Column

Replace the checkbox/blank column with an interactive ON/OFF toggle.

Example

```
ON
```

or

```
OFF
```

Clicking the switch should immediately:

* update database
* update UI
* show success toast

```
Origin address updated.
```

No modal required.

---

# Search

Search should include:

* Origin Name
* Code
* Formatted Address
* City
* State

---

# Default Sort

```sql
ORDER BY origin_name ASC
```

---

# Add Origin Address Dialog

Redesign the modal.

Current dialog has unnecessary controls.

Remove

```
Is Default
```

completely.

New layout

```
----------------------------------------

Origin Address

----------------------------------------

Origin Name *

[________________________]

Origin Code

[________________________]

Search Address

[ Search address... ]

Formatted Address

[ Auto populated ]

City

[ Auto populated ]

State

[ Auto populated ]

Active

☑ Active

----------------------------------------

Cancel            Save

----------------------------------------
```

---

# Address Search

The existing address search should remain.

When an address is selected,

automatically populate

* formatted_address
* address_line_1
* city
* state
* state_code
* postal_code
* country
* latitude
* longitude

Users should never manually encode these values.

---

# Edit Dialog

Use the same layout.

Populate

* Origin Name
* Origin Code
* Address Search
* Formatted Address
* Active

The search box should display the current formatted address.

---

# Read Only Fields

After selecting an address,

show

```
Formatted Address
```

as a read-only textbox or textarea.

Users should immediately see the full address that will be saved.

---

# Validation

Origin Name

Required

Must be unique.

Origin Code

Optional.

Maximum length 20.

Formatted Address

Required.

Must exist after selecting an address.

---

# Delete

Before deleting

show

```
Delete Origin Address?

This origin address may already be used by project runs or route calculations.

Cancel

Delete
```

If referenced by another table,

prevent deletion.

Prefer disabling

```
is_active = false
```

instead of deleting whenever possible.

---

# Empty State

If no origin addresses exist,

display

```
No Origin Addresses

Click "Add Origin Address" to create one.
```

---

# Loading State

Display skeleton rows or loading spinner while loading.

---

# Success Messages

After Add

```
Origin address added successfully.
```

After Edit

```
Origin address updated successfully.
```

After Active Toggle

```
Origin address updated.
```

---

# Error Messages

Display friendly messages.

Avoid exposing raw PostgreSQL or Supabase errors.

Example

```
Unable to save origin address.

Please try again.
```

---

# UI Consistency

Use the existing PSBUniverse components.

Maintain:

* Current spacing
* Current buttons
* Current typography
* Current card layout

Do not introduce a different design language.

---

# Performance

* Do not reload the entire page after toggling Active.
* Update local state whenever possible.
* Keep address search responsive.

---

# Goal

The finished page should allow administrators to:

* View all configured origin addresses
* See the complete formatted address at a glance
* Toggle Active status directly from the grid
* Add new origin addresses using address search
* Edit existing origin addresses
* Search origin addresses quickly
* Keep the interface simple and consistent with the rest of the PSBUniverse Setup pages

The final result should match the modern SaaS admin experience used throughout PSBUniverse while removing unused functionality (`is_default`) and surfacing the information that users actually need (`formatted_address` and `is_active`).
