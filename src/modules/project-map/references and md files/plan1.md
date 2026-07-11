Yes. I understand the project.

This is **not really a task management system** like [Asana](https://asana.com?utm_source=chatgpt.com).

What PSB needs is closer to a **Project Location Tracking / Building Installation Map**.

Based on your screenshots, the current workflow is garbage from an operational perspective:

> Asana → copy address → Google Maps → search → screenshot → Google Drive

You're manually converting **address data into geographic data every time**.

That entire process can be automated.

## My recommendation: Google Maps Platform

Use [Google Maps Platform](https://mapsplatform.google.com/?utm_source=chatgpt.com).

Specifically:

* **Maps JavaScript API**
* **Geocoding API**
* Optional later: **Places API**

The Maps JavaScript API is specifically designed for embedding interactive maps, custom markers, graphics, and location-aware features in web apps. ([Google for Developers][1])

The Geocoding API converts:

```text
6757 N Richards Rd
Lake City, MI 49651
```

into:

```text
Latitude: 44.4461409
Longitude: -85.0857699
```

That latitude and longitude can then be stored in your database and used to place the project on the map. ([Google for Developers][2])

---

# How I see the PSB system

I would build a new PSBUniverse module:

```text
PSBUniverse
│
├── Gutter
├── OHD
├── Metal Buildings
│
└── Project Map / Building Tracker
```

Possible name:

**PSB Project Map**

or

**PSB Building Tracker**

I prefer **PSB Project Map** because the purpose is immediately obvious.

---

# The UI I recommend

```text
┌──────────────────────────────────────────────────────────────┐
│ Project Map                                                  │
│ Track PSB building projects and installation locations       │
├──────────────────────────────────────────────────────────────┤
│ Search projects...   [Status ▼] [Dealer ▼] [State ▼]         │
├───────────────────┬──────────────────────────────────────────┤
│                   │                                          │
│  247 Projects     │              MAP                         │
│                   │                                          │
│  ● New Order      │       🟡          🔵                     │
│  ● Pending Permit │                  🔴                      │
│  ● Ready Install  │    🟢                                    │
│  ● Installing     │                         🟣               │
│  ● Completed      │                                          │
│                   │                                          │
│  PROJECT LIST     │                                          │
│                   │                                          │
│  Diane McPherson  │                                          │
│  6757 N Richards  │                                          │
│  Ready for Install│                                          │
│                   │                                          │
└───────────────────┴──────────────────────────────────────────┘
```

Think **Google Maps + Asana board data**.

But do **not** copy Asana's Kanban UI.

The entire point of this application is geographic visualization.

---

# Minimum data you actually need

Don't overengineer the database.

```text
Project
-------
Id
ClientName
BuildingAddress
City
State
ZipCode

Latitude
Longitude

Status
Dealer

OrderReceivedDate
InstallDate

CreatedAt
UpdatedAt
```

The most important fields are:

```text
ClientName
BuildingAddress
Latitude
Longitude
Status
```

That's enough to create the first useful version.

---

# How the workflow should work

### 1. User creates a project

```text
Client Name
Diane McPherson

Building Address
6757 N Richards Rd

City
Lake City

State
MI

ZIP
49651

Status
Ready for Install
```

### 2. Backend geocodes the address

Send:

```text
6757 N Richards Rd, Lake City, MI 49651
```

to the Google Geocoding API.

Google returns coordinates. The API exists specifically to convert addresses into coordinates. ([Google for Developers][2])

### 3. Save the coordinates

```text
Latitude
44.4461409

Longitude
-85.0857699
```

### 4. Display the marker

```text
📍 Diane McPherson
```

on the PSB map.

### 5. Clicking the marker opens the project

```text
┌──────────────────────────────┐
│ Diane McPherson              │
│                              │
│ Ready for Install            │
│                              │
│ 6757 N Richards Rd           │
│ Lake City, MI 49651          │
│                              │
│ Dealer: USA Buildings        │
│ Order: $4,321.70             │
│                              │
│ [View Project]               │
│ [Open in Google Maps]        │
└──────────────────────────────┘
```

That already eliminates your current copy/paste workflow.

---

# Status should control marker appearance

For example:

| Status                    | Marker     |
| ------------------------- | ---------- |
| New Dealer Order          | Gray       |
| Welcome Email / Call      | Blue       |
| Pending Permits           | Yellow     |
| Pending Site Readiness    | Orange     |
| Ready for Install         | Cyan       |
| Confirmed Install Date    | Purple     |
| Currently Being Installed | Red        |
| Pending Payment           | Amber      |
| Fully Installed           | Green      |
| Repairs                   | Pink       |
| Collections               | Dark Red   |
| Completed                 | Dark Green |

But I would **not use 12 completely unrelated colors**.

That's poor map UX.

I would group them by lifecycle:

```text
GRAY    Pre-processing
BLUE    Processing
YELLOW  Waiting / Pending
PURPLE  Scheduled
ORANGE  Active Installation
GREEN   Installed / Completed
RED     Problem / Collections
```

Much easier to scan.

---

# Important: stop saving screenshots manually

This requirement:

> screenshot the Google Map and save it to Google Drive

I would challenge it.

If the screenshot is only being saved so people can later see **where the building is located**, then the screenshot is redundant.

The system already has:

```text
Address
Latitude
Longitude
Map Marker
Project
```

You're storing structured geographic data instead of a dead PNG.

If the business **legally or operationally requires a frozen map image**, then automate it separately. Do not make employees screenshot maps.

---

# Google Maps vs Mapbox vs Leaflet

| Technology             | My Rating | Reason                                                             |
| ---------------------- | --------: | ------------------------------------------------------------------ |
| Google Maps            |  **9/10** | Best fit for PSB's current workflow                                |
| Mapbox                 |      8/10 | Better visual customization                                        |
| Leaflet                |      6/10 | More infrastructure decisions                                      |
| OpenStreetMap directly |      5/10 | Don't treat public OSM tile servers as your production map backend |

[Mapbox](https://www.mapbox.com/?utm_source=chatgpt.com) is strong if you want a highly branded custom map and provides maps plus location search APIs. Its pricing is usage-based with free tiers for many products. ([Mapbox][3])

[Leaflet](https://leafletjs.com/examples/quick-start/?utm_source=chatgpt.com) is just the map rendering library. You still need to decide on tiles and geocoding. Even Leaflet's documentation warns developers to review the OpenStreetMap production tile usage policy, and the OSM Foundation explicitly says its public tile servers have limited capacity. ([OSMF Operations][4])

### For PSB, I would use Google Maps.

Your employees already understand Google Maps.

Your existing workflow already depends on Google Maps.

The addresses are primarily U.S. building sites.

And you need:

```text
Address
    ↓
Coordinates
    ↓
Map Marker
    ↓
Project Tracking
```

Google Maps Platform directly supports this architecture. Google currently uses usage-based billing by billable events/SKUs, so you should set quotas and billing monitoring rather than treating the API as unlimited. ([Google for Developers][5])

## Recommended stack for your project

Since this belongs to **PSBUniverse**, I'd build it as:

```text
Frontend
React + Vite

Map
Google Maps JavaScript API

Address Conversion
Google Geocoding API

Backend / Database
Supabase PostgreSQL

Hosting
Vercel

Authentication
Existing PSBUniverse SSO
```

**Do not build routing, GIS, map tiles, or your own geocoding system.** That would be overengineered trash for this requirement.

The real application is the **PSB project tracking layer on top of the map**.

And looking at your Asana screenshots, I can already see a much stronger UI architecture for this. I would make the **map the primary workspace**, with a collapsible project list on the left and a project detail drawer on the right—similar to the Asana task drawer behavior in your fourth screenshot.

[1]: https://developers.google.com/maps/documentation/javascript/overview?utm_source=chatgpt.com "Overview | Maps JavaScript API"
[2]: https://developers.google.com/maps/documentation/geocoding/guides-v3/start?utm_source=chatgpt.com "Get Started with the Geocoding API v3"
[3]: https://www.mapbox.com/pricing?utm_source=chatgpt.com "Mapbox pricing"
[4]: https://operations.osmfoundation.org/policies/tiles/?utm_source=chatgpt.com "Tile Usage Policy"
[5]: https://developers.google.com/maps/billing-and-pricing/pricing?utm_source=chatgpt.com "Google Maps Platform core services pricing list"
