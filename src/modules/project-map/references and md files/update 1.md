From the screenshots, I can see that Asana is acting as the **master source of the sales workflow**, while your Project Map is becoming the **operations/scheduling system**. You should not copy every Asana field blindly. Only bring over the data that operations actually need.

## What I observed from Asana

Each customer/order contains information such as:

* Customer Name
* Dealer
* Building Address
* Order Received Date
* Welcome Call Status
* Permit Status
* State
* Order Subtotal
* Building Category
* Invoice Number
* Attachments
* Comments
* Assignee

The Project Map currently only has:

* Client Name
* Address
* Dealer
* Order Received Date
* Install Date
* Scheduled Date
* Status
* Price
* Coordinates

There are several missing fields that would make scheduling much easier.

---

# 1. Add Time Support

Currently you only have dates.

```
Order Received Date
Scheduled Project Date
Install Date
```

Operations scheduling eventually needs **time**, not just dates.

Instead of

```
Scheduled Project Date
2026-07-23
```

it should support

```
2026-07-23 8:00 AM
```

or

```
2026-07-23 1:30 PM
```

I recommend:

```
scheduled_project_start
scheduled_project_end
```

instead of just one datetime.

Example

```
Start:
July 23 2026 8:00 AM

End:
July 23 2026 12:00 PM
```

This will later allow:

* daily schedules
* overlapping detection
* arrival calculations
* technician workload

without redesigning the database later.

---

# 2. Building Category

Yes.

Do NOT store text.

Create a lookup table.

```
proj_s_building_categories
--------------------------------

id
building_category_name
description
display_order
is_active
created_at
updated_at
```

Examples

```
Garage

Commercial

Barn

Storage

Lean-To

Carport

Agricultural

Residential

Workshop
```

Then

```
proj_t_projects

building_category_id
```

FK

This is much cleaner.

---

# 3. Welcome Call Status

Do NOT make it a text field.

Make another lookup table.

```
proj_s_welcome_call_status
```

Example

```
Pending

Attempted

Completed

Needs Callback

Not Required
```

FK on projects.

---

# 4. Permit Status

Same approach.

```
proj_s_permit_status
```

Example

```
Pending

Submitted

Approved

Rejected

Not Required
```

FK.

---

# 5. Invoice Number

This one does NOT need a lookup.

Simply add

```
invoice_number
varchar(50)
```

inside

```
proj_t_projects
```

because every project has a unique invoice.

---

# 6. Order Time

Right now you only have

```
order_received_date
```

I'd change it to

```
order_received_datetime
```

or

```
order_received_at
```

That preserves the exact submission time.

---

# 7. Install Time

Instead of

```
install_date
```

I'd use

```
install_start
install_end
```

Again, more future-proof while still simple.

---

# 8. Route Arrival Time

Earlier you wanted:

```
Arrival Time per Stop
```

I would store it in

```
proj_t_run_projects
```

because it depends on the run, not the project.

```
arrival_datetime
```

Example

```
Run A

Stop 1

Arrival

9:42 AM
```

Tomorrow the same project could belong to another run with another arrival time.

---

# 9. Estimated Mileage

You also mentioned mileage.

Add

```
estimated_mileage
```

to

```
proj_t_runs
```

This should be calculated together with

```
estimated_distance

estimated_duration

estimated_subtotal
```

during recalculation.

---

# Suggested Phase 1 Database Changes

### New lookup tables

```
proj_s_building_categories

proj_s_permit_status

proj_s_welcome_call_status
```

---

### proj_t_projects

Add

```
building_category_id

permit_status_id

welcome_call_status_id

invoice_number

order_received_at

scheduled_project_start

scheduled_project_end

install_start

install_end
```

---

### proj_t_runs

Add

```
estimated_mileage
```

---

### proj_t_run_projects

Add

```
arrival_datetime
```

---

# One More Suggestion

Looking at Asana, there is another field that will become valuable later:

```
Assignee
```

Eventually, your runs are going to have:

```
Run
 ├── Vehicle
 ├── Team
 ├── Driver
 └── Crew
```

Therefore, **do not add `assignee` to projects**.

The assignment belongs to the **Run**, not the project, because one run services many projects.

---

## Prompt for Cline

> We are expanding Phase 1 of the Project Map based on the operational workflow used in Asana. The goal is to capture scheduling and operations data without overengineering the database.
>
> ### Database updates
>
> Create the following lookup tables:
>
> * `proj_s_building_categories`
> * `proj_s_permit_status`
> * `proj_s_welcome_call_status`
>
> Add the following columns to `proj_t_projects`:
>
> * `building_category_id` (FK)
> * `permit_status_id` (FK)
> * `welcome_call_status_id` (FK)
> * `invoice_number`
> * `order_received_at` (datetime)
> * `scheduled_project_start` (datetime)
> * `scheduled_project_end` (datetime)
> * `install_start` (datetime)
> * `install_end` (datetime)
>
> Add the following column to `proj_t_runs`:
>
> * `estimated_mileage`
>
> Add the following column to `proj_t_run_projects`:
>
> * `arrival_datetime`
>
> ### Rules
>
> * Use lookup tables for statuses and building categories. Do not store status names as free text.
> * Invoice number remains a text field in `proj_t_projects`.
> * Arrival time belongs to `proj_t_run_projects` because it is specific to a run, not the project itself.
> * Scheduled and install dates should support both date and time using datetime fields.
> * Keep the implementation simple and database-driven.
> * **DO NOT OVERENGINEER THE SOLUTION.**
> * **DO NOT INTRODUCE NEW ARCHITECTURE OR COMPLEX ABSTRACTIONS.**
> * **FOLLOW THE DATABASE DESIGN AS THE SINGLE SOURCE OF TRUTH.**
> * **NEVER HALF-ASS THE UI/UX. Every new field must be displayed and edited consistently wherever it is used.**

---

This is actually a good point to stop and redesign the forms before you keep adding columns. Right now both forms are still "v1" forms. If you continue adding fields randomly, they're going to become cluttered and difficult to use.

Based on your current forms and the Asana workflow, this is how I'd organize them.

---

# Project Form (Operations Data)

The Project should contain information about **the customer and the job**, not routing.

## Section 1 — Customer Information

```
Client Name *
Dealer *
Building Category *
State
```

---

## Section 2 — Project Location

```
Project Address *
Latitude (readonly)
Longitude (readonly)
```

Keep the current location search.

---

## Section 3 — Sales / Order Information

```
Project Subtotal *

Invoice #

Order Received
(Date + Time)

Dealer Order
(button)

```

---

## Section 4 — Workflow Status

Instead of only

```
Status
```

have

```
Project Status

Welcome Call Status

Permit Status
```

Exactly like Asana.

---

## Section 5 — Scheduling

```
Scheduled Start

Scheduled End

Install Start

Install End
```

instead of three separate dates.

---

## Section 6 — Notes

Large textarea.

---

# Run Form

Runs are different.

A run is an operational schedule.

---

## Section 1 — Run Information

```
Run Name

Origin

Run Date

Status
```

---

## Section 2 — Team

```
Team Assigned

Vehicle Assigned
```

Later you can add

```
Driver
```

without redesigning.

---

## Section 3 — Route Statistics (readonly)

Instead of only

```
Distance

Duration

Subtotal
```

include

```
Estimated Distance

Estimated Mileage

Estimated Duration

Estimated Revenue

Stops
```

These should never be editable.

Only recalculation changes them.

---

## Section 4 — Notes

Large textarea.

---

# Route Timeline

This is already close.

Each stop should eventually show

```
Stop #

Client

Arrival Time

Travel Time

Distance

Subtotal

Building Category

Permit Status

Welcome Call Status

Note
```

instead of only

```
Client

Address

Subtotal
```

---

# Detail Panel

I also noticed the right panel is becoming crowded.

I would group it.

```
Route Summary
```

```
Distance

Mileage

Duration

Revenue

Stops
```

---

```
Run Information
```

```
Origin

Team

Vehicle

Run Date

Status
```

---

```
Route Timeline
```

---

```
Route Statistics
```

---

```
Run Notes
```

---

```
Footer
```

```
Edit

Print Record

Recalculate Run
```

Nothing else.

No Optimize.

No Delete.

Delete belongs only inside the Edit Run dialog, exactly as you've already decided.

---

# Database Additions I'd Make

## New lookup tables

```
proj_s_building_categories

proj_s_permit_status

proj_s_welcome_call_status
```

---

## proj_t_projects

```
building_category_id

permit_status_id

welcome_call_status_id

invoice_number

order_received_at

scheduled_start

scheduled_end

install_start

install_end
```

---

## proj_t_runs

```
estimated_mileage
```

---

## proj_t_run_projects

```
arrival_datetime

notes
```

---

# One More Improvement

From the Asana screenshots, I noticed another opportunity.

Asana separates the **business workflow** from the **installation workflow**.

For example:

```
Welcome Call
↓

Permit

↓

Ready for Install

↓

Installation

↓

Repairs

↓

Completed
```

Your current `Project Status` is trying to represent all of these with one field.

That will eventually become messy because "Ready for Install" and "Permit Pending" are different concepts.

I recommend keeping them separate:

* **Project Status** → overall lifecycle (Draft, Active, Scheduled, Completed, Cancelled, etc.)
* **Welcome Call Status** → independent lookup
* **Permit Status** → independent lookup

That matches how operations actually work and avoids encoding multiple business processes into a single status field.

This keeps the schema normalized, makes filtering much more powerful, and aligns the Project Map with the operational data shown in Asana without overcomplicating the design.
