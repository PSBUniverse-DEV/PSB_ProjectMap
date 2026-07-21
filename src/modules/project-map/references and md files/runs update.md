These are all symptoms of the same underlying problem: **the Run module has multiple independent sources of truth.** Some parts of the UI are updating from stale local state while others are reading from the database or cached route calculations. Everything should derive from the actual `run_projects` relationship.

Here's a prompt for your AI coder.

---

# Prompt: Fix Run State Synchronization and Project Assignment Integrity

There are several data synchronization issues in the Run module. The UI is showing stale information because different components are maintaining independent state instead of deriving everything from the current database state.

The Run Details panel, Runs List, Route Timeline, Route Summary, Statistics, and Map must always remain synchronized.

---

# Issue 1: Removed Stops Still Appear in Run

## Problem

When a project is removed from a run:

* the Route Timeline still displays the old stops
* Route Summary still displays the old totals
* Runs List still displays the old stop count
* Distance, Duration and Revenue remain unchanged

Example:

```text
Run originally

Origin
Stop A
Stop B

Remove Stop A
Remove Stop B

Expected

0 Stops

Actual

Timeline still contains Stop A and Stop B
Statistics still show 2 Stops
Runs List still shows 2 Stops
```

This indicates stale cached state.

---

## Required Fix

When a project is:

* added
* removed
* reordered

Immediately:

* refresh the run-project relationship
* rebuild the ordered stop list
* recalculate every route segment
* recalculate total distance
* recalculate total duration
* recalculate total revenue
* recalculate stop count
* redraw the map route
* refresh the selected Run Details
* refresh the Runs List

Do not reuse stale state.

Everything must be regenerated from the latest data.

---

# Issue 2: Route Timeline Not Matching Stop Count

Example:

Run Summary

```text
Stops

0
```

Timeline

```text
2 Stops

Stop 1

Stop 2
```

These values should never disagree.

---

## Required Fix

The following should all use the exact same data source:

* Route Timeline
* Route Summary
* Route Statistics
* Runs List
* Map markers
* Polyline generation

There should be one canonical ordered collection of run stops.

Example:

```text
orderedRunProjects[]
```

Every component should derive from this collection.

Do not maintain separate copies.

---

# Issue 3: Runs List Not Updating

The Runs List on the left currently shows stale values.

After any modification:

* Stop Count
* Distance
* Revenue

must refresh immediately.

No page refresh should be required.

---

# Issue 4: Prevent Duplicate Project Assignment

Currently:

Martin House

belongs to

```text
Run A
```

User selects

```text
Run B
```

User right-clicks Martin House

The context menu still shows

```text
Add to Run
```

This should never happen.

A project may belong to only one run.

---

## Required Behavior

Before displaying the context menu:

Determine whether the selected project already belongs to another run.

If:

```text
project.run_id != null
```

and

```text
project.run_id != selectedRun.id
```

then do NOT show:

```text
Add to Run
```

Instead show:

```text
Already Assigned

This project is already assigned to:

Abreeza

Remove it from that run before assigning it elsewhere.
```

The Add action must be disabled.

---

## If the project belongs to the selected run

Show:

```text
Remove from Run
```

instead of

```text
Add to Run
```

---

## If the project belongs to no run

Show

```text
Add to Run
```

---

# Business Rule

A project can belong to **one and only one** run at any given time.

Enforce this consistently:

* UI
* Context Menu
* Service Layer
* Database Validation

The UI should prevent invalid actions, and the service layer should reject them if attempted.

---

# Refresh Strategy

After every operation involving run-project assignments:

* Add Project
* Remove Project
* Reorder Stops
* Delete Run
* Create Run

Execute a complete refresh sequence:

1. Reload the run-project mappings from the database.
2. Rebuild the ordered stop list.
3. Recalculate segment routes.
4. Recalculate route totals and statistics.
5. Refresh the selected run details panel.
6. Refresh the runs list on the left.
7. Refresh map markers and route polylines.

No component should rely on previously cached route or stop data after these operations.

---

# Goal

The entire Run module should behave as a **single synchronized view** of the underlying data. At any point in time, the Runs List, Route Summary, Route Timeline, Route Statistics, and Map must all represent the exact same state, with project assignments remaining unique and consistent across the application.
