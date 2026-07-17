"
I've done a thorough line-by-line comparison of the roadmap against the actual implementation. Here are the results:

## ✅ Fully Implemented (Matches Roadmap)

| Section | Requirement | Status |
|---------|------------|--------|
| 1 | Project stores: Client Name, Address, Lat/Lng, Status, Dealer, Dates, Subtotal, Location Source, Confirmed | ✅ |
| 1 | Project never stores origin | ✅ |
| 2 | `proj_s_origin_addresses` table with all required fields | ✅ |
| 2 | Origins never hardcode coordinates (from DB) | ✅ |
| 3 | `proj_s_states` table with State, Code, Color, Order, Active | ✅ |
| 3 | Map retrieves colors from setup table (no hardcoded state colors) | ✅ |
| 4 | OSRM route calculation (actual roads, not straight-line) | ✅ |
| 4 | Distance, Duration, Route Geometry returned | ✅ |
| 5 | Origin marker, project marker, route line on map | ✅ |
| 5 | Zoom to fit route, remove previous route, update on change | ✅ |
| 6 | Detail panel shows: Client, Address, Dealer, Status, Subtotal, Distance, Time | ✅ |
| 7 | Search centers map on matching results | ✅ |
| 8 | Filters: State, Dealer, Status, Date Range | ✅ |
| 8 | Filters update both list and map markers | ✅ |
| 9 | Marker colors from `proj_s_states` (no hardcoded colors) | ✅ |
| 10 | Distance and Estimated Time displayed | ✅ |
| 11 | Architecture: Projects/Origins/States separated | ✅ |
| 11 | Routing doesn't modify project data | ✅ |
| DB | `project_subtotal` added to `proj_t_projects` | ✅ |
| DB | `proj_s_origin_addresses` created | ✅ |
| DB | `proj_s_states` created | ✅ |
| Setup | Admin UI for managing origins and states | ✅ |

## ❌ Still Missing (2 items)

| # | Requirement | Missing |
|---|-----------|---------|
| 1 | **Search by Dealer** — Roadmap §7 says search by: Client, **Dealer**, City, State, **Project Status**. Current search only searches client_name, address, city, state. Missing: `dealer` and `status_name` fields. | 🔴 |
| 2 | **Geoapify for origin addresses** — Roadmap §2 says "Addresses are selected using Geoapify Address Autocomplete" when adding new origins. Currently the setup form just has plain text fields for origin address. | 🔴 |

Items 1 is a quick fix (add `dealer` and `status_name` to the search filter). Item 2 is a larger feature requiring Geoapify API integration for the origin setup form.

Would you like me to fix the search to include dealer and status name?


this was what's already implemented to the module...

but there is no "point B" right? can you help me explain to my aicoder that this is for the per project marker only? becuase the "point A" or the origin address is for the runs, right?
"

---


Exactly. The current **Project Map module** is only responsible for visualizing **individual customer projects** and optionally calculating the route from a selected origin to that one project. The roadmap itself says the goal is to "calculate the actual drivable route from a selected company origin to a selected project," and it explicitly notes that the architecture is preparing for future multi-stop **Runs**. 

The important distinction is:

* **Point A (Origin)** = Company Office / Warehouse / Dispatch Center
* **Point B** = **The selected Project Marker**
* There is **no separate Point B entity/table** because every project already has its own address and coordinates in `proj_t_projects`. 

The routing is simply:

```
Origin (Point A)
        ↓
Selected Project Marker
        ↓
Display Route
```

NOT

```
Point A
     ↓
Point B
     ↓
Point C
```

That latter flow belongs to the future **Runs** module.

---

## Prompt for your AI Coder

One clarification regarding the Project Map architecture.

### Current Scope

The current Project Map module is **not** a delivery routing or fleet management system.

Its responsibility is only to:

* Display customer projects as map markers.
* Allow the user to select one company Origin.
* Allow the user to select one Project.
* Calculate and display the actual drivable route between them using OSRM.
* Display distance and estimated travel time.

This means the routing is simply:

```
Origin (Company Office / Warehouse)
        ↓
Selected Project Marker
```

There is **no independent "Point B" entity** in the database.

The **selected project itself is Point B** because every project already stores:

* Latitude
* Longitude
* Complete Address

inside `proj_t_projects`. 

Do **not** create:

* A Point B table
* Destination table
* Route destination entity
* Additional destination records

Those would duplicate data that already exists in the Project record.

### Why the Origin Exists

`proj_s_origin_addresses` exists only because multiple company locations may exist:

* Main Office
* Warehouse
* Dispatch Yard
* Regional Office

The user selects which Origin to use for the route.

That Origin is temporary context for route calculation.

It is **not stored inside the project**.

Projects remain independent customer records. 

### Relationship

Current architecture:

```
proj_s_origin_addresses
          │
          │ (selected at runtime)
          ▼
      Route Calculation
          ▲
          │
proj_t_projects (selected project)
```

The Project is the destination.

The Origin is the starting location.

Nothing is permanently linked.

### Future Runs Module

The roadmap intentionally prepares for a future **Runs** module.

That future module will introduce concepts such as:

```
Origin
      ↓
Project 1
      ↓
Project 2
      ↓
Project 3
      ↓
Project N
```

or

```
Origin
      ↓
Multiple Stops
      ↓
Return to Origin
```

That is where concepts like multiple destinations, stop sequencing, driver assignment, and route optimization belong.

Those features **must not be introduced into the current Project Map module**.

### Implementation Rule

Treat every project marker as the destination (Point B) during route calculation.

The Origin is selected from `proj_s_origin_addresses`.

The selected Project Marker is the destination.

Do not introduce any new destination/Point B entity until the future Runs module is implemented.


---

Yes, that's actually the better architectural decision.

If you introduce **Point B** now, you're starting to build the data model for a logistics system before you've even built the **Runs** module. The current Project Map should remain focused on **visualizing projects**, not managing routes with multiple stops.

I would even simplify it further:

* **Project Map = Point A only (Origin selection)**
* The **Project Marker is simply the selected project**, not a separate "Point B" object.
* When a user clicks a project, calculate a temporary route from the selected Origin to that project.
* Do **not** persist or model a destination point. It's just the selected project.

Then, when you build **Runs**, that's where Point B, Point C, multiple stops, sequencing, optimization, drivers, etc., become real concepts.

I'd send your AI coder something like this:

---

## Additional Architecture Rule – Keep the Project Map Simple

To keep the Project Map module clean and extensible, **do not introduce Point B, Point C, or any additional route point concepts at this stage.**

### Current Scope

For the current Project Map module, the only configurable route point is:

```text
Point A = Origin
```

The Origin is selected from:

```text
proj_s_origin_addresses
```

This represents a company location such as:

* Main Office
* Warehouse
* Dispatch Yard
* Regional Office

When a user clicks a project marker, that project is simply the **selected destination for the current route calculation**.

The project itself already contains:

* Address
* Latitude
* Longitude

Therefore, there is **no need to create a Point B entity or destination object**.

The route is simply:

```text
Selected Origin (Point A)
          ↓
Selected Project Marker
```

The destination exists only for that route calculation and is **not stored as a separate routing point**.

### Why Keep It This Way?

The Project Map is intended to visualize projects and answer questions such as:

* Where is this project?
* How far is it from one of our offices?
* How long will it take to drive there?

It is **not yet** responsible for delivery planning or route optimization.

Adding Point B, Point C, stop sequencing, or destination entities now would introduce unnecessary complexity and duplicate data already stored in `proj_t_projects`.

### Future Runs Module

The future **Runs** module will introduce real routing concepts such as:

```text
Point A (Origin)
      ↓
Point B (Project 1)
      ↓
Point C (Project 2)
      ↓
Point D (Project 3)
      ↓
Return to Origin
```

This module will be responsible for:

* Multiple project stops
* Driver assignment
* Vehicle assignment
* Stop sequencing
* Route optimization
* Fleet management
* Multi-stop routing

That is the appropriate place to introduce additional routing points.

### Implementation Rule

For now:

* Keep the Project Map focused on **Point A (Origin)**.
* Treat the selected project marker as the temporary destination for routing.
* Do not create Point B, Point C, destination tables, or route stop entities.
* Keep the implementation simple so the future **Runs** module can extend it naturally without requiring a redesign of the current Project Map architecture.

This approach keeps the current module focused, avoids premature complexity, and leaves a clean foundation for the logistics features you'll build later.
