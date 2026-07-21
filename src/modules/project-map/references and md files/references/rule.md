Yes. Based on everything we've worked on in the Project Map module, I can catch patterns of "half-assed" implementations—not by nitpicking style, but by identifying incomplete logic, broken state management, and architectural shortcuts that will cause bugs later.

I'd review features against a checklist like this:

---

# 1. Business Logic

Questions I'll ask:

* Does it actually satisfy the business requirement?
* Are all business rules enforced?
* Can the user bypass a rule?

Example:

❌ Wrong

```text
Project already belongs to another run.

UI still shows:
Add to Run
```

✔ Correct

```text
Already Assigned

Cannot assign to another run.
```

---

# 2. Database Integrity

Questions:

* Is the database the source of truth?
* Are values duplicated in memory?
* Is derived data persisted correctly?

Example

```text
Run Summary
1 stop

Runs List
0 stops
```

Immediately tells me there are multiple sources of truth.

---

# 3. State Synchronization

This is where most of your bugs came from.

I'll ask:

When one thing changes...

Does EVERYTHING update?

Example

```text
Remove Stop

↓

Timeline

↓

Statistics

↓

Sidebar

↓

Map

↓

Polyline

↓

Run Totals
```

If even one doesn't update,

that's an incomplete implementation.

---

# 4. CRUD Completeness

Example

Run

Can I

✔ Create

✔ Read

✔ Update

❌ Delete

Feature isn't complete.

---

# 5. UI/UX Consistency

Example

```text
0 Stops

Timeline

1 Stop

Overlay

"No Route"

```

Impossible state.

The UI is lying.

---

# 6. Edge Cases

This is where AI coders usually stop.

I'll check

* No projects
* One project
* Fifty projects
* Overseas origin
* Invalid coordinates
* Deleted origin
* Deleted run
* Deleted project
* Duplicate assignments
* Empty notes
* Refresh browser
* Switch tabs
* Switch runs

---

# 7. Navigation

Example

You're on

```text
Runs
```

Overlay appears.

Click

```text
Projects
```

Overlay still there.

That's lazy cleanup.

---

# 8. Data Lifecycle

Example

Project

↓

Assign

↓

Remove

↓

Assign Again

↓

Delete Run

↓

Assign Again

If any stage breaks,

there's missing lifecycle logic.

---

# 9. Reusability

Example

Three dialogs

```text
Edit Note

Edit Run

Delete Run
```

If they all reinvent their own dialog instead of using your reusable `AppDialog`,

I'll call it out.

---

# 10. Performance

Example

Every marker hover

↓

Fetch database

↓

Recalculate route

↓

Refresh entire page

Terrible.

Should only update what's necessary.

---

# 11. Architecture

I'll look for

❌

```text
runTimeline

runTimeline2

selectedRunTimeline

cachedTimeline

timelineData
```

Four arrays holding the same thing.

Should be

```text
selectedRun

↓

orderedProjects

↓

render everything
```

---

# 12. Database Design

I'll call out things like

```text
Arrival Date

stored in Projects
```

Wrong.

Should be

```text
Run Project
```

because arrival changes per run.

---

# 13. Error Handling

Example

OSRM returns

```text
400
```

Does it

Crash?

or

Show

```text
Route unavailable
```

Huge difference.

---

# 14. User Flow

This is my favorite.

Example

Create Run

↓

Add Project

↓

Remove Project

↓

Recalculate

↓

Print

↓

Delete

↓

Refresh

↓

Create Another Run

↓

Assign Again

If that whole flow works,

the feature is probably done.

If only the happy path works,

it isn't finished.

---

# 15. "Looks Finished"

This is what I call **surface-level completion**.

Example

Developer says

> "Done."

I check.

* Sidebar updated?
* Timeline updated?
* Database updated?
* Polyline updated?
* Statistics updated?
* Print updated?
* Empty state updated?
* Loading state?
* Error state?
* Refresh works?
* Mobile layout?
* Dialog cleanup?

If half of those are missing,

it's not done.

---

## For PSBUniverse specifically

Since I've followed this project from the beginning, I can also enforce the architectural rules you've been building toward.

Every new feature should satisfy these principles:

* The database is the single source of truth.
* Keep implementations simple; avoid unnecessary abstractions and duplicated state.
* Use reusable components (dialogs, tables, forms) instead of creating one-off implementations.
* Keep business rules in the service/data layer, not only in the UI.
* Ensure all dependent UI updates after a data change.
* Never leave the application in a partially updated or contradictory state.
* Test the complete workflow, not just the primary success path.

That means I won't just review whether a feature "works." I'll review whether it's **complete, consistent, maintainable, and aligned with the architecture** you've established for PSBUniverse.
