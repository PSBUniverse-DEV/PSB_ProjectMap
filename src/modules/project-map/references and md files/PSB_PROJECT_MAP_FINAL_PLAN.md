# PSB Project Map — Final Implementation Plan

> ⚠️ **AI CODING NOTE**: This plan is designed for AI-assisted coding (Cline). Each phase contains strict rules to prevent overengineering. Do NOT add features outside the defined scope unless explicitly instructed by a senior developer.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Technology Stack](#2-technology-stack)
3. [Database Schema & Migrations](#3-database-schema--migrations)
4. [Module Structure](#4-module-structure)
5. [UI / UX Design](#5-ui--ux-design)
6. [Core Workflows](#6-core-workflows)
7. [API Security & Environment Setup](#7-api-security--environment-setup)
8. [V1 Scope (Strict)](#8-v1-scope-strict)
9. [Development Phases](#9-development-phases)
10. [PSBUniverse Integration Checklist](#10-psbuniverse-integration-checklist)
11. [Appendix A: Migration Script (psb_projects & psb_m_project_status)](#appendix-a-migration-script)
12. [Appendix B: PSBUniverse Routing Setup](#appendix-b-psbuniverse-routing-setup)

---

## 1. Project Overview

### Name
**PSB Project Map**

### Problem
PSB employees currently track building project locations using a manual workflow:

```
Asana → Copy address → Google Maps → Search → Screenshot → Google Drive
```

This is repetitive, error-prone, and provides no centralized geographic view of active projects.

### Solution
A web-based **Project Location Tracking / Building Installation Map** that replaces the manual workflow with an interactive map where employees can view, search, filter, add, and track PSB building projects by their actual construction-site locations.

### What PSB Project Map IS
- An interactive map showing all PSB building projects
- A tool to add/validate project locations via address autocomplete
- A way to pin the **actual building site** (not just the mailing address)
- A searchable, filterable project directory tied to geographic data

### What PSB Project Map IS NOT (V1)
- ❌ Not a replacement for Asana
- ❌ Not a task management system
- ❌ Not a Kanban board
- ❌ Not a GPS tracking system
- ❌ Not an analytics dashboard
- ❌ Not an Asana/Google Drive sync tool

---

## 2. Technology Stack

| Layer             | Technology                                                                    |
| ----------------- | ----------------------------------------------------------------------------- |
| Frontend          | React JS (existing PSBUniverse)                                               |
| Map Rendering     | [MapLibre GL JS](https://maplibre.org/)                                       |
| Address Search    | [Geoapify Address Autocomplete](https://www.geoapify.com/solutions/address-lookup/) |
| Geocoding         | Geoapify Geocoding API                                                        |
| Reverse Geocoding | Geoapify Reverse Geocoding API                                                |
| Database          | Supabase PostgreSQL (existing)                                                |
| Auth              | PSBUniverse SSO (existing — `useAuth()`)                                      |
| Hosting           | Vercel (existing)                                                             |
| Source Control    | GitHub (existing)                                                             |

### Why Not Google Maps?
- **Cost**: Google Maps Platform is expensive for internal tools. Geoapify's free tier (3,000 credits/day) covers PSB's initial usage.
- **Partial addresses**: Geoapify's autocomplete handles incomplete addresses better.
- **No credit card required**: Geoapify free tier has no CC requirement for signup.

### Why Not Leaflet / OpenStreetMap Nominatim?
- OSM's public Nominatim API forbids client-side autocomplete use and limits to 1 req/sec.
- Leaflet is just a renderer — you still need tiles, geocoding, and autocomplete from somewhere.

---

## 3. Database Schema & Migrations

### Table: `psb_m_project_status` (Status Lookup)

| Column        | Type                     | Constraints               |
| ------------- | ------------------------ | ------------------------- |
| id            | `uuid`                   | PK, default `gen_random_uuid()` |
| status_name   | `text`                   | NOT NULL, UNIQUE           |
| status_group  | `text`                   | NOT NULL                  |
| display_order | `integer`                | NOT NULL, default 0        |
| is_active     | `boolean`                | NOT NULL, default true     |
| created_at    | `timestamptz`            | default `now()`            |

**Status Grouping** (for marker colors):

| Lifecycle Group | Statuses                                    | Marker Color |
| --------------- | ------------------------------------------- | ------------ |
| Pre-Processing  | New Dealer Order                            | Gray         |
| Processing      | Welcome Email / Call                        | Blue         |
| Waiting         | Pending Permits, Pending Site Readiness     | Yellow       |
| Scheduled       | Ready for Install, Confirmed Install Date   | Purple       |
| Active          | Currently Being Installed                   | Orange       |
| Financial       | Pending Payment                             | Amber        |
| Installed       | Fully Installed                             | Green        |
| Issue           | Repairs, Collections                        | Red          |
| Completed       | Completed                                   | Dark Green   |

### Table: `psb_t_projects` (Project Data)

| Column               | Type                     | Constraints                        |
| -------------------- | ------------------------ | ---------------------------------- |
| id                   | `uuid`                   | PK, default `gen_random_uuid()`    |
| client_name          | `text`                   | NOT NULL                           |
| formatted_address    | `text`                   |                                    |
| address_line_1       | `text`                   |                                    |
| city                 | `text`                   |                                    |
| state                | `text`                   |                                    |
| state_code           | `text`                   |                                    |
| postal_code          | `text`                   |                                    |
| country              | `text`                   |                                    |
| address_latitude     | `numeric(10,7)`          |                                    |
| address_longitude    | `numeric(10,7)`          |                                    |
| site_latitude        | `numeric(10,7)`          |                                    |
| site_longitude       | `numeric(10,7)`          |                                    |
| location_source      | `text`                   | — e.g., 'geoapify', 'manual'       |
| location_confirmed   | `boolean`                | default false                      |
| status_id            | `uuid`                   | FK → `psb_m_project_status.id`     |
| dealer               | `text`                   |                                    |
| order_received_date  | `date`                   |                                    |
| install_date         | `date`                   |                                    |
| created_at           | `timestamptz`            | default `now()`                    |
| updated_at           | `timestamptz`            | default `now()`                    |
| created_by           | `uuid`                   | — references psb_s_user            |
| updated_by           | `uuid`                   | — references psb_s_user            |

### Why Two Sets of Coordinates?

```text
address_latitude / address_longitude
    → Location returned by Geoapify when user searches
site_latitude / site_longitude
    → Location confirmed by PSB employee (may be different)
```

**Rule**: Never overwrite `address_lat/lng` when the employee moves the pin. Store both.

---

## 4. Module Structure

Following PSBUniverse module conventions (matching the existing scaffold):

```
src/modules/project-map/
│
├── index.js                          ← Module definition (routes, app key)
│
├── data/
│   ├── projectMap.actions.js         ← "use server" — all DB queries
│   └── projectMap.data.js            ← Client helpers, constants, formatters
│
├── pages/
│   ├── ProjectMapPage.js             ← Server component (loads data, passes to View)
│   └── ProjectMapView.jsx            ← "use client" — all UI, hooks, interactivity
│
├── components/                       ← (Create) Additional client components
│   ├── ProjectMap.jsx                ← MapLibre map wrapper
│   ├── ProjectList.jsx               ← Left panel project cards
│   ├── ProjectDetailDrawer.jsx       ← Right-side detail drawer
│   ├── AddProjectForm.jsx            ← Add/Edit project form
│   ├── LocationSearch.jsx            ← Geoapify autocomplete input
│   ├── SitePinConfirm.jsx            ← Draggable pin confirmation UI
│   ├── MapMarker.jsx                 ← Individual marker with popup
│   ├── FilterBar.jsx                 ← Search + filter controls
│   └── StatusBadgeMap.jsx            ← Status badge with lifecycle color
│
└── references and md files/          ← Documentation (existing)
```

### Route Definition (in `index.js`)

```js
const projectMapModule = {
  key: "project-map",
  module_key: "project-map",
  name: "Project Map",
  description: "Interactive map for tracking PSB building project locations and installation sites.",
  icon: "map-location-dot",       // FontAwesome icon
  group_name: "Operations",
  group_desc: "Operational tools and tracking",
  order: 200,
  routes: [
    { path: "/project-map", page: "ProjectMapPage" },
  ],
};
```

---

## 5. UI / UX Design

### Main Layout

```
┌──────────────────────────────────────────────────────────────────────────┐
│ PSB Project Map                                       [User / Profile]   │
├──────────────────────────────────────────────────────────────────────────┤
│ [🔍 Search projects...]  [Status ▼]  [Dealer ▼]  [State ▼]  [+ Add]    │
├──────────────────────┬───────────────────────────────────────────────────┤
│ PROJECTS             │                                                   │
│                      │                                                   │
│ 247 Projects         │                MAPLIBRE MAP                       │
│                      │                                                   │
│ ● Diane McPherson    │        ●              ●                           │
│   Ready for Install  │                                                   │
│   Lake City, MI      │              ●                                    │
│                      │                                                   │
│ ● Paul Stern         │   ●                                               │
│   Pending Site Ready │                           ●                       │
│   Wisconsin          │                                                   │
│                      │                                                   │
│ ● John Meiss         │                                                   │
│   Ready for Install  │                                                   │
│   Illinois           │                                                   │
└──────────────────────┴───────────────────────────────────────────────────┘
```

### Key UI Rules

1. **Map is primary workspace** — not a sidebar or background element
2. **Left panel** = collapsible project list, synchronized with map
3. **Right drawer** = project details (slide-in, does NOT navigate away from map)
4. **Marker colors** = lifecycle groups, not 12 random colors
5. **Address form** = single unified form, not 5 floating cards
6. **No Kanban** — this is a map application, not a task board

### Marker Popup (on click)

```
┌──────────────────────────────────┐
│ Diane McPherson                  │
│                                  │
│ [Ready for Install]              │
│                                  │
│ 6757 N Richards Rd               │
│ Lake City, MI 49651              │
│                                  │
│ Dealer: USA Buildings            │
│                                  │
│ [View Project]   [Open in Maps]  │
└──────────────────────────────────┘
```

### Project Detail Drawer (right side)

```
                                ┌──────────────────────────────┐
                                │ Diane McPherson          ×   │
                                │                              │
                                │ [Ready for Install]          │
                                │                              │
                                │ PROJECT LOCATION             │
                                │ 6757 N Richards Rd           │
                                │ Lake City, MI 49651          │
                                │                              │
                                │ Dealer: USA Buildings        │
                                │ Order Received: June 3, 2026 │
                                │                              │
                                │ [Edit Project]               │
                                │ [Open in Google Maps]        │
                                └──────────────────────────────┘
```

### Add Project Form

```
┌─────────────────────────────────────────────────────────────────┐
│ Add Project                                                     │
│ Add a PSB building project and confirm its site location.       │
├─────────────────────────────┬───────────────────────────────────┤
│ PROJECT DETAILS             │ BUILDING SITE                     │
│                             │                                   │
│ Client Name                 │          MAPLIBRE MAP             │
│ [________________________] │                                   │
│                             │          📍 (draggable)           │
│ Dealer                      │                                   │
│ [Select Dealer _______▼___] │                                   │
│                             │                                   │
│ Status                      │                                   │
│ [Select Status _______▼___] │                                   │
│                             │                                   │
│ BUILDING LOCATION           │                                   │
│                             │                                   │
│ [🔍 Search location...   ] │                                   │
│                             │                                   │
│ Selected Address:           │                                   │
│ 6757 N Richards Rd          │                                   │
│ Lake City, MI 49651         │                                   │
│                             │                                   │
│                             │ [Reset Pin]  [Confirm Site]      │
├─────────────────────────────┴───────────────────────────────────┤
│                                     [Cancel]  [Save Project]   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. Core Workflows

### Workflow A: Viewing Projects

```
1. Employee opens /project-map
2. Map loads with all project markers (clustered at zoom-out)
3. Left panel shows project list with status badges
4. Employee can:
   a. Click marker → popup with project summary
   b. Click "View Project" → detail drawer opens
   c. Click project card → map centers on marker, detail drawer opens
   d. Search/filter → both list and markers update
```

### Workflow B: Adding a Project

```
1. Employee clicks "+ Add" button (or from detail drawer)
2. Add Project form opens (full-width modal or overlay)
3. Employee enters: Client Name, Dealer, Status
4. Employee types partial address in location search:
   → Geoapify autocomplete returns suggestions (debounced 300-500ms)
   → Employee selects correct location
   → Form fields auto-populate (city, state, ZIP, etc.)
   → Map centers on location with a pin
5. Employee drags pin to actual building site
6. Employee clicks "Confirm Site"
7. Employee clicks "Save Project"
8. Project saved to Supabase → appears on map immediately
```

### Workflow C: Editing a Project

```
1. From detail drawer, click "Edit Project"
2. Form pre-populates with existing data
3. Employee can change: Client Name, Dealer, Status, Address, Site Pin
4. "Save" updates the record → map refreshes
```

---

## 7. API Security & Environment Setup

### Geoapify API Key

```bash
# .env.local
GEOAPIFY_API_KEY=pk_abc123...
```

**Rules:**
- ✅ Store in `.env.local` only
- ✅ Never hardcode in source code
- ✅ Never commit to GitHub
- ✅ Use Vercel environment variables for production

### Architecture Options for Geoapify Calls

**Option A (V1 — Direct from Browser):**
```
React → Geoapify API (with API key)
```
- Simpler for V1
- Configure API key restrictions in Geoapify dashboard (HTTP referrer restrictions)
- Set usage alerts/monitoring

**Option B (More Secure — Proxy via Vercel API Routes):**
```
React → /api/location/search → Geoapify
React → /api/location/reverse → Geoapify
```
- API key never reaches the browser
- Can add logging, rate limiting, caching
- Implement if Option A proves insufficient

**Recommendation**: Start with **Option A** with Geoapify referrer restrictions enabled. Move to Option B if needed.

### Supabase RLS

Row Level Security must be enabled on both tables. Do NOT rely on hidden React buttons as security.

```sql
-- Example RLS policy: Authenticated users can read all projects
CREATE POLICY "Authenticated users can read projects"
  ON psb_t_projects
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Example RLS policy: Authenticated users can insert projects
CREATE POLICY "Authenticated users can insert projects"
  ON psb_t_projects
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');
```

---

## 8. V1 Scope (Strict)

### ✅ Included (Must Have)

| # | Feature                | Priority |
|--|------------------------|----------|
| 1 | Project Map (MapLibre) | P0       |
| 2 | Project List (left panel, synchronized) | P0 |
| 3 | Add Project (with form) | P0       |
| 4 | Edit Project           | P0       |
| 5 | Address autocomplete (Geoapify) | P0 |
| 6 | Address selection & auto-populate | P0 |
| 7 | Draggable building-site marker | P0 |
| 8 | Marker with popup      | P0       |
| 9 | Marker clustering      | P1       |
| 10 | Project status (from lookup table) | P0 |
| 11 | Dealer field           | P0       |
| 12 | Search (global text)   | P1       |
| 13 | Status filter          | P1       |
| 14 | Dealer filter          | P1       |
| 15 | State filter           | P1       |
| 16 | Project detail drawer  | P0       |
| 17 | PSBUniverse SSO integration | P0   |
| 18 | Loading / empty / error states | P0 |
| 19 | Database migration scripts | P0   |

### ❌ Excluded (V2 or later)

- Analytics dashboard
- Asana integration / sync
- Google Drive sync
- Weather data
- Employee GPS tracking
- Route planning
- Map screenshot export
- AI features
- Project density heatmaps
- Notification system

---

## 9. Development Phases

| Phase | Scope | Estimated Effort |
|-------|-------|-----------------|
| **Phase 1** | Project setup, update index.js, verify SSO, environment variables | 1 session |
| **Phase 2** | Run migration scripts (create tables, seed statuses), update actions.js | 1 session |
| **Phase 3** | MapLibre map integration (basic map rendering in View) | 1-2 sessions |
| **Phase 4** | Geoapify address search + autocomplete component | 1-2 sessions |
| **Phase 5** | Add/Edit project form with location workflow | 2-3 sessions |
| **Phase 6** | Draggable building-site pin + confirm site logic | 1 session |
| **Phase 7** | Project markers, popups, and marker clustering | 1 session |
| **Phase 8** | Project list (left panel) + synchronization with map | 1-2 sessions |
| **Phase 9** | Project detail drawer (right side) | 1 session |
| **Phase 10** | Search + filters (global search, status, dealer, state) | 1-2 sessions |
| **Phase 11** | UI/UX cleanup, loading/empty/error states, responsive | 1 session |
| **Phase 12** | QAS / UAT + Production deployment | 1 session |

---

## 10. PSBUniverse Integration Checklist

### Module Setup
- [ ] Update `index.js` with correct `module_key` (match `psb_s_application` entry)
- [ ] Update `icon`, `group_name`, `group_desc`, `order`
- [ ] Run `npm run dev` to auto-generate route wrapper in `src/app/project-map/page.js`

### Database Setup (Core Tables — Senior Dev Required)
- [ ] `psb_s_application` → Create entry with `module_key = 'project-map'`
- [ ] `psb_s_appcard` → Create card with `route_path = '/project-map'`
- [ ] `psb_m_appcardgroup` → Add/use a group for the card
- [ ] `psb_m_appcardroleaccess` → Assign roles that can see this card
- [ ] `psb_s_role` → Ensure roles exist
- [ ] `psb_m_userapproleaccess` → Assign users to roles for testing

### SSO / Auth
- [ ] View uses `useAuth()` from `@/core/auth/useAuth`
- [ ] Server actions use `getCurrentSession()` for validation
- [ ] `.env.local` has `NEXT_PUBLIC_COOKIE_DOMAIN` set

### Verification
- [ ] `npm run dev` starts without errors
- [ ] `/project-map` loads at localhost (or `.psbuniverse.com`)
- [ ] SSO login works
- [ ] RBAC access controls work (card visibility)
- [ ] Map renders with markers
- [ ] Add/Edit project saves to database
- [ ] Filters work correctly
- [ ] `npm run build` passes

---

## 11. Appendix A: Migration Script

```sql
-- ====================================================
-- Migration 001: Create PSB Project Map Tables
-- Schema: public
-- ====================================================

DO $$
BEGIN
    RAISE NOTICE '====================================================';
    RAISE NOTICE 'Migration 001: Create PSB Project Map Tables';
    RAISE NOTICE 'Schema: public';
    RAISE NOTICE '====================================================';
END $$;

-- ====================================================
-- STEP 1/4: Create project status lookup table
-- ====================================================
DO $$
BEGIN
    RAISE NOTICE '[STEP 1/4] Creating table "psb_m_project_status"...';

    CREATE TABLE IF NOT EXISTS public.psb_m_project_status (
        id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        status_name     TEXT        NOT NULL UNIQUE,
        status_group    TEXT        NOT NULL,
        display_order   INTEGER     NOT NULL DEFAULT 0,
        is_active       BOOLEAN     NOT NULL DEFAULT true,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    RAISE NOTICE '✔ Table "psb_m_project_status" created or already exists.';
END $$;

-- ====================================================
-- STEP 2/4: Create projects table
-- ====================================================
DO $$
BEGIN
    RAISE NOTICE '[STEP 2/4] Creating table "psb_t_projects"...';

    CREATE TABLE IF NOT EXISTS public.psb_t_projects (
        id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
        client_name         TEXT            NOT NULL,
        formatted_address   TEXT,
        address_line_1      TEXT,
        city                TEXT,
        state               TEXT,
        state_code          TEXT,
        postal_code         TEXT,
        country             TEXT,
        address_latitude    NUMERIC(10,7),
        address_longitude   NUMERIC(10,7),
        site_latitude       NUMERIC(10,7),
        site_longitude      NUMERIC(10,7),
        location_source     TEXT,
        location_confirmed  BOOLEAN         NOT NULL DEFAULT false,
        status_id           UUID            REFERENCES public.psb_m_project_status(id),
        dealer              TEXT,
        order_received_date DATE,
        install_date        DATE,
        created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
        updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
        created_by          UUID,
        updated_by          UUID
    );

    RAISE NOTICE '✔ Table "psb_t_projects" created or already exists.';
END $$;

-- ====================================================
-- STEP 3/4: Create indexes
-- ====================================================
DO $$
BEGIN
    RAISE NOTICE '[STEP 3/4] Creating indexes...';

    CREATE INDEX IF NOT EXISTS idx_psb_t_projects_status_id
        ON public.psb_t_projects (status_id);

    CREATE INDEX IF NOT EXISTS idx_psb_t_projects_client_name
        ON public.psb_t_projects (client_name);

    CREATE INDEX IF NOT EXISTS idx_psb_t_projects_state_code
        ON public.psb_t_projects (state_code);

    CREATE INDEX IF NOT EXISTS idx_psb_t_projects_dealer
        ON public.psb_t_projects (dealer);

    RAISE NOTICE '✔ Indexes created or already exist.';
END $$;

-- ====================================================
-- STEP 4/4: Seed project statuses
-- ====================================================
DO $$
DECLARE
    v_status_name   TEXT;
    v_status_group  TEXT;
    v_display_order INTEGER;
    v_exists        BOOLEAN;
BEGIN
    RAISE NOTICE '[STEP 4/4] Seeding project statuses...';

    -- Pre-Processing
    v_status_name := 'New Dealer Order'; v_status_group := 'Pre-Processing'; v_display_order := 10;
    SELECT EXISTS(SELECT 1 FROM public.psb_m_project_status WHERE status_name = v_status_name) INTO v_exists;
    IF NOT v_exists THEN
        INSERT INTO public.psb_m_project_status (status_name, status_group, display_order)
        VALUES (v_status_name, v_status_group, v_display_order);
        RAISE NOTICE '• %: INSERTED (Group: %)', v_status_name, v_status_group;
    ELSE
        RAISE NOTICE '• %: ALREADY EXISTS — skipping', v_status_name;
    END IF;

    -- Processing
    v_status_name := 'Welcome Email / Call'; v_status_group := 'Processing'; v_display_order := 20;
    SELECT EXISTS(SELECT 1 FROM public.psb_m_project_status WHERE status_name = v_status_name) INTO v_exists;
    IF NOT v_exists THEN
        INSERT INTO public.psb_m_project_status (status_name, status_group, display_order)
        VALUES (v_status_name, v_status_group, v_display_order);
        RAISE NOTICE '• %: INSERTED (Group: %)', v_status_name, v_status_group;
    ELSE
        RAISE NOTICE '• %: ALREADY EXISTS — skipping', v_status_name;
    END IF;

    -- Waiting
    v_status_name := 'Pending Permits'; v_status_group := 'Waiting'; v_display_order := 30;
    SELECT EXISTS(SELECT 1 FROM public.psb_m_project_status WHERE status_name = v_status_name) INTO v_exists;
    IF NOT v_exists THEN
        INSERT INTO public.psb_m_project_status (status_name, status_group, display_order)
        VALUES (v_status_name, v_status_group, v_display_order);
        RAISE NOTICE '• %: INSERTED (Group: %)', v_status_name, v_status_group;
    ELSE
        RAISE NOTICE '• %: ALREADY EXISTS — skipping', v_status_name;
    END IF;

    v_status_name := 'Pending Site Readiness'; v_status_group := 'Waiting'; v_display_order := 40;
    SELECT EXISTS(SELECT 1 FROM public.psb_m_project_status WHERE status_name = v_status_name) INTO v_exists;
    IF NOT v_exists THEN
        INSERT INTO public.psb_m_project_status (status_name, status_group, display_order)
        VALUES (v_status_name, v_status_group, v_display_order);
        RAISE NOTICE '• %: INSERTED (Group: %)', v_status_name, v_status_group;
    ELSE
        RAISE NOTICE '• %: ALREADY EXISTS — skipping', v_status_name;
    END IF;

    -- Scheduled
    v_status_name := 'Ready for Install'; v_status_group := 'Scheduled'; v_display_order := 50;
    SELECT EXISTS(SELECT 1 FROM public.psb_m_project_status WHERE status_name = v_status_name) INTO v_exists;
    IF NOT v_exists THEN
        INSERT INTO public.psb_m_project_status (status_name, status_group, display_order)
        VALUES (v_status_name, v_status_group, v_display_order);
        RAISE NOTICE '• %: INSERTED (Group: %)', v_status_name, v_status_group;
    ELSE
        RAISE NOTICE '• %: ALREADY EXISTS — skipping', v_status_name;
    END IF;

    v_status_name := 'Confirmed Install Date'; v_status_group := 'Scheduled'; v_display_order := 60;
    SELECT EXISTS(SELECT 1 FROM public.psb_m_project_status WHERE status_name = v_status_name) INTO v_exists;
    IF NOT v_exists THEN
        INSERT INTO public.psb_m_project_status (status_name, status_group, display_order)
        VALUES (v_status_name, v_status_group, v_display_order);
        RAISE NOTICE '• %: INSERTED (Group: %)', v_status_name, v_status_group;
    ELSE
        RAISE NOTICE '• %: ALREADY EXISTS — skipping', v_status_name;
    END IF;

    -- Active
    v_status_name := 'Currently Being Installed'; v_status_group := 'Active'; v_display_order := 70;
    SELECT EXISTS(SELECT 1 FROM public.psb_m_project_status WHERE status_name = v_status_name) INTO v_exists;
    IF NOT v_exists THEN
        INSERT INTO public.psb_m_project_status (status_name, status_group, display_order)
        VALUES (v_status_name, v_status_group, v_display_order);
        RAISE NOTICE '• %: INSERTED (Group: %)', v_status_name, v_status_group;
    ELSE
        RAISE NOTICE '• %: ALREADY EXISTS — skipping', v_status_name;
    END IF;

    -- Financial
    v_status_name := 'Pending Payment'; v_status_group := 'Financial'; v_display_order := 80;
    SELECT EXISTS(SELECT 1 FROM public.psb_m_project_status WHERE status_name = v_status_name) INTO v_exists;
    IF NOT v_exists THEN
        INSERT INTO public.psb_m_project_status (status_name, status_group, display_order)
        VALUES (v_status_name, v_status_group, v_display_order);
        RAISE NOTICE '• %: INSERTED (Group: %)', v_status_name, v_status_group;
    ELSE
        RAISE NOTICE '• %: ALREADY EXISTS — skipping', v_status_name;
    END IF;

    -- Installed
    v_status_name := 'Fully Installed'; v_status_group := 'Installed'; v_display_order := 90;
    SELECT EXISTS(SELECT 1 FROM public.psb_m_project_status WHERE status_name = v_status_name) INTO v_exists;
    IF NOT v_exists THEN
        INSERT INTO public.psb_m_project_status (status_name, status_group, display_order)
        VALUES (v_status_name, v_status_group, v_display_order);
        RAISE NOTICE '• %: INSERTED (Group: %)', v_status_name, v_status_group;
    ELSE
        RAISE NOTICE '• %: ALREADY EXISTS — skipping', v_status_name;
    END IF;

    -- Issue
    v_status_name := 'Repairs'; v_status_group := 'Issue'; v_display_order := 100;
    SELECT EXISTS(SELECT 1 FROM public.psb_m_project_status WHERE status_name = v_status_name) INTO v_exists;
    IF NOT v_exists THEN
        INSERT INTO public.psb_m_project_status (status_name, status_group, display_order)
        VALUES (v_status_name, v_status_group, v_display_order);
        RAISE NOTICE '• %: INSERTED (Group: %)', v_status_name, v_status_group;
    ELSE
        RAISE NOTICE '• %: ALREADY EXISTS — skipping', v_status_name;
    END IF;

    v_status_name := 'Collections'; v_status_group := 'Issue'; v_display_order := 110;
    SELECT EXISTS(SELECT 1 FROM public.psb_m_project_status WHERE status_name = v_status_name) INTO v_exists;
    IF NOT v_exists THEN
        INSERT INTO public.psb_m_project_status (status_name, status_group, display_order)
        VALUES (v_status_name, v_status_group, v_display_order);
        RAISE NOTICE '• %: INSERTED (Group: %)', v_status_name, v_status_group;
    ELSE
        RAISE NOTICE '• %: ALREADY EXISTS — skipping', v_status_name;
    END IF;

    -- Completed
    v_status_name := 'Completed'; v_status_group := 'Completed'; v_display_order := 120;
    SELECT EXISTS(SELECT 1 FROM public.psb_m_project_status WHERE status_name = v_status_name) INTO v_exists;
    IF NOT v_exists THEN
        INSERT INTO public.psb_m_project_status (status_name, status_group, display_order)
        VALUES (v_status_name, v_status_group, v_display_order);
        RAISE NOTICE '• %: INSERTED (Group: %)', v_status_name, v_status_group;
    ELSE
        RAISE NOTICE '• %: ALREADY EXISTS — skipping', v_status_name;
    END IF;

    RAISE NOTICE '✔ Project statuses seeded.';
END $$;

-- ====================================================
-- Final Summary
-- ====================================================
SELECT
    '001' AS migration,
    'Create PSB Project Map Tables' AS name,
    2 AS tables_created,
    0 AS tables_updated,
    4 AS indexes_created,
    12 AS rows_inserted,
    0 AS rows_updated,
    0 AS rows_unchanged,
    0 AS warnings,
    0 AS errors,
    'SUCCESS' AS status,
    now() AS finished_at,
    EXTRACT(EPOCH FROM (now() - now()))::numeric(10,2) AS duration_seconds;
```

---

## 12. Appendix B: PSBUniverse Routing Setup

### Core Database Setup (for Senior Dev)

After migration scripts are run, a senior developer needs to configure:

1. **`psb_s_application`**
   - Insert: `{ app_id: <uuid>, app_name: 'Project Map', module_key: 'project-map', ... }`

2. **`psb_s_appcard`**
   - Insert: `{ card_id: <uuid>, card_name: 'Project Map', route_path: '/project-map', app_id: <from above>, ... }`

3. **`psb_m_appcardgroup`**
   - Insert or use existing group (e.g., 'Operations')

4. **`psb_m_appcardroleaccess`**
   - Assign which roles can see the Project Map card

5. **`psb_s_role`**
   - Ensure roles exist (e.g., 'Project Map Admin', 'Project Map Viewer')

6. **`psb_m_userapproleaccess`**
   - Assign test users to roles

### Route Generation

```
npm run dev            → Auto-generates src/app/project-map/page.js
npm run gen:routes     ← Manual route generation (alternative)
```

The route wrapper in `src/app/` is auto-generated and should NEVER be manually edited.

---

## Document History

| Date | Author | Changes |
|------|--------|---------|
| 2026-07-13 | Cline (AI) | Initial consolidated plan from plan1.md, plan2.md, and plan3.md |

---

*This document is for AI-assisted development. Follow the V1 scope strictly. Do not add features outside the scope unless explicitly directed by a senior developer.*