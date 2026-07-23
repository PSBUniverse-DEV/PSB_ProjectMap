Looking at the screenshot, the detail panel is now **out of sync** with the database changes. It looks like Cline updated the Add/Edit form but forgot to update the read-only detail drawer.

### Issues I can see

The right panel only displays:

* Project Value ✅
* Project Address ✅
* Dealer ✅
* Schedule (still using old field names)

  * Order Received
  * Scheduled Project Date
  * Install Date

Everything else from the new schema is missing.

According to your current schema, the project detail should also support these fields: 

* Building Category
* Project Status
* Welcome Call Status
* Permit Status
* Invoice Number
* Order Received At
* Scheduled Project Start
* Scheduled Project End
* Install Start
* Install End
* Notes (if provided)

---

### Another problem

The Schedule section is still using the **old labels**:

```
Scheduled Project Date
Install Date
```

But your database has already been renamed to:

```
Scheduled Project Start
Scheduled Project End

Install Start
Install End
```

So the UI is showing an outdated model.

---

### The panel also isn't resolving lookup values

For example:

Instead of showing

```
Building Category
Commercial
```

it's probably only receiving

```
building_category_id = 3
```

The detail drawer should display the related lookup name, not the foreign key ID.

The same applies to:

* Project Status
* Permit Status
* Welcome Call Status

---

## Prompt for Cline

> The Project Detail Drawer is no longer synchronized with the updated Project schema.
>
> The Add/Edit Project form has been updated with the new operational fields, but the read-only Project Detail panel still reflects the old schema.
>
> ### Required updates
>
> Update `ProjectDetailDrawer` to display the current project information from the latest database schema.
>
> **Customer Information**
>
> * Client Name
> * Dealer
> * Building Category
>
> **Project Information**
>
> * Project Address
> * Project Value
> * Invoice Number
>
> **Workflow Status**
>
> * Project Status
> * Welcome Call Status
> * Permit Status
>
> **Scheduling**
>
> * Order Received At
> * Scheduled Project Start
> * Scheduled Project End
> * Install Start
> * Install End
>
> **Notes**
>
> * Display project notes when available.
>
> ### Lookup values
>
> Do **not** display foreign key IDs.
>
> Resolve and display:
>
> * `building_category_id` → Building Category Name
> * `status_id` → Project Status Name
> * `permit_status_id` → Permit Status Name
> * `welcome_call_status_id` → Welcome Call Status Name
>
> ### Cleanup
>
> Remove references to the obsolete fields:
>
> * `scheduled_project_date`
> * `install_date`
>
> Replace them with:
>
> * `scheduled_project_start`
> * `scheduled_project_end`
> * `install_start`
> * `install_end`
>
> Keep the current layout and styling. Only update the displayed data so the detail panel matches the current database schema and Add/Edit Project form.
