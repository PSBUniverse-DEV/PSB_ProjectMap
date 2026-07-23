Yes, based on the screenshots, this is a regression.

### What I observed

**Screenshot 1 (Supabase)**

* `proj_t_projects` contains multiple records.
* I can clearly see projects with IDs **30–38**.
* There are **9 project records** in the table.

**Screenshot 2 (Project Map)**

* The left project panel displays:

  * **0 Projects**
  * **No projects found.**
* The map also contains no markers.

The database clearly has data, but the UI is behaving as if there are no projects.

---

# Likely Cause

Since this happened immediately after the recent refactoring, one of these is probably true:

### 1. The project query is failing

The frontend may now be querying columns that don't exist or are returning an error after the schema changes.

For example, if the query now expects:

```sql
building_category_id
permit_status_id
welcome_call_status_id
```

or performs INNER JOINs to the new lookup tables, a failed query could result in an empty dataset.

---

### 2. A mapping error

The query returns rows, but the code is trying to read renamed fields.

Example:

```js
project.order_received_date
```

was renamed to

```js
project.order_received_at
```

If the mapper throws an exception or filters invalid records, the list becomes empty.

---

### 3. Filtering everything out

The UI may now require one of the new fields.

Example:

```js
projects.filter(p => p.status_id)
```

If `status_id` is undefined because of incorrect mapping, every project disappears.

---

### 4. The loadProjects() query changed

If Cline modified the SELECT statement, it may now contain incorrect joins.

For example:

```sql
INNER JOIN proj_s_building_categories
```

instead of

```sql
LEFT JOIN
```

Any missing lookup relationship would eliminate the project from the result set.

---

### 5. Runtime error during mapping

The API may successfully return projects, but a JavaScript error while transforming the data causes:

```text
[]
```

to be rendered.

---

# Prompt for Cline

> The Project Map is no longer loading any projects after the recent refactoring.
>
> **Observed Behavior**
>
> * `proj_t_projects` contains multiple records (confirmed in Supabase).
> * The Project Map displays **0 Projects** and **No projects found**.
> * No markers are rendered on the map.
>
> This indicates the issue is in the data loading or mapping layer, not the database.
>
> ### Please investigate the following:
>
> 1. Verify that the project loading query is still returning records.
> 2. Check the browser console and network response for any query or JavaScript errors.
> 3. Verify that all renamed fields (`order_received_at`, `scheduled_project_start`, `install_start`, etc.) are mapped correctly.
> 4. Verify that any joins to the new lookup tables use `LEFT JOIN` (or the Supabase equivalent) so projects without related lookup records are not excluded.
> 5. Ensure no client-side filtering is removing every project because of missing or incorrectly mapped fields.
> 6. Verify that the project list and map markers are rendering from the returned dataset.
>
> **Acceptance Criteria**
>
> * Existing projects from `proj_t_projects` appear in the left project list.
> * Project count matches the database.
> * Project markers appear on the map.
> * No unnecessary refactoring or architectural changes. Focus only on restoring the existing project loading functionality while supporting the new fields.
