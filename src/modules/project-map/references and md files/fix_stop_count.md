Yes, this is still the **same synchronization bug**. The screenshot actually makes it very obvious.

The application is showing **two different truths** at the same time:

* **Runs List:** `0 stops`
* **Run Details:** `3 stops`

That should be **impossible**.

There should never be a situation where the same run displays different stop counts depending on which component you're looking at.

This tells me the Runs List is **not rendering the same run object** that the Run Details panel is using.

---

# Prompt: Runs List and Run Details Are Using Different Data Sources

There is still a synchronization issue in the Runs module.

The same run is displaying different stop counts in different parts of the application.

Example:

```text
Runs List
0 Stops

Run Details
3 Stops
```

This should never be possible.

The application is rendering two different versions of the same run.

---

## Root Cause

The Runs List and the Run Details panel are not using the same refreshed data.

One component is rendering stale run data while the other is rendering updated data.

This is a data synchronization issue, not a UI issue.

---

## Required Investigation

Trace the entire data flow.

```
Database
        ↓
Load Runs
        ↓
Server Component
        ↓
ProjectMapView
        ↓
RunList

                AND

Selected Run
        ↓
Run Details
```

Determine why these two components are receiving different versions of the same run.

---

## Verify Data

Confirm the following:

### Database

Verify:

```text
proj_t_runs.stops = 3
```

This is already correct.

---

### Runs Query

Confirm that the query loading all runs includes:

```sql
stops
```

and that this value is returned correctly.

---

### Data Mapping

Inspect every mapper or transformer.

Ensure that:

```javascript
run.stops
```

is not overwritten, ignored, or replaced.

---

### Refresh Flow

After:

* Add Project
* Remove Project
* Recalculate Run
* Delete Run

The application must reload the updated run collection.

Do not continue rendering stale run objects.

---

## Debugging

Temporarily log the following:

### After database query

```javascript
console.log(runsFromDatabase);
```

### Before rendering ProjectMapView

```javascript
console.log(runs);
```

### Inside RunList

```javascript
console.log(run.id, run.stops);
```

### Inside Run Details

```javascript
console.log(selectedRun.id, selectedRun.stops);
```

Compare the values.

Both components should receive the exact same stop count.

---

## Development Rules

### DO NOT OVERENGINEER

This is not a state-management redesign.

Do **not** introduce:

* Redux
* Context API
* Global Stores
* Duplicate state
* Additional caching
* Complex synchronization logic

Keep the existing architecture.

Fix the broken data flow.

---

## Single Source of Truth

The stop count should always come from:

```text
proj_t_runs.stops
```

Both the Runs List and the Run Details panel must render this same persisted value.

There should never be any independent calculation or separate stop counters.

---

## Success Criteria

After assigning or removing projects or recalculating the run:

* `proj_t_runs.stops` is updated.
* The latest run collection is reloaded.
* Runs List displays the updated stop count.
* Run Details displays the same stop count.
* Route Timeline matches the same stop count.
* Route Summary matches the same stop count.

At any point in time, all components must display identical values for the selected run. If the Run Details shows **3 stops**, the Runs List must also show **3 stops**. There should never be conflicting information anywhere in the application.
