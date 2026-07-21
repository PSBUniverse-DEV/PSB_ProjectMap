now let's go back to the project-map


OSRM segment request failed (400): {"message":"Impossible route between points","code":"NoRoute"}

this is becuase the origin is really far away (overseas). and the stops are in philippines. so it throws an error. what i want is catch the error and just show a dialog/modal that the origin and stop is not available. also there should be no "start" button right? instead, put a "print record" to print the run record. right? becuase start is not we need here. this is just a static record.

- desctibe the issue, suggest via prompt and/or fix via prompt.


---

I agree with both changes.

The current behavior treats an expected routing limitation as an application crash. That's poor UX. A run can still be a perfectly valid record even if the routing engine cannot generate a route between two locations.

Also, the **Start** button doesn't fit the current business process. Based on what you've built so far, Runs are static planning/record documents, not live dispatches with tracking. A **Print Record** action is much more appropriate.

Here's a prompt you can give your AI coder.

---

# Prompt: Gracefully Handle OSRM "NoRoute" Errors and Replace "Start" with "Print Record"

## Problem

When calculating segment routes, OSRM returns:

```text
400 Bad Request

{
    "message": "Impossible route between points",
    "code": "NoRoute"
}
```

This commonly happens when:

* the Origin is in another country
* a Stop is overseas
* two points are disconnected by road
* coordinates are invalid
* the locations cannot be reached using the road network

Currently this exception is thrown to the UI and the page displays a Next.js error overlay.

This is incorrect behavior.

This is an expected routing limitation, not an application failure.

---

# Required Fix

## 1. Catch OSRM Errors

Wrap every OSRM route calculation in proper error handling.

Specifically handle:

```text
400
NoRoute
Impossible route between points
```

Do not allow these errors to propagate to React or Next.js.

The page must continue functioning normally.

---

## 2. Show a User-Friendly Dialog

Instead of throwing an exception, display a reusable application dialog.

Example:

**Unable to Calculate Route**

```
One or more locations cannot be connected using the road network.

This usually happens when the origin and one or more stops are in different countries or are otherwise unreachable by road.

Please verify the selected locations.
```

Buttons

```
OK
```

Do not show technical errors such as:

```
400
NoRoute
Impossible route between points
```

Those belong only in the console logs.

---

## 3. Continue Loading the Run

Even if routing fails:

* load the run
* load all stop cards
* display project information
* display notes
* display statistics that can still be calculated

The run record itself is still valid.

Only the route visualization is unavailable.

---

## 4. Route UI

If routing cannot be generated:

Hide:

* route polyline

Instead show:

```
Route unavailable
```

or

```
Unable to calculate driving route.
```

Do not leave broken map graphics.

---

## 5. Segment Handling

If only one segment fails:

Example

```
Origin
↓

Stop 1

↓

Stop 2

↓

Stop 3
```

where

```
Origin → Stop1 ✔

Stop1 → Stop2 ❌

Stop2 → Stop3 ✔
```

The application should still calculate and display all valid segments.

Only the failed segment should display:

```
Route unavailable
```

Do not discard the entire run because a single leg cannot be routed.

---

## 6. Logging

Continue logging the detailed OSRM response for developers.

Example:

```text
OSRM segment failed

Origin:
Atlanta HQ

Destination:
Martin House

Reason:
NoRoute
```

This should remain in the console only.

---

# Replace "Start" Button

The current Run module is not a live dispatching or fleet tracking system.

Runs are static planning and documentation records.

Therefore the **Start** button is misleading and should be removed.

Replace it with:

```
Print Record
```

---

# Print Record

Implement a printable Run Summary.

Include:

* Run Name
* Status
* Run Date
* Origin
* Team Assigned
* Vehicle Assigned
* Notes

Route Summary

* Total Distance
* Total Duration
* Total Revenue
* Total Stops

Stop List

```
1.
Client Name
Address
Distance from Previous Stop
Duration
Revenue

2.
...

3.
...
```

Include segment information whenever available.

If a segment could not be calculated:

```
Route unavailable
```

instead of leaving blank values.

---

# UI

Replace

```
[ Edit ]
[ Start ]
```

with

```
[ Edit ]
[ Print Record ]
```

The Print action should open the browser print dialog using a dedicated print layout that excludes navigation, sidebars, and unnecessary UI, producing a clean document suitable for operations, dispatch, or filing.

---

This approach treats routing failures as recoverable conditions instead of application errors, resulting in a much more resilient and professional user experience. It also aligns the Run module with its current purpose as a planning and record-keeping tool rather than a real-time execution system.
