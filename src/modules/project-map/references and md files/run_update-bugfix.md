This screenshot actually confirms the bug even more clearly.

The **route polyline is visiting four locations**, while the run should only contain **two assigned projects**.

That means the problem is no longer just a UI issue—it's affecting the routing engine as well.

The route calculation is being fed stale or duplicate waypoints.

---

# Prompt: Fix Route Calculation Using Stale/Duplicate Waypoints

There is a critical synchronization issue in the Run module.

The route displayed on the map does not match the projects actually assigned to the selected run.

## Current Behavior

The selected run contains only **2 assigned projects**, but:

* the Route Timeline displays **4 stops**
* the route polyline visits **4 locations**
* additional markers/segments are included that do not belong to the current run

This indicates that stale waypoints are being passed into the route calculation.

---

# Root Cause to Investigate

Review how the route waypoints are generated before calling OSRM.

Possible causes include:

* Previous run waypoints are not cleared.
* Removed projects remain in the waypoint array.
* Route state is being appended instead of replaced.
* Timeline state and map state are maintained separately.
* React state updates are using stale closures or previous state.
* Duplicate records returned from the run-project query.

The routing engine should **never** receive stale data.

---

# Required Fix

Whenever any of the following occurs:

* Run selection changes
* Project added to a run
* Project removed from a run
* Stop order changes
* Run is created
* Run is deleted

Perform a complete rebuild of the routing data.

### Step 1

Clear all existing route-related state.

Example:

```text
Current Route
Current Waypoints
Current Segments
Current Timeline
Current Statistics
Current Polyline
Current Markers
```

Do not reuse any previous routing collections.

---

### Step 2

Reload the current run-project assignments from the database.

The query result should become the **only** source of truth.

Example:

```typescript
orderedRunProjects[]
```

---

### Step 3

Sort the projects by their stop sequence.

---

### Step 4

Generate a fresh waypoint array.

Example:

```text
Origin

↓

Project 1

↓

Project 2

↓

Project 3
```

Only include projects that currently belong to the selected run.

---

### Step 5

Pass this newly generated waypoint array into the OSRM calculation.

Never append to an existing waypoint array.

Never merge with previous route state.

---

### Step 6

Render every dependent component from the same waypoint collection.

Specifically:

* Map markers
* Route polyline
* Route Timeline
* Route Statistics
* Route Summary
* Runs List stop count

Everything must reference the same ordered data.

---

# Add Debug Logging

Temporarily log the waypoint collection immediately before calling OSRM.

Example:

```text
Selected Run:
abreeza

Waypoints:

Origin
Abreeza

1.
Martin House

2.
Project B

Waypoint Count:
3
```

This should exactly match:

* the timeline
* the map markers
* the database records

If they differ, the route calculation should not proceed.

---

# Validation Checklist

After every update, verify that:

* Number of assigned projects in the database matches the Route Timeline.
* Number of route waypoints equals Origin + Assigned Projects.
* Number of map stop markers equals the assigned projects.
* Polyline only connects those waypoints.
* Route Summary stop count equals the timeline count.
* Runs List stop count equals the database count.
* No removed projects appear in the route.
* No duplicate waypoints exist.

---

# Architecture Requirement

The application should maintain **one canonical route model** for the selected run.

For example:

```typescript
selectedRunRoute = {
    origin,
    orderedProjects,
    waypoints,
    segments,
    statistics
}
```

Every UI component should render from this model.

There should **not** be separate arrays for:

* Timeline
* Map
* Route calculation
* Statistics
* Sidebar

Deriving all route-related UI and calculations from a single canonical model will eliminate synchronization bugs, phantom stops, duplicate waypoints, and stale route calculations.


---


This screenshot exposes another business rule that should be enforced.

The **Test Run** has **0 stops**, yet the map is still centered on the origin in Atlanta, USA. While this isn't technically incorrect, it's not useful from a user perspective.

A run with no assigned stops has **no route to visualize**. The application should communicate that state instead of simply showing an empty world map.

Here's a prompt for your AI coder.

---

# Prompt: Improve Empty Run State (No Assigned Stops)

## Problem

When a run contains **0 assigned stops**, the application still:

* centers the map on the origin
* displays an empty Route Timeline
* displays Route Summary values
* leaves a large empty map area

This provides very little value to the user.

A run with no assigned projects has no route to display.

The UI should clearly communicate this state.

---

# Required Behavior

If:

```text
Assigned Stops = 0
```

then the application should enter an **Empty Route State**.

---

## Route Timeline

Instead of

```text
No stops added yet.
```

Display something more actionable.

Example:

```text
No projects have been assigned to this run.

Right-click a project marker and choose
"Add to Run"
to begin building this route.
```

---

## Route Summary

Since no route exists:

Display

```text
Distance
—

Duration
—

Revenue
₱0.00

Stops
0
```

Do not display stale values or placeholder calculations.

Distance and Duration should remain blank until at least one stop has been assigned.

---

## Map Behavior

Do not attempt to calculate or render a route.

No OSRM requests should be made.

No polyline should be drawn.

Only display:

* Origin marker
* Available project markers

---

## Empty State Card

Instead of an empty map experience, show a lightweight overlay when no stops exist.

Example:

```text
No Route Created

This run currently has no assigned projects.

Add one or more projects to generate a route.
```

This overlay should disappear automatically once the first project is assigned.

---

## Disable Route Statistics

If there are no stops:

Hide or disable:

* Longest Leg
* Shortest Leg
* Average Stop Time

Display:

```text
—
```

instead.

---

## Print Record

Printing should still be allowed.

The printed document should contain:

```text
Run Name

Origin

Status

Team

Vehicle

Notes

No projects have been assigned to this run.
```

instead of an empty stop table.

---

# Skip Routing

Do not call OSRM when:

```text
Number of Stops == 0
```

Return immediately.

There is no route to calculate.

---

# UI Goal

A newly created run should feel intentional and complete, even before projects have been assigned. The application should clearly indicate that the run exists but is awaiting project assignments, rather than presenting an empty map and inactive route information. This creates a much clearer workflow for planners and avoids unnecessary route calculations.
