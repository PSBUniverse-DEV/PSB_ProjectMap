
read:
src\modules\project-map\references and md files\references\database-table-reference.md
src\modules\project-map\references and md files\references\migration_script_requirements.md
---

# PROJECT MAP - PHASE 1 (MVP)

## Objective

Complete the core Project Map and Runs functionality so the module is ready for UAT.

Only implement the features listed below. Do not introduce additional features unless explicitly requested.

---

# Step 1 - Project Pricing

## Goal

Display project pricing throughout the Project Map module.

### Requirements

* Display project subtotal on project cards.
* Display subtotal in the Project Details panel.
* Display subtotal in Run Timeline stop cards.
* Calculate and display the Run's estimated subtotal.
* Save the estimated subtotal in `proj_t_runs.estimated_subtotal`.

---

# Step 2 - Runs Management

## Goal

Allow planners to create and manage delivery/installation runs.

### Requirements

Implement:

* Create Run
* Edit Run
* Delete Run
* Assign Project to Run
* Remove Project from Run
* Reorder Stops
* Print Run Record
* Recalculate Run

### Database

Persist:

* estimated_distance
* estimated_duration
* estimated_mileage
* estimated_subtotal
* stops

inside

```text
proj_t_runs
```

---

# Step 3 - Sequential Route Calculation

## Goal

Calculate routing information for every stop in sequence.

Example

```text
Origin

↓

Stop 1

↓

Stop 2

↓

Stop 3
```

Each segment should calculate:

* Distance
* Duration
* Mileage
* Subtotal

The overall run should calculate:

* Total Distance
* Total Duration
* Total Mileage
* Total Revenue

---

# Step 4 - Stop Information

Each assigned project (run stop) should store its own routing information.

Store per-stop:

* Stop Sequence
* Estimated Arrival Date/Time
* Estimated Distance
* Estimated Duration
* Estimated Mileage
* Estimated Subtotal
* Stop Notes

These values belong to:

```text
proj_t_run_projects
```

---

# Step 5 - Arrival Scheduling

Automatically calculate the estimated arrival time for every stop.

Example

```text
Run Date

2026-07-22 8:00 AM

↓

Stop 1

Arrival
8:12 AM

↓

Stop 2

Arrival
8:31 AM

↓

Stop 3

Arrival
9:05 AM
```

Arrival times should be recalculated whenever:

* Origin changes
* Stop order changes
* Stops are added
* Stops are removed
* Run date changes

---

# Step 6 - Route Timeline

Display a sequential timeline.

Example

```text
Origin

↓

1.
Martin House

1.5 km

5 min

Arrival
8:12 AM

↓

2.
ABC Warehouse

3.1 km

8 min

Arrival
8:25 AM

↓

3.
Client XYZ

4.8 km

11 min

Arrival
8:41 AM

↓

End
```

Each stop should display:

* Client
* Address
* Distance from previous stop
* Duration from previous stop
* Mileage from previous stop
* Estimated Arrival
* Subtotal
* Stop Note indicator

---

# Step 7 - Reporting

Generate a printable Run Record.

Include:

Run Information

* Run Number
* Run Name
* Run Date
* Origin
* Team
* Vehicle
* Notes

Run Summary

* Total Stops
* Total Distance
* Total Duration
* Total Mileage
* Total Revenue

Stop Details

For every stop:

* Stop Sequence
* Client Name
* Address
* Estimated Arrival
* Distance
* Duration
* Mileage
* Price
* Notes

The report should print in stop order.

---

# Step 8 - Map Visualization

The map should display:

* Origin
* Project markers
* Selected run markers
* Sequential route polyline

Whenever the run changes:

* Recalculate route
* Redraw polyline
* Refresh markers
* Refresh timeline
* Refresh statistics

---

# Step 9 - Status Colors

Display color-coded project status markers.

Examples:

* Draft
* Pending
* Scheduled
* Ongoing
* Completed
* Cancelled

Marker colors should come from the status configuration stored in the database.

---

# Step 10 - State Colors

Display state/region colors on project markers using the configured state color mapping.

---

# Development Rules

Before implementing any feature:

1. Follow the database schema as the single source of truth.
2. Do not overengineer solutions.
3. Do not maintain duplicate state.
4. Rebuild UI state from the database after every data modification.
5. Complete the entire user flow before marking a feature as finished.
6. Never leave the UI in a partially updated state.
7. Keep the implementation modular, maintainable, and consistent with the existing architecture.

---

This ordering is deliberate. Each step builds on the previous one, so your AI coder won't be tempted to implement arrival times before routing exists or reports before the underlying data is available. It also clearly separates **database persistence**, **business logic**, **UI**, and **reporting**, making the implementation sequence much less prone to hallucination or dependency issues.
