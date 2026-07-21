read:
src\modules\project-map\references and md files\references\database-table-reference.md
src\modules\project-map\references and md files\references\migration_script_requirements.md

## 1. Estimated Mileage

This belongs in the **Run** because it's an overall metric.

Add:

```sql
estimated_mileage numeric(10,2) null
```

to:

```sql
proj_t_runs
```

Result:

```sql
estimated_distance
estimated_duration
estimated_mileage
estimated_subtotal
```

---

## 2. Estimated Arrival Date/Time Per Stop

I **would not** store this in `proj_t_projects`.

It belongs to the relationship between a run and a project because the arrival depends on:

* run date
* stop order
* previous stops
* travel duration
* delays (future)
* reordering

Therefore it belongs in:

```sql
proj_t_run_projects
```

I'd actually expand it a bit.

```sql
estimated_arrival timestamp with time zone null,
estimated_departure timestamp with time zone null,
estimated_distance numeric(10,2) null,
estimated_duration numeric(10,2) null,
estimated_mileage numeric(10,2) null,
estimated_subtotal numeric(12,2) null
```

Notice that every stop now stores its own calculated metrics.

---

## Why?

Suppose

```text
Run
Origin

↓

Stop 1

↓

Stop 2

↓

Stop 3
```

Each stop should know:

| Stop | Arrival | Distance | Duration | Mileage | Subtotal |
| ---- | ------- | -------- | -------- | ------- | -------- |
| 1    | 8:15 AM | 2.1 km   | 5 min    | 1.30 mi | ₱1,000   |
| 2    | 8:35 AM | 6.4 km   | 12 min   | 3.98 mi | ₱2,500   |
| 3    | 9:10 AM | 8.9 km   | 18 min   | 5.53 mi | ₱3,200   |

Then the Run stores

```text
Total Distance

Total Duration

Total Mileage

Total Revenue
```

---

# I would update the schema like this

### proj_t_runs

Add

```sql
estimated_mileage numeric(10,2) null
```

---

### proj_t_run_projects

Add

```sql
estimated_arrival timestamp with time zone null,
estimated_departure timestamp with time zone null,
estimated_distance numeric(10,2) null,
estimated_duration numeric(10,2) null,
estimated_mileage numeric(10,2) null,
estimated_subtotal numeric(12,2) null
```

---

# Why this design is better

Think of the Run as the **summary**, and the Run Projects as the **details**.

```
Run
──────────────────────────────
Distance
Duration
Mileage
Revenue
Stops

↓

Run Projects
──────────────────────────────
Stop 1
Arrival
Distance
Duration
Mileage
Revenue

Stop 2
Arrival
Distance
Duration
Mileage
Revenue

Stop 3
Arrival
Distance
Duration
Mileage
Revenue
```

This follows a classic **Header / Detail** database design:

* `proj_t_runs` = Header (overall route totals)
* `proj_t_run_projects` = Detail (per-stop metrics)

It also aligns with one of your original Phase 1 requirements:

> **reports: sequential (est/distances/mileages per route, Client name, address, date arrival (date - day - time), price)**

With this structure, generating that report becomes straightforward because each stop already stores the arrival time, travel metrics, mileage, and subtotal, while the run table stores the overall totals.
