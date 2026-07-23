src\modules\project-map\references and md files\references\database-table-reference.md
src\modules\project-map\references and md files\references\migration_script_requirements.md
src\modules\project-map\references and md files\references\rule.md
src\modules\project-map\references and md files\references\simple.md

---

## Response to Cline

### 1. Form Redesign Scope

**Implement the full redesign now.**

Do **not** just append the new fields to the existing forms.

The current forms were designed around the original schema. Adding another 8–10 fields will make them cluttered and harder to use. The Update 1 proposal already groups the information logically:

**Project Form**

* Customer Information
* Project Location
* Sales / Order Information
* Workflow Status
* Scheduling
* Notes

**Run Form**

* Run Information
* Team
* Route Statistics (readonly)
* Notes

This is the right time to reorganize before the forms grow even larger.

---

### 2. Field Renaming

**Do a clean rename. Do not keep backward compatibility.**

This project is still evolving, so there is little benefit in carrying legacy names.

Rename:

* `order_received_date` → `order_received_at`
* `scheduled_project_date` → `scheduled_project_start`
* add `scheduled_project_end`
* `install_date` → `install_start`
* add `install_end`

Using datetime fields now avoids another migration later.

---

### 3. Priority

Implement in phases, but keep them within the same feature branch.

Recommended order:

1. Database migration
2. Server actions
3. Setup/lookups
4. Project Form
5. Run Form
6. Run Detail Panel
7. Run List
8. Route recalculation updates
9. Build + verification

Do **not** start changing the UI before the database and server actions are complete.

---

### 4. Migration Approach

**Create one migration script** for this update.

Everything in Update 1 belongs to the same feature:

* lookup tables
* new project columns
* new run columns
* new run-project columns
* seed data

Following your migration standards, it should be one idempotent migration with proper `RAISE NOTICE` logging and a final summary. 

---

# Additional Implementation Notes

There are a few things I'd add to the implementation plan.

### Route recalculation

Whenever a run is recalculated, update **all** of these together:

* estimated_distance
* estimated_mileage
* estimated_duration
* estimated_subtotal
* arrival_datetime for every stop
* stop sequence (if recalculation changes ordering)

The database should remain the single source of truth.

---

### Lookup Tables

Use lookup tables for:

* Building Category
* Permit Status
* Welcome Call Status

Do **not** store these as free text.

---

### Route Timeline

Once `arrival_datetime` exists, each stop should display:

* Stop number
* Client
* Arrival time
* Travel time
* Distance
* Revenue/Subtotal
* Building category
* Permit status
* Welcome call status

This makes the timeline much more useful for dispatch.

---

### UI

The Route Statistics section should remain **read-only**.

Users should never manually edit:

* Distance
* Mileage
* Duration
* Revenue
* Stops

Those values should only change after recalculation.

---

## One Improvement to the Current Plan

I would slightly reorder Phase 5.

Instead of immediately enhancing the Run Detail Panel, first ensure the recalculation logic is fully implemented and persists:

* `estimated_mileage`
* `arrival_datetime`

Only after those values are reliably stored should the UI display them. That prevents building UI around placeholder or incomplete data.

Other than that, the proposed implementation is well-structured and matches the architecture and database direction you've been establishing for the Project Map.
