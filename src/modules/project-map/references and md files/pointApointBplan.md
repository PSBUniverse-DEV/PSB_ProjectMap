Yes. **Generalizing the prompt is better.** The AI coder should inspect the existing architecture first instead of assuming React, DevExpress, Blazor, or anything else.

Use this:

---

# AI Coder Prompt — Implement Actual Road Route Distance Mapping

Study the existing project before making any changes.

## Phase 1 — Analyze the Existing Tech Stack

Inspect the entire relevant codebase and determine:

* Frontend framework and rendering architecture.
* Backend framework and application structure.
* Programming language.
* Existing map library or mapping implementation.
* Existing map tile provider/server.
* Database technology.
* Existing project/location tables, models, entities, or DTOs.
* How addresses are currently stored.
* Whether latitude and longitude are already stored.
* Existing API/service patterns.
* Existing code-behind, controller, service, repository, or API architecture.
* Existing JavaScript interoperability, if applicable.
* Existing environment configuration and secrets handling.

**Do not assume the application uses React, Blazor, DevExpress, Supabase, SQL Server, or any specific technology.**

Determine the architecture from the actual codebase.

Before implementing, provide a short technical summary:

```text
Detected Frontend:
Detected Backend:
Detected Database:
Current Map Implementation:
Current Tile Provider:
Current Location Data Structure:
Recommended Integration Point:
```

Then proceed with the implementation using the project's **existing patterns and architecture**.

---

# Feature Requirement

Implement **Point A → Point B actual drivable road routing** on the existing map.

This must behave similarly to the basic routing functionality of Google Maps.

Example:

```text
POINT A
Project / Starting Location
        ↓
Actual Road Network
        ↓
POINT B
Selected Destination

Distance: 2.1 km
Estimated Duration: 8 min
```

The distance must represent the **actual calculated road route**.

## DO NOT Use Straight-Line Distance

Do not use:

* Haversine formula.
* Euclidean distance.
* Direct latitude/longitude distance.
* Straight lines between markers.
* Turf direct distance measurement.

This implementation requires **road-network routing**.

The route line must follow actual roads.

---

# Routing Engine

Use **OSRM (Open Source Routing Machine)** for route calculation.

Study the official OSRM Route Service documentation before implementation:

[OSRM API Documentation](https://project-osrm.org/docs/v5.24.0/api/?utm_source=chatgpt.com)

Use the OSRM Route Service.

Conceptual request:

```text
/route/v1/driving/{longitudeA},{latitudeA};{longitudeB},{latitudeB}
```

Request the required routing information:

```text
overview=full
geometries=geojson
steps=true
alternatives=true
```

The routing response should provide:

* Route geometry.
* Actual road distance.
* Estimated route duration.
* Alternative routes, when available.

Do not implement traffic calculation.

Traffic data is **not required**.

---

# Map Routing Behavior

The user must be able to define:

```text
Point A = Starting Location
Point B = Destination
```

Use the existing location selection and map architecture when possible.

Once both valid coordinates exist:

1. Send Point A and Point B coordinates to the routing integration.
2. Request the driving route from OSRM.
3. Validate the routing response.
4. Extract the primary route.
5. Read the route distance.
6. Read the estimated duration.
7. Read the GeoJSON route geometry.
8. Draw the route on the existing map.
9. Fit the map viewport to the entire route.
10. Display the route distance in kilometers.
11. Display the estimated route duration.

Example:

```text
Recommended Route

2.1 km
8 min
```

Distance conversion:

```text
OSRM distance = meters

Kilometers = distance / 1000
```

Format the result cleanly.

Example:

```text
2.1 km
```

Do not display:

```text
2.100000 km
```

---

# Route Visualization

Use the project's **existing map library**.

Do not replace the current mapping system unless technically required.

If the application already uses MapLibre, integrate the OSRM route geometry into the existing MapLibre instance.

The primary route must:

* Follow the returned GeoJSON road geometry.
* Be clearly visible.
* Appear above the street map layers.
* Update when Point A changes.
* Update when Point B changes.
* Be removed before rendering a new route.

Do not stack duplicate route layers or map sources.

Use stable source and layer IDs.

Conceptually:

```text
route-source
route-primary
```

Before adding a route, safely check whether the source or layer already exists.

Update the existing source when possible instead of repeatedly destroying and recreating map resources.

---

# Alternative Routes

If OSRM returns alternative routes, support displaying them.

The primary route must be visually dominant.

Alternative routes must be visually secondary.

Example:

```text
Route 1
2.1 km
8 min

Route 2
2.7 km
9 min
```

Selecting an alternative route must:

1. Change the active route.
2. Update the displayed distance.
3. Update the displayed duration.
4. Highlight the selected route.
5. Keep other routes visually secondary.

Do not overengineer the route selector.

Keep the UI simple.

---

# Point A and Point B Markers

Display clear markers for:

```text
A = Starting Location
B = Destination
```

Markers must not be recreated unnecessarily.

When coordinates change:

* Update the existing marker position.
* Recalculate the route.
* Refresh route information.

Do not create duplicate markers.

---

# Error Handling

Handle the following cases:

* Point A is missing.
* Point B is missing.
* Invalid latitude.
* Invalid longitude.
* OSRM is unavailable.
* OSRM returns `NoRoute`.
* Empty route response.
* Network timeout.
* Invalid GeoJSON geometry.
* Map is not initialized.
* Route source does not exist.
* Route layer does not exist.

Do not allow an unhandled routing error to crash the page.

Show a simple user-friendly message.

Examples:

```text
Unable to calculate a road route between these locations.
```

or:

```text
Routing service is currently unavailable.
```

Log the actual technical error using the project's existing logging pattern.

Do not expose raw exceptions or API response dumps to the user.

---

# Architecture Rules

Follow the existing project's architecture.

If the project uses:

```text
Services
Repositories
Controllers
Code-Behind
API Routes
Hooks
Utilities
```

use the existing pattern.

**Do not create a new architecture just for routing.**

Do not introduce:

* Redux solely for routing.
* New state management libraries.
* Unnecessary repository layers.
* Unnecessary abstraction layers.
* Complex routing domain models.
* Microservices.
* Message queues.
* Background workers.

Keep the implementation simple and maintainable.

---

# Security and Configuration

Do not hardcode routing URLs throughout the application.

Use the project's existing configuration pattern.

Example concept:

```text
OSRM_BASE_URL
```

The routing base URL must be configurable so the system can later move from a public OSRM endpoint to a self-hosted OSRM server.

Do not expose secrets.

OSRM does not require an API key by default, so do not invent an API-key implementation.

---

# Important Scalability Requirement

Design the routing integration so the OSRM base URL can be changed without rewriting the route calculation logic.

Initial setup may use a compatible OSRM server.

Future setup may use:

```text
Self-Hosted OSRM
        ↓
OpenStreetMap Road Data
        ↓
Internal Routing Service
```

The application code should only need a configuration change to switch routing servers.

---

# Final Implementation Rules

1. Study the existing project first.
2. Detect the actual technology stack.
3. Do not assume the framework.
4. Preserve the existing map implementation.
5. Use OSRM for actual road routing.
6. Do not calculate straight-line distance.
7. Draw the actual returned road geometry.
8. Show road distance in kilometers.
9. Show estimated route duration.
10. Support alternative routes when available.
11. Prevent duplicate map sources, layers, and markers.
12. Follow the existing project architecture.
13. Keep the code simple.
14. Do not overengineer.
15. Reuse existing services and utilities where possible.
16. Keep the OSRM server URL configurable.
17. Handle routing failures safely.
18. Do not add traffic functionality.
19. Do not redesign unrelated pages or components.
20. **Only modify files directly required for this feature.**

## Expected Result

The final map behavior should be:

```text
Select Point A
        ↓
Select Point B
        ↓
Calculate Actual Driving Route
        ↓
Draw Route Following Real Roads
        ↓
Display:

2.1 km
8 min
```

The final implementation should feel like a **basic Google Maps directions feature without traffic data**, integrated into the application's existing map and technology stack.

---