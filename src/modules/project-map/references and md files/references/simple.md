Absolutely. Here's a prompt that gets the point across clearly and professionally without being abusive. It sets expectations for both the architecture and the UX.

---

# Development Directive - Read Before Implementing Any Fixes

The recent fixes have introduced unnecessary complexity, stale state issues, and incomplete UI behavior. Before implementing any additional changes, follow these development principles.

---

# 1. DO NOT OVERENGINEER THE FIXES

Keep every solution as simple as possible.

The database is the **single source of truth**. Most synchronization issues can be solved by reloading and rebuilding state from the database instead of introducing additional caches, duplicate state, complex workarounds, or multiple synchronization layers.

### Expectations

* Keep the implementation simple.
* Prefer rebuilding state over trying to patch existing state.
* Do not introduce unnecessary abstractions.
* Do not create additional caches unless absolutely required.
* Do not duplicate data across multiple state variables.
* Do not add complicated logic to compensate for stale state.
* If a value already exists in the database, read it from the database instead of maintaining another copy in memory.

When something changes (add, remove, reorder, delete), refresh the affected data and let the UI render from that refreshed state.

Simple code is easier to debug, easier to maintain, and less likely to introduce synchronization bugs.

---

# 2. NEVER SHIP AN INCOMPLETE OR INCONSISTENT UX

A feature is **not complete** just because the primary functionality works.

Every implementation must be reviewed from the user's perspective.

Examples of unacceptable behavior include:

* dialogs remaining visible after they should close
* overlays appearing on unrelated pages
* counters showing different values in different parts of the UI
* stale route timelines
* stale statistics
* buttons remaining enabled when they should be disabled
* actions that violate business rules
* UI components displaying conflicting information

If one part of the interface updates, every dependent component must update as well.

The application should never display conflicting states simultaneously.

---

# 3. VERIFY THE ENTIRE USER FLOW

Do not stop testing after the first successful action.

Every feature should be tested end-to-end.

Examples:

* Create Run
* Edit Run
* Delete Run
* Add Project
* Remove Project
* Reorder Stops
* Switch Selected Run
* Switch Tabs
* Refresh Page
* Print Record

Verify that every related component updates correctly after each action.

---

# 4. ONE SOURCE OF TRUTH

The following should never maintain independent copies of the same data:

* Runs List
* Route Summary
* Route Timeline
* Route Statistics
* Map Markers
* Route Polyline
* Empty-State Overlay

They should all derive from the same refreshed run data.

If the database says there is **1 stop**, every component should display **1 stop**.

---

# 5. FOLLOW BUSINESS RULES FIRST

Before implementing UI behavior, validate the business rules.

Examples:

* A project can belong to only one run.
* Deleting a run must not delete projects.
* A run with zero stops has no route.
* Route calculations should only use the current assigned projects.
* Empty-state overlays should only appear within the Runs module.

The UI should enforce these rules consistently.

---

# Goal

Write clean, maintainable, and predictable code.

Avoid solving simple problems with overly complex logic. Build features around the database as the single source of truth, keep state management straightforward, and ensure the UI is fully synchronized before considering any implementation complete. A feature is finished only when the **entire user experience** is consistent, accurate, and free of stale or conflicting state.
