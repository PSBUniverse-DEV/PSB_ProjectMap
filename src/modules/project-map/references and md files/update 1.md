Looking at the screenshots and the `RunForm.jsx`, the UI itself is fine. The problem is that **the origin data isn't being mapped consistently between the Setup module and the Runs module.** 

## What I noticed

Your Setup page clearly contains records like:

* abreza
* Atlanta HQ
* Dallas Service Center
* Phoenix Depot
* Tampa Warehouse

Yet in the Run modal, the dropdown only displays:

```
Select origin...
Draft
```

That is a huge clue.

`Draft` is **not an origin**.

`Draft` is a **Run Status**.

That means the data source being passed into:

```jsx
origins
```

is either:

* actually the status list,
* or it contains the wrong objects,
* or the loader/query is incorrect.

---

## The RunForm itself is not the issue

The dropdown is straightforward.

```jsx
<select
    value={form.origin_id}
    onChange={(e) => handleChange("origin_id", e.target.value)}
>
    <option value="">Select origin...</option>

    {origins.map((o) => (
        <option key={o.id} value={o.id}>
            {o.origin_name}
        </option>
    ))}
</select>
```

This expects every item to look like

```js
{
    id,
    origin_name,
    formatted_address,
    address_line_1,
    ...
}
```

which matches the database perfectly. 

---

## Database says

The origin table is

```sql
proj_s_origin_addresses
```

Columns

```
id
origin_name
origin_code
formatted_address
address_line_1
city
state
postal_code
latitude
longitude
...
```

Exactly what the form expects. 

---

## The biggest evidence

The dropdown shows

```
Draft
```

But

```
Draft
```

exists in

```
proj_t_runs.status
```

NOT

```
proj_s_origin_addresses.origin_name
```

That almost certainly means somewhere above this component someone is doing something similar to

```jsx
<RunForm
    origins={statuses}
/>
```

or

```jsx
origins={runStatuses}
```

instead of

```jsx
origins={originAddresses}
```

---

# Another issue

This field

```jsx
value={selectedOrigin?.formatted_address || selectedOrigin?.address_line_1 || ""}
```

only works **after** a valid origin has been found.

If

```jsx
selectedOrigin
```

is always

```
null
```

then

```
Origin Address
```

will forever stay blank.

That tells me

```jsx
const selectedOrigin = useMemo(() => {
    if (!form.origin_id) return null;

    return origins.find(
        (o) => String(o.id) === String(form.origin_id)
    ) || null;

}, [form.origin_id, origins]);
```

is never finding a matching record because either:

* origins is wrong
* origin_id is wrong
* ids don't match

---

# Things to inspect

### 1. Verify what is being passed into RunForm

Immediately before

```jsx
<RunForm
```

add

```jsx
console.log("Origins:", origins);
```

You should see

```js
[
    {
        id:1,
        origin_name:"Atlanta HQ",
        formatted_address:"...",
        ...
    },
    ...
]
```

If you instead see

```js
[
    {
        status:"Draft"
    }
]
```

or

```js
[
    {
        status_name:"Draft"
    }
]
```

then you've found the bug.

---

### 2. Verify the query

The loader should be querying

```sql
proj_s_origin_addresses
```

NOT

```
proj_t_runs
```

NOT

```
proj_s_project_status
```

---

### 3. Verify the prop

The parent component should be doing something like

```jsx
<RunForm
    origins={originAddresses}
    statuses={statuses}
/>
```

NOT

```jsx
origins={statuses}
```

---

### 4. Verify object shape

Every origin should contain

```js
{
    id,
    origin_name,
    formatted_address,
    address_line_1,
    city,
    state
}
```

If instead the object looks like

```js
{
    name,
    code
}
```

or

```js
{
    label,
    value
}
```

then

```jsx
o.origin_name
```

will be undefined.

---

# Prompt for Cline

> The Run Form origin dropdown is not wired correctly.
>
> **Current behavior**
>
> * The Setup page correctly loads records from `proj_s_origin_addresses`.
> * The Run Form dropdown displays `Draft`, which is a Run Status rather than an Origin.
> * Selecting an origin does not populate the Origin Address field.
>
> **Expected behavior**
>
> * The Origin dropdown must load from `proj_s_origin_addresses`.
> * Each option should display `origin_name`.
> * Selecting an origin should store `origin_id`.
> * The selected origin should populate the read-only Origin Address using `formatted_address`, falling back to `address_line_1`.
>
> **Investigate the parent component**
>
> 1. Verify the query fetching origin records uses `proj_s_origin_addresses`.
> 2. Verify the fetched data is passed into `<RunForm origins={originAddresses} />` rather than passing statuses or another collection.
> 3. Log the `origins` prop before rendering the form to verify its shape.
> 4. Ensure each origin object contains:
>
>    * `id`
>    * `origin_name`
>    * `formatted_address`
>    * `address_line_1`
> 5. Ensure `form.origin_id` matches `origin.id` so `selectedOrigin` resolves correctly.
> 6. Do not modify the RunForm UI unless necessary—the likely issue is the data source or prop wiring, not the component itself.
