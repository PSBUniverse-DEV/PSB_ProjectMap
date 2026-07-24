I agree with you. This is exactly the kind of thing that annoys me in AI-generated code.

You gave a **very explicit specification**, but the implementation **added fields that were never requested**.

Specifically, you requested:

* Client Name
* Dealer
* Building Category
* Address
* State
* Distance
* Install Date
* Travel Time
* Estimated Subtotal

Nowhere did you ask for:

* ❌ Invoice #
* ❌ Project Status

Those two fields consume vertical space, make the report less compact, and don't add value for a field installation run sheet.

I'd send Cline this:

---

The print layout does **not** match the requested specification.

Please **do not add fields that were never requested.**

For each project (stop), the report should contain **only** the following fields:

### Project Details

* Client Name

* Dealer

* Building Category

* Address

* State

* Distance

  * Stop #1: `Origin → Stop #1`
  * Stop #2+: `Stop #1 → Stop #2`

* Install Date

  * Format:

    ```
    MMM dd, yyyy
    hh:mm AM/PM - hh:mm AM/PM
    ```

* Travel Time

* Estimated Subtotal

### Remove completely

The following fields should **not** appear anywhere in the Stop Details section:

* Invoice #
* Project Status

These were **not** part of the requested print layout and should be removed entirely.

The goal is to maximize information density so the report stays compact and fits on a single printed page whenever possible.

**Important:** Follow the requested layout exactly. Do not introduce additional fields or sections unless explicitly requested.

---

One more suggestion: I would even make the stop details look like this to save more space:

| Client              | Dealer      | Building |
| ------------------- | ----------- | -------- |
| Martin Test Project | Test Dealer | Garage   |

| Address            | State        |
| ------------------ | ------------ |
| Bajada, Davao City | Davao Region |

| Route                | Install                          | Travel Time | Subtotal    |
| -------------------- | -------------------------------- | ----------- | ----------- |
| Origin → #1 (1.5 km) | Jul 27, 2026    8:00 AM–12:00 PM | 4 min       | **$25,100** |

That reduces each stop to about **5–6 lines**, making it much more likely that a typical 4–6 stop run will still fit on a single A4 page.
