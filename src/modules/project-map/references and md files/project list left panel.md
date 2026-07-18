## Prompt: Improve Project Card Layout

Refine the layout of the project cards in the left panel to better prioritize important information.

### Current Layout

The project subtotal is currently displayed at the bottom of each project card.

This makes the financial value less noticeable because it is treated like secondary information.

### Required Layout

Move the **Project Subtotal** to the **top-right corner** of each project card.

The card should follow this hierarchy:

```text
Client Name                              $4,324.00

City, State

Dealer
```

Example:

```text
ABC Construction                     $245,000.00

Dallas, Texas

Premium Steel Buildings
```

### Layout Requirements

* The **Client Name** remains the primary piece of information.
* The **Project Subtotal** should appear on the same row as the Client Name, aligned to the far right.
* The subtotal should be formatted as currency.
* Use the existing typography hierarchy:

  * Client Name: primary emphasis.
  * Project Subtotal: secondary emphasis, but still clearly visible.
  * Location and Dealer: supporting information.
* If the project subtotal is null, display:

```text
—
```

instead of `0.00`.

### UI/UX Goal

Users should be able to quickly identify:

1. Which project it is.
2. How much the project is worth.
3. Where it is located.
4. Which dealer it belongs to.

The subtotal is an important business metric and should be immediately visible without requiring users to scan to the bottom of the card.


---

part 2

---

## Prompt: Simplify Project Card Layout

Refine the project cards in the left panel to improve readability and prioritize the most important information.

### Required Layout

Remove the **Dealer** from the project card.

The card should only display:

```text
Client Name                              $4,324.00

City, State
```

Example:

```text
ABC Construction                     $245,000.00

Dallas, Texas
```

### Layout Requirements

* Display the **Client Name** on the left.
* Display the **Project Subtotal** on the same row, aligned to the far right.
* Format the subtotal as currency.
* Display the project's **City, State** below the client name.
* If the location is unavailable, display:

```text
No location
```

* If the subtotal is null, display:

```text
—
```

instead of `0.00`.

### UI/UX Goal

Each project card should allow users to immediately identify:

1. The client.
2. The project value.
3. The project location.

The dealer information is already available in the Project Details panel, so it is unnecessary to repeat it in the project list. Keeping the card focused on these three pieces of information results in a cleaner, less cluttered interface.
