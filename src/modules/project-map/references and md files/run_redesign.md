
> Implement route calculations for every segment of a run instead of only calculating the total route.
>
> The system should calculate and display the following for each leg of the journey:
>
> * **Origin Address → Stop 1**
>
>   * Distance
>   * Estimated Duration
>   * Subtotal
> * **Stop 1 → Stop 2**
>
>   * Distance
>   * Estimated Duration
>   * Subtotal
> * **Stop 2 → Stop 3**
>
>   * Distance
>   * Estimated Duration
>   * Subtotal
> * Continue this process for every subsequent stop in the run.
>
> Additionally, calculate the **overall route summary** from:
>
> **Origin Address → Stop 1 → Stop 2 → Stop 3 → ... → Final Stop**
>
> The overall summary should include:
>
> * Total Distance
> * Total Estimated Duration
> * Total Subtotal
>
> Ensure that both the **per-segment metrics** and the **overall route totals** are automatically recalculated whenever the stop order changes or when a stop is added, removed, or updated. This should use the actual road route between consecutive locations rather than straight-line distances.



---

The current UI is functional, but it still feels like a CRUD form rather than a route planning application. Since the **Runs** page is essentially a logistics/planning module, the UI should emphasize the route, progress, and key metrics instead of the form fields.

Here are my suggestions.

---

# 1. Redesign the Right Panel

Instead of showing a long list of labels, organize the information into sections.

```
┌──────────────────────────────────────┐
│ 🛻 Run: Abreeza                  Draft│
│ Jul 19, 2026                        │
├──────────────────────────────────────┤
│ 📍 Origin                           │
│ Abreeza                             │
│ Davao City...                       │
├──────────────────────────────────────┤
│ 📊 Route Summary                    │
│ Distance   19.4 km                  │
│ Duration   1 hr 12 min              │
│ Revenue    ₱54,000                  │
│ Stops      12                       │
├──────────────────────────────────────┤
│ 👥 Team & Vehicle                   │
│ Team Alpha                          │
│ Truck #3                            │
├──────────────────────────────────────┤
│ 📝 Notes                            │
│ ...                                 │
└──────────────────────────────────────┘
```

This is much easier to scan.

---

# 2. Replace Project Cards with Stop Cards

Instead of

```
Projects (2)

Stop 2: martin house
```

Use numbered stop cards.

```
Stops (2)

① Martin House
Dealer
₱1,000

Distance from Origin
2.4 km • 6 mins

--------------------------

② ABC Warehouse
Dealer
₱4,200

Distance from Stop 1
3.1 km • 8 mins
```

Immediately users understand the route.

---

# 3. Show Segment Information

Since you're already calculating every segment...

```
Origin
│
├── 2.3 km
├── 5 mins
▼
Stop 1

│
├── 3.8 km
├── 9 mins
▼
Stop 2

│
├── 1.1 km
├── 4 mins
▼
Stop 3
```

This is far more useful than only showing totals.

---

# 4. Route Summary Card

Instead of putting Distance/Duration/Subtotal in small text.

Make it the first thing people see.

```
━━━━━━━━━━━━━━━━━━━━━━

Distance
19.3 km

Duration
1 hr 14 mins

Revenue
₱54,800

Stops
12

━━━━━━━━━━━━━━━━━━━━━━
```

Bigger numbers.

Less labels.

---

# 5. Color-code Status

Instead of plain text.

```
● Draft

● Planned

● In Progress

● Completed
```

Use the same status colors used in Projects.

---

# 6. Better Left Sidebar

Current

```
abreeza

2026-07-19

0 projects

19 km
```

Suggested

```
🛻 Abreeza

Jul 19, 2026

12 Stops

19 km

₱54,000

──────────────────
```

Much more informative.

---

# 7. Improve Map

The map should dominate the page.

Current

```
25% sidebar

50% map

25% details
```

I would instead use

```
20% sidebar

60% map

20% details
```

because the map is the primary feature.

---

# 8. Highlight Selected Stop

When clicking a stop.

Instead of only zooming...

* pulse animation
* marker grows
* draw path from previous stop
* show popup

```
Stop #3

Martin House

2.1 km

5 mins

₱3,400
```

Makes navigation much easier.

---

# 9. Route Timeline

This would probably be the biggest UX improvement.

Instead of

```
Projects

Stop 2

Stop 1
```

Use

```
Origin
│
├── 2 km
▼
① Martin House

│
├── 5 km
▼
② Abreeza

│
├── 3 km
▼
③ Lanang

│
└── 4 km
▼
Destination
```

Users instantly understand the order.

---

# 10. Better Actions

Current

```
Edit Delete
```

Suggested

```
[ Edit Run ]

[ Optimize Route ]

[ Start Run ]

[ Delete ]
```

Depending on the status:

Draft

```
Edit
Optimize
Delete
```

Planned

```
Edit
Start
```

In Progress

```
View Live
Complete
```

Completed

```
Duplicate
Print
Export
```

This avoids presenting actions that aren't valid for the current state.

---

# 11. Add Route Statistics

A compact analytics section adds value without clutter.

```
Route Statistics

Total Stops      12
Average Stop     7 mins
Longest Leg      14 km
Shortest Leg     0.8 km
Total Revenue    ₱54,000
```

---

# 12. Keep the Details Panel Scroll-Free

The current panel requires scrolling because everything is stacked vertically.

A better hierarchy is:

```
Run Header
↓
Summary Card
↓
Origin
↓
Team
↓
Stops Timeline (remaining scroll area)
↓
Footer Actions (sticky)
```

Keep the header and action buttons fixed, and let only the stop list scroll. This keeps the most important information and actions visible at all times.

---

## Overall Recommendation

I would shift the page from a **form-centric layout** to a **route planner dashboard**:

```
┌──────────────┬───────────────────────────────┬──────────────────────────────┐
│              │                               │ 🛻 Run Header                │
│ Runs         │                               ├──────────────────────────────┤
│              │                               │ 📊 Route Summary             │
│ Draft        │          MAP                  ├──────────────────────────────┤
│ Planned      │                               │ 📍 Origin                    │
│ Completed    │                               ├──────────────────────────────┤
│              │                               │ 🛣 Route Timeline            │
│              │                               │                              │
│              │                               │ ① Stop 1                     │
│              │                               │ 2 km • 5 min                 │
│              │                               │                              │
│              │                               │ ② Stop 2                     │
│              │                               │ 4 km • 9 min                 │
│              │                               │                              │
│              │                               ├──────────────────────────────┤
│              │                               │ Sticky Action Buttons        │
└──────────────┴───────────────────────────────┴──────────────────────────────┘
```

This layout feels more like Google Maps, Onfleet, Routific, or Circuit, where the **route and stops** are the focus, while the form data becomes supporting information rather than the primary visual element.
