
---

# Project Map Roadmap

## Phase 1

### Project Map

Goal:

Visualize all projects on an interactive map and calculate the actual drivable route from a selected company origin to a selected project.

---

## Objectives

* Display all projects on a MapLibre map.
* Store project locations using complete address information.
* Store company origin locations separately.
* Calculate actual road routes using OSRM.
* Display distance, estimated travel time, and route geometry.
* Keep the architecture extensible for future multi-stop Runs.

---

# Functional Scope

## 1. Project Locations

Projects represent customer job sites.

Each project stores:

* Client Name
* Project Address
* Latitude
* Longitude
* Status
* Dealer
* Scheduled Dates
* Project Subtotal
* Location Source
* Location Confirmed

Add:

```sql
project_subtotal NUMERIC(12,2)
```

The project itself never stores an origin.

---

## 2. Origin Locations

Create a new setup table.

```
proj_s_origin_addresses
```

Purpose:

Store all company offices, warehouses, yards, and dispatch locations.

Example:

| Name              |
| ----------------- |
| Davao Main Office |
| Cebu Warehouse    |
| Manila Office     |

Each origin stores:

* Origin Name
* Origin Code
* Formatted Address
* Address Line 1
* City
* State
* State Code
* Postal Code
* Country
* Latitude
* Longitude
* Default Origin
* Active Flag

Addresses are selected using Geoapify Address Autocomplete.

Store the returned:

* formatted_address
* latitude
* longitude

The application never hardcodes office coordinates.

---

## 3. State Configuration

Replace hardcoded state colors.

Create:

```
proj_s_states
```

Store:

* State
* State Code
* Display Color
* Display Order
* Active

The map retrieves colors from this setup table.

Example:

```
Texas

↓

#F44336
```

instead of

```javascript
if(state=="TX")
```

---

## 4. Route Calculation

The user selects:

```
Origin

↓

Project
```

The system retrieves

Origin Coordinates

↓

Project Coordinates

↓

OSRM Route Service

↓

Distance

↓

Duration

↓

Route Geometry

The route follows actual roads.

Do not calculate straight-line distance.

---

## 5. Map Rendering

Use the existing MapLibre implementation.

Display:

* Origin Marker
* Project Marker
* Route Line

Automatically:

* Zoom to fit route.
* Remove previous route before drawing a new one.
* Update the route when origin or project changes.

---

## 6. Project Information Panel

Selecting a project displays:

```
Client

Project Address

Dealer

Status

Subtotal

Distance

Estimated Time
```

Example:

```
ABC Construction

Houston, Texas

Dealer A

Active

$125,000

18.4 km

24 mins
```

---

## 7. Search

Search by:

* Client
* Dealer
* City
* State
* Project Status

Selecting a search result centers the map.

---

## 8. Filters

Support:

* State
* Dealer
* Status
* Date Range

Filters update both:

* Project list
* Map markers

---

## 9. Marker Colors

Markers inherit their display color from:

```
proj_s_states
```

No colors are hardcoded.

---

## 10. Distance Information

Display:

```
Distance

18.4 km
```

Display:

```
Estimated Time

24 mins
```

No traffic information.

---

## 11. Architecture

Keep responsibilities separated.

### Projects

```
proj_t_projects
```

Stores customer project information.

---

### Origins

```
proj_s_origin_addresses
```

Stores company locations.

---

### States

```
proj_s_states
```

Stores state configuration.

---

Routing must not modify project data.

Projects never store origin information.

Origins never store project information.

---

## Database Changes

### Modify

```
proj_t_projects
```

Add:

```sql
project_subtotal NUMERIC(12,2)
```

---

### Create

```
proj_s_origin_addresses
```

Stores:

* Company offices
* Warehouses
* Dispatch centers

---

### Create

```
proj_s_states
```

Stores:

* State
* State Code
* Display Color

---

## Mapping Providers

### Tile Rendering

* Martin
* MapLibre GL JS

### Address Search

* Geoapify Address Autocomplete

### Routing

* OSRM

---

## Future Compatibility

This design intentionally prepares the application for the next module:

```
Project Map

↓

Runs

↓

Driver Assignment

↓

Route Optimization

↓

Fleet Management
```

No redesign of the current database should be required when Runs is introduced.

---

## Design Principles

* Keep project data normalized.
* Separate master data from transactional data.
* Never duplicate addresses unnecessarily.
* Never store origin information inside project records.
* Never hardcode colors, coordinates, or routing providers.
* Keep all routing providers configurable.
* Build reusable setup tables instead of embedding business rules in code.
* Design for scalability from a single office to multiple offices and warehouses.
* Ensure every enhancement to the Project Map can be reused by future logistics features such as Runs, route optimization, and fleet management.

---

