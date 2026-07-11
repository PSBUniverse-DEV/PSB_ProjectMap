# PSB Project Map — Complete Project Plan

## 1. Project Overview

### Project Name

**PSB Project Map**

### Purpose

PSB sells and builds metal buildings for clients across different locations. Project location information is currently tracked in [Asana](https://asana.com/?utm_source=chatgpt.com).

The existing workflow requires employees to:

```text
Find project in Asana
        ↓
Copy building address
        ↓
Open Google Maps
        ↓
Paste and search address
        ↓
Review project location
        ↓
Take screenshot
        ↓
Save screenshot to Google Drive
```

This workflow is manual, repetitive, and does not provide PSB with a centralized geographic view of active building projects.

The **PSB Project Map** will provide a centralized interactive map where employees can view, search, filter, and track PSB building projects based on their actual construction-site locations.

---

# 2. Project Goal

Create a web-based project location tracking system that allows PSB employees to:

* View all building projects on an interactive map.
* Search for incomplete or complete addresses.
* Select a validated address from location suggestions.
* Confirm the location visually on a map.
* Move the project marker to the actual construction site.
* Track projects using project statuses.
* Search and filter projects.
* Open project details directly from the map.
* Eliminate manual address copy-pasting into Google Maps.
* Reduce the need for manually saved map screenshots.

This application is **not a replacement for Asana during the initial phase**.

Its primary responsibility is:

> **Geographic visualization and location tracking of PSB building projects.**

---

# 3. Technology Stack

| Layer             | Technology                                                          |
| ----------------- | ------------------------------------------------------------------- |
| Frontend          | React JS                                                            |
| Map Rendering     | [MapLibre GL JS](https://maplibre.org/?utm_source=chatgpt.com)      |
| Address Search    | [Geoapify](https://www.geoapify.com/?utm_source=chatgpt.com)        |
| Geocoding         | Geoapify Geocoding API                                              |
| Reverse Geocoding | Geoapify Reverse Geocoding API                                      |
| Database          | [Supabase](https://supabase.com/?utm_source=chatgpt.com) PostgreSQL |
| Authentication    | Existing PSBUniverse SSO                                            |
| Hosting           | [Vercel](https://vercel.com/?utm_source=chatgpt.com)                |
| Source Control    | [GitHub](https://github.com/?utm_source=chatgpt.com)                |

## Recommended Map Architecture

```text
React JS
   │
   ├── MapLibre GL JS
   │      └── Interactive Map
   │
   ├── Geoapify API
   │      ├── Address Autocomplete
   │      ├── Forward Geocoding
   │      └── Reverse Geocoding
   │
   ├── Supabase
   │      ├── Projects
   │      ├── Project Statuses
   │      └── Location Coordinates
   │
   └── Vercel
          └── Application Hosting
```

---

# 4. Core System Concept

The map is the **primary workspace**.

Do not design this like another Asana Kanban board.

The main layout should be:

```text
┌──────────────────────────────────────────────────────────────────────┐
│ PSB Project Map                                      User / Profile  │
├──────────────────────────────────────────────────────────────────────┤
│ Search Projects     Status ▼     Dealer ▼     State ▼     Reset     │
├───────────────────────┬──────────────────────────────────────────────┤
│ PROJECTS              │                                              │
│                       │                                              │
│ 247 Projects          │                                              │
│                       │                  MAP                         │
│ Diane McPherson       │                                              │
│ Ready for Install     │          ●                ●                  │
│ Lake City, MI         │                                              │
│                       │                   ●                          │
│ Paul Stern            │                                              │
│ Pending Site Ready    │     ●                                        │
│ Wisconsin             │                             ●                │
│                       │                                              │
│ John Meiss            │                                              │
│ Ready for Install     │                                              │
│ Illinois              │                                              │
└───────────────────────┴──────────────────────────────────────────────┘
```

### UI Structure

```text
Top Header
    ↓
Map Toolbar / Filters
    ↓
┌────────────────┬─────────────────────┐
│ Project List   │ Interactive Map     │
│                │                     │
│ Collapsible    │ Primary Workspace   │
└────────────────┴─────────────────────┘
                         ↓
                 Project Detail Drawer
```

---

# 5. Main Modules

## Module 1 — Project Map

This is the application's default page.

### Route

```text
/project-map
```

### Responsibilities

* Display project locations.
* Display project markers.
* Cluster nearby markers.
* Search projects.
* Filter projects.
* Select projects.
* Open project details.
* Fit map to filtered project results.

### Map Marker

Each project with valid site coordinates receives a marker.

Clicking a marker should open a compact preview:

```text
┌──────────────────────────────────┐
│ Diane McPherson                  │
│                                  │
│ Ready for Install                │
│                                  │
│ 6757 N Richards Rd               │
│ Lake City, MI 49651              │
│                                  │
│ Dealer: USA Buildings            │
│                                  │
│ [View Project]                   │
└──────────────────────────────────┘
```

Do not overload the marker popup with every project field.

---

## Module 2 — Project List

Displayed on the left side of the map.

### Project Card Information

Only display:

```text
Client Name
Status
City, State
Dealer
```

Example:

```text
Diane McPherson

[Ready for Install]

Lake City, MI
USA Buildings
```

Clicking the project card should:

1. Select the project.
2. Center the map on the marker.
3. Zoom to the project.
4. Highlight the marker.
5. Open the project detail drawer.

The project list and map must remain synchronized.

---

# 6. Project Location Search

This is a critical feature.

Users must **not be required to provide a complete address**.

### Search Input

```text
Building Location

[ Search address, road, city, or location... ]
```

The user may enter:

```text
6757 N Richards
```

or:

```text
Richards Rd Lake City
```

or:

```text
Lake City MI
```

Geoapify should return address/location suggestions.

Example:

```text
6757 N Richards Rd
Lake City, MI 49651, United States

Richards Rd
Lake City, Michigan, United States

N Richards Rd
Missaukee County, Michigan
```

The employee selects the correct location.

---

# 7. Location Confirmation Workflow

The workflow should be:

```text
Search Location
       ↓
Select Suggested Address
       ↓
Map Centers on Address
       ↓
Display Location Marker
       ↓
Employee Visually Confirms Location
       ↓
Employee May Move Marker
       ↓
Confirm Building Site
       ↓
Save Project
```

## Critical Business Rule

The **address location** and **actual building site location** are not necessarily the same.

Example:

```text
ROAD
────────────────────────────────────

       📍 Address Location

             Property
                │
                │
                │
                │
                         🏗 Building Site
```

Therefore, the map marker must be draggable.

### Instruction

```text
Place the pin on the actual building construction site.
```

### Actions

```text
[ Reset to Address ]    [ Confirm Site Location ]
```

---

# 8. Location Data Model

Store both the address coordinates and site coordinates.

## Project Location Fields

```text
formatted_address

address_line_1
city
state
state_code
postal_code
country

address_latitude
address_longitude

site_latitude
site_longitude

location_source
location_confirmed
```

### Address Coordinates

```text
address_latitude
address_longitude
```

Coordinates returned by Geoapify.

### Site Coordinates

```text
site_latitude
site_longitude
```

Coordinates confirmed by the PSB employee.

### Rule

**Never overwrite the address coordinates when the employee moves the building-site marker.**

---

# 9. Project Data Structure

Recommended table:

```text
psb_projects
```

### Core Fields

```text
id
client_name

formatted_address
address_line_1
city
state
state_code
postal_code
country

address_latitude
address_longitude

site_latitude
site_longitude

location_source
location_confirmed

status_id
dealer

order_received_date
install_date

created_at
updated_at
created_by
updated_by
```

I recommend using a status lookup table instead of storing random status strings.

```text
psb_m_project_status
```

Fields:

```text
id
status_name
status_group
display_order
is_active
```

---

# 10. Project Statuses

Based on the current Asana workflow:

```text
New Dealer Order
Welcome Email / Call
Pending Permits
Pending Site Readiness
Ready for Install
Confirmed Install Date
Currently Being Installed
Pending Payment
Fully Installed
Repairs
Collections
Completed
```

## Status Grouping

Do not assign twelve random marker colors.

Group statuses by lifecycle.

| Lifecycle      | Statuses                                  |
| -------------- | ----------------------------------------- |
| Pre-Processing | New Dealer Order                          |
| Processing     | Welcome Email / Call                      |
| Waiting        | Pending Permits, Pending Site Readiness   |
| Scheduled      | Ready for Install, Confirmed Install Date |
| Active         | Currently Being Installed                 |
| Financial      | Pending Payment                           |
| Installed      | Fully Installed                           |
| Issue          | Repairs, Collections                      |
| Completed      | Completed                                 |

The marker style should represent the **lifecycle group**.

This creates a readable map instead of rainbow garbage.

---

# 11. Search and Filters

### Global Search

Search by:

```text
Client Name
Building Address
City
State
ZIP Code
Dealer
```

### Filters

Initial filters:

```text
Status
Dealer
State
```

Do not add ten filters in V1.

### Filter Behavior

Example:

```text
Status: Ready for Install
State: Michigan
```

The system should:

1. Filter the project list.
2. Filter map markers.
3. Update the project count.
4. Fit the map bounds to matching markers.

The list and map must use the **same filtered dataset**.

---

# 12. Project Detail Drawer

Use a right-side drawer similar to the Asana task detail behavior.

```text
                               ┌──────────────────────────────┐
                               │ Diane McPherson          ×   │
                               │                              │
                               │ [Ready for Install]          │
                               │                              │
                               │ PROJECT LOCATION             │
                               │                              │
                               │ 6757 N Richards Rd           │
                               │ Lake City, MI 49651          │
                               │                              │
                               │ Dealer                       │
                               │ USA Buildings                │
                               │                              │
                               │ Order Received               │
                               │ June 3, 2026                 │
                               │                              │
                               │ [Edit Project]               │
                               │ [Open Map]                   │
                               └──────────────────────────────┘
```

Opening the drawer should **not navigate away from the map**.

The employee should retain geographic context.

---

# 13. Add Project Form

Recommended layout:

```text
┌─────────────────────────────────────────────────────────────┐
│ Add Project                                                 │
│ Add a PSB building project and confirm its site location.   │
├─────────────────────────────┬───────────────────────────────┤
│ PROJECT DETAILS             │ BUILDING SITE                 │
│                             │                               │
│ Client Name                 │                               │
│ [                         ] │                               │
│                             │              MAP              │
│ Dealer                      │                               │
│ [ Select Dealer ▼         ] │               📍              │
│                             │                               │
│ Status                      │                               │
│ [ Select Status ▼         ] │                               │
│                             │                               │
│ BUILDING LOCATION           │                               │
│                             │                               │
│ [ Search location...      ] │                               │
│                             │                               │
│ Selected Address            │                               │
│ 6757 N Richards Rd          │                               │
│ Lake City, MI 49651         │                               │
│                             │                               │
│                             │ [Reset Pin] [Confirm Site]    │
├─────────────────────────────┴───────────────────────────────┤
│                                         [Cancel] [Save]     │
└─────────────────────────────────────────────────────────────┘
```

The form should feel like **one unified form**.

Do not create five floating cards for five fields.

---

# 14. Geoapify Integration

Use Geoapify for:

### Address Autocomplete

```text
User types address
       ↓
Debounce input
       ↓
Geoapify autocomplete request
       ↓
Display suggestions
```

Use approximately:

```text
300–500ms debounce
```

Do not send an API request on every raw keystroke.

### Address Selection

When a suggestion is selected:

```text
Geoapify Result
       ↓
Extract formatted address
       ↓
Extract city
       ↓
Extract state
       ↓
Extract state code
       ↓
Extract ZIP
       ↓
Extract country
       ↓
Extract latitude / longitude
       ↓
Center map
```

### Reverse Geocoding

Use reverse geocoding only when needed.

Example:

```text
User manually places a marker
       ↓
Coordinates selected
       ↓
Reverse geocode
       ↓
Display nearest readable location
```

---

# 15. API Security

Do **not** blindly expose unrestricted API usage.

The Geoapify API key will be accessible to the browser if the frontend calls the API directly.

For V1, configure provider restrictions where supported and enforce usage limits/monitoring.

For stronger control:

```text
React
   ↓
Vercel API Route
   ↓
Geoapify
```

Example:

```text
/api/location/search
/api/location/reverse
```

The browser calls your API route.

Your server-side function calls Geoapify.

### Environment Variable

```text
GEOAPIFY_API_KEY
```

Do not hardcode this:

```text
const apiKey = "actual-api-key";
```

And definitely do not commit the key to GitHub.

---

# 16. Supabase Architecture

Recommended initial tables:

```text
psb_projects
psb_m_project_status
```

That's it for V1.

Do not create:

```text
project_locations
project_coordinates
project_address_history
project_geocode_logs
project_map_settings
project_marker_settings
```

unless an actual business requirement appears.

That would be overengineered.

## Supabase Access

```text
React
   ↓
Supabase Client
   ↓
Row Level Security
   ↓
PostgreSQL
```

RLS must be enabled.

Do not rely on hidden React buttons as security.

---

# 17. PSBUniverse Integration

The application should be integrated into PSBUniverse as a module.

```text
PSBUniverse
│
├── Gutter
├── OHD
├── Metal Buildings
└── Project Map
```

Use the existing PSBUniverse authentication/SSO approach.

### Production Domain Recommendation

```text
map.psbuniverse.com
```

Alternative:

```text
projects.psbuniverse.com
```

I prefer:

```text
map.psbuniverse.com
```

It is short and obvious.

---

# 18. V1 Scope

The first production version should only include:

1. Project Map
2. Project List
3. Add Project
4. Edit Project
5. Address autocomplete
6. Address selection
7. Draggable building-site marker
8. Project status
9. Dealer
10. Search
11. Status filter
12. Dealer filter
13. State filter
14. Project detail drawer
15. PSBUniverse SSO

**Stop there.**

Do not add analytics, route planning, employee GPS tracking, weather, Asana sync, Google Drive sync, or AI in V1.

Ship the core workflow first.

---

# 19. Future Phase 2 Features

After PSB employees actually use V1:

### Asana Integration

Potential workflow:

```text
Asana Project
      ↓
Read Project Data
      ↓
Import Client Name
      ↓
Import Building Address
      ↓
PSB employee confirms location
      ↓
Save to Project Map
```

Do not implement automatic Asana synchronization until you understand which fields are reliable.

Your screenshots already show that Asana data is inconsistent and sometimes incomplete.

### Dashboard Analytics

Possible future KPIs:

```text
Total Active Projects
Ready for Install
Currently Installing
Completed This Month
Projects Missing Location
Projects by State
```

### Geographic Analytics

```text
Projects by State
Project Density
Installation Regions
Dealer Coverage
Active Installation Areas
```

### Map Screenshot / Export

Only if PSB still requires it:

```text
Select Project
       ↓
Generate Map Snapshot
       ↓
Download / Save
```

Automate it.

Do not make employees manually use Snipping Tool.

---

# 20. Recommended Development Phases

| Phase    | Scope                                 |
| -------- | ------------------------------------- |
| Phase 1  | Project setup, Supabase schema, SSO   |
| Phase 2  | MapLibre map integration              |
| Phase 3  | Geoapify address search               |
| Phase 4  | Add/Edit project workflow             |
| Phase 5  | Draggable building-site pin           |
| Phase 6  | Project markers and clustering        |
| Phase 7  | Project list and detail drawer        |
| Phase 8  | Search and filters                    |
| Phase 9  | UI/UX cleanup and responsive behavior |
| Phase 10 | QAS/UAT                               |
| Phase 11 | Production deployment                 |

---

# 21. Final User Workflow

```text
Employee opens PSB Project Map
              ↓
Views all PSB projects geographically
              ↓
Clicks Add Project
              ↓
Enters Client Name
              ↓
Selects Dealer and Status
              ↓
Searches partial building address
              ↓
Selects suggested location
              ↓
Map centers on selected address
              ↓
Employee moves marker to actual building site
              ↓
Confirms site location
              ↓
Saves project
              ↓
Project immediately appears on PSB map
```

Then later:

```text
Manager opens Project Map
              ↓
Filters "Ready for Install"
              ↓
Filters "Michigan"
              ↓
Map displays matching building sites
              ↓
Manager selects project marker
              ↓
Views client and project information
```

## Final Architecture Recommendation

```text
PSB PROJECT MAP

React JS
    │
    ├── MapLibre GL JS
    │      ├── Map
    │      ├── Markers
    │      ├── Marker Clustering
    │      └── Draggable Site Pin
    │
    ├── Geoapify
    │      ├── Address Autocomplete
    │      ├── Geocoding
    │      └── Reverse Geocoding
    │
    ├── Supabase PostgreSQL
    │      ├── Projects
    │      └── Project Statuses
    │
    ├── PSBUniverse SSO
    │
    └── Vercel
```

**This is the project I would build.** The key design decision is that the system tracks the **actual PSB building site**, while the address is only the starting point for finding that site.

For your AI-coding workflow, the next correct step is to turn this into a **`PROJECT_PLAN.md` and phased implementation prompt with strict rules so Cline does not overengineer the application**.
