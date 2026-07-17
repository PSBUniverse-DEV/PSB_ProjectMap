I actually wouldn't jump straight into fleet management. I'd make **Runs** the orchestration layer between **Projects** and future **Drivers/Vehicles**.

Think of it like this:

```
Projects Map (Current)
        │
        ▼
Runs (Grouping & Planning)
        │
        ▼
Driver Assignment
        │
        ▼
Vehicle Assignment
        │
        ▼
Route Optimization
        │
        ▼
Fleet Management
```

The Runs module should answer:

> "Tomorrow, which projects are we doing together?"

—not—

> "How do we drive there?"

That comes later.

---

# RUNS MODULE ROADMAP.md

```md
# Runs Module Roadmap

## Overview

The Runs module is the next evolution of the Project Map.

Instead of looking at one project at a time, users will create a **Run**, which is a collection of projects scheduled to be completed together.

A Run represents one day's work for one crew.

Examples:

Run #1001

Origin:
Dallas Warehouse

Projects:

• ABC Construction
• Smith Residence
• Johnson Commercial

Status:
Scheduled

---

The Runs module does NOT perform route optimization.

It only groups projects together.

Future modules will optimize the route automatically.

---

# Goals

Allow planners to:

• Create Runs
• Assign Projects into Runs
• View all projects belonging to a Run
• Display an entire Run on the map
• Calculate total distance/time
• Prepare for Driver Assignment

---

# Database Design

## Run Header

Table

proj_t_runs

Represents one Run.

Columns

Run ID

Run Number

Run Name

Origin ID

Run Date

Status

Notes

Estimated Distance

Estimated Duration

Estimated Subtotal

Created By

Created Date

Updated By

Updated Date

---

Status Examples

Draft

Planned

Scheduled

In Progress

Completed

Cancelled

---

## Run Details

Table

proj_t_run_projects

Each row links one project to one Run.

Columns

ID

Run ID

Project ID

Stop Sequence

Arrival Time (future)

Departure Time (future)

Notes

Example

Run 100

↓

Project 12

Stop 1

Run 100

↓

Project 28

Stop 2

Run 100

↓

Project 41

Stop 3

---

There is NO duplicated project information.

Only IDs are stored.

---

# Relationships

proj_t_runs

↓

proj_t_run_projects

↓

proj_t_projects

Origin comes from

proj_s_origin_addresses

State colors continue using

proj_s_states

---

# Map Behavior

The existing Project Map should be reused.

Do NOT create a second map page.

Instead introduce two modes.

---

Mode 1

Projects

Current behavior.

Shows all projects.

Selecting a project displays details.

---

Mode 2

Runs

Shows Runs.

Selecting a Run displays:

Origin

↓

Stop 1

↓

Stop 2

↓

Stop 3

↓

Stop N

Draw one continuous route.

---

# Creating a Run

Planner clicks

New Run

↓

Choose Origin

↓

Choose Run Date

↓

Choose Projects

↓

Save

Initially, project order can be manual.

Future optimization will reorder them automatically.

---

# Run Detail Panel

Display

Run Name

Run Date

Origin

Number of Projects

Estimated Distance

Estimated Duration

Estimated Subtotal

Status

Crew (future)

Driver (future)

Vehicle (future)

---

Projects Grid

Sequence

Client

Dealer

Status

Subtotal

Distance

Estimated Time

---

# Map Rendering

Display

Origin Marker

↓

Polyline

↓

Project 1

↓

Polyline

↓

Project 2

↓

Polyline

↓

Project 3

Each project keeps its state color.

Origin keeps its own icon.

---

# Route Calculation

Current Project Map

Origin

↓

One Project

Runs

Origin

↓

Project 1

↓

Project 2

↓

Project N

Each segment uses OSRM.

Total Distance

=

Segment1

+

Segment2

+

Segment3

...

---

# Drag and Drop

Projects inside a Run should support:

Drag

↓

Drop

↓

Update Stop Sequence

Recalculate:

Estimated Distance

Estimated Duration

---

# Project Rules

A project may belong to:

One active Run only.

Prevent duplicate assignment.

Allow removing from a Run.

Completed Runs retain history.

---

# Dashboard

Cards

Runs Today

Projects Assigned

Projects Unassigned

Distance Today

Estimated Revenue

---

# Future Modules

The Runs module prepares the application for:

Driver Assignment

Vehicle Assignment

Crew Assignment

GPS Tracking

Live Progress

Proof of Delivery

Route Optimization

Fleet Management

Notifications

ETA Calculations

---

# UI Layout

Reuse the existing Project Map page.

Example

--------------------------------------------------------

Projects Map

--------------------------------------------------------

[ Projects ] [ Runs ]

--------------------------------------------------------

Search

Filters

--------------------------------------------------------

Sidebar

Projects List

or

Runs List

--------------------------------------------------------

Map

--------------------------------------------------------

Right Detail Panel

--------------------------------------------------------

When Runs mode is selected:

Left Panel

Run List

Center

Map showing entire Run

Right Panel

Run Details

Projects Grid

No additional page should be created.

The existing map page becomes the central Operations workspace.

---

# Design Principles

• Keep Runs independent from Projects.
• Never duplicate project information.
• Store only foreign keys.
• Continue using Origin setup.
• Continue using State setup.
• Reuse the existing Project Map.
• Keep routing providers configurable.
• Route optimization will be implemented later.
• Driver and Vehicle assignment are separate modules.
• Build Runs as the orchestration layer between Projects and Fleet Management.
```

## My recommendation before coding

I would make **Project Map** and **Runs** share the same workspace instead of creating `/runs`.

For example:

```
Operations Workspace
─────────────────────────────────────────────────────

[ Projects ] [ Runs ]

─────────────────────────────────────────────────────

Search | Filters | + Add Project | + New Run

─────────────────────────────────────────────────────

┌───────────────┬───────────────────────────────┬──────────────┐
│               │                               │              │
│ Left Panel    │           Map                │ Right Panel  │
│               │                               │              │
└───────────────┴───────────────────────────────┴──────────────┘
```

* **Projects tab**: Current implementation (individual project markers).
* **Runs tab**: Shows runs, routes, stop order, and run details using the exact same map.
* The only thing that changes is the data source and the right-hand panel.

This keeps the Operations workspace unified and avoids maintaining two nearly identical map pages. As your application grows into dispatching and fleet management, the same workspace can naturally expand to include Drivers, Vehicles, Live Tracking, and Route Optimization without requiring a redesign.


---


I actually like that better.

A lot of companies don't have permanent crews. Today it might be:

* Team A
* Team B
* Team C

Then next month:

* Team Mike
* Team John
* Team Alpha

Or even:

* "Mike, John & Kevin"

Creating `teams`, `team_members`, `team_assignments`, etc. this early is overengineering. You'd end up maintaining master data that may never be reused.

I'd keep it simple and evolve it later if the business requires it.

I'd update the roadmap like this:

---

# Team Assignment (Simple Version)

The Runs module will support assigning a team to each Run.

To keep the initial implementation simple, **Team Assigned** will be stored as a plain text field.

Example:

```text
Team Assigned

Team A
```

or

```text
Team Assigned

Mike / John / Kevin
```

or

```text
Team Assigned

Installation Team 2
```

No master table is required.

No foreign key is required.

No Team setup screen is required.

This allows planners to type whatever team will handle the Run.

---

## Database Changes

Modify:

```text
proj_t_runs
```

Add:

```sql
team_assigned TEXT NULL
```

Example values:

```text
Team A

Installation Team 1

Mike / John / Kevin

Outsource Crew
```

---

## Run Details

Display:

```text
Run Name

Run Date

Origin

Team Assigned

Number of Projects

Estimated Distance

Estimated Duration

Estimated Subtotal

Status
```

The **Team Assigned** field is editable directly from the Run Details panel.

Use a simple textbox.

No lookup.

No dropdown.

No validation beyond normal text length.

---

## Why This Approach?

The purpose of the Runs module is to organize work, not manage employees.

Keeping the team as free text:

* Eliminates unnecessary setup tables.
* Avoids creating Team, Team Member, and Team Assignment tables prematurely.
* Keeps data entry fast for dispatchers.
* Supports changing crew names without database maintenance.

If the business later requires crew scheduling, employee availability, attendance, or labor reporting, the `team_assigned` field can be replaced with a foreign key to a future Team module without affecting the overall Runs architecture.

---

## Future Enhancement

If needed in the future, `team_assigned` can evolve into:

```text
Team
    ↓
Team Members
    ↓
Employees
    ↓
Attendance
    ↓
Crew Scheduling
```

However, **this functionality is intentionally out of scope for the initial Runs module**.

---

I would also make one small enhancement while you're still designing the table. Besides `team_assigned`, I'd add a `vehicle_assigned` field as **another nullable text field**.

```sql
team_assigned TEXT NULL,
vehicle_assigned TEXT NULL
```

Examples:

* **Team Assigned:** `Team A`
* **Vehicle Assigned:** `Truck 3`, `Van 1`, `F-150`, `Outsource Vehicle`

It follows the same philosophy: keep it simple now, and if the company eventually needs a full fleet management system, these fields can later be replaced with foreign keys to dedicated Team and Vehicle modules. This keeps the initial implementation lightweight while leaving a clean upgrade path.
