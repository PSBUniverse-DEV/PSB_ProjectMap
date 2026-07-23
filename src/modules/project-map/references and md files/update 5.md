Yeah, this is a good example of Cline following the instruction too literally and losing the original intent. It "fixed" one issue by introducing several new ones.

## What I observed from the screenshots

### 1. Customer Information section lost important fields ❌

Originally it contained:

* Client Name
* Dealer
* Building Category
* Status
* State

Now it only contains:

* Client Name
* State

Dealer and Building Category have been moved elsewhere, which breaks the logical grouping.

---

### 2. Building Category is in the wrong section ❌

It has been moved into **Sales / Order Information**.

That doesn't make business sense.

A building category is part of the **project itself**, not sales information.

It belongs with:

* Client
* Dealer
* State

---

### 3. State is duplicated ❌

I can see **State** twice.

One is in Customer Information.

Another is in Sales / Order Information.

Only one should exist.

Since State comes from the selected address, it should be displayed once as a readonly field.

---

### 4. Dealer disappeared completely ❌

Dealer is one of the primary project attributes.

It's no longer visible anywhere.

That means either:

* it was accidentally removed
* or forgotten during the refactor

Either way, that's a regression.

---

### 5. Sales / Order Information lost most of its fields ❌

Originally this section was intended to contain things like:

* Project Subtotal
* Invoice #
* Order Received

Instead it now contains:

* Building Category
* State
* Order Received

This is incorrect grouping.

---

### 6. Workflow Status is correct ✅

This section is actually better.

Grouping

* Project Status
* Welcome Call Status
* Permit Status

together is exactly what we wanted.

---

### 7. Scheduling section looks good ✅

No issues.

---

### 8. Notes section is fine ✅

---

# What happened?

Cline misunderstood **"move Project Status into Workflow Status"** as **"move everything around until the layout fits."**

The requirement was **not** to reshuffle unrelated fields.

The only requested move was:

```
Project Status

↓

Workflow Status
```

Everything else should have stayed where it logically belongs.

---

# Recommended Layout

## Customer Information

```
Client Name *

Dealer *

Building Category *

State (readonly)
```

---

## Project Location

```
Project Address *
```

Nothing else.

No coordinates.

---

## Sales / Order Information

```
Project Subtotal

Invoice #

Order Received
```

---

## Workflow Status

```
Project Status

Welcome Call Status

Permit Status
```

---

## Scheduling

```
Scheduled Start

Scheduled End

Install Start

Install End
```

---

## Notes

```
Notes
```

---

# Prompt for Cline

> The latest refactor introduced several regressions by moving fields into incorrect sections. Please restore the logical organization of the Project form without redesigning it.
>
> **Observed Issues**
>
> * Dealer has disappeared from the form.
> * Building Category was moved into **Sales / Order Information**, but it belongs to the project's general information.
> * State now appears twice (Customer Information and Sales / Order Information). It should only exist once.
> * Sales / Order Information no longer contains only sales/order-related fields.
>
> **Required Layout**
>
> **Customer Information**
>
> * Client Name
> * Dealer
> * Building Category
> * State (readonly, auto-populated from the selected address)
>
> **Project Location**
>
> * Project Address (required)
>
> **Sales / Order Information**
>
> * Project Subtotal
> * Invoice Number
> * Order Received
>
> **Workflow Status**
>
> * Project Status
> * Welcome Call Status
> * Permit Status
>
> **Scheduling**
>
> * Scheduled Start
> * Scheduled End
> * Install Start
> * Install End
>
> **Notes**
>
> * Notes textarea
>
> Do **not** move fields between sections unless there is a business reason. The objective is to organize the existing form logically, not redesign it. Keep the implementation simple, preserve the original structure where possible, and only apply the requested improvements.
