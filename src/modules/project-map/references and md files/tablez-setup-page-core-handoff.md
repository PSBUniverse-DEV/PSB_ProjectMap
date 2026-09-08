# TableZ Setup Page Core Handoff

## Purpose

Update the shared Core `TableZ` experience so the Project Map setup page can use the current setup-page visual language without losing table behavior.

The desired result is a modern, compact, operational setup table that matches the existing Project Map setup workspace. The current setup workspace uses restrained borders, tight rows, muted blue-gray surfaces, compact controls, clear action icons, and dense admin-oriented spacing. The existing Core `TableZ` behavior is useful, but its current presentation reads as an older generic data table.

This document is a handoff for Core. It describes the files to read, the current rendering architecture, the required TableZ capabilities, and the acceptance criteria.

## Scope Boundary

Project Map-specific files are under:

`src/modules/project-map`

The Project Map team should not modify shared Core files directly. Core owns the shared TableZ implementation and its shared styles.

The shared component supplied for review is:

`src/shared/components/ui/table/TableZ.js`

The shared styling is currently defined in:

`src/app/globals.css`

## Current Setup Page Entry Point

The setup route is:

`src/app/project-map/setup/page.js`

The route delegates to:

`src/modules/project-map/pages/ProjectMapSetupPage.js`

That server page loads setup data and renders:

`src/modules/project-map/pages/setup/ProjectMapSetupView.jsx`

`ProjectMapSetupView.jsx` is the primary integration point. It owns the setup table definitions, active setup tab, data selection, setup CRUD callbacks, and render branching.

## Current Rendering Architecture

`ProjectMapSetupView.jsx` currently imports `TableZ`, but TableZ is only used by the final fallback branch:

```jsx
<TableZ
  data={filteredRows}
  columns={columns}
  rowIdKey={tableDef.pk}
  actions={actions}
  hideSearch
  emptyMessage={`No ${tableDef.label.toLowerCase()} found.`}
/>
```

That fallback is not the primary renderer for the current setup tables because the active tabs are routed to custom components.

### Current table renderers

| Setup table | Current renderer | Current primary key |
|---|---|---|
| Project Statuses | `src/modules/project-map/components/ProjectStatusesGrid.jsx` | `status_id` |
| Origin Addresses | `src/modules/project-map/components/OriginAddressesGrid.jsx` | `id` |
| States | `src/modules/project-map/components/StatesGrid.jsx` | `id` |
| Building Categories | `src/modules/project-map/components/LookupTableGrid.jsx` | `id` |
| Permit Statuses | `src/modules/project-map/components/LookupTableGrid.jsx` | `id` |
| Welcome Call Statuses | `src/modules/project-map/components/LookupTableGrid.jsx` | `id` |
| Run Statuses | `src/modules/project-map/components/LookupTableGrid.jsx` | `status_id` |
| Payment Methods | `src/modules/project-map/components/LookupTableGrid.jsx` | `id` |

The render branches are located in:

`src/modules/project-map/pages/setup/ProjectMapSetupView.jsx`

The current shared lookup-grid implementation is:

`src/modules/project-map/components/LookupTableGrid.jsx`

The lookup grid currently renders a native HTML `<table>`, not TableZ.

## Project Map Visual Language to Match

The current setup page styling is defined in:

`src/modules/project-map/pages/setup/setup-workspace.css`

Important visual conventions:

- Compact enterprise/admin workspace layout.
- Approximately 44px toolbars with title, record count, search, and add action.
- Tight table rows with approximately 12px to 13px body text.
- Header labels are small, uppercase, muted, and strongly weighted.
- Borders are subtle and cool blue-gray rather than dark gray.
- Hover states are light blue-gray and should not cause layout shifts.
- Actions are compact icon buttons with clear edit and delete/deactivate states.
- Status values use small badges or switches rather than large pills.
- Color values use compact swatches with readable hex values where applicable.
- Empty states are quiet and informative rather than oversized.
- The setup page should feel like a dense operational workspace, not a marketing card or a legacy Bootstrap table.

The relevant setup-specific CSS sections include:

- `.setup-grid-wrap`
- `.psg-*` for the Project Statuses grid
- `.oag-*` for the Origin Addresses grid
- `.ssg-*` for the States grid
- `.ltg-*` for the shared lookup grid

## Desired Core TableZ Direction

Update the shared TableZ presentation to support the setup-page visual language while preserving existing TableZ behavior for other modules.

Prefer additive, opt-in styling or a documented class/configuration path if the global visual change could affect unrelated tables. The Project Map setup page should be able to opt into the updated design with a stable class name or TableZ display preset.

A suitable direction would be one of these approaches:

1. Add a TableZ visual variant such as `variant="setup"` or `density="compact"`.
2. Add a class supplied by the caller, such as `className="project-map-setup-table"`, with Core-owned styles.
3. Add a documented TableZ preset that combines compact density, setup header styling, and compact action controls.

The preferred option is an explicit opt-in variant or class. Do not make unrelated application tables change unexpectedly.

## Required TableZ Capabilities

The current TableZ component already supports many required behaviors:

- `columns`
- `column.render`
- `rowIdKey`
- `actions`
- `draggable`
- `onReorder`
- search
- sorting
- filters
- pagination
- loading state
- empty state
- batch editing
- controlled and uncontrolled modes

Core should verify the following behaviors specifically for setup use.

### 1. Custom row identity

The table must support both:

```jsx
rowIdKey="id"
```

and:

```jsx
rowIdKey="status_id"
```

This is required for Run Statuses and Project Statuses.

### 2. Custom cell rendering

Columns need reliable render support for setup-specific values:

- display color swatches
- status badges
- active/inactive labels
- payment method values
- drag handles or order values
- truncated descriptions with accessible full text where appropriate

The render callback must remain compatible with the existing `TableZ` rendering contract and should not require setup components to fork the table markup.

### 3. Row actions

The setup tables need compact, visually consistent action buttons:

- Edit
- Delete or deactivate
- Optional restore in future

Actions should support icon-first presentation with accessible labels and tooltips. The action column must remain stable in width and must not resize when labels or loading states change.

### 4. Drag-and-drop ordering

Run Statuses and other ordered lookup tables need drag-and-drop ordering.

The existing TableZ props are:

```jsx
draggable={true}
onReorder={handleReorder}
rowIdKey="status_id"
```

Core should verify that:

- drag ordering works with custom `rowIdKey` values
- filtered or sorted views do not persist an ambiguous order
- drag is disabled while a search, filter, or sort transform is active if that is the existing TableZ safety behavior
- the drop target has a clear but restrained visual state
- the drag handle does not alter row height
- keyboard or non-pointer accessibility behavior is documented if supported

### 5. Optional active-state controls

Not every setup table has an `is_active` field.

The table configuration must allow active-state UI to be omitted. Payment Methods currently do not expose the same active/order fields as Run Statuses. Core should not force an Active column, Active filter, or Active switch onto tables that do not have those fields.

### 6. Optional ordering controls

Not every setup table has `display_order`.

The table configuration must allow the order column and drag behavior to be omitted. Payment Methods currently do not use the same ordering model as Run Statuses.

### 7. Toolbar compatibility

The setup page already has a workspace toolbar and the lookup grid currently has its own table toolbar. Core should support a clean composition so the result does not show two competing search bars or two separate Add buttons.

The preferred setup composition is:

- one setup table title and record count
- one search control
- optional active/all filter controls
- one Add button
- the TableZ table body and footer below

If TableZ always renders its own search shell, provide a supported way for the setup page to hide or externally control it. The current TableZ prop `hideSearch` is relevant.

### 8. Pagination and dense layout

The setup-page tables should support compact pagination without excessive vertical padding. The pagination controls should visually match the setup workspace and remain usable on smaller widths.

The table must remain horizontally scrollable when columns cannot fit. It must not cause the setup page's main shell to overflow the viewport vertically.

### 9. Empty, loading, and error states

Empty states should use the existing setup tone:

- compact heading
- one short supporting line
- no oversized illustration

Loading states should preserve table dimensions and avoid layout jumping.

Errors should be handled by the existing Project Map toast/action layer rather than by embedding large error panels into each row.

## Data and Action Contracts

The setup view currently imports actions from:

`src/modules/project-map/data/projectMap.actions.js`

The generic setup actions are:

- `createSetupRow`
- `updateSetupRow`
- `deleteSetupRow`

The lookup actions are:

- `createLookupRow`
- `updateLookupRow`
- `toggleLookupRowActive`
- `reorderLookupRows`
- `softDeleteLookupRow`

The setup table registry is `SETUP_TABLES` in `projectMap.actions.js`.

The lookup table registry is `LOOKUP_TABLES` in `projectMap.actions.js`.

Current relevant database mappings:

```js
projectStatuses: { table: "proj_s_project_status", pk: "status_id" }
runStatuses: { table: "proj_s_run_status", pk: "status_id" }
paymentMethods: { table: "proj_s_payment_method", pk: "id" }
```

Do not make TableZ responsible for database mutations. TableZ should emit row actions and reorder events; Project Map action functions should remain responsible for validation, persistence, toast handling, and refresh behavior.

## Table Definitions to Read

The setup table definitions are in `ProjectMapSetupView.jsx` under `TABLE_DEFS`.

Important definitions:

### Run Statuses

```js
{
  key: "runStatuses",
  label: "Run Statuses",
  pk: "status_id",
  columns: [
    { key: "status_name", label: "Status Name", sortable: true },
    { key: "status_description", label: "Description", sortable: true },
    { key: "display_color", label: "Color", sortable: false },
    { key: "display_order", label: "Order", sortable: true },
    { key: "is_active", label: "Active", sortable: true },
  ],
}
```

Run Statuses need:

- color rendering
- order rendering and drag reorder
- active/inactive rendering
- `status_id` identity
- edit action
- soft deactivate action

### Payment Methods

```js
{
  key: "paymentMethods",
  label: "Payment Methods",
  pk: "id",
  columns: [
    { key: "method_name", label: "Method Name", sortable: true },
    { key: "method_description", label: "Description", sortable: true },
  ],
}
```

Payment Methods need:

- `id` identity
- edit action
- permanent delete behavior as currently implemented
- no forced color column
- no forced order column
- no forced active switch or active filter

## Files Core Should Read

### Primary integration file

`src/modules/project-map/pages/setup/ProjectMapSetupView.jsx`

Read this first. It defines the setup tabs, table metadata, action wiring, and renderer selection.

### Current shared lookup table behavior

`src/modules/project-map/components/LookupTableGrid.jsx`

This is the best reference for the desired setup-page interaction model:

- compact toolbar
- all/active/inactive filters
- search
- add modal
- edit modal
- icon actions
- color swatches
- active switch and badge
- drag reorder
- soft-delete confirmation

It currently renders native HTML table markup and should be treated as a behavior/style reference, not as the Core table implementation.

### Specialized setup behavior

`src/modules/project-map/components/ProjectStatusesGrid.jsx`

Read for project-status-specific behavior, especially status color handling, `status_id`, and status-specific action flows.

`src/modules/project-map/components/OriginAddressesGrid.jsx`

Read for address-specific behavior. This table has richer domain editing and should not be forced into a generic lookup-table API without preserving the location workflow.

`src/modules/project-map/components/StatesGrid.jsx`

Read for state-specific status/color/order behavior.

### Setup shell styles

`src/modules/project-map/pages/setup/setup-workspace.css`

Use this as the visual reference for the updated TableZ setup variant. Core should avoid importing Project Map CSS into the shared layer; instead, reproduce the relevant visual contract in Core-owned styles or expose stable classes for the Project Map stylesheet to target.

### Data loading

`src/modules/project-map/data/projectMap.server.js`

This loads setup data, including active Run Statuses and Payment Methods.

### Persistence and action behavior

`src/modules/project-map/data/projectMap.actions.js`

This owns table mappings, validation, CRUD, active toggles, ordering, and soft-delete behavior.

## Recommended Integration Sequence

1. Review `TableZ.js`, `tableRender.js`, `tableDragNDrop.js`, `tableColumns.js`, and the existing TableZ CSS.
2. Add an opt-in visual variant or class for the Project Map setup design.
3. Verify custom `rowIdKey` support with `id` and `status_id`.
4. Verify column render callbacks for color swatches, badges, and compact values.
5. Verify action-column sizing and icon-button presentation.
6. Verify optional drag ordering and active controls.
7. Update the Project Map setup render branch to use the TableZ-based path for lookup tables.
8. Keep location-specific editing behavior for Origin Addresses intact.
9. Remove or retire duplicate native-table rendering only after the TableZ path passes interaction checks.
10. Run the Project Map production build and manually test every setup tab.

## Acceptance Criteria

The work is complete when:

- The setup tables visually match the current Project Map setup workspace.
- TableZ no longer looks like a visually separate legacy table in the setup page.
- Run Statuses support `status_id`, color, order, active state, edit, and soft deactivate.
- Payment Methods support `id`, edit, and delete without unsupported order/active UI.
- Search, sort, pagination, empty state, and loading state remain functional.
- Action buttons are compact, stable, accessible, and visually consistent.
- Drag reorder does not persist an ambiguous order after filtering or sorting.
- No unrelated application tables change appearance unless they explicitly opt into the new variant.
- No database mutation logic is moved into TableZ.
- The Project Map build completes successfully.

## Important Non-Goals

- Do not redesign the Project Map setup shell itself.
- Do not move Supabase or database logic into Core.
- Do not force every setup table into the same data capabilities.
- Do not require Payment Methods to gain `is_active` or `display_order` unless the database contract changes separately.
- Do not remove address-specific editing behavior merely to make every table use one generic renderer.
