what if we make it simple...

once a run is created. then "adding a project to the run" is via, (so when hovering a marker shows its details right? then lets just update what the hover project details shows name of client, dealer, status, full address, order received and project subtotal) shows a button to "add to run" then that project will be added to that selected run (in the run tab (only adding to run is only applicable in the run tab)).

so the add run modal form doesnt need a 2nd column right? just the column for the run details right?

---

I actually think this is a much better workflow.

The previous design was trying to do **too much in one modal**. Users would have to create the run, browse projects, add projects, reorder them, and review calculations—all before even saving the run.

A simpler workflow is:

1. **Create the Run** (metadata only).
2. **Select the Run** from the Runs tab.
3. **Click projects on the map** and add them to the selected run.
4. **Manage the selected projects** from the Runs panel (reorder/remove).
5. Route, distance, duration, and subtotal update automatically.

This matches how dispatchers typically work—they create the route first, then assign stops.

---

# Updated Plan: Runs Module

## Workflow

The Runs module should follow a two-step workflow.

### Step 1

Create the run.

The user fills in the run information only.

### Step 2

After the run has been created, the user switches into Run Management mode and starts assigning projects to the selected run directly from the map.

This keeps the workflow simple and avoids an overly complex "New Run" dialog.

---

# New Run Modal

The New Run modal should contain only the Run information.

No second column.

No project browser.

No project selection.

No drag-and-drop.

Those belong to the Run Management screen after the run has been created.

---

## Run Form

### Run Name

Full-width textbox.

Required.

---

### Origin

Dropdown.

Data source:

```
proj_s_origin_addresses
```

---

### Origin Address

Read-only textbox.

Automatically populated from the selected origin.

Display the complete formatted address.

Users cannot edit it.

---

### Status | Run Date

Two-column layout.

```
Status              Run Date
```

---

### Team Assigned | Vehicle Assigned

Two-column layout.

```
Team Assigned       Vehicle Assigned
```

Both are simple textboxes.

No lookup table is required.

---

### Notes

Full-width multiline textbox.

---

### Estimated Values

Display the following fields.

```
Estimated Distance

Estimated Duration

Estimated Subtotal
```

These fields are:

* Read-only
* Initially zero
* Automatically updated after projects are added to the run

Users never edit these manually.

---

# Runs Tab

Once a run has been created, it appears in the Runs tab.

Selecting a run makes it the **active run**.

Only one run can be active at a time.

The active run becomes the destination when adding projects.

---

# Adding Projects to a Run

Projects are **not** added from the Run dialog.

Instead, they are added directly from the map.

This action is only available while the user is viewing the **Runs** tab.

---

## Marker Hover / Project Popup

When hovering over a project marker, display:

```
Client Name

Dealer

Status

Full Address

Order Received

Project Subtotal
```

At the bottom of the popup, display:

```
Add to Run
```

This button should only appear when:

* The user is on the Runs tab.
* A run is currently selected.

If no run is selected, hide the button or disable it with an instruction to select a run first.

---

# Add to Run

Clicking **Add to Run** should:

* Add the project to the currently selected run.
* Create a record in:

```
proj_t_run_projects
```

using:

* run_id
* project_id
* stop_sequence

Automatically assign the next available stop sequence.

Example:

```
Run

↓

Stop 1

↓

Stop 2

↓

Stop 3
```

---

# Selected Projects

The Runs tab should contain a panel showing the projects assigned to the currently selected run.

Each card should display:

```
Client Name

Dealer

Status

Full Address

Order Received

Project Subtotal
```

Each project card should also include:

* Remove
* Drag Handle (for reordering)

---

# Reordering

Users should be able to drag and reorder projects.

Reordering updates:

* stop_sequence
* estimated distance
* estimated duration

---

# Automatic Calculations

Whenever a project is:

* Added
* Removed
* Reordered

Automatically recalculate:

* Estimated Distance
* Estimated Duration
* Estimated Subtotal

These values are displayed in the selected run.

Users cannot edit them.

---

# Route Generation

The route should always follow:

```
Origin

↓

Project 1

↓

Project 2

↓

Project 3

↓

...
```

The origin always comes from:

```
proj_s_origin_addresses
```

The projects come from:

```
proj_t_run_projects
```

The route is generated using the stop sequence.

---

# Duplicate Protection

A project cannot be added to the same run twice.

Attempting to add an existing project should:

* Prevent the duplicate.
* Display an appropriate message.

---

# UI/UX Goals

* Keep the New Run modal focused solely on creating the run.
* Let users build the run naturally by interacting with the map.
* Use the project popup as the primary entry point for assigning projects.
* Keep project assignment contextual and intuitive.
* Separate **Run Creation** from **Run Management**, resulting in a cleaner and more scalable workflow.

This approach also scales well. In the future, if you introduce features like route optimization, bulk assignment, or team scheduling, they can be added to the Runs tab without making the New Run modal increasingly complex.
