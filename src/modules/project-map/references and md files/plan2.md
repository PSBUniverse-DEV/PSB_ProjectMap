Got it. **React JS + Supabase + Vercel.** That actually makes this map project straightforward.

And your incomplete-address requirement **changes my recommendation**.

## My recommendation: MapLibre + Geoapify

Use:

| Purpose                     | Technology                                                                                                 |
| --------------------------- | ---------------------------------------------------------------------------------------------------------- |
| React application           | Your existing React JS                                                                                     |
| Interactive map             | [MapLibre GL JS](https://maplibre.org/?utm_source=chatgpt.com)                                             |
| Map/location data           | OpenStreetMap-based provider                                                                               |
| Address search/autocomplete | [Geoapify Address Autocomplete](https://www.geoapify.com/solutions/address-lookup/?utm_source=chatgpt.com) |
| Database                    | [Supabase](https://supabase.com/?utm_source=chatgpt.com)                                                   |
| Hosting                     | [Vercel](https://vercel.com/?utm_source=chatgpt.com)                                                       |

**I would no longer choose Google Maps first if cost is one of your primary concerns.**

[Geoapify](https://www.geoapify.com/?utm_source=chatgpt.com) currently offers a free plan with **3,000 credits per day**, and autocomplete/geocoding requests cost one credit each. ([Geoapify][1])

For an **internal PSB tool**, that is likely plenty for your initial usage.

---

# Your incomplete address problem

This is exactly where **address autocomplete/search** comes in.

Instead of this trash:

```text
Building Address

[ 6757 N Richards Rd             ]
```

Use this:

```text
Building Location

[ Search address or location...       🔍 ]

  6757 N Richards Rd
  Lake City, MI 49651, United States

  6757 Richards Road
  Missaukee County, Michigan

  Richards Rd
  Lake City, MI, United States
```

The user types:

```text
6757 N Richards
```

Or even:

```text
Richards Rd Lake City
```

The application searches locations and returns suggestions.

Geoapify's address lookup offering supports forward geocoding, autocomplete, reverse geocoding, and address validation. ([Geoapify][2])

The user **selects the correct result**.

Then you save:

```text
Client Name
Diane McPherson

Building Address
6757 N Richards Rd

City
Lake City

State
Michigan

State Code
MI

Postal Code
49651

Country
United States

Latitude
44.4461409

Longitude
-85.0857699
```

**Do not make the user manually enter City, State, ZIP, Latitude, or Longitude.**

That's unnecessary data entry and introduces garbage data.

---

# I would make the form like this

```text
┌──────────────────────────────────────────────────────┐
│ Project Location                                     │
│                                                      │
│ Client Name                                          │
│ [ Diane McPherson                                  ] │
│                                                      │
│ Building Location                                    │
│ [ 🔍 Search address, road, city, or location...    ] │
│                                                      │
│ ┌──────────────────────────────────────────────────┐ │
│ │ 📍 6757 N Richards Rd                            │ │
│ │    Lake City, MI 49651, United States            │ │
│ ├──────────────────────────────────────────────────┤ │
│ │ 📍 Richards Rd                                   │ │
│ │    Lake City, Michigan, United States            │ │
│ └──────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────┘
```

After selection:

```text
┌──────────────────────────────────────────────────────┐
│ ✓ Location Selected                                  │
│                                                      │
│ 6757 N Richards Rd                                   │
│ Lake City, MI 49651                                  │
│ United States                                        │
│                                                      │
│                     [ Change Location ]               │
└──────────────────────────────────────────────────────┘
```

And beside it:

```text
┌────────────────────────────────────┐
│                                    │
│             MAP                    │
│                                    │
│               📍                   │
│                                    │
│      6757 N Richards Rd            │
│                                    │
└────────────────────────────────────┘
```

This is **much safer UX**.

The user visually confirms:

> "Yes. That's where we're building."

---

# One feature I strongly recommend

Allow the user to **move the map pin manually**.

Why?

Because PSB builds metal buildings.

The mailing address may point here:

```text
                 📍 Road Address
──────────────────────────────── Road
          │
          │
          │
          │
          │
          │        🏗 ACTUAL BUILD SITE
```

The actual building site could be **300 feet behind the property entrance**.

So after selecting an address:

```text
Location found
      ↓
Map centers on location
      ↓
User can drag pin
      ↓
"Place the pin on the actual building site"
      ↓
Save coordinates
```

### UI

```text
┌────────────────────────────────────────────┐
│ Building Site Location                     │
│                                            │
│        Drag the pin to the exact           │
│        building installation site.         │
│                                            │
│                  📍                        │
│                                            │
│                                            │
│ [ Reset to Address ]        [ Confirm Pin ]│
└────────────────────────────────────────────┘
```

**This is more useful than Google Maps address search alone.**

You're not really tracking customer addresses.

You're tracking **building sites**.

That distinction matters.

---

# Database design

I would slightly change my original structure:

```text
psb_projects
-----------------------------
id
client_name

formatted_address
address_line_1
city
state
state_code
postal_code
country

address_latitude
address_longitude

site_latitude
site_longitude

location_source

status
dealer

created_at
updated_at
```

Why two coordinates?

```text
address_latitude
address_longitude
```

= Location returned by address search.

```text
site_latitude
site_longitude
```

= Exact pin selected by PSB employee.

Example:

```text
Address Location
44.4461409
-85.0857699

Actual Building Site
44.4458912
-85.0847231
```

**Do not overwrite the original address coordinates when the pin is moved.**

Store both.

That will save you headaches later.

---

# About using Nominatim because it's "free"

You might find tutorials telling you:

> Just use the free OpenStreetMap Nominatim API.

I **do not recommend using the public Nominatim server as PSB's production autocomplete backend**.

The OpenStreetMap Foundation says the public service has limited capacity, imposes an absolute maximum of one request per second, and explicitly forbids client-side autocomplete use against that public API. ([OSMF Operations][3])

So don't let your AI coder do this:

```text
onChange
    ↓
fetch(nominatim)
    ↓
every keystroke
```

That's a weak production architecture.

---

# Final stack I recommend for PSB

```text
React JS
    │
    ├── MapLibre GL JS
    │       └── Interactive Project Map
    │
    ├── Geoapify
    │       ├── Address Autocomplete
    │       ├── Geocoding
    │       └── Reverse Geocoding
    │
    ├── Supabase
    │       ├── Projects
    │       ├── Coordinates
    │       └── Project Status
    │
    └── Vercel
```

**My pick: MapLibre + Geoapify + Supabase.**

For PSB's current requirement, I would **not pay Google Maps prices yet**. Geoapify's current free plan is 3,000 credits/day with no credit card required, though its free tier is described as having limited commercial use, so you should verify the plan terms against PSB's internal production usage before launch. ([Geoapify][4])

And the **manual draggable building-site pin should be a core requirement, not a "future enhancement."** Your actual business entity is the **construction site location**, not merely the postal address.

[1]: https://www.geoapify.com/pricing-details/?utm_source=chatgpt.com "Pricing Details | Geoapify Location Platform"
[2]: https://www.geoapify.com/solutions/address-lookup/?utm_source=chatgpt.com "Address Lookup API for Search, Validation, and ..."
[3]: https://operations.osmfoundation.org/policies/nominatim/?utm_source=chatgpt.com "Nominatim Usage Policy (aka Geocoding Policy)"
[4]: https://www.geoapify.com/pricing/?utm_source=chatgpt.com "Pricing | Geoapify Location Platform"
