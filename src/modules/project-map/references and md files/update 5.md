


---

# Project Form Review - UI & Functional Corrections

The new Project Form layout is heading in the right direction. The grouped sections improve readability and align with the operational workflow. However, there are several functional and UX issues that need to be addressed.

## 1. State Should Be Auto-Populated

### Current Behavior

The **State** field is still manually editable.

From the screenshots, it appears as a normal text input beside Status.

### Expected Behavior

When the user selects an address from the address search:

* formatted address
* city
* state
* state code
* postal code
* country
* latitude
* longitude

should all be populated automatically from the selected location.

The user should **not** manually type the state.

If the address changes, the state should update automatically.

The State field should therefore be readonly (or disabled) because it is derived from the selected address.

---

## 2. Hide Latitude and Longitude

### Current Behavior

The Project Location section still displays:

* Latitude
* Longitude

These are only showing "Auto-populated."

### Expected Behavior

Hide these fields completely.

They are implementation details and provide no value to the end user.

The coordinates should still be stored internally and saved to the database, but they do not need to be visible in the form.

This also frees up vertical space.

---

## 3. Project Status Dropdown Is Not Wired

### Current Behavior

The Status dropdown only shows:

```
Select status...
```

No project statuses are loaded.

Meanwhile, the Setup page clearly contains multiple Project Status records such as:

* New Dealer Order
* Welcome Email / Call
* Pending Permits
* Ready for Install
* Fully Installed
* Repairs
* Collections

The dropdown is not loading from `proj_s_project_status`.

### Expected Behavior

The Status dropdown should load all active records from `proj_s_project_status`.

This should work exactly like:

* Building Category
* Permit Status
* Welcome Call Status

No hardcoded options.

---

## 4. Group All Status Fields Together

The current Workflow Status section only contains:

* Welcome Call Status
* Permit Status

while Project Status is still located inside Customer Information.

This separates related information.

### Expected Layout

Move Project Status into the Workflow Status section.

Workflow Status should contain:

```
Project Status

Welcome Call Status

Permit Status
```

These three represent the operational workflow and should stay together.

Remove Status from Customer Information.

---

## 5. Address Should Be Required

The map relies on a valid address.

Without an address:

* location cannot be geocoded
* coordinates cannot be stored
* marker cannot be created
* routing cannot work

Therefore:

Address should be a required field.

Example:

```
Project Address *
```

The user should not be able to save a project without a valid selected address.

---

# Minor UX Suggestions

These are optional but would improve the form.

### Customer Information

Current:

```
Dealer

Building Category

Status

State
```

After moving Status:

```
Dealer

Building Category

State (readonly)
```

Cleaner layout.

---

### Project Location

After hiding coordinates:

```
Project Address *
```

Only one row is needed.

Much cleaner.

---

### Workflow Status

Recommended layout:

```
Project Status

Welcome Call Status

Permit Status
```

Three equal-width dropdowns on one row (or two on the first row and one below if needed for responsiveness).

---

# Acceptance Criteria

* State is automatically populated from the selected address and is readonly.
* Latitude and Longitude fields are hidden from the UI while still being stored internally.
* Project Status dropdown loads from `proj_s_project_status`.
* Project Status is grouped together with Welcome Call Status and Permit Status.
* Project Address is marked as required and validation prevents saving without a valid address.
* No unnecessary refactoring or architectural changes; simply wire the existing form correctly and keep the implementation straightforward.
