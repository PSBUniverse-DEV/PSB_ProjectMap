Yes. Based on your description and the console, **this is a bug**.

A routing calculation (OSRM) is an **expensive operation**. It should **never** run on every render or every React state update.

## What should happen instead

The route should only be recalculated when one of these changes:

* ✅ A project is added to the run
* ✅ A project is removed from the run
* ✅ The order/sequence changes
* ✅ The origin changes
* ✅ A project's coordinates change
* ✅ A run is loaded for the first time
* ✅ User manually clicks "Recalculate Route" (if you add that button)

It **should NOT** recalculate when:

* ❌ Selecting another project
* ❌ Opening/closing the Run Details panel
* ❌ Typing notes
* ❌ Changing unrelated state
* ❌ Hovering markers
* ❌ React re-rendering
* ❌ Parent component updates

---

## What is probably happening

I can already tell from the logs:

```
Calling OSRM with coords...
Calling OSRM with coords...
Calling OSRM with coords...
Calling OSRM with coords...
Calling OSRM with coords...
```

This almost always means one of these mistakes exists.

### 1. useEffect dependency is wrong (Most likely)

Bad:

```tsx
useEffect(() => {
    calculateRoute();
});
```

No dependency array means:

> Every render
> →
> calculateRoute()

---

Bad:

```tsx
useEffect(() => {
    calculateRoute();
}, [run]);
```

If `run` is recreated every render:

```
render

run = { ... }

render

run = { ... }

render

run = { ... }
```

React thinks

```
run changed
run changed
run changed
run changed
```

Even though nothing meaningful changed.

---

### 2. calculateRoute() updates state

Example

```
calculateRoute()

↓

setDistance()

↓

render

↓

useEffect()

↓

calculateRoute()

↓

setDuration()

↓

render

↓

calculateRoute()
```

Infinite render loop.

---

### 3. Parent keeps recreating props

Example

```
<ProjectMapView
    selectedRun={{
        ...run
    }}
/>
```

Every render

```
new object

↓

effect fires

↓

OSRM

↓

repeat
```

---

### 4. Supabase subscription

If you subscribed like

```
postgres_changes
```

and every update causes

```
fetchRuns()

↓

setRuns()

↓

effect

↓

OSRM

↓

fetchRuns()

↓

repeat
```

it becomes endless.

---

## Better architecture

Think of routing as **derived data**, not UI state.

```
Database changes
        │
        ▼
Run updated
        │
        ▼
calculateRoute()
        │
        ▼
Save distance
Save duration
Polyline
Subtotal
        │
        ▼
Done
```

Nothing else should trigger it.

---

## Even better

Instead of

```
React Render

↓

Calculate Route
```

Do

```
User edits run

↓

Save run

↓

calculateRoute()

↓

Update database

↓

Render
```

One calculation.

Done.

---

## If using React

Your dependency should look closer to something like

```tsx
useEffect(() => {
    calculateRoute();
}, [
    origin,
    orderedProjectIds
]);
```

Not

```tsx
[runs]
```

Not

```tsx
[selectedRun]
```

Not

```tsx
[projects]
```

Only the actual values that affect routing.

---

# This is the architecture I would recommend

```
Run Editor

Add Project
Remove Project
Reorder Project
Change Origin

        │
        ▼

saveRun()

        │
        ▼

calculateRoute()

        │
        ▼

saveDistance()
saveDuration()
savePolyline()

        │
        ▼

refresh UI
```

Notice:

> **UI rendering never triggers route calculation.**

Only **actual data mutations** do.

---

# Prompt for your AI coder

> **The route calculation logic is incorrect and is being executed continuously, causing repeated OSRM requests on every render. This is a performance bug.**
>
> Refactor the routing flow so that OSRM is only called when the route data actually changes.
>
> Specifically:
>
> * Identify every place where `calculateRoute()` (or equivalent) is being called.
> * Remove any execution caused by React re-renders, unrelated state updates, panel toggles, hover events, or parent component renders.
> * Ensure route recalculation only occurs when:
>
>   * a project is added to a run,
>   * a project is removed,
>   * the project sequence changes,
>   * the origin changes,
>   * project coordinates change,
>   * or the run is initially loaded.
> * Audit all `useEffect` hooks and correct their dependency arrays. Avoid using entire objects or arrays as dependencies if their references change every render.
> * Prevent render loops caused by `setState()` inside effects that also trigger route recalculation.
> * Memoize derived values where appropriate (`useMemo`, `useCallback`) so stable data does not cause unnecessary effects.
> * If Supabase subscriptions are involved, ensure they only refresh data when the relevant run records actually change and do not indirectly trigger repeated route calculations.
> * Add logging to verify when route recalculation is triggered and include the reason (e.g., "Project added", "Sequence changed", "Origin updated"), so future debugging is straightforward.
>
> The expected behavior is that OSRM requests are **event-driven**, not **render-driven**. After the initial load, no additional routing requests should occur unless the underlying run data has actually changed.

This refactor will eliminate the repeated network calls you're seeing (12, 19, and increasing) and significantly reduce unnecessary CPU usage, network traffic, and UI lag.
