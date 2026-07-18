Yes, I agree. A **table/key-value layout** is the better UI choice for the Project Details panel.

Right now the values have different lengths (dealer, address, dates, subtotal), so using plain stacked paragraphs makes the alignment inconsistent and harder to scan. A two-column layout (label | value) keeps everything aligned, while still allowing the **Client Name** and **Status** to stand out as the header.

I'd send your AI coder this:

---

## Prompt: Improve Project Details Panel Layout and Project List

Review the current Project Details panel and refactor it to improve readability and consistency. The target users are business users, so the panel should present information in a clean and organized format.

---

# 1. Project Header

The top of the Project Details panel should remain visually distinct from the rest of the information.

Display:

```text
Client Name

[Status Badge]
```

Example:

```text
ABC Construction

Ready for Install
```

Do **not** display labels such as:

```text
Client Name:
Status:
```

The header already makes it obvious that the large text is the client name and the badge below it represents the project status.

---

# 2. Status Badge

Always display the project status as a colored badge.

The badge color must come from the existing status configuration in the database.

Do **not** hardcode status colors.

Use the configured display color associated with the selected status.

---

# 3. Separate Dealer Section

The Dealer should not appear directly beneath the Client Name and Status.

Instead, create its own section.

Example:

```text
Dealer

ABC Dealer
```

This visually separates customer information from dealer information and makes the panel easier to scan.

---

# 4. Use a Key–Value Layout for Details

The remaining information should be displayed using a two-column key–value layout.

Example:

| Project Address  | 123 Main Street, Dallas, Texas |
| ---------------- | ------------------------------ |
| Order Received   | July 18, 2026                  |
| Scheduled Date   | July 25, 2026                  |
| Install Date     | July 30, 2026                  |
| Project Subtotal | $4,324.00                      |

This layout keeps labels aligned and makes values much easier to read.

Use this approach throughout the details panel.

---

# 5. Suggested Information Hierarchy

### Header

* Client Name
* Status Badge

---

### Dealer

| Dealer | Dealer Name |

---

### Project Address

| Address | Full Project Address |

---

### Schedule

| Order Received | Date |
| Scheduled Project Date | Date |
| Install Date | Date |

---

### Financial

| Project Subtotal | Currency |

---

Do not display unnecessary technical information such as:

* Latitude
* Longitude
* State Code
* Address Source
* Database field names

Those are implementation details and should not be shown in the standard user interface.

---

# 6. Project List (Left Panel)

Enhance each project card in the left panel.

Currently it displays:

* Client Name
* Location
* Dealer

Also display the project's subtotal.

Example:

```text
ABC Construction

Dallas, Texas

Dealer A

$245,000.00
```

The subtotal should be clearly visible but visually secondary to the client name.

Format the value as currency.

---

# General Rules

* Keep the Project Details panel clean and business-friendly.
* Use a consistent two-column key–value layout for all detail sections.
* Keep the Client Name and Status Badge as the visual header.
* Retrieve the status badge color from the existing status configuration in the database.
* Do not hardcode status colors.
* Maintain consistent spacing, alignment, and typography throughout the panel.
* Optimize the layout for quick scanning by non-technical users.


---

<!DOCTYPE html>
<html>
  <head>
    <title>Hello, World!</title>
    <link rel="stylesheet" href="styles.css" />
    <style>
body{
    background:#f5f7fa;
    font-family:Inter, sans-serif;
}

.project-details{

    width:340px;
    background:#fff;

    border-left:1px solid #e5e7eb;

    display:flex;
    flex-direction:column;
}

.project-header{

    padding:24px;

    border-bottom:1px solid #ececec;
}

.project-header h2{

    margin:0 0 10px;
    font-size:24px;
    font-weight:600;
    color:#222;
}

.status-badge{

    display:inline-flex;

    padding:4px 12px;

    border-radius:999px;

    font-size:12px;
    font-weight:600;

    background:#eef8f0;
    color:#1d8f45;
}

.section{

    padding:18px 24px;
}

.section:not(:last-child){

    border-bottom:1px solid #f0f0f0;
}

.section-title{

    margin-bottom:12px;

    font-size:11px;
    font-weight:700;

    letter-spacing:.08em;

    color:#7a7a7a;

    text-transform:uppercase;
}

.details-table{
    width:100%;
    border-collapse:collapse;
}

.details-table tr{
    border-bottom:1px solid #f2f2f2;
}

.details-table tr:last-child{
    border-bottom:none;
}

.details-table td{
    padding:12px 0;
    vertical-align:top;
}

.details-table td:first-child{

    width:42%;

    color:#6b7280;

    font-size:13px;

    font-weight:500;
}

.details-table td:last-child{

    width:58%;

    text-align:right;

    font-size:14px;

    font-weight:600;

    color:#222;

    line-height:1.5;
}

.price{

    font-size:18px;

    font-weight:700;
}

    </style>
  </head>
  <body>
      <div class="project-details">

    <div class="project-header">
        <h2>ABC Construction</h2>

        <span class="status-badge">
            Ready for Install
        </span>
    </div>

    <div class="section">
        <div class="section-title">Dealer</div>

        <table class="details-table">
            <tr>
                <td>Dealer</td>
                <td>Premium Steel Buildings</td>
            </tr>
        </table>
    </div>

    <div class="section">
        <div class="section-title">Project Address</div>

        <table class="details-table">
            <tr>
                <td>Address</td>
                <td>
                    123 Main Street<br>
                    Dallas, Texas 75242<br>
                    United States
                </td>
            </tr>
        </table>
    </div>

    <div class="section">
        <div class="section-title">Schedule</div>

        <table class="details-table">
            <tr>
                <td>Order Received</td>
                <td>July 18, 2026</td>
            </tr>

            <tr>
                <td>Scheduled Project</td>
                <td>July 25, 2026</td>
            </tr>

            <tr>
                <td>Install Date</td>
                <td>July 30, 2026</td>
            </tr>
        </table>
    </div>

    <div class="section">
        <div class="section-title">Financial</div>

        <table class="details-table">
            <tr>
                <td>Project Subtotal</td>
                <td class="price">$245,000.00</td>
            </tr>
        </table>
    </div>

</div>
  </body>
</html>